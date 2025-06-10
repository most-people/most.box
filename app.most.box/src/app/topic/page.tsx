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
import { useEffect, useMemo, useState } from "react";
import mp from "@/constants/mp";
import { type MostWallet, mostWallet } from "dot.most.box";
import { AppHeader } from "@/components/AppHeader";
import { useRouter } from "next/navigation";
import { useTopicStore } from "@/stores/topicStore";
import "@/app/friend/chat.scss";
import { useTopic } from "@/hooks/useTopic";
import { Messages } from "@/components/Messages";
import { IconDoorExit, IconTrash, IconUsers } from "@tabler/icons-react";
import { useBack } from "@/hooks/useBack";
import { Friend } from "@/hooks/useFriend";

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
  const quit = useTopicStore((state) => state.quit);
  const join = useTopicStore((state) => state.join);
  const topicInfo = useTopicStore((state) => state.topicInfo);

  const quitTopic = () => {
    if (topicWallet) {
      quit(topicWallet.address);
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
      join(name, password, topicWallet.address);
    } catch (error) {
      console.log("hash 解析错误", error);
    }
  };
  const { messages, send, clear, del } = useTopic(topicWallet);

  const [mounted, setMounted] = useState(false);
  const [showMember, setShowMember] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (hash) {
      init(hash);
    }
  }, [hash]);

  const members = useMemo(() => {
    const list: Friend[] = [];
    if (topicInfo && topicWallet) {
      for (const address in topicInfo[topicWallet.address]) {
        const item = topicInfo[topicWallet.address][address];
        list.push({
          address,
          username: item.value.username,
          public_key: item.value.public_key,
          timestamp: item.timestamp,
        });
      }
    }
    return list;
  }, [topicInfo, topicWallet]);

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
