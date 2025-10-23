"use client";
import { useState, useEffect, useMemo } from "react";
import { AppHeader } from "@/components/AppHeader";
import {
  Box,
  Card,
  Text,
  Badge,
  Stack,
  Group,
  Button,
  Alert,
  Select,
  Container,
  Title,
  Paper,
  Divider,
  ActionIcon,
  Tooltip,
  ThemeIcon,
  Flex,
  TextInput,
  Anchor,
  Radio,
} from "@mantine/core";
import { Contract, JsonRpcProvider } from "ethers";
import { notifications } from "@mantine/notifications";
import {
  IconCheck,
  IconX,
  IconRefresh,
  IconNetwork,
  IconServer,
  IconClock,
  IconDatabase,
  IconWifi,
  IconWifiOff,
  IconWorldWww,
  IconSwitchHorizontal,
  IconSearch,
  IconSettings,
  IconBrandGithub,
} from "@tabler/icons-react";
import {
  CONTRACT_ABI_DOT,
  CONTRACT_ADDRESS_DOT,
  NETWORK_CONFIG,
  NETWORK_TYPE,
} from "@/constants/dot";
import mp from "@/constants/mp";
import { CID } from "multiformats";
import Link from "next/link";
import { DotNode, useDotStore } from "@/stores/dotStore";
import { useBack } from "@/hooks/useBack";

// ===== 常量定义 =====
const TIMEOUT = 2000;

// ===== 类型定义 =====
type DetectionStatus = "success" | "error" | "timeout" | "pending";
type DetectionResult = {
  status: DetectionStatus;
  responseTime?: number;
};

