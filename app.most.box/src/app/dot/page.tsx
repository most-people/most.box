"use client";
import { useState, Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import {
  Box,
  Card,
  Text,
  Badge,
  Stack,
  Group,
  Button,
  Container,
  Title,
  Divider,
  ActionIcon,
  ThemeIcon,
  TextInput,
  Anchor,
  Grid,
  LoadingOverlay,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconCheck,
  IconX,
  IconRefresh,
  IconServer,
  IconActivity,
  IconRocket,
  IconPlus,
} from "@tabler/icons-react";
import Link from "next/link";
import { useUserStore } from "@/stores/userStore";
import { CID } from "multiformats";

// ===== 类型定义 =====
type GatewayInfo = {
  key: string;
  title: string;
  description: string;
  gateways: string[];
};

type DetectionStatus = "success" | "error" | "timeout" | "pending" | "idle";
type DetectionResult = {
  status: DetectionStatus;
  responseTime?: number;
};

// ===== 网关列表配置 =====
const gatewayList: GatewayInfo[] = [
  {
    key: "custom",
    title: "自定义网关",
    description: "用户自定义的 IPFS 网关",
    gateways: ["http://localhost:8080"],
  },
  {
    key: "crust",
    title: "Crust 官方网关",
    description: "由 Crust Network 提供的高速稳定网关",
    gateways: ["https://gw.crust-gateway.com", "https://gw.crust-gateway.xyz"],
  },
  {
    key: "public",
    title: "公共网关",
    description: "由社区或第三方服务商提供的公共网关",
    gateways: [
      "https://ipfs.io",
      "https://dweb.link",
      "https://gateway.pinata.cloud",
      "https://ipfs.filebase.io",
      "https://w3s.link",
      "https://4everland.io",
      "https://ipfs.cyou",
      "https://apac.orbitor.dev",
      "https://eu.orbitor.dev",
      "https://latam.orbitor.dev",
      "https://dget.top",
    ],
  },
];

// ===== 检测函数 =====
const checkGateway = async (
  gateway: string,
  cid: string,
): Promise<DetectionResult> => {
  // 移除末尾斜杠
  const baseUrl = gateway.replace(/\/$/, "");
  const testUrl = `${baseUrl}/ipfs/${cid}`;

  const startTime = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒超时

  try {
    const response = await fetch(testUrl, {
      // method: "GET",
      // headers: { Range: "bytes=0-0" }, // 请求极小部分数据以测试连通性
      method: "HEAD",
      signal: controller.signal,
    });

    const responseTime = Date.now() - startTime;
    clearTimeout(timeoutId);

    if (response.ok || response.status === 206) {
      return { status: "success", responseTime };
    } else {
      return { status: "error", responseTime };
    }
  } catch (error: unknown) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      return { status: "timeout" };
    }
    return { status: "error" };
  }
};

