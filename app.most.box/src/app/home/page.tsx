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
  Paper,
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
  IconCheck,
} from "@tabler/icons-react";
import classes from "./page.module.css";

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
    <div className={classes.hero}>
      <Container size="lg">
        <Stack align="center" gap="xl">
          <Badge variant="light" size="lg" radius="xl" color="blue">
            Web3 Storage
          </Badge>

          <Stack className={classes.heroTitle}>
            <span>Most.Box 如影随形</span>
            <span className={classes.gradientText}>数字资产，从此永生</span>
          </Stack>

          <Text c="dimmed" size="xl" maw={600} ta="center" lh={1.6}>
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
            <Button
              size="xl"
              radius="xl"
              variant="default"
              leftSection={<IconRocket size={20} />}
            >
              了解更多
            </Button>
          </Group>
        </Stack>
      </Container>
    </div>
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
    <Container size="lg" py={100} id="pain-points">
      <Title order={2} className={classes.sectionTitle}>
        直击核心痛点
      </Title>
      <SimpleGrid cols={{ base: 1, md: 3 }} spacing={30}>
        {points.map((item) => (
          <Paper
            key={item.title}
            radius="md"
            p="xl"
            withBorder
            className={classes.card}
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
    <Container size="lg" py={100}>
      <Title order={2} className={classes.sectionTitle}>
        核心功能
      </Title>
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing={50}>
        {features.map((feature) => (
          <Card
            key={feature.title}
            radius="md"
            padding="lg"
            className={classes.card}
            withBorder
          >
            <Group align="flex-start">
              <div className={classes.featureIcon}>
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
  );
}

function TechStackSection() {
  const stack = [
    {
      label: "存储层：Crust Network",
      desc: "基于 TEE 的去中心化存储层",
      icon: IconServer,
    },
    {
      label: "逻辑层：Cloudflare Workers",
      desc: "毫秒级响应的边缘计算",
      icon: IconCloud,
    },
    {
      label: "数据层：Cloudflare D1",
      desc: "高性能边缘 SQL 数据库",
      icon: IconDatabase,
    },
    { label: "协议层：IPFS", desc: "内容寻址，全球唯一标识", icon: IconWorld },
  ];

  return (
    <Container size="lg" py={100} bg="var(--mantine-color-gray-light)">
      <Stack align="center" mb={50}>
        <Title order={2} className={classes.sectionTitle} mb={0}>
          技术背书
        </Title>
        <Text c="dimmed">透明、开放、不可篡改</Text>
      </Stack>

      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
        {stack.map((item, index) => (
          <Paper
            key={index}
            p="lg"
            radius="md"
            withBorder
            className={classes.card}
          >
            <Group>
              <ThemeIcon variant="light" size="xl" radius="md" color="gray">
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
  );
}

function FaqSection() {
  return (
    <Container size="sm" py={100}>
      <Title order={2} className={classes.sectionTitle}>
        常见问题
      </Title>

      <Accordion variant="separated" radius="md" chevronPosition="left">
        <Accordion.Item value="expire" mb="sm">
          <Accordion.Control
            icon={<IconCheck size={20} color="var(--mantine-color-blue-6)" />}
          >
            <Text fw={500}>6个月到期后文件会丢吗？</Text>
          </Accordion.Control>
          <Accordion.Panel c="dimmed">
            不会。Most.box
            会自动管理你的“续费池”。只要你的账户余额充足，系统会自动在链上发起续费交易，确保存储周期无限顺延。
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="token" mb="sm">
          <Accordion.Control
            icon={<IconCheck size={20} color="var(--mantine-color-blue-6)" />}
          >
            <Text fw={500}>我需要买 CRU 代币吗？</Text>
          </Accordion.Control>
          <Accordion.Panel c="dimmed">
            不需要。我们通过 Hono
            后端逻辑帮你完成了复杂的链上交互，你只需像使用普通网盘一样操作即可。
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="why" mb="sm">
          <Accordion.Control
            icon={<IconCheck size={20} color="var(--mantine-color-blue-6)" />}
          >
            <Text fw={500}>为什么选 Most.box 而不是百度网盘？</Text>
          </Accordion.Control>
          <Accordion.Panel c="dimmed">
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
    <Container size="lg" py={100}>
      <Card radius="lg" p={80} className={classes.ctaCard} ta="center">
        <Title order={2} mb="md" c="white">
          准备好开始了吗？
        </Title>
        <Text size="lg" c="white" opacity={0.9} mb="xl" maw={600} mx="auto">
          无需注册，连接钱包或邮箱即可免费体验 100MB 永久存储。
        </Text>
        <Button size="xl" radius="xl" variant="white" c="blue">
          立即开始存储
        </Button>
      </Card>
    </Container>
  );
}
