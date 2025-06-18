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
  Loader,
  Alert,
  Select,
} from "@mantine/core";
import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { notifications } from "@mantine/notifications";
import { IconCheck, IconX, IconRefresh } from "@tabler/icons-react";
import { api } from "@/constants/api";

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

  // 合约配置 - 基于你的代码示例
  const CONTRACT_ADDRESS = "0xdc82cef1a8416210afb87caeec908a4df843f016";

  // 网络配置
  const NETWORK_CONFIG = {
    mainnet: {
      rpc: "https://mainnet.base.org",
      name: "Base 主网",
    },
    testnet: {
      rpc: "https://sepolia.base.org",
      name: "Base 测试网",
    },
  };

  const RPC = NETWORK_CONFIG[network].rpc;

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

  // 检测节点连通性
  const checkNodeConnectivity = async (
    node: DotNode
  ): Promise<{ isOnline: boolean; responseTime: number }> => {
    if (!node.APIs || node.APIs.length === 0) {
      return { isOnline: false, responseTime: 0 };
    }

    const startTime = Date.now();

    try {
      // 使用节点的第一个 API 地址检测连通性
      const apiUrl = node.APIs[0];
      const res = await api.get(apiUrl + "/ipv6", {
        method: "GET",
        timeout: 5000, // 5秒超时
      });

      const responseTime = Date.now() - startTime;
      if (res.data) {
        return { isOnline: true, responseTime };
      } else {
        return { isOnline: false, responseTime };
      }
    } catch (error) {
      console.log("连通性检测失败:", error);
      const responseTime = Date.now() - startTime;
      return { isOnline: false, responseTime };
    }
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
        color: "blue",
      });
    }
  };

  useEffect(() => {
    fetchNodes();
  }, [network]); // 当网络切换时重新获取节点列表

  if (loading) {
    return (
      <Box id="page-dot-list">
        <AppHeader title="节点列表" />
        <Box p="md" style={{ textAlign: "center" }}>
          <Loader size="lg" />
          <Text mt="md">正在加载节点列表...</Text>
        </Box>
      </Box>
    );
  }

  if (error) {
    return (
      <Box id="page-dot-list">
        <AppHeader title="节点列表" />
        <Box p="md">
          <Alert color="red" title="加载失败">
            {error}
          </Alert>
          <Button mt="md" onClick={fetchNodes}>
            重新加载
          </Button>
        </Box>
      </Box>
    );
  }

  return (
    <Box id="page-dot-list">
      <AppHeader title="节点列表" />

      <Box p="md">
        <Group justify="space-between" mb="md">
          <Group>
            <Text size="lg" fw={500}>
              共 {nodes.length} 个节点
            </Text>
            <Select
              value={network}
              onChange={handleNetworkChange}
              data={[
                { value: "testnet", label: "Base 测试网" },
                { value: "mainnet", label: "Base 主网" },
              ]}
              size="sm"
              w={150}
            />
          </Group>
          <Group>
            <Button
              leftSection={<IconRefresh size={16} />}
              onClick={fetchNodes}
              variant="light"
            >
              刷新列表
            </Button>
            <Button
              leftSection={<IconCheck size={16} />}
              onClick={checkAllConnectivity}
              loading={checkingConnectivity}
              disabled={nodes.length === 0}
            >
              检测连通性
            </Button>
          </Group>
        </Group>

        {/* 显示当前网络状态 */}
        <Alert mb="md" color="blue" variant="light">
          当前网络: {NETWORK_CONFIG[network].name} (
          {NETWORK_CONFIG[network].rpc})
        </Alert>

        {nodes.length === 0 ? (
          <Alert title="暂无节点">当前没有注册的节点</Alert>
        ) : (
          <Stack gap="md">
            {nodes.map((node) => (
              <Card
                key={node.address}
                shadow="sm"
                padding="lg"
                radius="md"
                withBorder
              >
                <Group justify="space-between" mb="xs">
                  <Text fw={500} size="lg">
                    {node.name}
                  </Text>
                  {node.isOnline !== undefined && (
                    <Badge
                      color={node.isOnline ? "green" : "red"}
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

                <Text size="sm" c="dimmed" mb="xs">
                  地址: {node.address}
                </Text>

                <Text size="sm" c="dimmed" mb="xs">
                  最后更新: {formatTime(node.lastUpdate)}
                </Text>

                {node.APIs.length > 0 && (
                  <Box mb="xs">
                    <Text size="sm" fw={500} mb={4}>
                      API 端点:
                    </Text>
                    <Stack gap={4}>
                      {node.APIs.map((api, apiIndex) => (
                        <Text
                          key={apiIndex}
                          size="xs"
                          c="blue"
                          component="a"
                          href={api}
                          target="_blank"
                        >
                          {api}
                        </Text>
                      ))}
                    </Stack>
                  </Box>
                )}

                {node.CIDs.length > 0 && (
                  <Box>
                    <Text size="sm" fw={500} mb={4}>
                      CID 列表:
                    </Text>
                    <Group gap={4}>
                      {node.CIDs.slice(0, 3).map((cid, cidIndex) => (
                        <Badge key={cidIndex} variant="light" size="xs">
                          {cid.length > 10 ? `${cid.slice(0, 10)}...` : cid}
                        </Badge>
                      ))}
                      {node.CIDs.length > 3 && (
                        <Badge variant="light" size="xs" c="dimmed">
                          +{node.CIDs.length - 3} 更多
                        </Badge>
                      )}
                    </Group>
                  </Box>
                )}
              </Card>
            ))}
          </Stack>
        )}
      </Box>
    </Box>
  );
}