export default function PageDot() {
  // ===== Zustand Store =====
  const setItem = useDotStore((state) => state.setItem);
  const dotAPI = useDotStore((state) => state.dotAPI);
  const dotNodes = useDotStore((state) => state.dotNodes);
  const updateDot = useDotStore((state) => state.updateDot);
  const network = useDotStore((state) => state.network);
  const setNetwork = useDotStore((state) => state.setNetwork);

  // ===== 当前节点状态 =====
  const [apiLoading, setApiLoading] = useState(false);
  const [ApiList, setApiList] = useState<string[]>([]);
  const [apiURL, setApiURL] = useState("http://localhost:1976");

  // ===== 节点列表状态 =====
  const [loading, setLoading] = useState(true);
  const [checkingConnectivity, setCheckingConnectivity] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [switchingNode, setSwitchingNode] = useState<string | null>(null);
  // 每个节点的选中 API（默认第一个）
  const [selectedApiByNode, setSelectedApiByNode] = useState<
    Record<string, string>
  >({});

  // ===== 网络和RPC状态 =====
  const RPC = NETWORK_CONFIG[network].rpc;
  const [customRPC, setCustomRPC] = useState(RPC);
  const Explorer = NETWORK_CONFIG[network].explorer;

  // ===== CID检测状态 =====
  const [customCid, setCustomCid] = useState(
    "bafkreihp5o7tdipf6ajkgkdxknnffkuxpeecwqydi4q5iqt4gko6r2agk4?filename=长征.jpg"
  );
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectionResults, setDetectionResults] = useState<
    Record<string, DetectionResult>
  >({});

  const onlineNodes = dotNodes.filter((node) => node.isOnline);
  const offlineNodes = dotNodes.filter((node) => node.isOnline === false);

  const title = useMemo(() => {
    try {
      return new URL(dotAPI).host.toUpperCase();
    } catch {
      return "DOT.MOST.BOX";
    }
  }, [dotAPI]);

  // ===== 工具函数 =====
  const formatTime = (timestamp: number) => {
    if (!timestamp) return "未知";
    return new Date(timestamp * 1000).toLocaleString("zh-CN");
  };

  const formatResponseTime = (time?: number) => {
    return time === undefined ? "" : `${time}ms`;
  };

  const getCIDs = (node: DotNode) => {
    const CIDs = node.CIDs.map((url) => `${url}/ipfs`);
    const defaultCID = node.APIs.find((api) => api.endsWith(":1976"))?.replace(
      ":1976",
      ":8080/ipfs"
    );
    if (defaultCID) {
      CIDs.push(defaultCID);
    }
    return [...new Set(CIDs)];
  };

  const isCurrentNode = (node: DotNode) => {
    return node.APIs.some((api) => {
      try {
        return new URL(api).origin === new URL(dotAPI).origin;
      } catch {
        return false;
      }
    });
  };
  const isRadioDisabled = (node: DotNode, api: string) => {
    if (isCurrentNode(node)) {
      return true;
    }
    if (window.location.protocol === "https:" && api.startsWith("http:")) {
      return true;
    }
    return false;
  };

  const isDisabledNode = (node: DotNode) => {
    if (!node.APIs.length) return true;
    if (location.protocol === "https:" && node.APIs[0].startsWith("http:"))
      return true;
    return isCurrentNode(node);
  };

  const showNotification = (title: string, message: string, color: string) => {
    notifications.show({ title, message, color });
  };

  // ===== CID检测相关函数 =====
  const checkCidOnGateway = async (
    fullUrl: string
  ): Promise<DetectionResult> => {
    const startTime = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);

    try {
      const response = await fetch(fullUrl, {
        headers: { Range: "bytes=0-1023" },
        signal: controller.signal,
      });
      const responseTime = Date.now() - startTime;
      clearTimeout(timeoutId);

      if (response.ok || response.status === 206) {
        return { status: "success", responseTime };
      } else {
        return { status: "error", responseTime };
      }
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === "AbortError") {
        return { status: "timeout" };
      }
      return { status: "error" };
    }
  };

  const validateCID = (cid: string): boolean => {
    cid = cid.trim().split("?")[0];
    if (!cid) {
      showNotification("CID不能为空", "请输入一个CID进行检测", "orange");
      return false;
    }

    try {
      CID.parse(cid);
      return true;
    } catch {
      showNotification("无效的 CID", "输入的值不是有效的 CID", "red");
      return false;
    }
  };

  const buildDetectionUrls = (): string[] => {
    const allUrls: string[] = [];
    dotNodes.forEach((node) => {
      const gateways = getCIDs(node).filter((url): url is string => !!url);

      gateways.forEach((gatewayBase) => {
        allUrls.push(`${gatewayBase}/${customCid}`);
      });
    });
    return [...new Set(allUrls)];
  };

  const handleDetectCid = async () => {
    if (!validateCID(customCid)) return;

    setIsDetecting(true);
    const uniqueUrls = buildDetectionUrls();

    // 初始化检测结果
    const initialResults: typeof detectionResults = {};
    uniqueUrls.forEach((url) => {
      initialResults[url] = { status: "pending" };
    });
    setDetectionResults(initialResults);

    // 并行检测所有URL
    const detectionPromises = uniqueUrls.map(async (fullUrl) => {
      const result = await checkCidOnGateway(fullUrl);
      setDetectionResults((prev) => ({ ...prev, [fullUrl]: result }));
    });

    await Promise.all(detectionPromises);
    setIsDetecting(false);
  };

  // ===== 节点管理相关函数 =====
  const validateNetwork = (chainId: number): boolean => {
    if (chainId === NETWORK_CONFIG.mainnet.chainId) {
      setNetwork("mainnet");
      return true;
    } else if (chainId === NETWORK_CONFIG.testnet.chainId) {
      setNetwork("testnet");
      return true;
    } else {
      showNotification(
        "网络错误",
        `网络 ID 为 ${chainId}，不支持 Base 协议`,
        "red"
      );
      setCustomRPC("");
      return false;
    }
  };

  const fetchNodes = async (rpc?: string) => {
    try {
      setLoading(true);
      setError(null);

      const rpcUrl = rpc || customRPC || RPC;
      const provider = new JsonRpcProvider(rpcUrl);
      const networkInfo = await provider.getNetwork();
      const chainId = Number(networkInfo.chainId);

      if (!validateNetwork(chainId)) return;

      const contract = new Contract(
        CONTRACT_ADDRESS_DOT,
        CONTRACT_ABI_DOT,
        provider
      );
      const [addresses, names, APIss, CIDss, updates] =
        await contract.getAllDots();
      const nodes = addresses.map((address: string, index: number) => {
        return {
          address,
          name: names[index] || `节点 ${index + 1}`,
          APIs: APIss[index] || [],
          CIDs: CIDss[index] || [],
          lastUpdate: Number(updates[index]),
        };
      });
      localStorage.setItem("dotNodes", JSON.stringify(nodes));
      if (nodes) {
        setItem("dotNodes", nodes);
      }
    } catch (err) {
      console.info("获取节点列表失败:", err);
      setError("获取节点列表失败，请更换 RPC");
      showNotification("获取失败", "无法获取节点列表", "red");
    } finally {
      setLoading(false);
    }
  };

  const checkNodeConnectivity = (
    node: DotNode
  ): Promise<{ isOnline: boolean; responseTime: number }> => {
    return new Promise((resolve) => {
      if (!node.APIs || node.APIs.length === 0) {
        resolve({ isOnline: false, responseTime: 0 });
        return;
      }

      const nodeUrl = node.APIs[0];
      const startTime = Date.now();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);

      fetch(`${nodeUrl}/api.dot`, {
        signal: controller.signal,
        mode: "cors",
      })
        .then(() => {
          clearTimeout(timeoutId);
          const responseTime = Date.now() - startTime;
          resolve({ isOnline: true, responseTime });
        })
        .catch(() => {
          clearTimeout(timeoutId);
          const responseTime = Date.now() - startTime;
          resolve({ isOnline: false, responseTime });
        });
    });
  };

  const checkAllConnectivity = async () => {
    setCheckingConnectivity(true);

    try {
      const updatedNodes = await Promise.all(
        dotNodes.map(async (node) => {
          const { isOnline, responseTime } = await checkNodeConnectivity(node);
          return { ...node, isOnline, responseTime };
        })
      );

      setItem("dotNodes", updatedNodes);

      const onlineCount = updatedNodes.filter((node) => node.isOnline).length;
      showNotification(
        "连通性检测完成",
        `${onlineCount}/${updatedNodes.length} 个节点在线`,
        onlineCount > 0 ? "green" : "orange"
      );
    } catch (error) {
      console.log("连通性检测失败:", error);
      showNotification("检测失败", "连通性检测过程中出现错误", "red");
    } finally {
      setCheckingConnectivity(false);
    }
  };

  const apiUrlChange = async () => {
    setApiLoading(true);
    const list = await updateDot(apiURL);
    if (list) {
      setApiList(list);
      showNotification("节点切换成功", list[0], "green");
    } else {
      showNotification("节点切换失败", "无法连接到该节点", "red");
    }
    setApiLoading(false);
  };

  const back = useBack();
  const switchNode = async (node: DotNode) => {
    setSwitchingNode(node.address);
    try {
      // 使用当前单选中的 API 值，默认取第一个
      const nodeAPI = selectedApiByNode[node.address] || node.APIs[0];
      const list = await updateDot(nodeAPI);
      if (list) {
        setApiList(list);
        showNotification("节点切换成功", `已切换到 ${node.name}`, "green");
        if (window.location.search.includes("back")) {
          back();
        }
      } else {
        showNotification("节点切换失败", "无法连接到该节点", "red");
      }
    } catch (error) {
      console.error(error);
      showNotification("节点切换失败", "无法连接到该节点", "red");
    } finally {
      setSwitchingNode(null);
    }
  };

  const changeNetwork = (value: string | null) => {
    if (value && (value === "mainnet" || value === "testnet")) {
      const rpc = NETWORK_CONFIG[value].rpc;
      setCustomRPC(rpc);
      setNetwork(value);
      fetchNodes(rpc);
      notifications.show({
        title: "网络已切换",
        message: `已切换到 ${NETWORK_CONFIG[value].name}`,
        color: NETWORK_CONFIG[value].color,
        icon: <IconNetwork size={16} />,
      });
    }
  };

  // ===== 初始化 =====
  useEffect(() => {
    if (dotNodes.length > 0) {
      setLoading(false);
      return;
    }

    // 尝试从缓存加载
    const nodes = localStorage.getItem("dotNodes");
    if (nodes) {
      try {
        setItem("dotNodes", JSON.parse(nodes));
        setLoading(false);
        return;
      } catch {}
    }

    // 从区块链获取最新数据
    fetchNodes();
  }, []);

  const randomRPC = (network: NETWORK_TYPE) => {
    return NETWORK_CONFIG[network].RPCs[
      Math.floor(Math.random() * NETWORK_CONFIG[network].RPCs.length)
    ];
  };

  // ===== 主渲染 =====
  return (
    <Container size="lg" w="100%" style={{ wordBreak: "break-all" }}>
      <AppHeader title="请选择节点" />

      {/* 当前节点信息区域 */}
      <Box mb="lg">
        <Stack align="center">
          <Title mt="md">{title}</Title>
          <Group gap={0}>
            <IconBrandGithub />
            <Anchor
              c="dimmed"
              component={Link}
              href="https://github.com/most-people/most.box"
              target="_blank"
            >
              「轻松简单、开源免费、部署自己的节点」
            </Anchor>
          </Group>
          {ApiList.length > 0 ? (
            <>
              <Text>已成功接入</Text>
              <Stack justify="center">
                {ApiList.map((url, index) => (
                  <Anchor
                    key={index}
                    onClick={(e) => {
                      e.preventDefault();
                      mp.openDot(url);
                    }}
                    lineClamp={1}
                    component={Link}
                    href={url}
                  >
                    {url}
                  </Anchor>
                ))}
              </Stack>
            </>
          ) : (
            <Anchor component={Link} href={dotAPI} target="_blank">
              {dotAPI}
            </Anchor>
          )}

          <Group w="100%" justify="space-between">
            <TextInput
              flex={1}
              leftSection={<IconWorldWww />}
              value={apiURL}
              onChange={(event) => setApiURL(event.currentTarget.value)}
              placeholder="私有节点地址"
            />
            <Button
              leftSection={<IconSettings size={16} />}
              onClick={apiUrlChange}
              loading={apiLoading}
            >
              私有节点
            </Button>
          </Group>
        </Stack>
      </Box>

      {/* 节点列表控制区域 */}
      <Box mb="lg">
        <Flex justify="space-between" align="center" wrap="wrap" gap="md">
          <Group>
            <ThemeIcon size={40} radius="md" variant="light" color="blue">
              <IconServer size={20} />
            </ThemeIcon>
            <Box>
              <Title order={2}>节点列表</Title>
              <Text size="sm" c="dimmed">
                共 {dotNodes.length} 个节点
                {dotNodes.some((n) => n.isOnline !== undefined) && (
                  <>
                    {" "}
                    • {onlineNodes.length} 在线 • {offlineNodes.length} 离线
                  </>
                )}
              </Text>
            </Box>
          </Group>

          <Group>
            <Select
              value={network}
              onChange={changeNetwork}
              data={[
                { value: "testnet", label: "🧪 Base 测试网" },
                { value: "mainnet", label: "🌐 Base 主网" },
              ]}
              leftSection={<IconNetwork size={16} />}
              variant="filled"
              radius="md"
              w={180}
            />

            <Tooltip label="刷新节点列表">
              <ActionIcon
                size="lg"
                variant="light"
                color="blue"
                onClick={() => fetchNodes()}
                loading={loading}
              >
                <IconRefresh size={18} />
              </ActionIcon>
            </Tooltip>

            <Button
              leftSection={<IconWifi size={16} />}
              onClick={checkAllConnectivity}
              loading={checkingConnectivity}
              disabled={dotNodes.length === 0}
              variant="gradient"
              gradient={{ from: "blue", to: "cyan" }}
            >
              检测连通性
            </Button>
          </Group>
        </Flex>
      </Box>

      {/* CID检测区域 */}
      <Group align="flex-end" mb="lg">
        <TextInput
          style={{ flex: 1 }}
          placeholder="输入要查询的 CID..."
          value={customCid}
          onChange={(event) => setCustomCid(event.currentTarget.value)}
        />
        <Button
          onClick={handleDetectCid}
          loading={isDetecting}
          disabled={!customCid}
        >
          <IconSearch size={16} />
          <Text ml="xs">CID</Text>
        </Button>
      </Group>

      {/* 节点列表 */}
      {loading ? (
        <Paper p="xl" radius="md" style={{ textAlign: "center" }}>
          <ThemeIcon size={60} radius="xl" variant="light" color="blue" mb="md">
            <IconServer size={30} />
          </ThemeIcon>
          <Title order={3} c="dimmed">
            正在加载节点列表...
          </Title>
          <Text size="sm" c="dimmed" mt="xs">
            请稍候，正在从区块链获取数据
          </Text>
        </Paper>
      ) : error ? (
        <Paper shadow="sm" p="xl" radius="md">
          <Alert color="red" title="加载失败" icon={<IconX size={16} />}>
            {error}
          </Alert>

          <Group mt="md">
            <Button
              size="sm"
              color="orange"
              variant="light"
              onClick={() => {
                setCustomRPC(randomRPC(network));
                fetchNodes();
              }}
            >
              重新尝试
            </Button>
          </Group>
        </Paper>
      ) : dotNodes.length === 0 ? (
        <Paper shadow="sm" p="xl" radius="md" style={{ textAlign: "center" }}>
          <ThemeIcon size={60} radius="xl" variant="light" color="gray" mb="md">
            <IconServer size={30} />
          </ThemeIcon>
          <Title order={3} c="dimmed" mb="xs">
            暂无节点
          </Title>
          <Text size="sm" c="dimmed">
            当前网络没有注册的节点
          </Text>
        </Paper>
      ) : (
        <Flex wrap="wrap" gap="md">
          {dotNodes.map((node, index) => (
            <Card
              key={node.address}
              shadow="sm"
              padding="lg"
              radius="md"
              withBorder
              maw="100%"
              w={358}
              style={{
                transition: "transform 0.2s ease, box-shadow 0.2s ease",
                border: isCurrentNode(node) ? "2px solid #228be6" : undefined,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,0.1)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "";
              }}
            >
              {/* 节点头部 */}
              <Group justify="space-between" mb="md">
                <Group>
                  <ThemeIcon
                    size={36}
                    radius="md"
                    variant="light"
                    color={
                      node.isOnline
                        ? "green"
                        : node.isOnline === false
                        ? "red"
                        : "gray"
                    }
                  >
                    {node.isOnline ? (
                      <IconWifi size={18} />
                    ) : node.isOnline === false ? (
                      <IconWifiOff size={18} />
                    ) : (
                      <IconServer size={18} />
                    )}
                  </ThemeIcon>
                  <Box>
                    <Group gap="xs">
                      <Text fw={600} size="md" lineClamp={1}>
                        {node.name}
                      </Text>
                      {isCurrentNode(node) && (
                        <Badge size="xs" color="blue" variant="filled">
                          当前
                        </Badge>
                      )}
                    </Group>
                    <Text size="xs" c="dimmed">
                      节点地址 {network.slice(0, 1).toUpperCase()}
                      {index + 1}
                    </Text>
                  </Box>
                </Group>

                {node.isOnline !== undefined && (
                  <Badge
                    color={node.isOnline ? "green" : "red"}
                    variant="light"
                    leftSection={
                      node.isOnline ? (
                        <IconCheck size={12} />
                      ) : (
                        <IconX size={12} />
                      )
                    }
                  >
                    {node.isOnline ? "在线" : "离线"}
                    {node.responseTime !== undefined &&
                      ` (${formatResponseTime(node.responseTime)})`}
                  </Badge>
                )}
              </Group>

              <Divider mb="md" />

              {/* 节点详细信息 */}
              <Stack justify="space-between" flex={1}>
                <Stack gap="sm">
                  <Group gap="xs" wrap="nowrap">
                    <IconDatabase
                      size={14}
                      color="gray"
                      style={{ flexShrink: 0 }}
                    />
                    <Text size="xs" c="dimmed">
                      {mp.formatAddress(node.address)}{" "}
                      <Anchor
                        component={Link}
                        href={{
                          pathname: "/dot/deploy",
                          query: { address: node.address, api: node.APIs[0] },
                        }}
                        c="dimmed"
                      >
                        Deploy
                      </Anchor>
                    </Text>
                  </Group>

                  <Group gap="xs">
                    <IconClock size={14} color="gray" />
                    <Text size="xs" c="dimmed">
                      {formatTime(node.lastUpdate)}
                    </Text>
                  </Group>

                  {node.APIs.length > 0 && (
                    <Radio.Group
                      size="xs"
                      value={selectedApiByNode[node.address] || node.APIs[0]}
                      onChange={(val) =>
                        setSelectedApiByNode((prev) => ({
                          ...prev,
                          [node.address]: val,
                        }))
                      }
                    >
                      <Stack gap={2} align="flex-start">
                        {node.APIs.map((api, apiIndex) => (
                          <Group key={apiIndex} gap="xs" wrap="nowrap">
                            <Radio
                              disabled={isRadioDisabled(node, api)}
                              value={api}
                            />
                            <Anchor
                              key={apiIndex}
                              c="blue"
                              onClick={(e) => {
                                e.preventDefault();
                                mp.openDot(api);
                              }}
                              lineClamp={1}
                              component={Link}
                              href={api}
                            >
                              {api}
                            </Anchor>
                          </Group>
                        ))}
                      </Stack>
                    </Radio.Group>
                  )}
                  <Box>
                    <Text size="xs" fw={500} mb={4} c="gray">
                      IPFS 网关
                    </Text>
                    <Stack gap="xs" align="flex-start">
                      {getCIDs(node).map((gatewayBase, index) => {
                        const finalUrl = customCid
                          ? `${gatewayBase}/${customCid}`
                          : gatewayBase;
                        const result = detectionResults[finalUrl];

                        return (
                          <Stack key={index} gap="xs">
                            <Anchor
                              component={Link}
                              c="blue"
                              href={finalUrl}
                              target="_blank"
                              lineClamp={1}
                            >
                              {finalUrl}
                            </Anchor>
                            <Badge
                              flex={1}
                              size="sm"
                              color={
                                result?.status === "success" ? "green" : "gray"
                              }
                              variant="light"
                            >
                              {result?.status || "CID"}
                              {result?.responseTime != null &&
                                ` (${result?.responseTime}ms)`}
                            </Badge>
                          </Stack>
                        );
                      })}
                    </Stack>
                  </Box>
                </Stack>

                <Group>
                  <Button
                    flex={1}
                    variant={isCurrentNode(node) ? "filled" : "light"}
                    color={isCurrentNode(node) ? "green" : "blue"}
                    leftSection={<IconSwitchHorizontal size={16} />}
                    onClick={() => switchNode(node)}
                    loading={switchingNode === node.address}
                    disabled={isDisabledNode(node)}
                  >
                    {isCurrentNode(node) ? "当前节点" : "切换节点"}
                  </Button>
                </Group>
              </Stack>
            </Card>
          ))}
        </Flex>
      )}

      {/* 底部控制区域 */}
      <Group mt="lg" gap="xs" justify="space-between">
        <Button
          size="sm"
          color="yellow"
          variant="light"
          onClick={() => setCustomRPC(randomRPC("mainnet"))}
        >
          更换 RPC
        </Button>

        <TextInput
          size="sm"
          flex={1}
          leftSection={<IconServer size={16} />}
          value={customRPC}
          onChange={(event) => setCustomRPC(event.currentTarget.value)}
          placeholder="自定义 RPC"
        />

        <Tooltip label="刷新节点列表">
          <ActionIcon
            size="lg"
            variant="light"
            color="blue"
            onClick={() => fetchNodes()}
            loading={loading}
          >
            <IconRefresh size={18} />
          </ActionIcon>
        </Tooltip>
      </Group>

      <Group gap="xs" mt="lg" justify="center">
        <Anchor
          size="sm"
          c="blue"
          component={Link}
          href="https://docs.base.org/chain/connecting-to-base"
          target="_blank"
        >
          官方 RPC
        </Anchor>
        <Anchor
          size="sm"
          c="blue"
          component={Link}
          href="https://chainlist.org/chain/8453"
          target="_blank"
        >
          主网 RPC
        </Anchor>
        <Anchor
          size="sm"
          c="blue"
          component={Link}
          href="https://docs.base.org/chain/network-faucets"
          target="_blank"
        >
          水龙头列表
        </Anchor>
        <Anchor
          size="sm"
          c="blue"
          component={Link}
          href="https://portal.cdp.coinbase.com/products/faucet?projectId=0b869244-5000-43dd-8aba-c9feee07f6ab"
          target="_blank"
        >
          注册领水
        </Anchor>
        <Anchor
          size="sm"
          c="blue"
          component={Link}
          href={Explorer + "/address/" + CONTRACT_ADDRESS_DOT}
          target="_blank"
        >
          节点合约 {mp.formatAddress(CONTRACT_ADDRESS_DOT)}
        </Anchor>

        <Anchor size="sm" c="blue" component={Link} href="/dot/status">
          本地 IPFS 节点状态
        </Anchor>
      </Group>
    </Container>
  );
}
