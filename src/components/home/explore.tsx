"use client";
import { useState, useEffect } from "react";
import inAWord from "@/assets/json/in-a-word.json";
import {
  Text,
  Container,
  Title,
  Group,
  Stack,
  SimpleGrid,
  ThemeIcon,
  Paper,
  rem,
  Card,
  Box,
} from "@mantine/core";
import {
  IconShieldLock,
  IconCoin,
  IconRocket,
  IconCopy,
  IconServer,
  IconUserBitcoin,
  IconDatabase,
  IconWorld,
  IconShare,
  IconBrandGithub,
} from "@tabler/icons-react";
import "./explore.scss";

export default function HomeExplore() {
  const [randomWord, setRandomWord] = useState("");

  useEffect(() => {
    // 随机选择一句话
    const randomIndex = Math.floor(Math.random() * inAWord.length);
    setRandomWord(inAWord[randomIndex]);
  }, []);

  const points = [
    {
      icon: IconShieldLock,
      title: "怕文件被删？",
      description:
        "底层接入 IPFS + Crust 去中心化协议，数据分散存储于全球数千个节点，没有任何中心化机构可以一键删除你的文件。",
    },
    {
      icon: IconCoin,
      title: "怕忘记续费？",
      description: "利用 Crust 网络动态订单续费与预存池功能，一键批量续费。",
    },
    {
      icon: IconRocket,
      title: "怕访问慢？",
      description:
        "聚合全球多个高速网关，支持智能测速与切换。即使是去中心化存储，也能拥有秒开的上传下载体验。",
    },
  ];

  const features = [
    {
      icon: IconBrandGithub,
      title: "开源透明",
      description:
        "遵循 MIT 协议完全开源，支持本地离线运行。拒绝黑箱操作，让每一行代码都经得起审查。",
    },
    {
      icon: IconShieldLock,
      title: "物理级安全隐私",
      description:
        "数据在上传前即进行分片加密，只有持有私钥的你才能重组文件。即便是存储节点，也无法窥探你的隐私。",
    },
    {
      icon: IconCopy,
      title: "永不掉线的“影子”存储",
      description:
        "独特的多副本冗余机制（20+ 随机副本）。即使 90% 的节点下线，你的文件依然可以在地球的另一个角落被找回。",
    },
    {
      icon: IconShare,
      title: "一键分享",
      description:
        "支持一键分享文件 / 文件夹 / 笔记，生成包含二维码的分享卡片，通过 IPFS 网关永久分享你的文件。",
    },
  ];

  const stack = [
    {
      label: "协议层：IPFS Network",
      desc: "内容寻址，全球唯一标识",
      icon: IconWorld,
    },
    {
      label: "存储层：Crust Network",
      desc: "基于 TEE 的去中心化存储层",
      icon: IconServer,
    },
    {
      label: "用户层：Cold Wallet",
      desc: "基于 NaCl 与 sr25519 的本地密钥离线派生",
      icon: IconUserBitcoin,
    },
    {
      label: "数据层：Cloudflare R2 + Workers",
      desc: "高性能边缘计算与对象存储",
      icon: IconDatabase,
    },
  ];

  return (
    <div id="page-index-panel-explore">
      <div className="hero">
        <Container size="lg">
          <Stack align="center" gap="xl">
            <Stack className="hero-title">
              <span className="gradient-text">数字资产，从此永生</span>
            </Stack>

            <Text c="dimmed" size="xl" maw={600} ta="center" lh={1.6}>
              基于 Crust Network 物理级加密存储，配合全球 IPFS
              网关加速。告别传统云盘的审查与断电风险，让数据在区块链上拥有“自动续费”的永久生命力。
            </Text>
          </Stack>
        </Container>
      </div>

      <Container size="lg" py={60} id="pain-points">
        <Title order={2} className="sectionTitle">
          直击核心痛点
        </Title>
        <SimpleGrid cols={{ base: 1, md: 3 }} spacing={30}>
          {points.map((item) => (
            <Paper
              key={item.title}
              radius="md"
              p="xl"
              withBorder
              className="card"
            >
              <ThemeIcon
                size={60}
                radius={60}
                variant="light"
                color="blue"
                mb="md"
              >
                <item.icon style={{ width: rem(32), height: rem(32) }} />
              </ThemeIcon>
              <Text fz="xl" fw={700} mb="sm">
                {item.title}
              </Text>
              <Text fz="sm" c="dimmed" lh={1.6}>
                {item.description}
              </Text>
            </Paper>
          ))}
        </SimpleGrid>
      </Container>

      <Container size="lg" py={60}>
        <Title order={2} className="sectionTitle">
          核心功能
        </Title>
        <SimpleGrid cols={{ base: 1, md: 2 }} spacing={50}>
          {features.map((feature) => (
            <Card
              key={feature.title}
              radius="md"
              padding="lg"
              className="card"
              withBorder
            >
              <Group align="flex-start">
                <div className="featureIcon">
                  <feature.icon style={{ width: rem(26), height: rem(26) }} />
                </div>
                <div style={{ flex: 1 }}>
                  <Text fz="lg" fw={700} mb="xs">
                    {feature.title}
                  </Text>
                  <Text c="dimmed" lh={1.6} fz="sm">
                    {feature.description}
                  </Text>
                </div>
              </Group>
            </Card>
          ))}
        </SimpleGrid>
      </Container>

      <Box className="sectionBg">
        <Container size="lg" py={60}>
          <Stack align="center" mb={50}>
            <Title order={2} className="sectionTitle" mb={0}>
              技术背书
            </Title>
            <Text c="dimmed">透明、开放、不可篡改</Text>
          </Stack>

          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
            {stack.map((item, index) => (
              <Paper key={index} p="lg" radius="md" withBorder className="card">
                <Group>
                  <ThemeIcon variant="light" color="blue" size="xl" radius="md">
                    <item.icon size={24} />
                  </ThemeIcon>
                  <div>
                    <Text fw={700} size="md">
                      {item.label}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {item.desc}
                    </Text>
                  </div>
                </Group>
              </Paper>
            ))}
          </SimpleGrid>
        </Container>
      </Box>

      <Container py="md">
        <Group justify="center">
          <Text c="dimmed">「{randomWord}」</Text>
        </Group>
      </Container>
    </div>
  );
}
