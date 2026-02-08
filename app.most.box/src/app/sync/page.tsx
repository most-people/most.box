"use client";

import { useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import {
  Container,
  Text,
  Button,
  Stepper,
  Group,
  Stack,
  Alert,
  ThemeIcon,
  SimpleGrid,
  Card,
  Badge,
} from "@mantine/core";
import {
  IconCloudUpload,
  IconCloudDownload,
  IconCheck,
  IconAlertCircle,
  IconDatabase,
  IconWorldUpload,
  IconLink,
  IconSearch,
  IconDownload,
  IconWallet,
} from "@tabler/icons-react";
import { useUserStore } from "@/stores/userStore";
import crust from "@/utils/crust";
import { mostCrust } from "@/utils/MostWallet";
import { notifications } from "@mantine/notifications";
import { useRouter } from "next/navigation";
import Link from "next/link";

const PageContent = () => {
  const router = useRouter();
  const wallet = useUserStore((state) => state.wallet);
  const balance = useUserStore((state) => state.balance);
  const exportData = useUserStore((state) => state.exportData);
  const importData = useUserStore((state) => state.importData);
  const dotCID = useUserStore((state) => state.dotCID);

  const [activeOperation, setActiveOperation] = useState<
    "sync" | "pull" | null
  >(null);
  const [activeStep, setActiveStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const resetState = () => {
    setActiveStep(0);
    setError(null);
    setSuccess(false);
    setLoading(false);
  };

  const handleSyncToChain = async () => {
    if (!wallet) {
      notifications.show({ message: "请先登录", color: "red" });
      router.push("/login");
      return;
    }

    setActiveOperation("sync");
    resetState();
    setLoading(true);

    try {
      // Step 0: 检查余额 (Starting at step 0 visually, but logically first check)
      // Actually we can do a pre-check
      setActiveStep(0);

      // Step 1: 准备数据
      setActiveStep(1);
      const data = exportData();
      const backupContent = JSON.stringify(data);
      const file = new File([backupContent], "most-box-backup.json", {
        type: "application/json",
      });

      // Step 2: 上传到 IPFS
      setActiveStep(2);
      const crustWallet = mostCrust(wallet.danger);
      const { cid } = await crust.upload(file, crustWallet);

      // Step 3: 写入链上
      setActiveStep(3);
      await crust.saveRemark(cid, wallet.danger, balance);

      setActiveStep(4);
      setSuccess(true);
      notifications.show({
        message: "同步到链上成功",
        color: "green",
      });
    } catch (err: any) {
      console.error("同步到链上失败", err);
      let errorMessage = "同步失败，请重试";
      if (err.cause === "INSUFFICIENT_BALANCE") {
        errorMessage = "余额不足，请充值 CRU";
      } else if (err.message) {
        errorMessage = err.message;
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handlePullFromChain = async () => {
    if (!wallet) {
      notifications.show({ message: "请先登录", color: "red" });
      router.push("/login");
      return;
    }

    setActiveOperation("pull");
    resetState();
    setLoading(true);

    try {
      // Step 0: 准备
      setActiveStep(0);

      // Step 1: 查询链上记录
      setActiveStep(1);
      const { crust_address } = mostCrust(wallet.danger);
      const cid = await crust.getRemark(crust_address);

      if (!cid) {
        throw new Error("未在链上找到备份记录");
      }

      // Step 2: 拉取数据
      setActiveStep(2);
      const res = await fetch(`${dotCID}/ipfs/${cid}`);
      if (!res.ok) {
        throw new Error(`从网关获取备份失败: ${res.status} ${res.statusText}`);
      }
      const data = await res.json();

      // Step 3: 恢复数据
      setActiveStep(3);
      if (data && (data.notes || data.files)) {
        importData(data);
      } else {
        throw new Error("无效的备份数据格式");
      }

      setActiveStep(4);
      setSuccess(true);
      notifications.show({
        message: "从链上恢复成功",
        color: "green",
      });
    } catch (err: any) {
      console.error("从链上恢复失败", err);
      setError(err.message || "恢复失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container py="lg" size="sm">
      <AppHeader title="数据同步" />

      <Group justify="flex-end" mt="md">
        <Badge
          size="lg"
          variant="light"
          color="gray"
          leftSection={<IconWallet size={14} />}
        >
          余额: {parseFloat(balance || "0")} CRU
        </Badge>
      </Group>

      <SimpleGrid cols={{ base: 1, sm: 2 }} mt="md" spacing="lg">
        {/* 同步到链上 Card */}
        <Card
          shadow="sm"
          padding="lg"
          radius="md"
          withBorder
          style={{
            borderColor:
              activeOperation === "sync"
                ? "var(--mantine-color-blue-6)"
                : undefined,
          }}
        >
          <Group justify="space-between" mb="xs">
            <Text fw={500}>同步到链上</Text>
            <ThemeIcon color="blue" variant="light">
              <IconCloudUpload size={20} />
            </ThemeIcon>
          </Group>

          <Text size="sm" c="dimmed" mb="lg">
            将当前的笔记和文件索引备份到去中心化网络 (Crust
            Network)，防止数据丢失。
          </Text>

          {activeOperation === "sync" && (
            <Stack mb="lg">
              <Stepper
                active={activeStep}
                orientation="vertical"
                size="sm"
                color="blue"
                iconSize={32}
              >
                <Stepper.Step
                  label="准备数据"
                  description="打包本地数据"
                  icon={<IconDatabase size={18} />}
                  loading={loading && activeStep === 1}
                />
                <Stepper.Step
                  label="上传 IPFS"
                  description="上传到去中心化存储"
                  icon={<IconWorldUpload size={18} />}
                  loading={loading && activeStep === 2}
                />
                <Stepper.Step
                  label="链上确权"
                  description="写入区块链记录"
                  icon={<IconLink size={18} />}
                  loading={loading && activeStep === 3}
                />
                <Stepper.Step
                  label="完成"
                  description="同步成功"
                  icon={<IconCheck size={18} />}
                />
              </Stepper>

              {error && (
                <Alert
                  icon={<IconAlertCircle size={16} />}
                  title="错误"
                  color="red"
                  variant="light"
                >
                  <Group justify="space-between" align="center">
                    <Text size="sm">{error}</Text>
                  </Group>
                </Alert>
              )}
            </Stack>
          )}

          <Button
            fullWidth
            variant="light"
            color="blue"
            onClick={handleSyncToChain}
            loading={loading && activeOperation === "sync"}
            disabled={loading && activeOperation !== "sync"}
          >
            {activeOperation === "sync" && loading ? "同步中..." : "开始同步"}
          </Button>
        </Card>

        {/* 从链上拉取 Card */}
        <Card
          shadow="sm"
          padding="lg"
          radius="md"
          withBorder
          style={{
            borderColor:
              activeOperation === "pull"
                ? "var(--mantine-color-teal-6)"
                : undefined,
          }}
        >
          <Group justify="space-between" mb="xs">
            <Text fw={500}>从链上拉取</Text>
            <ThemeIcon color="teal" variant="light">
              <IconCloudDownload size={20} />
            </ThemeIcon>
          </Group>

          <Text size="sm" c="dimmed" mb="lg">
            从区块链获取最新的备份记录，并恢复到本地。这将覆盖本地的旧数据。
          </Text>

          {activeOperation === "pull" && (
            <Stack mb="lg">
              <Stepper
                active={activeStep}
                orientation="vertical"
                size="sm"
                iconSize={32}
                color="teal"
              >
                <Stepper.Step
                  label="查询记录"
                  description="查找链上最新备份"
                  icon={<IconSearch size={18} />}
                  loading={loading && activeStep === 1}
                />
                <Stepper.Step
                  label="下载数据"
                  description="从 IPFS 网关拉取"
                  icon={<IconDownload size={18} />}
                  loading={loading && activeStep === 2}
                />
                <Stepper.Step
                  label="恢复数据"
                  description="导入到本地"
                  icon={<IconDatabase size={18} />}
                  loading={loading && activeStep === 3}
                />
                <Stepper.Step
                  label="完成"
                  description="恢复成功"
                  icon={<IconCheck size={18} />}
                />
              </Stepper>

              {error && (
                <Alert
                  icon={<IconAlertCircle size={16} />}
                  title="错误"
                  color="red"
                  variant="light"
                >
                  {error}
                </Alert>
              )}
            </Stack>
          )}

          <Button
            fullWidth
            variant="light"
            color="teal"
            onClick={handlePullFromChain}
            loading={loading && activeOperation === "pull"}
            disabled={loading && activeOperation !== "pull"}
          >
            {activeOperation === "pull" && loading ? "拉取中..." : "开始拉取"}
          </Button>
        </Card>
      </SimpleGrid>

      {parseFloat(balance || "0") === 0 ? (
        <Alert
          icon={<IconWallet size={16} />}
          title="新用户福利"
          color="green"
          mt="xl"
          variant="light"
        >
          <Group justify="space-between" align="center">
            <Text size="sm">
              检测到您的 CRU 余额为 0，作为新用户您可以免费领取 CRU 用于同步。
            </Text>
            <Button
              component={Link}
              href="/pay"
              size="xs"
              variant="white"
              color="green"
            >
              免费领取
            </Button>
          </Group>
        </Alert>
      ) : (
        <Alert
          icon={<IconWallet size={16} />}
          title="余额提示"
          color="blue"
          mt="xl"
          variant="light"
        >
          <Group justify="space-between" align="center">
            <Text size="sm" c="dimmed">
              同步操作需要消耗少量的 CRU (Gas费 + 存储费)
            </Text>
            <Button
              component={Link}
              href="/pay"
              size="sm"
              variant="subtle"
              color="blue"
            >
              去充值
            </Button>
          </Group>
        </Alert>
      )}
    </Container>
  );
};

export default function PageSync() {
  return <PageContent />;
}
