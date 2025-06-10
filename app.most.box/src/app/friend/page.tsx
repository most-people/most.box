"use client";

import {
  Text,
  Button,
  Stack,
  Avatar,
  Box,
  Space,
  Textarea,
  Menu,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import mp from "@/constants/mp";
import { AppHeader } from "@/components/AppHeader";
import "@/app/friend/chat.scss";
import { getAddress, isAddress, ZeroAddress } from "ethers";
import { useUserStore } from "@/stores/userStore";
import { useEffect, useState } from "react";
import { useHash } from "@mantine/hooks";
import { Messages } from "@/components/Messages";
import { IconDoorExit, IconTrash } from "@tabler/icons-react";
import { useBack } from "@/hooks/useBack";
import { type Friend, type Message } from "@/constants/chat";

const AddFriend = () => {
  const form = useForm({
    initialValues: {
      address: "",
    },
    validate: {
      address: (value) => (!isAddress(value) ? "请输入有效的以太坊地址" : null),
    },
  });

  const submit = () => {
    if (!form.validate().hasErrors) {
      const address = getAddress(form.values.address);
      console.log("address", address);
    }
  };

  return (
    <Stack gap="md" className="add-box">
      <Box className="header">
        <Text size="xl" fw={500}></Text>
        <Space h="sx" />
        <Avatar
          size="xl"
          radius="md"
          src={
            isAddress(form.values.address)
              ? mp.avatar(form.values.address)
              : "/icons/pwa-512x512.png"
          }
          alt="it's me"
        />
      </Box>
      <form onSubmit={form.onSubmit(submit)}>
        <Stack gap="md">
          <Textarea
            withAsterisk
            label="好友地址"
            placeholder={ZeroAddress}
            rows={2}
            maxLength={42}
            {...form.getInputProps("address")}
          />
          <Button type="submit" disabled={!form.values.address}>
            添加好友
          </Button>
        </Stack>
      </form>
    </Stack>
  );
};

export default function PageFriend() {
  const back = useBack();
  const [hash] = useHash();
  const [friendAddress, setFriendAddress] = useState("");

  const wallet = useUserStore((state) => state.wallet);

  const removeFriend = () => {
    back();
  };

  const [friend] = useState<Friend | null>(null);
  const messages: Message[] = [];
  const send = () => {};
  const clear = () => {};
  const del = () => {};

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (hash) {
      if (isAddress(hash.slice(1))) {
        setFriendAddress(hash.slice(1));
      }
    }
  }, [hash]);

  const title =
    friendAddress === wallet?.address
      ? "文件传输助手"
      : friend
      ? `${friend.username}#${friendAddress.slice(-4)}`
      : "好友";

  return (
    <Box id="page-chat">
      <AppHeader
        title={title}
        right={
          <Menu
            shadow="md"
            position="bottom-end"
            withArrow
            arrowPosition="center"
            disabled={!friendAddress}
          >
            <Menu.Target>
              <Avatar
                style={{ cursor: "pointer" }}
                src={
                  friendAddress
                    ? mp.avatar(friendAddress)
                    : "/icons/pwa-512x512.png"
                }
              />
            </Menu.Target>

            <Menu.Dropdown>
              <Menu.Item
                leftSection={<IconDoorExit size={24} />}
                onClick={removeFriend}
              >
                <Text>删除好友</Text>
              </Menu.Item>
              <Menu.Item leftSection={<IconTrash size={24} />} onClick={clear}>
                <Text>清空我的消息</Text>
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        }
      />
      {friend?.public_key && (
        <Messages onSend={send} messages={messages} onDelete={del} />
      )}
      {mounted && !friendAddress && <AddFriend />}
    </Box>
  );
}
