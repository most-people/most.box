"use client";
import { useState, useEffect, useRef } from "react";
import inAWord from "@/assets/json/in-a-word.json";
import {
  Text,
  Container,
  Title,
  Accordion,
  Divider,
  Group,
  Box,
  Anchor,
  Stack,
} from "@mantine/core";
import { useMarkdown } from "@/hooks/useMarkdown";
import IPFS from "@/assets/docs/IPFS.md";
import IPv6 from "@/assets/docs/IPv6.md";
import Crust from "@/assets/docs/Crust.md";
import { useUserStore } from "@/stores/userStore";
import { Icon } from "@/components/Icon";
import Link from "next/link";
import "./explore.scss";

export default function HomeExplore() {
  const [randomWord, setRandomWord] = useState("");

  const ipfsElement = useRef<HTMLDivElement>(null);
  const ipv6Element = useRef<HTMLDivElement>(null);
  const crustElement = useRef<HTMLDivElement>(null);
  const notesDark = useUserStore((state) => state.notesDark);

  const markdown = useMarkdown();
  const init = async () => {
    if (ipfsElement.current) {
      const viewer = await markdown.initViewer(ipfsElement.current);
      viewer.setMarkdown(IPFS);
    }
    if (ipv6Element.current) {
      const viewer = await markdown.initViewer(ipv6Element.current);
      viewer.setMarkdown(IPv6);
    }
    if (crustElement.current) {
      const viewer = await markdown.initViewer(crustElement.current);
      viewer.setMarkdown(Crust);
    }
  };

  useEffect(() => {
    init();
    // 随机选择一句话
    const randomIndex = Math.floor(Math.random() * inAWord.length);
    setRandomWord(inAWord[randomIndex]);
  }, []);

  return (
    <Container py="md">
      <div className="hero">
        <Container size="lg">
          <Stack align="center" gap="xl">
            <Stack className="hero-title">
              <span className="gradient-text">数字资产，从此永生</span>
            </Stack>

            <Text c="dimmed" size="xl" maw={600} ta="center" lh={1.6}>
              基于 Crust Network 物理级加密存储，配合 Cloudflare 全球加速。
              告别传统云盘的审查与断电风险，让数据都拥有“自动续费”的永久生命力。
            </Text>
          </Stack>
        </Container>
      </div>

      <Accordion my="md" variant="separated" defaultValue="IPFS">
        <Accordion.Item value="IPFS">
          <Accordion.Control icon="🍎">1. IPFS</Accordion.Control>
          <Accordion.Panel>
            <Box className={notesDark} ref={ipfsElement} />
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="Crust">
          <Accordion.Control icon="🍌">2. Crust Network</Accordion.Control>
          <Accordion.Panel>
            <Box className={notesDark} ref={crustElement} />
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="IPv6">
          <Accordion.Control icon="🥦">3. 公网 IPV6</Accordion.Control>
          <Accordion.Panel>
            <Box className={notesDark} ref={ipv6Element} />
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>

      <Title size="h3">使用说明</Title>
      <Text c="dimmed">——「回归数据存储本质」</Text>
      <Divider my="md" />

      <Accordion my="md" variant="separated">
        <Accordion.Item value="DOT">
          <Accordion.Control icon="🌐">节点切换</Accordion.Control>
          <Accordion.Panel>
            点击左上角 <Icon name="Earth" size={24} /> 图标选择 IPFS 网关
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="NOTE">
          <Accordion.Control icon="✏️">笔记</Accordion.Control>
          <Accordion.Panel>
            点击底部 <Icon name="Note" size={24} /> 图标，创建 Markdown 笔记
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="IPFS">
          <Accordion.Control icon="📂">文件系统</Accordion.Control>
          <Accordion.Panel>
            点击左下角 <Icon name="File" size={24} /> 图标，打开 IPFS
            星级文件系统
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>

      <Divider my="md" />
      <Group justify="flex-end">
        <Text c="dimmed">——「{randomWord}」</Text>
      </Group>

      <Title size="h3">快捷入口</Title>
      <Divider my="md" />

      <Accordion my="md" variant="separated">
        <Accordion.Item value="GAME">
          <Accordion.Control icon="🦕">小游戏</Accordion.Control>
          <Accordion.Panel>
            <Group>
              <Anchor component={Link} href="/game/5">
                <Text>五子棋</Text>
              </Anchor>

              <Anchor component={Link} href="/game/black">
                <Text>黑白棋</Text>
              </Anchor>
            </Group>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    </Container>
  );
}
