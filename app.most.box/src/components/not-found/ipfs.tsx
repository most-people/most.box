"use client";
import "./ipfs.scss";
import { AppHeader } from "@/components/AppHeader";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import {
  Suspense,
  useMemo,
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { QRCodeSVG } from "qrcode.react";
import { toPng } from "html-to-image";
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
import {
  IconCopy,
  IconFileText,
  IconInfoCircle,
  IconSettings,
  IconWorld,
} from "@tabler/icons-react";
import { useUserStore } from "@/stores/userStore";
import { checkGateway } from "@/utils/ipfs";

type CidType = "website" | "file";

const isMedia = (filename: string) => {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  const exts = ["mp4", "webm", "ogg", "mp3", "wav", "mkv", "avi", "mov"];
  return exts.includes(ext);
};

const PageContent = () => {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const cidType = (params.get("type") || "file") as CidType;
  const cid = pathname.split("/")[2] || params.get("cid") || "";
  const initFilename = params.get("filename") || "";
  const [filename, setFilename] = useState<string>(initFilename);
  const dotCID = useUserStore((state) => state.dotCID);

  const goToSwitchGateway = () => {
    const params = new URLSearchParams();
    if (cid) params.set("cid", cid);
    if (filename) params.set("filename", filename);
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

  const host = `most.box/${pathname.split("/")[1]}/`;

  const [gatewayStatus, setGatewayStatus] = useState<
    "ok" | "error" | "checking"
  >("checking");

  const qrRef = useRef<HTMLDivElement>(null);

  const handleDownload = useCallback(() => {
    if (qrRef.current === null) {
      return;
    }

    toPng(qrRef.current, { cacheBust: true })
      .then((dataUrl) => {
        const link = document.createElement("a");
        link.download = `share-${cid}.png`;
        link.href = dataUrl;
        link.click();
      })
      .catch((err) => {
        console.error(err);
      });
  }, [qrRef, cid]);

  useEffect(() => {
    if (!dotCID) {
      setGatewayStatus("ok");
      return;
    }

    const check = async () => {
      setGatewayStatus("checking");
      // 使用 CID 检测网关连通性
      const result = await checkGateway(dotCID, cid);
      if (result.status === "success") {
        setGatewayStatus("ok");
      } else {
        setGatewayStatus("error");
      }
    };

    check();
  }, [dotCID, cid]);

  return (
    <Box id="page-ipfs">
      <AppHeader title={filename || cid || "CID"} />
      <Stack gap="lg">
        {!cid && (
          <Alert icon={<IconInfoCircle size={18} />} color="orange" radius="md">
            未提供 CID，请通过带有 cid 的链接访问本页。
          </Alert>
        )}

        <Group justify="space-between" align="center" mt="lg">
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
          <Badge
            size="lg"
            variant="dot"
            color={
              gatewayStatus === "error"
                ? "red"
                : gatewayStatus === "checking"
                  ? "yellow"
                  : "green"
            }
          >
            网关: {dotCID ? new URL(dotCID).hostname : "未选择"}
          </Badge>

          {gatewayStatus === "error" && (
            <Text c="red" size="sm" ta="center">
              当前网关无法访问，请切换网关
            </Text>
          )}

          <Tooltip label="切换网关" position="top">
            <ActionIcon
              variant="subtle"
              color={gatewayStatus === "error" ? "red" : "gray"}
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

        <Group wrap="nowrap" mb={30}>
          {isMedia(filename) ? (
            <Button
              color="grape"
              variant="light"
              w="100%"
              component={Link}
              href={`/player?cid=${cid}&filename=${filename}`}
            >
              在线播放
            </Button>
          ) : (
            <Button
              color="green"
              variant="light"
              w="100%"
              component={Link}
              target="_blank"
              href={previewUrl}
            >
              在线预览
            </Button>
          )}
          {filename ? (
            <Button
              variant="light"
              color="blue"
              w="100%"
              component={Link}
              target="_blank"
              href={downloadUrl}
            >
              下载
            </Button>
          ) : (
            <Button variant="light" color="blue" w="100%" disabled>
              下载
            </Button>
          )}
        </Group>

        <Stack align="center">
          <Stack align="center" ref={qrRef}>
            <div className="ipfs-qrcode">
              <div className="cid-type">
                {cidType === "website" ? (
                  <IconWorld size={24} />
                ) : (
                  <IconFileText size={24} />
                )}
              </div>

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
                <Text>{host}</Text>
                <Text>{cid}</Text>
              </div>
            </div>
          </Stack>

          <Group>
            <Button
              onClick={handleDownload}
              variant="subtle"
              size="sm"
              color="gray"
            >
              下载分享图片
            </Button>
          </Group>
        </Stack>
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
