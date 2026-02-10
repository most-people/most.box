"use client";
import "./ipfs.scss";
import { AppHeader } from "@/components/AppHeader";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { Suspense, useMemo, useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  Text,
  Stack,
  Group,
  Title,
  CopyButton,
  ActionIcon,
  Alert,
  TextInput,
  Tooltip,
  Button,
  Center,
  Box,
  Badge,
} from "@mantine/core";
import Link from "next/link";
import { IconCopy, IconInfoCircle, IconSettings } from "@tabler/icons-react";
import { useUserStore } from "@/stores/userStore";

type CidType = "website" | "file";

const PageContent = () => {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const cidType = (params.get("type") || "file") as CidType;
  const cid = pathname.split("/")[2] || "";
  const initFilename = params.get("filename") || "";
  const [filename, setFilename] = useState<string>(initFilename);
  const dotCID = useUserStore((state) => state.dotCID);

  const [isGatewayAvailable, setIsGatewayAvailable] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    if (!dotCID || !cid) {
      setIsChecking(false);
      return;
    }

    const checkGateway = async () => {
      setIsChecking(true);
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        // 使用当前 CID 检查网关连通性
        const res = await fetch(`${dotCID}/ipfs/${cid}`, {
          method: "HEAD",
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (res.ok) {
          setIsGatewayAvailable(true);
        } else {
          throw new Error(`网关返回 ${res.status}`);
        }
      } catch (error) {
        console.warn("网关检查失败...", error);
        setIsGatewayAvailable(false);
      } finally {
        setIsChecking(false);
      }
    };

    checkGateway();
  }, [dotCID, cid]);

  const goToSwitchGateway = () => {
    const params = new URLSearchParams();
    if (filename) params.set("filename", filename);
    if (cid) params.set("cid", cid);
    router.push(`/dot?${params.toString()}`);
  };

  const previewUrl = useMemo(() => {
    if (cid) {
      const url = new URL(dotCID);
      url.pathname = `/ipfs/${cid}`;
      if (filename) {
        url.searchParams.set("filename", filename);
      }
      return url.href;
    }
    return "";
  }, [dotCID, cid, filename]);

  const downloadUrl = useMemo(() => {
    if (cid) {
      const url = new URL(dotCID);
      url.pathname = `/ipfs/${cid}`;
      url.searchParams.set("download", "true");
      if (filename) {
        if (cidType === "website") {
          url.searchParams.set("format", "tar");
          url.searchParams.set("filename", `${filename}.tar`);
        } else {
          url.searchParams.set("filename", filename);
        }
      }
      return url.href;
    }
    return "";
  }, [dotCID, cid, filename, cidType]);

  const host = `https://most.box/${pathname.split("/")[1]}/`;

  return (
    <Box id="page-ipfs">
      <AppHeader title={filename || cid || "CID"} />
      <Stack gap="lg">
        {!cid && (
          <Alert icon={<IconInfoCircle size={18} />} color="orange" radius="md">
            未提供 CID，请通过带有 cid 的链接访问本页。
          </Alert>
        )}

        <Group justify="space-between" align="center">
          <Group gap={8}>
            {cidType === "website" ? "🌐" : "📄"}
            <Title order={4}>
              {cidType === "website" ? "网站" : "文件"}信息
            </Title>
          </Group>
          {initFilename && (
            <Text size="sm" c="dimmed">
              {initFilename}
            </Text>
          )}
        </Group>

        <TextInput
          radius="md"
          placeholder={cidType === "website" ? "网站" : "文件名"}
          value={filename}
          onChange={(e) => setFilename(e.currentTarget.value)}
        />

        <Center>
          <Title>IPFS</Title>
        </Center>

        <Group justify="center" gap="xs">
          <Badge size="lg" variant="dot" color="green">
            网关: {dotCID ? new URL(dotCID).hostname : "未选择"}
          </Badge>
          <Tooltip label="切换网关" position="top">
            <ActionIcon
              variant="subtle"
              color="gray"
              size="lg"
              onClick={goToSwitchGateway}
            >
              <IconSettings size={18} />
            </ActionIcon>
          </Tooltip>
        </Group>

        {!dotCID && (
          <Alert color="gray" radius="md" mb="sm">
            未连接到 Dot 节点，下载链接将不可用。
          </Alert>
        )}

        {dotCID && !isChecking && !isGatewayAvailable && (
          <Alert
            color="red"
            radius="md"
            mb="sm"
            icon={<IconInfoCircle size={18} />}
          >
            <Group justify="space-between" align="center">
              <Text size="sm">当前网关无法访问</Text>
              <Button
                size="xs"
                color="red"
                variant="white"
                onClick={goToSwitchGateway}
              >
                切换网关
              </Button>
            </Group>
          </Alert>
        )}

        <TextInput
          radius="md"
          value={previewUrl || ""}
          readOnly
          variant="filled"
          disabled={!previewUrl}
          placeholder="无可用链接"
          rightSection={
            <CopyButton value={previewUrl || ""}>
              {({ copied, copy }) => (
                <Tooltip label={copied ? "已复制" : "复制链接"} position="top">
                  <ActionIcon
                    variant="subtle"
                    color={copied ? "teal" : "gray"}
                    onClick={copy}
                    disabled={!previewUrl}
                  >
                    <IconCopy size={16} />
                  </ActionIcon>
                </Tooltip>
              )}
            </CopyButton>
          }
        />

        <Group wrap="nowrap">
          <Button
            color="green"
            variant="light"
            w="100%"
            component={Link}
            target="_blank"
            href={previewUrl}
            disabled={!isGatewayAvailable || isChecking}
            loading={isChecking}
          >
            预览
          </Button>
          {filename ? (
            <Button
              variant="light"
              color="blue"
              w="100%"
              component={Link}
              target="_blank"
              href={downloadUrl}
              disabled={!isGatewayAvailable || isChecking}
              loading={isChecking}
            >
              下载
            </Button>
          ) : (
            <Button
              variant="light"
              color="blue"
              w="100%"
              disabled
              loading={isChecking}
            >
              下载
            </Button>
          )}
        </Group>

        <Center>
          <div className="ipfs-qrcode">
            <div className="qrcode-frame">
              <QRCodeSVG
                className="qrcode"
                value={`${host}${cid}`}
                size={158}
                bgColor="#FFF"
                fgColor="#000"
              />
            </div>
            <div className="line"></div>

            <div className="info">
              <Text className="name" lineClamp={3}>
                {filename}
              </Text>
              <Text className="host">{host}</Text>
              <Text className="ipns">{cid}</Text>
            </div>
          </div>
        </Center>
      </Stack>
    </Box>
  );
};
export default function PageIPFS() {
  return (
    <Suspense>
      <PageContent />
    </Suspense>
  );
}
