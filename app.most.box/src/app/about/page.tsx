import { AppHeader } from "@/components/AppHeader";
import { Box, Text, Stack, Button } from "@mantine/core";
import Link from "next/link";

export default function PageAbout() {
  return (
    <Box>
      <AppHeader title="关于" />
      <Stack gap="xl" p="md">
        <Box>
          <Text size="lg" fw="bold" mb="xs">
            去中心化
          </Text>
          <Text>
            通俗地讲，就是每个人都是中心，每个人都可以连接并影响其他节点，这种扁平化、开源化、平等化的现象或结构。
          </Text>
        </Box>

        <Box>
          <Text size="lg" fw="bold" mb="xs">
            密码朋克
          </Text>
          <Text>
            热衷于使用加密技术保护隐私的人们，他们相信通过技术而不是法律，才能真正保障个人信息的安全和自由。
          </Text>
        </Box>

        <Box>
          <Text size="lg" fw="bold" mb="xs">
            论文
          </Text>
          <Link href="/about/thesis">
            IPFS + Fastify + Smart Contracts = Fully DApp
          </Link>
        </Box>

        <Stack gap="xs">
          <Text size="lg" fw="bold">
            最后更新
          </Text>
          <Text c="dimmed">2025-08-13 03:21:00</Text>
        </Stack>
      </Stack>
    </Box>
  );
}
