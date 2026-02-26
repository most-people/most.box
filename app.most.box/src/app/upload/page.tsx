"use client";

import { AppHeader } from "@/components/AppHeader";
import { useUserStore } from "@/stores/userStore";
import crust from "@/utils/crust";
import { mostCrust } from "@/utils/MostWallet";
import {
  Button,
  Container,
  Group,
  Paper,
  Stack,
  Text,
  Title,
  FileInput,
  Progress,
  Badge,
  Alert,
  Modal,
  ActionIcon,
  Tooltip,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconUpload,
  IconFile,
  IconAlertCircle,
  IconWallet,
  IconPlayerPlay,
  IconBan,
  IconTrash,
} from "@tabler/icons-react";
import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import mp from "@/utils/mp";

interface UploadItem {
  id: string;
  file: File;
  status: "pending" | "uploading" | "success" | "error" | "queued";
  progress: number;
  message?: string;
  cid?: string;
}

function UploadContent() {
  const searchParams = useSearchParams();
  const path = searchParams.get("path") || "";

  const wallet = useUserStore((state) => state.wallet);
  const balance = useUserStore((state) => state.balance);
  const fetchBalance = useUserStore((state) => state.fetchBalance);
  const addFile = useUserStore((state) => state.addFile);

  const [files, setFiles] = useState<UploadItem[]>([]);
  const [showPayModal, setShowPayModal] = useState(false);

  // Keep track of abort controllers for cancellation
  const abortControllers = useRef<Record<string, AbortController>>({});

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  // Clean up abort controllers on unmount
  useEffect(() => {
    return () => {
      Object.values(abortControllers.current).forEach((controller) =>
        controller.abort(),
      );
    };
  }, []);

  const handleFileSelect = (selectedFiles: File[]) => {
    if (!selectedFiles || selectedFiles.length === 0) return;

    const newItems = selectedFiles.map((file) => ({
      id: Math.random().toString(36).substring(7),
      file,
      status: "pending" as const,
      progress: 0,
    }));
    setFiles((prev) => [...prev, ...newItems]);
  };

  const removeFile = (id: string) => {
    // If uploading, cancel first
    if (abortControllers.current[id]) {
      abortControllers.current[id].abort();
      delete abortControllers.current[id];
    }
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const updateItemStatus = (
    id: string,
    status: UploadItem["status"],
    progress: number,
    message?: string,
    cid?: string,
  ) => {
    setFiles((prev) =>
      prev.map((f) =>
        f.id === id ? { ...f, status, progress, message, cid } : f,
      ),
    );
  };

  const cancelUpload = (id: string) => {
    if (abortControllers.current[id]) {
      abortControllers.current[id].abort();
      delete abortControllers.current[id];
      updateItemStatus(id, "pending", 0, "已取消");
    }
  };

  const handleUpload = async (id: string) => {
    const item = files.find((f) => f.id === id);
    if (!item) return;

    if (!wallet) {
      notifications.show({
        message: "请先连接钱包",
        color: "red",
      });
      return;
    }

    const { danger } = wallet;
    const crustWallet = mostCrust(danger);

    // Check balance for large files
    const isLargeFile = item.file.size > 200 * 1024 * 1024;
    const currentBalance = useUserStore.getState().balance;

    if (isLargeFile && parseFloat(currentBalance) <= 0) {
      updateItemStatus(id, "error", 0, "余额不足");
      setShowPayModal(true);
      return;
    }

    // Initialize AbortController
    const controller = new AbortController();
    abortControllers.current[id] = controller;

    updateItemStatus(id, "uploading", 0, "准备上传...");

    try {
      if (isLargeFile) {
        // Large file flow (> 200MB)
        // 1. Upload to IPFS Gateway (Add only, no Pin)
        const authHeader = crust.auth(
          crustWallet.crust_address,
          crustWallet.sign(crustWallet.crust_address),
        );

        updateItemStatus(id, "uploading", 1, "正在上传数据到 IPFS...");

        const ipfsResult = await crust.ipfs(
          item.file,
          authHeader,
          (bytes) => {
            if (controller.signal.aborted) return;
            // IPFS upload takes 90% of progress for large files
            const progress = Math.round((bytes / item.file.size) * 90);
            updateItemStatus(
              id,
              "uploading",
              progress,
              `上传中 ${mp.formatFileSize(bytes)} / ${mp.formatFileSize(item.file.size)}`,
            );
          },
          controller.signal,
        );

        if (controller.signal.aborted) return;

        updateItemStatus(id, "uploading", 90, "正在支付存储费用...");

        // 2. Place Storage Order on Chain
        const txHash = await crust.order(
          ipfsResult.cid,
          item.file.size,
          danger,
          0,
          currentBalance,
        );

        updateItemStatus(
          id,
          "success",
          100,
          "上传成功！存储订单已提交。",
          ipfsResult.cid,
        );

        // Add to local file list
        addFile({
          cid: ipfsResult.cid,
          name: item.file.name,
          size: item.file.size,
          type: "file",
          path: path, // Add to current path
          expired_at: Date.now() + 180 * 24 * 60 * 60 * 1000,
          tx_hash: txHash,
        });
      } else {
        // Small file (<= 200MB)
        // Upload directly using crust.upload to show progress
        updateItemStatus(id, "uploading", 1, "正在上传到 IPFS 网关...");

        const result = await crust.upload(
          item.file,
          crustWallet,
          (bytes) => {
            if (controller.signal.aborted) return;
            const progress = Math.round((bytes / item.file.size) * 100);
            updateItemStatus(
              id,
              "uploading",
              progress,
              `上传中 ${mp.formatFileSize(bytes)} / ${mp.formatFileSize(item.file.size)}`,
            );
          },
          controller.signal,
        );

        if (controller.signal.aborted) return;

        updateItemStatus(id, "success", 100, "上传成功！", result.cid);

        // Add to local file list
        addFile({
          cid: result.cid,
          name: item.file.name,
          size: item.file.size,
          type: "file",
          path: path, // Add to current path
          expired_at: Date.now() + 180 * 24 * 60 * 60 * 1000,
          tx_hash: "", // No tx hash for free upload
        });
      }
    } catch (error: any) {
      if (error.name === "AbortError" || error.message === "Aborted") {
        updateItemStatus(id, "pending", 0, "已取消");
        return;
      }

      console.error("Upload error:", error);

      let errorMsg = error.message || "上传失败";

      if (
        error.cause === "INSUFFICIENT_BALANCE" ||
        errorMsg.includes("INSUFFICIENT_BALANCE")
      ) {
        errorMsg = "余额不足，无法支付存储费";
        setShowPayModal(true);
      }

      updateItemStatus(id, "error", 0, errorMsg);
    } finally {
      delete abortControllers.current[id];
    }
  };

  const handleUploadAll = () => {
    files.forEach((file) => {
      if (file.status === "pending" || file.status === "error") {
        handleUpload(file.id);
      }
    });
  };

  return (
    <Container py="lg" size="md">
      <AppHeader title="大文件上传" />

      <Stack mt="xl" gap="lg">
        <Alert icon={<IconAlertCircle size={16} />} title="说明" color="blue">
          普通文件（&le;200MB）将使用免费通道上传。大文件（&gt;200MB）需要消耗
          CRU 余额直接向 Crust 网络支付存储费用。
        </Alert>

        <Paper withBorder p="md" radius="md">
          <Group justify="space-between">
            <Group>
              <IconWallet size={24} color="gray" />
              <div>
                <Text size="sm" c="dimmed">
                  当前余额
                </Text>
                <Text fw={700}>{parseFloat(balance || "0")} CRU</Text>
              </div>
            </Group>
            <Button variant="light" component={Link} href="/pay">
              充值
            </Button>
          </Group>
        </Paper>

        <Paper withBorder p="xl" radius="md" style={{ borderStyle: "dashed" }}>
          <Stack align="center" gap="md">
            <IconUpload size={48} color="gray" />
            <Text ta="center">点击选择或拖拽文件到此处</Text>
            {path && (
              <Text size="sm" c="dimmed">
                上传至目录: <Badge variant="light">{path}</Badge>
              </Text>
            )}
            <FileInput
              placeholder="选择文件"
              multiple
              value={[]}
              onChange={handleFileSelect}
              style={{ width: "100%", maxWidth: 300 }}
              clearable={false}
            />
          </Stack>
        </Paper>

        {files.length > 0 && (
          <Stack gap="md">
            <Group justify="space-between">
              <Title order={5}>上传列表</Title>
              <Button
                onClick={handleUploadAll}
                disabled={files.every(
                  (f) =>
                    f.status === "success" ||
                    f.status === "queued" ||
                    f.status === "uploading",
                )}
              >
                全部开始
              </Button>
            </Group>

            {files.map((item) => (
              <Paper key={item.id} withBorder p="sm" radius="sm">
                <Group align="center" wrap="nowrap">
                  <IconFile
                    size={32}
                    color={item.status === "error" ? "red" : "blue"}
                  />

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Group justify="space-between" mb={4} wrap="nowrap">
                      <Text fw={500} truncate title={item.file.name}>
                        {item.file.name}
                      </Text>
                      <Badge
                        color={
                          item.file.size > 200 * 1024 * 1024 ? "orange" : "blue"
                        }
                        variant="light"
                        size="sm"
                      >
                        {mp.formatFileSize(item.file.size)}
                      </Badge>
                    </Group>

                    <Group justify="space-between" mb={4} wrap="nowrap">
                      <Text
                        size="xs"
                        c={item.status === "error" ? "red" : "dimmed"}
                        truncate
                      >
                        {item.message ||
                          (item.status === "pending"
                            ? "等待上传"
                            : item.status)}
                      </Text>
                      {item.status === "uploading" && (
                        <Text size="xs">{item.progress}%</Text>
                      )}
                    </Group>

                    {item.status === "uploading" && (
                      <Progress value={item.progress} size="sm" animated />
                    )}
                  </div>

                  <Group gap="xs">
                    {item.status === "uploading" ? (
                      <Tooltip label="取消上传">
                        <ActionIcon
                          variant="light"
                          color="red"
                          onClick={() => cancelUpload(item.id)}
                        >
                          <IconBan size={18} />
                        </ActionIcon>
                      </Tooltip>
                    ) : (
                      <>
                        {(item.status === "pending" ||
                          item.status === "error") && (
                          <Tooltip label="开始上传">
                            <ActionIcon
                              variant="light"
                              color="blue"
                              onClick={() => handleUpload(item.id)}
                            >
                              <IconPlayerPlay size={18} />
                            </ActionIcon>
                          </Tooltip>
                        )}
                        <Tooltip label="移除">
                          <ActionIcon
                            variant="subtle"
                            color="gray"
                            onClick={() => removeFile(item.id)}
                          >
                            <IconTrash size={18} />
                          </ActionIcon>
                        </Tooltip>
                      </>
                    )}
                  </Group>
                </Group>
              </Paper>
            ))}
          </Stack>
        )}
      </Stack>

      <Modal
        opened={showPayModal}
        onClose={() => setShowPayModal(false)}
        title="余额不足"
        centered
      >
        <Stack align="center">
          <Text ta="center">您的 CRU 余额不足以支付大文件的存储费用。</Text>
          <Button
            component={Link}
            href="/pay"
            fullWidth
            onClick={() => setShowPayModal(false)}
          >
            前往充值
          </Button>
        </Stack>
      </Modal>
    </Container>
  );
}

export default function UploadPage() {
  return (
    <Suspense
      fallback={
        <Container p="xl">
          <Text ta="center">加载中...</Text>
        </Container>
      }
    >
      <UploadContent />
    </Suspense>
  );
}
