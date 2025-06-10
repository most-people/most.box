"use client";

import { useDisclosure, useHash } from "@mantine/hooks";
import {
  Text,
  Input,
  Button,
  Stack,
  PasswordInput,
  Avatar,
  Box,
  Space,
  Switch,
  Group,
  Menu,
  Flex,
} from "@mantine/core";
import { useEffect, useState } from "react";
import mp from "@/constants/mp";
import { type MostWallet, mostWallet } from "@/constants/MostWallet";
import { AppHeader } from "@/components/AppHeader";
import { useRouter } from "next/navigation";
import "@/app/friend/chat.scss";
import { type Message, type Friend } from "@/constants/chat";
import { Messages } from "@/components/Messages";
import { IconDoorExit, IconTrash, IconUsers } from "@tabler/icons-react";
import { useBack } from "@/hooks/useBack";

const JoinTopic = ({ onUpdate }: { onUpdate: (hash: string) => void }) => {
  const router = useRouter();
  const [visible, { toggle }] = useDisclosure(false);

  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [isEncrypted, setIsEncrypted] = useState(false);

  const submit = () => {
    const hash = "#" + mp.topicJoin(name, password);
    router.replace("/topic" + hash);
    onUpdate(hash);
  };
  return (
    <Stack gap="md" className="add-box">
      <Box className="header">
        <Text size="xl" fw={500}></Text>
        <Space h="sx" />
        <Avatar
          size="xl"
          radius="md"
          src={mp.topic(mostWallet(name, "most.box#" + password).address)}
          alt="topic"
        />
      </Box>
      <Stack gap="md">
        <Input
          autoFocus
          placeholder="话题名称"
          value={name}
          onChange={(event) => setName(event.currentTarget.value)}
        />

        <Group justify="flex-end">
          <Switch
            label="加密"
            size="md"
            labelPosition="left"
            checked={isEncrypted}
            onChange={(event) => {
              setIsEncrypted(event.currentTarget.checked);
              setPassword("");
            }}
          />
        </Group>

        <PasswordInput
          placeholder="话题密码"
          visible={visible}
          onVisibilityChange={toggle}
          value={password}
          disabled={!isEncrypted}
          onChange={(event) => setPassword(event.currentTarget.value)}
        />

        <Button onClick={submit} disabled={!name}>
          加入话题
        </Button>
      </Stack>
    </Stack>
  );
};

export default function PageTopic() {
  const [hash] = useHash();
  const back = useBack();
  const [topicWallet, setTopicWallet] = useState<MostWallet | null>(null);

  const quitTopic = () => {
    if (topicWallet) {
      back();
    }
  };

  const init = (hash: string) => {
    try {
      const [name, password] = mp.topicSplit(hash);
      const topicWallet = mostWallet(
        name,
        "most.box#" + password,
        "I know loss mnemonic will lose my wallet."
      );
      setTopicWallet(topicWallet);
    } catch (error) {
      console.log("hash 解析错误", error);
    }
  };
  const messages: Message[] = [];
  const send = () => {};
  const clear = () => {};
  const del = () => {};

  const [mounted, setMounted] = useState(false);
  const [showMember, setShowMember] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (hash) {
      init(hash);
    }
  }, [hash]);

  const members: Friend[] = [];

  return (
    <Box id="page-chat">
      <AppHeader
        title={
          topicWallet
            ? `${topicWallet.username}#${topicWallet.address.slice(-4)}`
            : "话题"
        }
        right={
          <Menu
            shadow="md"
            position="bottom-end"
            withArrow
            arrowPosition="center"
            disabled={!topicWallet}
          >
            <Menu.Target>
              <Avatar
                style={{ cursor: "pointer" }}
                src={
                  topicWallet
                    ? mp.topic(topicWallet.address)
                    : "/icons/pwa-512x512.png"
                }
              />
            </Menu.Target>

            <Menu.Dropdown>
              <Menu.Item
                leftSection={<IconUsers size={24} />}
                onClick={() => setShowMember(!showMember)}
              >
                <Text>{showMember ? "隐藏" : "显示"}成员</Text>
              </Menu.Item>

              <Menu.Item leftSection={<IconTrash size={24} />} onClick={clear}>
                <Text>清空我的消息</Text>
              </Menu.Item>

              <Menu.Item
                leftSection={<IconDoorExit size={24} />}
                onClick={quitTopic}
              >
                <Text>退出话题</Text>
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        }
      />

      {showMember && (
        <Group justify="center" pb={10} pt={10}>
          {members.map((member) => {
            return (
              <Flex
                key={member.address}
                direction="column"
                align="center"
                gap={2}
              >
                <Avatar src={mp.avatar(member.address)} />
                <Text size="sm">{member.username}</Text>
              </Flex>
            );
          })}
        </Group>
      )}

      {topicWallet && (
        <Messages onSend={send} messages={messages} onDelete={del} />
      )}
      {mounted && !topicWallet && <JoinTopic onUpdate={init} />}
    </Box>
  );
}
