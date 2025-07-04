"use client";
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
} from "@mantine/core";
import { useEffect, useState } from "react";
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
} from "@tabler/icons-react";
import mp from "@/constants/mp";
import "./list.scss";

// DotContract ABI - 从你的合约中提取的关键方法
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

interface DotNode {
  address: string;
  name: string;
  APIs: string[];
  CIDs: string[];
  lastUpdate: number;
  isOnline?: boolean;
  responseTime?: number;
}

export default function PageDotList() {
  const [nodes, setNodes] = useState<DotNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingConnectivity, setCheckingConnectivity] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [network, setNetwork] = useState<"mainnet" | "testnet">("testnet");

  // 合约配置
  const CONTRACT_ADDRESS = "0xdc82cef1a8416210afb87caeec908a4df843f016";

  // 网络配置
  const NETWORK_CONFIG = {
    mainnet: {
      rpc: "https://mainnet.base.org",
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
  const Explorer = NETWORK_CONFIG[network].explorer;

  // 获取节点列表
  const fetchNodes = async () => {
    try {
      setLoading(true);
      setError(null);

      const provider = new ethers.JsonRpcProvider(RPC);
      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        DotContractABI,
        provider
      );

      // 调用 getAllDots 获取所有节点
      const [addresses, names, timestamps] = await contract.getAllDots();

      // 为每个节点获取详细信息
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
      setNodes(nodeList);
    } catch (err) {
      console.error("获取节点列表失败:", err);
      setError("获取节点列表失败，请检查网络连接");
      notifications.show({
        title: "获取失败",
        message: "无法获取节点列表",
        color: "red",
      });
    } finally {
      setLoading(false);
    }
  };

  // 通过错误类型判断节点状态
  const checkNodeConnectivity = (
    node: DotNode
  ): Promise<{ isOnline: boolean; responseTime: number }> => {
    return new Promise((resolve) => {
      if (!node.APIs || node.APIs.length === 0) {
        return { isOnline: false, responseTime: 0 };
      }
      const nodeUrl = node.APIs[0];

      const startTime = Date.now();
      const timeout = 3000; // 3秒超时

      // 使用 fetch 进行检测
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      fetch(`${nodeUrl}/ipv6`, {
        method: "GET",
        signal: controller.signal,
        mode: "cors", // 明确指定 CORS 模式
      })
        .then(() => {
          // 请求成功 - 节点在线
          clearTimeout(timeoutId);
          const responseTime = Date.now() - startTime;
          resolve({ isOnline: true, responseTime });
        })
        .catch((error) => {
          clearTimeout(timeoutId);
          const responseTime = Date.now() - startTime;

          // 分析错误类型
          const errorMessage = error.message.toLowerCase();
          const errorName = error.name.toLowerCase();

          // 跨域错误或混合内容错误 = 节点在线
          if (
            errorMessage.includes("cors") ||
            errorMessage.includes("mixed content") ||
            errorMessage.includes("blocked")
          ) {
            resolve({ isOnline: true, responseTime });
          }
          // 网络错误、超时错误 = 节点离线
          else if (
            errorMessage.includes("network") ||
            errorMessage.includes("timeout") ||
            errorMessage.includes("connection") ||
            errorName === "aborterror"
          ) {
            resolve({ isOnline: false, responseTime });
          }
          // 其他未知错误，保守判断为离线
          else {
            console.warn(`未知错误类型: ${errorName} - ${errorMessage}`);
            resolve({ isOnline: false, responseTime });
          }
        });
    });
  };

  // 批量检测所有节点连通性
  const checkAllConnectivity = async () => {
    setCheckingConnectivity(true);

    try {
      const updatedNodes = await Promise.all(
        nodes.map(async (node) => {
          const { isOnline, responseTime } = await checkNodeConnectivity(node);
          return { ...node, isOnline, responseTime };
        })
      );

      setNodes(updatedNodes);

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
  const handleNetworkChange = (value: string | null) => {
    if (value && (value === "mainnet" || value === "testnet")) {
      setNetwork(value);
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

  useEffect(() => {
    fetchNodes();
  }, [network]);

  if (loading) {
    return (
      <Box id="page-dot-list">
        <AppHeader title="节点列表" />
        <Container size="lg" py="xl">
          <Paper p="xl" radius="md" style={{ textAlign: "center" }}>
            <ThemeIcon
              size={60}
              radius="xl"
              variant="light"
              color="blue"
              mb="md"
            >
              <IconServer size={30} />
            </ThemeIcon>
            {/* <Loader size="lg" mb="md" /> */}
            <Title order={3} c="dimmed">
              正在加载节点列表...
            </Title>
            <Text size="sm" c="dimmed" mt="xs">
              请稍候，正在从区块链获取数据
            </Text>
          </Paper>
        </Container>
      </Box>
    );
  }

  if (error) {
    return (
      <Box id="page-dot-list">
        <AppHeader title="节点列表" />
        <Container size="lg" py="xl">
          <Paper shadow="sm" p="xl" radius="md">
            <Alert color="red" title="加载失败" icon={<IconX size={16} />}>
              {error}
            </Alert>
            <Button
              mt="md"
              onClick={fetchNodes}
              leftSection={<IconRefresh size={16} />}
              variant="light"
              color="red"
            >
              重新加载
            </Button>
          </Paper>
        </Container>
      </Box>
    );
  }

  const onlineNodes = nodes.filter((node) => node.isOnline);
  const offlineNodes = nodes.filter((node) => node.isOnline === false);

  return (
    <Box id="page-dot-list">
      <AppHeader title="节点列表" />

      <Container size="lg" py="md">
        {/* 顶部统计和控制区域 */}
        <Paper shadow="sm" p="lg" radius="md" mb="lg">
          <Flex justify="space-between" align="center" wrap="wrap" gap="md">
            <Group>
              <ThemeIcon size={40} radius="md" variant="light" color="blue">
                <IconServer size={20} />
              </ThemeIcon>
              <Box>
                <Title order={2}>节点监控</Title>
                <Text size="sm" c="dimmed">
                  共 {nodes.length} 个节点
                  {nodes.some((n) => n.isOnline !== undefined) && (
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
                onChange={handleNetworkChange}
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
                  onClick={fetchNodes}
                  loading={loading}
                >
                  <IconRefresh size={18} />
                </ActionIcon>
              </Tooltip>

              <Button
                leftSection={<IconWifi size={16} />}
                onClick={checkAllConnectivity}
                loading={checkingConnectivity}
                disabled={nodes.length === 0}
                variant="gradient"
                gradient={{ from: "blue", to: "cyan" }}
              >
                检测连通性
              </Button>
            </Group>
          </Flex>
        </Paper>

        {/* 网络状态指示器 */}
        <Alert
          mb="lg"
          color={NETWORK_CONFIG[network].color}
          variant="light"
          icon={<IconNetwork size={16} />}
          title={`当前网络: ${NETWORK_CONFIG[network].name}`}
        >
          <Text size="sm">
            RPC 端点:
            <Text component="span" ff="monospace" c="dimmed">
              {NETWORK_CONFIG[network].rpc}
            </Text>
          </Text>
        </Alert>

        {/* 节点列表 */}
        {nodes.length === 0 ? (
          <Paper shadow="sm" p="xl" radius="md" style={{ textAlign: "center" }}>
            <ThemeIcon
              size={60}
              radius="xl"
              variant="light"
              color="gray"
              mb="md"
            >
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
          <Grid>
            {nodes.map((node) => (
              <Grid.Col key={node.address} span="auto">
                <Card
                  shadow="sm"
                  padding="lg"
                  radius="md"
                  withBorder
                  h="100%"
                  w={343}
                  style={{
                    transition: "transform 0.2s ease, box-shadow 0.2s ease",
                    cursor: "pointer",
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
                        <Text fw={600} size="md" lineClamp={1}>
                          {node.name}
                        </Text>
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
                  <Stack gap="sm">
                    <Group gap="xs" wrap="nowrap">
                      <IconDatabase
                        size={14}
                        color="gray"
                        style={{ flexShrink: 0 }}
                      />
                      <Text size="xs" c="dimmed">
                        {mp.formatAddress(node.address)}
                      </Text>
                    </Group>

                    <Group gap="xs">
                      <IconClock size={14} color="gray" />
                      <Text size="xs" c="dimmed">
                        {formatTime(node.lastUpdate)}
                      </Text>
                    </Group>

                    {node.APIs.length > 0 && (
                      <Stack gap={2}>
                        {node.APIs.map((api, apiIndex) => (
                          <Text
                            key={apiIndex}
                            c="blue"
                            component="a"
                            href={api}
                            target="_blank"
                            style={{ textDecoration: "none" }}
                            lineClamp={1}
                          >
                            {api}
                          </Text>
                        ))}
                      </Stack>
                    )}

                    <Box>
                      <Text size="xs" fw={500} mb={4} c="gray">
                        CID 浏览器
                      </Text>
                      <Group gap={2}>
                        {node.CIDs.map((cid, cidIndex) => (
                          <Text
                            key={cidIndex}
                            c="blue"
                            component="a"
                            href={cid + "/ipfs"}
                            target="_blank"
                            style={{ textDecoration: "none" }}
                            lineClamp={1}
                          >
                            {cid + "/ipfs"}
                          </Text>
                        ))}
                        {defaultCID(node) && (
                          <Text
                            c="blue"
                            component="a"
                            href={defaultCID(node)}
                            target="_blank"
                            style={{ textDecoration: "none" }}
                            lineClamp={1}
                          >
                            {defaultCID(node)}
                          </Text>
                        )}
                      </Group>
                    </Box>
                  </Stack>
                </Card>
              </Grid.Col>
            ))}
          </Grid>
        )}

        <Group gap="xs" mt="lg" justify="center">
          <Text
            size="sm"
            c="blue"
            component="a"
            href="https://docs.base.org/chain/connecting-to-base"
            target="_blank"
            style={{ textDecoration: "none" }}
          >
            官方 RPC
          </Text>

          <Text
            size="sm"
            c="blue"
            component="a"
            href="https://chainlist.org/chain/8453"
            target="_blank"
            style={{ textDecoration: "none" }}
          >
            主网 RPC
          </Text>

          <Text
            size="sm"
            c="blue"
            component="a"
            href="https://chainlist.org/chain/84532"
            target="_blank"
            style={{ textDecoration: "none" }}
          >
            测试网 RPC
          </Text>

          <Text
            size="sm"
            c="blue"
            component="a"
            href="https://docs.base.org/chain/network-faucets"
            target="_blank"
            style={{ textDecoration: "none" }}
          >
            水龙头列表
          </Text>

          <Text
            size="sm"
            c="blue"
            component="a"
            href="https://portal.cdp.coinbase.com/products/faucet?projectId=0b869244-5000-43dd-8aba-c9feee07f6ab"
            target="_blank"
            style={{ textDecoration: "none" }}
          >
            注册领水
          </Text>

          <Text
            size="sm"
            c="blue"
            component="a"
            href={
              Explorer + "/address/0xdc82cef1a8416210afb87caeec908a4df843f016"
            }
            target="_blank"
            style={{ textDecoration: "none" }}
          >
            合约地址
          </Text>
        </Group>
      </Container>
    </Box>
  );
}