function GatewayManagerContent() {
  const searchParams = useSearchParams();
  const queryCid = searchParams.get("cid");
  const queryFilename = searchParams.get("filename");

  // ===== Zustand Store =====
  const setItem = useUserStore((state) => state.setItem);
  const dotCID = useUserStore((state) => state.dotCID);

  // ===== 状态管理 =====
  const [customCid, setCustomCid] = useState(
    queryCid || "bafkreihp5o7tdipf6ajkgkdxknnffkuxpeecwqydi4q5iqt4gko6r2agk4",
  );
  const [filename, setFilename] = useState(queryFilename || "长征.jpg");

  useEffect(() => {
    if (queryCid) setCustomCid(queryCid);
    if (queryFilename) setFilename(queryFilename);
  }, [queryCid, queryFilename]);
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectionResults, setDetectionResults] = useState<
    Record<string, DetectionResult>
  >({});
  const [customGateway, setCustomGateway] = useState("");
  const [isAddingGateway, setIsAddingGateway] = useState(false);
  const [gateways, setGateways] = useState<GatewayInfo[]>(gatewayList);

  const addCustomGateway = async () => {
    let gateway = "";
    try {
      gateway = new URL(customGateway).origin;
    } catch (error) {
      notifications.show({
        title: "无效的网关 URL",
        message: "请输入正确的网关 URL",
        color: "red",
      });
      return;
    }
    if (!gateway) return;

    const isDuplicate = gateways.some((cat) => cat.gateways.includes(gateway));

    if (isDuplicate) {
      notifications.show({
        title: "重复添加",
        message: "该网关已存在列表中",
        color: "orange",
      });
      return;
    }

    setIsAddingGateway(true);
    const result = await checkGateway(gateway, customCid);
    setIsAddingGateway(false);

    if (result.status !== "success") {
      notifications.show({
        title: "网关不可用",
        message: "无法连接到该网关，请检查 URL",
        color: "red",
      });
      return;
    }

    setGateways((prev) => {
      const newCategories = [...prev];
      if (newCategories[0].key === "custom") {
        newCategories[0] = {
          ...newCategories[0],
          gateways: [gateway, ...newCategories[0].gateways],
        };
      }
      return newCategories;
    });

    setCustomGateway("");
    notifications.show({
      title: "添加成功",
      message: "自定义网关已添加",
      color: "green",
    });
  };

  const handleDetectAll = async () => {
    if (!customCid) {
      notifications.show({
        title: "CID 不能为空",
        message: "请输入用于测试的 CID",
        color: "orange",
      });
      return;
    }

    try {
      CID.parse(customCid);
    } catch (e) {
      notifications.show({
        title: "无效的 CID",
        message: "检测到非法的 IPFS CID 格式，请检查输入",
        color: "red",
        icon: <IconX size={16} />,
      });
      return;
    }

    setIsDetecting(true);
    const newResults: Record<string, DetectionResult> = {};

    // 收集所有网关
    const allGateways: string[] = [];
    gateways.forEach((cat) => allGateways.push(...cat.gateways));
    if (customGateway) allGateways.push(customGateway);

    // 初始化状态
    allGateways.forEach((gw) => {
      newResults[gw] = { status: "pending" };
    });
    setDetectionResults(newResults);

    // 并发检测
    const promises = allGateways.map(async (gateway) => {
      const result = await checkGateway(gateway, customCid);
      setDetectionResults((prev) => ({
        ...prev,
        [gateway]: result,
      }));
    });

    await Promise.all(promises);
    setIsDetecting(false);

    // 统计结果
    const successCount = Object.values(detectionResults).filter(
      (r) => r.status === "success",
    ).length;
    // 注意：这里拿到的 detectionResults 可能是旧的闭包值，所以最好不依赖它做即时统计，或者用 setState 回调
    // 简单起见，检测完成后弹窗提示
    notifications.show({
      title: "检测完成",
      message: "所有网关连通性测试已完成",
      color: "green",
    });
  };

  const handleTestSingle = async (gateway: string) => {
    if (!customCid) {
      notifications.show({
        title: "CID 不能为空",
        message: "请输入用于测试的 CID",
        color: "orange",
      });
      return;
    }

    setDetectionResults((prev) => ({
      ...prev,
      [gateway]: { status: "pending" },
    }));

    const result = await checkGateway(gateway, customCid);

    setDetectionResults((prev) => ({
      ...prev,
      [gateway]: result,
    }));
  };

  const selectGateway = (gateway: string) => {
    setItem("dotCID", gateway);
    notifications.show({
      title: "已选择网关",
      message: `当前网关已设置为: ${new URL(gateway).hostname}`,
      color: "blue",
      icon: <IconCheck size={16} />,
    });
  };

  const getStatusColor = (status?: DetectionStatus) => {
    switch (status) {
      case "success":
        return "green";
      case "error":
        return "red";
      case "timeout":
        return "orange";
      case "pending":
        return "blue";
      default:
        return "gray";
    }
  };

  const getStatusLabel = (result?: DetectionResult) => {
    if (!result) return "未检测";
    switch (result.status) {
      case "success":
        return `${result.responseTime}ms`;
      case "error":
        return "错误";
      case "timeout":
        return "超时";
      case "pending":
        return "检测中...";
      default:
        return "未检测";
    }
  };

  // 页面加载时自动检测一次? 或者留给用户手动点击
  // 为了不浪费资源，留给用户点击

  return (
    <Container size="lg" w="100%" pb="xl">
      <AppHeader title="IPFS 网关选择" />

      {/* 顶部控制区 */}
      <Card shadow="sm" p="lg" radius="md" withBorder my="lg">
        <Stack>
          <Group justify="space-between" align="center">
            <Box>
              <Title order={3}>网关测试与选择</Title>
              <Text c="dimmed" size="sm">
                测试各个公共 IPFS 网关的连通性和速度，选择最适合您的网关。
              </Text>
            </Box>
            <Button
              size="md"
              leftSection={
                isDetecting ? (
                  <LoadingOverlay
                    visible
                    overlayProps={{ radius: "sm", blur: 2 }}
                    loaderProps={{ type: "dots" }}
                  />
                ) : (
                  <IconRocket size={20} />
                )
              }
              onClick={handleDetectAll}
              loading={isDetecting}
              gradient={{ from: "blue", to: "cyan" }}
              variant="gradient"
            >
              开始测试
            </Button>
          </Group>

          <Divider />

          <Group wrap="wrap">
            <TextInput
              label="测试 CID"
              description="用于测试网关响应速度的资源 CID"
              value={customCid}
              w="100%"
              maw={580}
              onChange={(e) => setCustomCid(e.currentTarget.value)}
              rightSection={
                <ActionIcon
                  variant="subtle"
                  c="blue"
                  onClick={() => {
                    setCustomCid(
                      "bafkreihp5o7tdipf6ajkgkdxknnffkuxpeecwqydi4q5iqt4gko6r2agk4",
                    );
                    setFilename("长征.jpg");
                  }}
                >
                  <IconRefresh size={16} />
                </ActionIcon>
              }
            />
            <TextInput
              label="文件名"
              description="URL 后的文件名"
              value={filename}
              onChange={(e) => setFilename(e.currentTarget.value)}
              placeholder="长征.jpg"
            />
            <TextInput
              label="自定义网关"
              description="添加自定义网关地址"
              value={customGateway}
              onChange={(e) => setCustomGateway(e.currentTarget.value)}
              placeholder="https://..."
              maw={230}
              rightSection={
                <ActionIcon
                  variant="subtle"
                  c="blue"
                  onClick={addCustomGateway}
                  loading={isAddingGateway}
                >
                  <IconPlus size={16} />
                </ActionIcon>
              }
            />
          </Group>

          <Group>
            <Text size="sm" fw={500}>
              当前 IPFS 网关:
            </Text>
            <Badge size="lg" variant="dot" color="blue">
              {dotCID ? new URL(dotCID).hostname : "未选择"}
            </Badge>
          </Group>
        </Stack>
      </Card>

      {/* 网关列表 */}
      <Stack gap="xl">
        {gateways.map((category, idx) => (
          <Box key={idx}>
            <Title order={4} mb="xs" c="blue.7">
              {category.title}
            </Title>
            <Text c="dimmed" size="sm" mb="md">
              {category.description}
            </Text>

            <Grid gutter="md">
              {category.gateways.map((gateway) => {
                const result = detectionResults[gateway];
                const isSelected = dotCID === gateway;

                return (
                  <Grid.Col key={gateway} span={{ base: 12, md: 6, lg: 4 }}>
                    <Card
                      shadow="sm"
                      padding="lg"
                      radius="md"
                      withBorder
                      style={{
                        transition: "transform 0.2s ease, box-shadow 0.2s ease",
                        border: isSelected ? "2px solid #228be6" : undefined,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "translateY(-2px)";
                        e.currentTarget.style.boxShadow =
                          "0 4px 20px rgba(0,0,0,0.1)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow = "";
                      }}
                    >
                      <Group justify="space-between" mb="md">
                        <Group gap="xs">
                          <ThemeIcon
                            size={36}
                            radius="md"
                            variant="light"
                            color="blue"
                          >
                            <IconServer size={20} />
                          </ThemeIcon>
                          <Text fw={600} size="md">
                            {new URL(gateway).hostname}
                          </Text>
                        </Group>
                        <ActionIcon
                          variant="light"
                          color="blue"
                          size="sm"
                          onClick={() => handleTestSingle(gateway)}
                          loading={result?.status === "pending"}
                          title="测试连接"
                        >
                          <IconActivity size={16} />
                        </ActionIcon>
                      </Group>

                      <Anchor
                        component={Link}
                        href={
                          gateway +
                          "/ipfs/" +
                          customCid +
                          (filename
                            ? `?filename=${encodeURIComponent(filename)}`
                            : "")
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        c="dimmed"
                        mb="md"
                        lineClamp={1}
                      >
                        {gateway}
                      </Anchor>

                      <Group justify="space-between" align="center">
                        <Badge
                          color={getStatusColor(result?.status)}
                          variant="light"
                          size="lg"
                        >
                          {getStatusLabel(result)}
                        </Badge>

                        <Button
                          size="sm"
                          variant={isSelected ? "filled" : "light"}
                          color={isSelected ? "green" : "blue"}
                          onClick={() => selectGateway(gateway)}
                          disabled={isSelected}
                        >
                          {isSelected ? "当前 IPFS 网关" : "选择"}
                        </Button>
                      </Group>
                    </Card>
                  </Grid.Col>
                );
              })}
            </Grid>
          </Box>
        ))}
      </Stack>

      <Divider my="xl" label="相关工具" labelPosition="center" />

      <Group justify="center">
        <Anchor
          component={Link}
          target="_blank"
          rel="noopener noreferrer"
          href="http://localhost:5001/webui"
          c="dimmed"
          size="sm"
        >
          查看本地 IPFS 节点状态
        </Anchor>
      </Group>
    </Container>
  );
}

export default function GatewayManager() {
  return (
    <Suspense fallback={<LoadingOverlay visible />}>
      <GatewayManagerContent />
    </Suspense>
  );
}
