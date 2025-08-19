// import { useState, useEffect } from "react";
// import wordsData from "@/assets/json/in-a-word.json";
import { Text, Container, Title, Accordion, Divider } from "@mantine/core";
import "./explore.scss";

export default function HomeExplore() {
  // const [randomWord, setRandomWord] = useState("");

  // useEffect(() => {
  //   // 随机选择一句话
  //   const randomIndex = Math.floor(Math.random() * wordsData.length);
  //   setRandomWord(wordsData[randomIndex]);
  // }, []);

  return (
    <Container py="md">
      <Title size="h3">Most.Box - 如影随形</Title>
      <Text c="dimmed">——「轻松简单、开源免费、部署自己的云盘」</Text>

      <Divider my="md" />
      {/* <Text c="dimmed">{randomWord}</Text> */}

      <Accordion my="md" variant="separated" defaultValue="IPFS">
        <Accordion.Item value="IPFS">
          <Accordion.Control icon="🍎">1. IPFS</Accordion.Control>
          <Accordion.Panel>
            <Text>
              IPFS (InterPlanetary File System)
              是一种点对点的分布式文件系统协议。旨在创建一个更开放、更快速、更安全、更持久化的网络，以取代或补充目前主导互联网的
              http 协议。
            </Text>
            <Title size="h4">核心思想：从“位置寻址”到“内容寻址”</Title>
            <li>
              IPFS: 你通过一个内容本身的唯一加密哈希值 (称为 CID - Content
              Identifier)
              来访问内容。这个哈希值就像是内容的数字指纹，完全由内容本身计算得来。只要内容不变，哈希值就不变。这称为
              “内容寻址” - 你通过内容本身（其指纹）请求内容。
            </li>
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
    </Container>
  );
}
