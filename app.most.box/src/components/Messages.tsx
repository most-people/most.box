import {
  Box,
  Group,
  ActionIcon,
  Textarea,
  Avatar,
  Center,
  Button,
  Menu,
  Text,
  Modal,
  Stack,
} from "@mantine/core";
import { useClipboard } from "@mantine/hooks";
import {
  IconCopy,
  IconMicrophone,
  IconMoodSmile,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";
import { Message } from "@/hooks/useFriend";
import { useUserStore } from "@/stores/userStore";
import mp from "@/constants/mp";
import { usePathname } from "next/navigation";
import { notifications } from "@mantine/notifications";
import Link from "next/link";
import dayjs from "dayjs";

interface MessagesProps {
  messages: Message[];
  onSend: (text: string) => void;
  onDelete?: (message: Message) => void;
}

type MessagesType = "topic" | "friend";

export const Messages = ({ messages, onSend, onDelete }: MessagesProps) => {
  const clipboard = useClipboard();

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [messageDelete, setMessageDelete] = useState<Message | null>(null);
  const [longTimer, setLongTimer] = useState<NodeJS.Timeout | null>(null);
  const [activeMessage, setActiveMessage] = useState<number | null>(null);

  const [text, setText] = useState("");

  const wallet = useUserStore((state) => state.wallet);
  const pathname = usePathname();
  const messagesType = pathname.split("/")[1] as MessagesType;

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 消息列表更新时自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 处理长按事件
  const touchStart = (timestamp: number) => {
    if (longTimer) clearTimeout(longTimer);
    const timer = setTimeout(() => {
      setActiveMessage(timestamp);
    }, 500);
    setLongTimer(timer);
  };

  const touchEnd = () => {
    if (longTimer) {
      clearTimeout(longTimer);
      setLongTimer(null);
    }
  };

  // 处理删除消息
  const delMessage = (message: Message) => {
    setMessageDelete(message);
    setConfirmDelete(true);
  };

  const delMessageConfirm = () => {
    if (messageDelete && onDelete) {
      onDelete(messageDelete);
    }
    setConfirmDelete(false);
    setMessageDelete(null);
    setActiveMessage(null);
  };

  // 处理复制消息
  const copyMessage = (message: Message) => {
    clipboard.copy(message.text);
    notifications.show({
      message: "复制成功",
      color: "teal",
      autoClose: 1000,
    });
    setActiveMessage(null);
  };

  return (
    <>
      <Box className="messages">
        {messages.map((message, index) => {
          const isMe = message.address === wallet?.address;

          return (
            <Box
              key={message.timestamp}
              className={`message-box ${isMe ? "me" : ""}`}
              onTouchStart={() => touchStart(message.timestamp)}
              onTouchEnd={touchEnd}
              onTouchCancel={touchEnd}
              onContextMenu={(e) => {
                e.preventDefault();
                setActiveMessage(message.timestamp);
              }}
            >
              {messagesType === "topic" && (
                <Box
                  className="avatar"
                  component={Link}
                  href={{
                    pathname: "/friend",
                    hash: message.address,
                  }}
                >
                  {message.address !== wallet?.address &&
                    message.address !== messages[index + 1]?.address && (
                      <Avatar src={mp.avatar(message.address)} />
                    )}
                </Box>
              )}

              <Menu
                opened={activeMessage === message.timestamp}
                onChange={() =>
                  activeMessage === message.timestamp && setActiveMessage(null)
                }
                position={isMe ? "bottom-start" : "bottom-end"}
              >
                <Menu.Target>
                  <Box className="message">
                    <Box className="content">{message.text}</Box>
                  </Box>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Item
                    leftSection={<IconCopy size={20} />}
                    onClick={() => copyMessage(message)}
                  >
                    复制
                  </Menu.Item>
                  <Menu.Item
                    disabled={!isMe && messagesType === "friend"}
                    leftSection={<IconTrash size={20} />}
                    onClick={() => delMessage(message)}
                  >
                    删除
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
            </Box>
          );
        })}
        <Box ref={messagesEndRef} />
      </Box>

      {!wallet && (
        <Center>
          <Button mb="lg" variant="gradient" component={Link} href="/login">
            去登录
          </Button>
        </Center>
      )}

      <Group gap="xs" className="message-input">
        <ActionIcon variant="subtle" color="gray" size="lg">
          <IconMoodSmile size={24} />
        </ActionIcon>
        <Textarea
          placeholder="输入消息..."
          size="md"
          radius="md"
          autosize
          maxRows={4}
          style={{ flex: 1 }}
          value={text}
          onChange={(event) => setText(event.currentTarget.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              if (event.shiftKey) return;
              event.preventDefault();
              if (text.trim()) {
                onSend(text);
                setText("");
              }
            }
          }}
        />
        <ActionIcon variant="subtle" color="gray" size="lg">
          <IconMicrophone size={24} />
        </ActionIcon>
        <ActionIcon variant="subtle" color="gray" size="lg">
          <IconPlus size={24} />
        </ActionIcon>
      </Group>

      <Modal
        opened={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="确认要删除这个消息吗？"
        centered
      >
        {messageDelete && (
          <Stack>
            <Text size="xl">{messageDelete.text}</Text>
            <Text c="dimmed">
              {dayjs(messageDelete.timestamp).fromNow()}：
              {mp.formatTime(messageDelete.timestamp)}
            </Text>
          </Stack>
        )}

        <Group justify="space-between">
          <Text c="dimmed">删除后将无法恢复</Text>
          <Group>
            <Button onClick={() => setConfirmDelete(false)} variant="default">
              取消
            </Button>
            <Button onClick={delMessageConfirm}>删除</Button>
          </Group>
        </Group>
      </Modal>
    </>
  );
};
