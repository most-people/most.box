"use client";
import { useState, useEffect } from "react";
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
} from "@tabler/icons-react";
import mp from "@/constants/mp";
import Link from "next/link";
import { DotNode, useUserStore } from "@/stores/userStore";
import "./dot.scss";

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
  const [network, setNetwork] = useState<"mainnet" | "testnet">("testnet");
  const [switchingNode, setSwitchingNode] = useState<string | null>(null);

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

  // 更新当前节点
  const apiUrlChange = async () => {
    setApiLoading(true);
    const list = await updateDot(apiURL);
    if (list) {
      setApiList(list);
    }
    setApiLoading(false);
  };

  // 切换到指定节点
  const handleSwitchNode = async (node: DotNode) => {
    if (!node.APIs || node.APIs.length === 0) {
      notifications.show({
        title: "切换失败",
        message: "该节点没有可用的API地址",
        color: "red",
      });
      return;
    }

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
      setItem("dotNodes", nodeList);
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

      fetch(`${nodeUrl}/dot`, {
        method: "GET",
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
  const handleNetworkChange = (value: string | null) => {
    if (value && (value === "mainnet" || value === "testnet")) {
      setNetwork(value);
      fetchNodes();
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

  useEffect(() => {
    if (dotNodes.length === 0) {
      fetchNodes();
    } else {
      setLoading(false);
    }
  }, []);

  const onlineNodes = dotNodes.filter((node) => node.isOnline);
  const offlineNodes = dotNodes.filter((node) => node.isOnline === false);

  return (
    <Box id="page-dot">
      <AppHeader title="节点管理" />

      <Container size="lg" py="md">
        {/* 当前节点信息区域 */}
        <Paper shadow="sm" p="lg" radius="md" mb="lg">
          <Stack className="container" align="center" gap={0}>
            <h1>DOT.MOST.BOX</h1>
            {ApiList.length > 0 ? (
              <>
                <p>已成功接入节点</p>
                <Stack justify="center">
                  {ApiList.map((url, index) => (
                    <a
                      key={index}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {url}
                    </a>
                  ))}
                </Stack>
              </>
            ) : (
              <>
                <p>当前节点</p>
                <a href={dotAPI} target="_blank" rel="noopener noreferrer">
                  {dotAPI}
                </a>
              </>
            )}
            <p>為 全 人 類 徹 底 解 放 奮 鬥 終 身</p>

            <Link href="/dot/files">查看我的文件</Link>

            <Group mt="lg">
              <TextInput
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
        </Paper>

        {/* 节点列表控制区域 */}
        <Paper shadow="sm" p="lg" radius="md" mb="lg">
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
                disabled={dotNodes.length === 0}
                variant="gradient"
                gradient={{ from: "blue", to: "cyan" }}
              >
                检测连通性
              </Button>
            </Group>
          </Flex>
        </Paper>

        {/* 节点列表 */}
        {loading ? (
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
        ) : dotNodes.length === 0 ? (
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
            {dotNodes.map((node) => (
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
                    border: isCurrentNode(node)
                      ? "2px solid #228be6"
                      : undefined,
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
                      <Stack gap={2} align="flex-start">
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
                      <Group gap={2} align="flex-start">
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

                    <Button
                      fullWidth
                      variant={isCurrentNode(node) ? "filled" : "light"}
                      color={isCurrentNode(node) ? "green" : "blue"}
                      leftSection={<IconSwitchHorizontal size={16} />}
                      onClick={() => handleSwitchNode(node)}
                      loading={switchingNode === node.address}
                      disabled={isCurrentNode(node) || !node.APIs.length}
                      mt="sm"
                    >
                      {isCurrentNode(node) ? "当前节点" : "切换到此节点"}
                    </Button>
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
