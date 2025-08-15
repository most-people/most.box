import { useState, useEffect } from "react";
import wordsData from "@/assets/json/in-a-word.json";
import {
  Text,
  Container,
  Title,
  Stack,
  Accordion,
  Box,
  Divider,
} from "@mantine/core";
import "./explore.scss";

export default function HomeExplore() {
  const [randomWord, setRandomWord] = useState("");

  useEffect(() => {
    // 随机选择一句话
    const randomIndex = Math.floor(Math.random() * wordsData.length);
    setRandomWord(wordsData[randomIndex]);
  }, []);

  return (
    <Container py="md">
      <Title>轻松简单、开源免费、部署您自己的云服务</Title>
      <Divider my="md" />
      <Text c="dimmed">{randomWord}</Text>

      <Accordion my="md" variant="separated">
        <Accordion.Item value="IPFS">
          <Accordion.Control icon="🍎">1. IPFS</Accordion.Control>
          <Accordion.Panel>
            Crisp and refreshing fruit. Apples are known for their versatility
            and nutritional benefits. They come in a variety of flavors and are
            great for snacking, baking, or adding to salads.
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="IPV6">
          <Accordion.Control icon="🍌">2. 公网 IPV6</Accordion.Control>
          <Accordion.Panel>
            Crisp and refreshing fruit. Apples are known for their versatility
            and nutritional benefits. They come in a variety of flavors and are
            great for snacking, baking, or adding to salads.
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="DOT">
          <Accordion.Control icon="🥦">3. 运行节点</Accordion.Control>
          <Accordion.Panel>
            Crisp and refreshing fruit. Apples are known for their versatility
            and nutritional benefits. They come in a variety of flavors and are
            great for snacking, baking, or adding to salads.
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>

      <Title size="h3">使用说明</Title>
      <Divider my="md" />

      <Accordion my="md" variant="separated">
        <Accordion.Item value="IPFS">
          <Accordion.Control icon="📂">文件系统</Accordion.Control>
          <Accordion.Panel>
            Crisp and refreshing fruit. Apples are known for their versatility
            and nutritional benefits. They come in a variety of flavors and are
            great for snacking, baking, or adding to salads.
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="IPV6">
          <Accordion.Control icon="✏️">笔记</Accordion.Control>
          <Accordion.Panel>
            Crisp and refreshing fruit. Apples are known for their versatility
            and nutritional benefits. They come in a variety of flavors and are
            great for snacking, baking, or adding to salads.
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="DOT">
          <Accordion.Control icon="🦕">节点切换</Accordion.Control>

          <Accordion.Panel>
            Crisp and refreshing fruit. Apples are known for their versatility
            and nutritional benefits. They come in a variety of flavors and are
            great for snacking, baking, or adding to salads.
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    </Container>
  );
}
