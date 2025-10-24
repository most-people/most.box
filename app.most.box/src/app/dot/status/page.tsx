"use client";

import { AppHeader } from "@/components/AppHeader";
import {
  Container,
  Stack,
  Card,
  Text,
  Badge,
  Group,
  Button,
  Alert,
  ActionIcon,
  ThemeIcon,
  Paper,
  Title,
  Box,
  Loader,
  ScrollArea,
} from "@mantine/core";
import {
  IconCheck,
  IconX,
  IconRefresh,
  IconNetwork,
  IconServer,
  IconClock,
  IconWifi,
  IconWifiOff,
  IconWorldWww,
  IconSearch,
  IconDatabase,
} from "@tabler/icons-react";
import { useState, useEffect } from "react";
import { notifications } from "@mantine/notifications";

// 类型定义
interface IPFSNodeInfo {
  ID: string;
  PublicKey: string;
  Addresses: string[];
  AgentVersion: string;
  Protocols: string[];
}

interface SwarmPeer {
  Addr: string;
  Peer: string;
  Identify: {
    ID: string;
    PublicKey: string;
    Addresses: string[] | null;
    AgentVersion: string;
    Protocols: string[] | null;
  };
}

interface SwarmPeersResponse {
  Peers: SwarmPeer[];
}

interface PingResult {
  Success: boolean;
  Time: number;
  Text: string;
}

interface CustomNode {
  name: string;
  type: string;
  id: string;
  ip: string[];
}

interface NodeTestResult {
  node: CustomNode;
  found: boolean;
  addresses: string[];
  pingResults: PingResult[];
  avgLatency?: number;
  status: "success" | "error" | "testing" | "idle";
}

// Custom nodes from custom.json
const CUSTOM_NODES: CustomNode[] = [
  {
    name: "ThreeBody",
    type: "dhtserver",
    id: "12D3KooWEfhngz9JqycJXmrxtozE3qKvwBpTW8cusoU7SWixgeEc",
    ip: ["/dns6/m1.most.box"],
  },
  {
    name: "SG1",
    type: "dhtserver",
    id: "12D3KooWK3Z55bUGEC8Rn8cfqFFMzy8LzHEFwitdsx3xX48LEJvA",
    ip: ["/ip4/129.226.147.127", "/dns4/sg1.most-people.com"],
  },
  {
    name: "DOT",
    type: "dhtserver",
    id: "12D3KooWBXK1mBkN8UY9UVEfkKJtaY8Xkb1YKZgBUTDRFnLAKGpV",
    ip: ["/ip4/119.91.213.99", "/dns4/dot.most.red"],
  },
  {
    name: "SG2",
    type: "dhtclient",
    id: "12D3KooWHNKz2FbXQzUGynYMyDpPHrEQSm2jkjzzW8t285tWbb41",
    ip: ["/ip4/143.156.32.57", "/dns4/sg2.most-people.com"],
  },
  {
    name: "Damon",
    type: "dhtclient",
    id: "12D3KooWNeNLV7D7qivHMX237XzyfMbzeQZyqbkizFcekKhDJiqR",
    ip: ["/ip4/111.230.30.145", "/dns4/damon.most.red"],
  },
  {
    name: "ZX",
    type: "dhtclient",
    id: "12D3KooWPen5b7dvQm9C2nmnVXad51FaxLWrwQch2H8fVNFfhoGW",
    ip: ["/ip4/123.206.203.234", "/dns4/zx-dot.most.red"],
  },
];

const IPFS_API_BASE = "http://localhost:5001/api/v0";

