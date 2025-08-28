"use client";
import { useState, useEffect, useRef } from "react";
import wordsData from "@/assets/json/in-a-word.json";
import {
  Text,
  Container,
  Title,
  Accordion,
  Divider,
  Group,
  Box,
} from "@mantine/core";
import { useMarkdown } from "@/hooks/useMarkdown";
import IPFS from "@/assets/docs/IPFS.md";
import IPv6 from "@/assets/docs/IPv6.md";
import RunDot from "@/assets/docs/run-dot.md";
import "./explore.scss";
import { useUserStore } from "@/stores/userStore";

export default function HomeExplore() {
  const [randomWord, setRandomWord] = useState("");

  const ipfsElement = useRef<HTMLDivElement>(null);
  const ipv6Element = useRef<HTMLDivElement>(null);
  const runDotElement = useRef<HTMLDivElement>(null);
  const nodeDark = useUserStore((state) => state.nodeDark);

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
    if (runDotElement.current) {
      const viewer = await markdown.initViewer(runDotElement.current);
      viewer.setMarkdown(RunDot);
    }
  };

  useEffect(() => {
    init();
    // 随机选择一句话
    const randomIndex = Math.floor(Math.random() * wordsData.length);
    setRandomWord(wordsData[randomIndex]);
  }, []);

  return (
    <Container py="md">
      <Title size="h3">Most.Box - 如影随形</Title>
      <Text c="dimmed">——「轻松简单、开源免费、部署自己的节点」</Text>

      <Divider my="md" />

      <Accordion my="md" variant="separated" defaultValue="IPFS">
        <Accordion.Item value="IPFS">
          <Accordion.Control icon="🍎">1. IPFS</Accordion.Control>
          <Accordion.Panel>
            <Box className={nodeDark} ref={ipfsElement} />
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="IPv6">
          <Accordion.Control icon="🍌">2. 公网 IPV6</Accordion.Control>
          <Accordion.Panel>
            <Box className={nodeDark} ref={ipv6Element} />
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="DOT">
          <Accordion.Control icon="🥦">3. 运行节点</Accordion.Control>
          <Accordion.Panel>
            <Box className={nodeDark} ref={runDotElement} />
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>

      <Title size="h3">使用说明</Title>
      <Text c="dimmed">——「回归数据存储本质」</Text>
      <Divider my="md" />

      <Accordion my="md" variant="separated">
        <Accordion.Item value="DOT">
          <Accordion.Control icon="🦕">节点切换</Accordion.Control>
          <Accordion.Panel>
            Crisp and refreshing fruit. Apples are known for their versatility
            and nutritional benefits. They come in a variety of flavors and are
            great for snacking, baking, or adding to salads.
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="NOTE">
          <Accordion.Control icon="✏️">笔记</Accordion.Control>
          <Accordion.Panel>
            Crisp and refreshing fruit. Apples are known for their versatility
            and nutritional benefits. They come in a variety of flavors and are
            great for snacking, baking, or adding to salads.
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="IPFS">
          <Accordion.Control icon="📂">文件系统</Accordion.Control>
          <Accordion.Panel>
            Crisp and refreshing fruit. Apples are known for their versatility
            and nutritional benefits. They come in a variety of flavors and are
            great for snacking, baking, or adding to salads.
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>

      <Divider my="md" />
      <Group justify="flex-end">
        <Text c="dimmed">——「{randomWord}」</Text>
      </Group>
    </Container>
  );
}
