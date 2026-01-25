"use client";

import {
  Container,
  Title,
  Text,
  Button,
  Group,
  SimpleGrid,
  ThemeIcon,
  Card,
  Accordion,
  Stack,
  rem,
  Badge,
} from "@mantine/core";
import {
  IconShieldLock,
  IconCopy,
  IconCoin,
  IconDeviceMobile,
  IconCloud,
  IconDatabase,
  IconServer,
  IconWorld,
  IconRocket,
} from "@tabler/icons-react";

// We'll define some styles inline or use Mantine props for simplicity,
// but for a real project, CSS modules or styled-components are preferred.
// I'll use Mantine's style props where possible.

export default function LandingPage() {
  return (
    <>
      <HeroSection />
      <PainPointsSection />
      <FeaturesSection />
      <TechStackSection />
      <FaqSection />
      <CtaSection />
    </>
  );
}

function HeroSection() {
  return (
    <Container size="lg" py={100}>
      <Stack align="center" gap="xl">
        <Badge variant="filled" size="lg" radius="xl" color="blue">
          Web3 Storage
        </Badge>

        <Title
          order={1}
          style={{
            fontSize: rem(48),
            fontWeight: 900,
            lineHeight: 1.1,
            textAlign: "center",
          }}
        >
          Most.Box - 如影随形
          <Text
            component="span"
            inherit
            variant="gradient"
            gradient={{ from: "blue", to: "cyan" }}
            style={{ display: "block", marginTop: rem(10) }}
          >
            你的数字资产，从此永生。
          </Text>
        </Title>

        <Text c="dimmed" size="xl" maw={600} ta="center">
          基于 Crust Network 物理级加密存储，配合 Cloudflare 全球加速。
          告别传统云盘的审查与断电风险，让每一份数据都拥有“自动续费”的永久生命力。
        </Text>

        <Group mt="xl">
          <Button
            size="xl"
            radius="xl"
            variant="gradient"
            gradient={{ from: "blue", to: "cyan" }}
          >
            立即开始存储
          </Button>
          <Button size="xl" radius="xl" variant="default">
            了解更多
          </Button>
        </Group>
      </Stack>
    </Container>
  );
}

function PainPointsSection() {
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
      description:
        "我们内置了“智能续费池”机制。只需一次托管，后端自动完成链上清算，无需手动操作，数据如影随形，跨越世纪。",
    },
    {
      icon: IconRocket,
      title: "怕大陆访问慢？",
      description:
        "针对中国大陆优化。利用 Cloudflare Workers 边缘计算与全球 CDN，即使是去中心化存储，也能拥有秒开的上传下载体验。",
    },
  ];

  return (
    <Container size="lg" py={80} id="pain-points">
      <Title order={2} ta="center" mb={50}>
        直击核心痛点
      </Title>
      <SimpleGrid cols={{ base: 1, md: 3 }} spacing={30}>
        {points.map((item) => (
          <Card
            key={item.title}
            shadow="sm"
            radius="md"
            padding="xl"
            withBorder
          >
            <ThemeIcon
              size={50}
              radius={50}
              variant="light"
              color="blue"
              mb="md"
            >
              <item.icon style={{ width: rem(28), height: rem(28) }} />
            </ThemeIcon>
            <Text fz="lg" fw={700} mb="sm">
              {item.title}
            </Text>
            <Text fz="sm" c="dimmed" lh={1.6}>
              {item.description}
            </Text>
          </Card>
        ))}
      </SimpleGrid>
    </Container>
  );
}

function FeaturesSection() {
  const features = [
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
      icon: IconCoin,
      title: "极简支付与自动化管理",
      description:
        "无需折腾加密货币。支持法币便捷充值，系统自动转化为链上存储押金，并智能监控余额，自动触发续费订单。",
    },
    {
      icon: IconDeviceMobile,
      title: "PWA 原生体验",
      description:
        "支持安装至手机桌面。无需下载臃肿的 App，通过浏览器即可享受如原生应用般的丝滑操作。",
    },
  ];

  return (
    <Container size="lg" py={80} bg="var(--mantine-color-body)">
      <Title order={2} ta="center" mb={50}>
        核心功能
      </Title>
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing={50}>
        {features.map((feature) => (
          <Group key={feature.title} align="flex-start">
            <ThemeIcon
              size={44}
              radius="md"
              variant="gradient"
              gradient={{ from: "blue", to: "cyan" }}
            >
              <feature.icon style={{ width: rem(26), height: rem(26) }} />
            </ThemeIcon>
            <div style={{ flex: 1 }}>
              <Text fz="lg" fw={700} mb="xs">
                {feature.title}
              </Text>
              <Text c="dimmed" lh={1.6}>
                {feature.description}
              </Text>
            </div>
          </Group>
        ))}
      </SimpleGrid>
    </Container>
  );
}

function TechStackSection() {
  const stack = [
    {
      label: "存储层：Crust Network (基于 TEE 的去中心化存储层)",
      icon: IconServer,
    },
    {
      label: "逻辑层：Cloudflare Workers (毫秒级响应的边缘计算)",
      icon: IconCloud,
    },
    {
      label: "数据层：Cloudflare D1 (高性能边缘 SQL 数据库)",
      icon: IconDatabase,
    },
    { label: "协议层：IPFS (内容寻址，全球唯一标识)", icon: IconWorld },
  ];

  return (
    <Container size="lg" py={80}>
      <Title order={2} ta="center" mb="xl">
        技术背书
      </Title>
      <Text c="dimmed" ta="center" mb={50}>
        透明、开放、不可篡改
      </Text>

      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
        {stack.map((item, index) => (
          <Card key={index} padding="lg" radius="md" withBorder>
            <Group>
              <ThemeIcon variant="light" size="lg" color="gray">
                <item.icon size={20} />
              </ThemeIcon>
              <Text fw={500} size="sm">
                {item.label}
              </Text>
            </Group>
          </Card>
        ))}
      </SimpleGrid>
    </Container>
  );
}

function FaqSection() {
  return (
    <Container size="sm" py={80}>
      <Title order={2} ta="center" mb={50}>
        常见问题
      </Title>

      <Accordion variant="separated" radius="md">
        <Accordion.Item value="expire">
          <Accordion.Control>6个月到期后文件会丢吗？</Accordion.Control>
          <Accordion.Panel>
            不会。Most.box
            会自动管理你的“续费池”。只要你的账户余额充足，系统会自动在链上发起续费交易，确保存储周期无限顺延。
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="token">
          <Accordion.Control>我需要买 CRU 代币吗？</Accordion.Control>
          <Accordion.Panel>
            不需要。我们通过 Hono
            后端逻辑帮你完成了复杂的链上交互，你只需像使用普通网盘一样操作即可。
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="why">
          <Accordion.Control>
            为什么选 Most.box 而不是百度网盘？
          </Accordion.Control>
          <Accordion.Panel>
            因为在
            Most.box，数据真正属于你。没有限速，没有审查，没有服务停摆导致文件丢失的风险。
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    </Container>
  );
}

function CtaSection() {
  return (
    <Container size="lg" py={80} ta="center">
      <Card radius="lg" padding={60} bg="var(--mantine-color-blue-light)">
        <Title order={2} mb="md">
          准备好开始了吗？
        </Title>
        <Text size="lg" c="dimmed" mb="xl" maw={600} mx="auto">
          无需注册，连接钱包或邮箱即可免费体验 100MB 永久存储。
        </Text>
        <Button size="xl" radius="xl" variant="filled" color="blue">
          立即开始存储
        </Button>
      </Card>
    </Container>
  );
}