export default function PageDotStatus() {
  const [nodeInfo, setNodeInfo] = useState<IPFSNodeInfo | null>(null);
  const [swarmPeers, setSwarmPeers] = useState<SwarmPeer[]>([]);
  const [nodeTests, setNodeTests] = useState<NodeTestResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [ipfsOnline, setIpfsOnline] = useState<boolean | null>(null);

  // 初始化节点测试结果
  useEffect(() => {
    setNodeTests(
      CUSTOM_NODES.map((node) => ({
        node,
        found: false,
        addresses: [],
        pingResults: [],
        status: "idle",
      }))
    );
  }, []);

  // 检查IPFS节点信息
  const checkNodeInfo = async () => {
    try {
      const response = await fetch(`${IPFS_API_BASE}/id`, {
        method: "POST",
      });
      if (response.ok) {
        const data = await response.json();
        setNodeInfo(data);
        setIpfsOnline(true);
        return true;
      }
    } catch (error) {
      console.error("Failed to get node info:", error);
      setIpfsOnline(false);
    }
    return false;
  };

  // 获取对等节点列表
  const getSwarmPeers = async () => {
    try {
      const response = await fetch(`${IPFS_API_BASE}/swarm/peers`, {
        method: "POST",
      });
      if (response.ok) {
        const data: SwarmPeersResponse = await response.json();
        setSwarmPeers(data.Peers || []);
        return data.Peers || [];
      }
    } catch (error) {
      console.error("Failed to get swarm peers:", error);
    }
    return [];
  };

  // 查找特定节点
  const findPeer = async (peerId: string) => {
    try {
      const response = await fetch(
        `${IPFS_API_BASE}/routing/findpeer?arg=${peerId}`,
        {
          method: "POST",
        }
      );
      if (response.ok) {
        const data = await response.json();
        if (data.Responses && data.Responses.length > 0) {
          return data.Responses[0];
        }
      }
    } catch (error) {
      console.error("Failed to find peer:", error);
    }
    return null;
  };

  // Ping节点
  const pingPeer = async (peerId: string, count: number = 3) => {
    try {
      const response = await fetch(
        `${IPFS_API_BASE}/ping?arg=${peerId}&count=${count}`,
        {
          method: "POST",
        }
      );
      if (response.ok) {
        const text = await response.text();
        const lines = text.trim().split("\n");
        const results: PingResult[] = [];

        for (const line of lines) {
          try {
            const result = JSON.parse(line);
            results.push(result);
          } catch {
            // 忽略解析错误的行
          }
        }

        return results;
      }
    } catch (error) {
      console.error("Failed to ping peer:", error);
    }
    return [];
  };

  // 测试单个节点
  const testNode = async (nodeIndex: number) => {
    const node = CUSTOM_NODES[nodeIndex];

    setNodeTests((prev) =>
      prev.map((test, i) =>
        i === nodeIndex ? { ...test, status: "testing" } : test
      )
    );

    try {
      // 查找节点
      const peerInfo = await findPeer(node.id);

      if (peerInfo) {
        // Ping测试
        const pingResults = await pingPeer(node.id, 3);

        // 计算平均延迟
        const latencyResults = pingResults.filter(
          (r) => r.Success && r.Time > 0
        );
        const avgLatency =
          latencyResults.length > 0
            ? latencyResults.reduce((sum, r) => sum + r.Time, 0) /
              latencyResults.length /
              1000000 // 转换为毫秒
            : undefined;

        setNodeTests((prev) =>
          prev.map((test, i) =>
            i === nodeIndex
              ? {
                  ...test,
                  found: true,
                  addresses: peerInfo.Addrs || [],
                  pingResults,
                  avgLatency,
                  status: "success",
                }
              : test
          )
        );
      } else {
        setNodeTests((prev) =>
          prev.map((test, i) =>
            i === nodeIndex
              ? {
                  ...test,
                  found: false,
                  addresses: [],
                  pingResults: [],
                  status: "error",
                }
              : test
          )
        );
      }
    } catch (error) {
      console.error(`Failed to test node ${node.name}:`, error);
      setNodeTests((prev) =>
        prev.map((test, i) =>
          i === nodeIndex ? { ...test, status: "error" } : test
        )
      );
    }
  };

  // 测试所有节点
  const testAllNodes = async () => {
    setLoading(true);

    try {
      // 首先检查IPFS是否在线
      const isOnline = await checkNodeInfo();
      if (!isOnline) {
        notifications.show({
          title: "错误",
          message: "IPFS节点未运行或无法连接",
          color: "red",
        });
        setLoading(false);
        return;
      }

      // 获取对等节点列表
      await getSwarmPeers();

      // 测试所有自定义节点
      for (let i = 0; i < CUSTOM_NODES.length; i++) {
        await testNode(i);
      }

      notifications.show({
        title: "完成",
        message: "节点连接测试完成",
        color: "green",
      });
    } catch (error) {
      console.info("Failed to test all nodes:", error);
      notifications.show({
        title: "错误",
        message: "测试过程中发生错误",
        color: "red",
      });
    } finally {
      setLoading(false);
    }
  };

  // 刷新基本信息
  const refreshBasicInfo = async () => {
    setLoading(true);
    await checkNodeInfo();
    await getSwarmPeers();
    setLoading(false);
  };

  // 初始加载
  useEffect(() => {
    refreshBasicInfo();
  }, []);

  // 获取状态图标和颜色
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <IconCheck size={16} color="green" />;
      case "error":
        return <IconX size={16} color="red" />;
      case "testing":
        return <Loader size={16} />;
      default:
        return <IconSearch size={16} color="gray" />;
    }
  };

  return (
    <Container py={20}>
      <AppHeader title="本地 IPFS 节点状态" />

      <Stack gap="md">
        <Card withBorder>
          <Group justify="space-between" mb="md">
            <Group>
              <ThemeIcon
                variant="light"
                color={
                  ipfsOnline === true
                    ? "green"
                    : ipfsOnline === false
                    ? "red"
                    : "gray"
                }
              >
                {ipfsOnline === true ? (
                  <IconWifi size={18} />
                ) : ipfsOnline === false ? (
                  <IconWifiOff size={18} />
                ) : (
                  <IconNetwork size={18} />
                )}
              </ThemeIcon>
              <Title order={4}>本地 IPFS 节点</Title>
            </Group>
            <ActionIcon
              variant="subtle"
              onClick={refreshBasicInfo}
              loading={loading}
            >
              <IconRefresh size={16} />
            </ActionIcon>
          </Group>

          {ipfsOnline === false ? (
            <Alert color="red" icon={<IconX size={16} />}>
              IPFS 节点未运行或无法连接到 http://127.0.0.1:5001
            </Alert>
          ) : nodeInfo ? (
            <Stack gap="xs">
              <Group>
                <Text size="sm" c="dimmed">
                  节点 ID:
                </Text>
                <Text size="sm" ff="monospace">
                  {nodeInfo.ID}
                </Text>
              </Group>
              <Group>
                <Text size="sm" c="dimmed">
                  版本:
                </Text>
                <Text size="sm">{nodeInfo.AgentVersion}</Text>
              </Group>
              <Group>
                <Text size="sm" c="dimmed">
                  协议数量:
                </Text>
                <Badge variant="light">{nodeInfo.Protocols?.length || 0}</Badge>
              </Group>
              <Group>
                <Text size="sm" c="dimmed">
                  地址数量:
                </Text>
                <Badge variant="light">{nodeInfo.Addresses?.length || 0}</Badge>
              </Group>
            </Stack>
          ) : (
            <Loader size="sm" />
          )}
        </Card>

        <Card withBorder>
          <Group justify="space-between" mb="md">
            <Group>
              <ThemeIcon variant="light" color="blue">
                <IconServer size={18} />
              </ThemeIcon>
              <Title order={4}>对等节点</Title>
            </Group>
            <Badge variant="light" size="lg">
              {swarmPeers.length} 个连接
            </Badge>
          </Group>

          {swarmPeers.length > 0 ? (
            <ScrollArea h={200}>
              <Stack gap="xs">
                {swarmPeers.map((peer, index) => (
                  <Paper key={index} p="xs" withBorder>
                    <Group justify="space-between">
                      <Box flex={1}>
                        <Text size="xs" ff="monospace" lineClamp={1}>
                          {peer.Peer}
                        </Text>
                        <Text size="xs" c="dimmed" lineClamp={1}>
                          {peer.Addr}
                        </Text>
                      </Box>
                    </Group>
                  </Paper>
                ))}
              </Stack>
            </ScrollArea>
          ) : (
            <Text c="dimmed" ta="center">
              暂无连接的对等节点
            </Text>
          )}
        </Card>

        {/* 自定义节点测试 */}
        <Card withBorder>
          <Group justify="space-between" mb="md">
            <Group>
              <ThemeIcon variant="light" color="violet">
                <IconDatabase size={18} />
              </ThemeIcon>
              <Title order={4}>自定义节点测试</Title>
            </Group>
            <Button
              size="sm"
              onClick={testAllNodes}
              loading={loading}
              leftSection={<IconRefresh size={16} />}
            >
              测试所有节点
            </Button>
          </Group>

          <Stack gap="sm">
            {nodeTests.map((test, index) => (
              <Paper key={test.node.id} p="md" withBorder>
                <Group justify="space-between" mb="sm">
                  <Group>
                    <Badge
                      variant="light"
                      color={test.node.type === "dhtserver" ? "blue" : "green"}
                    >
                      {test.node.type}
                    </Badge>
                    <Text fw={500}>{test.node.name}</Text>
                  </Group>
                  <Group>
                    {test.avgLatency && (
                      <Group gap={4}>
                        <IconClock size={14} />
                        <Text size="sm">{test.avgLatency.toFixed(2)}ms</Text>
                      </Group>
                    )}
                    {getStatusIcon(test.status)}
                    <Button
                      size="xs"
                      variant="subtle"
                      onClick={() => testNode(index)}
                      loading={test.status === "testing"}
                    >
                      测试
                    </Button>
                  </Group>
                </Group>

                <Text size="xs" c="dimmed" ff="monospace" mb="xs">
                  {test.node.id}
                </Text>

                {test.found && test.addresses.length > 0 && (
                  <Stack gap={4}>
                    <Text size="sm" fw={500}>
                      发现的地址:
                    </Text>
                    {test.addresses.map((addr, i) => (
                      <Text key={i} size="xs" ff="monospace" c="dimmed">
                        {addr}
                      </Text>
                    ))}
                  </Stack>
                )}

                {test.status === "error" && !test.found && (
                  <Alert color="red">无法找到或连接到此节点</Alert>
                )}
              </Paper>
            ))}
          </Stack>
        </Card>

        {/* API 说明 */}
        <Card withBorder>
          <Group mb="md">
            <ThemeIcon variant="light" color="gray">
              <IconWorldWww size={18} />
            </ThemeIcon>
            <Title order={4}>使用的 API</Title>
          </Group>

          <Stack gap="xs">
            <Group>
              <Badge variant="dot" color="blue">
                GET
              </Badge>
              <Text size="sm" ff="monospace">
                /api/v0/id
              </Text>
              <Text size="sm" c="dimmed">
                获取节点信息
              </Text>
            </Group>
            <Group>
              <Badge variant="dot" color="blue">
                POST
              </Badge>
              <Text size="sm" ff="monospace">
                /api/v0/swarm/peers
              </Text>
              <Text size="sm" c="dimmed">
                获取对等节点列表
              </Text>
            </Group>
            <Group>
              <Badge variant="dot" color="blue">
                POST
              </Badge>
              <Text size="sm" ff="monospace">
                /api/v0/routing/findpeer
              </Text>
              <Text size="sm" c="dimmed">
                查找特定节点
              </Text>
            </Group>
            <Group>
              <Badge variant="dot" color="blue">
                POST
              </Badge>
              <Text size="sm" ff="monospace">
                /api/v0/ping
              </Text>
              <Text size="sm" c="dimmed">
                测试节点连通性
              </Text>
            </Group>
          </Stack>
        </Card>
      </Stack>
    </Container>
  );
}
