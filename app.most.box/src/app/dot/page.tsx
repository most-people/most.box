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
  Grid,
  ThemeIcon,
  Flex,
  TextInput,
  Anchor,
} from "@mantine/core";
import { ethers } from "ethers";
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
  IconExternalLink,
} from "@tabler/icons-react";
import mp from "@/constants/mp";
import Link from "next/link";
import { DotNode, useUserStore } from "@/stores/userStore";
import { mostEncode, mostWallet } from "@/constants/MostWallet";
import dayjs from "dayjs";

// DotContract ABI
const DotContractABI = [
  {
    inputs: [],
    name: "getAllDots",
    outputs: [
      { internalType: "address[]", name: "addresses", type: "address[]" },
      { internalType: "string[]", name: "names", type: "string[]" },
      { internalType: "uint256[]", name: "timestamps", type: "uint256[]" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "dot", type: "address" }],
    name: "getDot",
    outputs: [
      { internalType: "string", name: "name", type: "string" },
      { internalType: "string[]", name: "APIs", type: "string[]" },
      { internalType: "string[]", name: "CIDs", type: "string[]" },
      { internalType: "uint256", name: "update", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
];

export default function PageDot() {
  // 当前节点状态
  const [apiLoading, setApiLoading] = useState(false);
  const [ApiList, setApiList] = useState<string[]>([]);
  const [apiURL, setApiURL] = useState("");
  const setItem = useUserStore((state) => state.setItem);
  const dotAPI = useUserStore((state) => state.dotAPI);
  const dotNodes = useUserStore((state) => state.dotNodes);
  const updateDot = useUserStore((state) => state.updateDot);

  // 节点列表状态
  const [loading, setLoading] = useState(true);
  const [checkingConnectivity, setCheckingConnectivity] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [network, setNetwork] = useState<"mainnet" | "testnet">("mainnet");
  const [switchingNode, setSwitchingNode] = useState<string | null>(null);

  // 合约配置
  const CONTRACT_ADDRESS = "0xdc82cef1a8416210afb87caeec908a4df843f016";

  // 网络配置
  const NETWORK_CONFIG = {
    mainnet: {
      rpc: "https://mainnet-preconf.base.org",
      name: "Base 主网",
      color: "blue",
      explorer: "https://basescan.org",
    },
    testnet: {
      rpc: "https://sepolia.base.org",
      name: "Base 测试网",
      color: "orange",
      explorer: "https://sepolia.basescan.org",
    },
  };

  const RPC = NETWORK_CONFIG[network].rpc;
  const [customRPC, setCustomRPC] = useState(RPC);
  const Explorer = NETWORK_CONFIG[network].explorer;

  // 更新当前节点
  const apiUrlChange = async () => {
    setApiLoading(true);
    const list = await updateDot(apiURL);
    if (list) {
      setApiList(list);
      notifications.show({
        title: "节点切换成功",
        message: list[0],
        color: "green",
      });
    }
    setApiLoading(false);
  };

  // 切换到指定节点
  const openNode = async (node: DotNode) => {
    const nodeAPI = node.APIs[0];
    const url = new URL("/auth/jwt/", nodeAPI);
    const jwt = localStorage.getItem("jwt");
    if (jwt) {
      const wallet = mp.verifyJWT(jwt);
      if (wallet) {
        // 当前分钟有效
        const key = dayjs().format("YY/M/D HH:mm");
        const { public_key, private_key } = mostWallet("auth/jwt", key);
        const token = mostEncode(
          JSON.stringify(wallet),
          public_key,
          private_key
        );
        url.searchParams.set("token", token);
      }
    }
    window.open(url.href);
  };

  const switchNode = async (node: DotNode) => {
    setSwitchingNode(node.address);
    try {
      const nodeAPI = node.APIs[0];
      const list = await updateDot(nodeAPI);
      if (list) {
        setApiList(list);
        notifications.show({
          title: "节点切换成功",
          message: `已切换到 ${node.name}`,
          color: "green",
        });
      }
    } catch (error) {
      console.error(error);
      notifications.show({
        title: "切换失败",
        message: "无法连接到该节点",
        color: "red",
      });
    } finally {
      setSwitchingNode(null);
    }
  };

  // 获取节点列表
  const fetchNodes = async (rpc?: string) => {
    try {
      setLoading(true);
      setError(null);

      const provider = new ethers.JsonRpcProvider(rpc || customRPC || RPC);
      const network = await provider.getNetwork();
      const chainId = Number(network.chainId);

      if (chainId === 8453) {
        setNetwork("mainnet");
      } else if (chainId === 84532) {
        setNetwork("testnet");
      } else {
        notifications.show({
          title: "网络错误",
          message: `网络 ID 为 ${chainId}，不支持 Base 协议`,
          color: "red",
        });
        setCustomRPC("");
        return;
      }

      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        DotContractABI,
        provider
      );

      const [addresses, names, timestamps] = await contract.getAllDots();

      const nodePromises = addresses.map(
        async (address: string, index: number) => {
          const [name, APIs, CIDs, update] = await contract.getDot(address);
          return {
            address,
            name: name || names[index] || `节点 ${index + 1}`,
            APIs: APIs || [],
            CIDs: CIDs || [],
            lastUpdate: Number(update || timestamps[index]),
          };
        }
      );

      const nodeList = await Promise.all(nodePromises);
      localStorage.setItem("dotNodes", JSON.stringify(nodeList));
      setItem("dotNodes", nodeList);
    } catch (err) {
      console.error("获取节点列表失败:", err);
      setError("获取节点列表失败，请检查 RPC 连接");
      notifications.show({
        title: "获取失败",
        message: "无法获取节点列表",
        color: "red",
      });
    } finally {
      setLoading(false);
    }
  };

  // 检测节点连通性
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
      const timeout = 3000;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

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

  // 批量检测连通性
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
      notifications.show({
        title: "连通性检测完成",
        message: `${onlineCount}/${updatedNodes.length} 个节点在线`,
        color: onlineCount > 0 ? "green" : "orange",
      });
    } catch (error) {
      console.log("连通性检测失败:", error);
      notifications.show({
        title: "检测失败",
        message: "连通性检测过程中出现错误",
        color: "red",
      });
    } finally {
      setCheckingConnectivity(false);
    }
  };

  // 格式化时间
  const formatTime = (timestamp: number) => {
    if (!timestamp) return "未知";
    return new Date(timestamp * 1000).toLocaleString("zh-CN");
  };

  // 格式化响应时间
  const formatResponseTime = (time?: number) => {
    if (time === undefined) return "";
    return `${time}ms`;
  };

  // 网络切换处理
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

  const defaultCID = (node: DotNode) => {
    return node.APIs.find((api) => api.endsWith(":1976"))?.replace(
      ":1976",
      ":8080/ipfs"
    );
  };

  // 检查当前节点是否在列表中
  const isCurrentNode = (node: DotNode) => {
    return node.APIs.some((api) => {
      try {
        return new URL(api).origin === new URL(dotAPI).origin;
      } catch {
        return false;
      }
    });
  };

  const isDisabledNode = (node: DotNode) => {
    if (!node.APIs.length) {
      return true;
    }
    if (location.protocol === "https:" && node.APIs[0].startsWith("http:")) {
      return true;
    }
    return isCurrentNode(node);
  };

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

  const onlineNodes = dotNodes.filter((node) => node.isOnline);
  const offlineNodes = dotNodes.filter((node) => node.isOnline === false);

  const title = useMemo(() => {
    try {
      return new URL(dotAPI).hostname.toUpperCase();
    } catch {
      return "节点选择";
    }
  }, [dotAPI]);

  return (
    <Container size="lg" w="100%">
      <AppHeader title={title} />
      {/* 当前节点信息区域 */}
      <Box mb="lg">
        <Stack align="center">
          <Title>DOT.MOST.BOX</Title>
          {ApiList.length > 0 ? (
            <>
              <Text>已成功接入</Text>
              <Stack justify="center">
                {ApiList.map((url, index) => (
                  <Anchor
                    key={index}
                    component={Link}
                    href={url}
                    target="_blank"
                    lineClamp={1}
                  >
                    {url}
                  </Anchor>
                ))}
              </Stack>
            </>
          ) : (
            <>
              <Text>当前节点</Text>
              <Anchor component={Link} href={dotAPI} target="_blank">
                {dotAPI}
              </Anchor>
            </>
          )}

          <Group mt="lg" w="100%" justify="space-between">
            <TextInput
              flex={1}
              leftSection={<IconWorldWww />}
              value={apiURL}
              onChange={(event) => setApiURL(event.currentTarget.value)}
              placeholder="自定义节点地址"
            />
            <Button onClick={apiUrlChange} loading={apiLoading}>
              自定义
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
                {
                  value: "testnet",
                  label: "🧪 Base 测试网",
                },
                {
                  value: "mainnet",
                  label: "🌐 Base 主网",
                },
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
              w={343}
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
                        {node.name} #{network.slice(0, 1).toUpperCase()}
                        {index + 1}
                      </Text>
                      {isCurrentNode(node) && (
                        <Badge size="xs" color="blue" variant="filled">
                          当前
                        </Badge>
                      )}
                    </Group>
                    <Text size="xs" c="dimmed">
                      节点地址
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
                    <Stack gap={2} align="flex-start">
                      {node.APIs.map((api, apiIndex) => (
                        <Anchor
                          key={apiIndex}
                          c="blue"
                          component={Link}
                          href={api}
                          target="_blank"
                          lineClamp={1}
                        >
                          {api}
                        </Anchor>
                      ))}
                    </Stack>
                  )}

                  <Box>
                    <Text size="xs" fw={500} mb={4} c="gray">
                      CID 浏览器
                    </Text>
                    <Group gap={2} align="flex-start">
                      {node.CIDs.map((cid, cidIndex) => (
                        <Anchor
                          key={cidIndex}
                          component={Link}
                          c="blue"
                          href={cid + "/ipfs"}
                          target="_blank"
                          lineClamp={1}
                        >
                          {cid + "/ipfs"}
                        </Anchor>
                      ))}
                      {defaultCID(node) && (
                        <Anchor
                          c="blue"
                          component={Link}
                          href={defaultCID(node) || ""}
                          target="_blank"
                          lineClamp={1}
                        >
                          {defaultCID(node)}
                        </Anchor>
                      )}
                    </Group>
                  </Box>
                </Stack>
                <Group>
                  <Button
                    flex={1}
                    variant="light"
                    color="blue"
                    leftSection={<IconExternalLink size={16} />}
                    onClick={() => openNode(node)}
                  >
                    打开节点
                  </Button>
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

      <Group mt="lg" justify="space-between">
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
          href={
            Explorer + "/address/0xdc82cef1a8416210afb87caeec908a4df843f016"
          }
          target="_blank"
        >
          合约地址
        </Anchor>
      </Group>
    </Container>
  );
}
