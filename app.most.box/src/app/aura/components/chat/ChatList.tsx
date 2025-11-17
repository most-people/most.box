"use client";
import { useMemo, useState } from "react";
import {
  Avatar,
  Badge,
  Button,
  Group,
  Stack,
  Text,
  TextInput,
  Title,
  Menu,
  ActionIcon,
  Modal,
  Textarea,
} from "@mantine/core";
import {
  IconSearch,
  IconPlus,
  IconUsers,
  IconMessageCircle,
  IconNotebook,
} from "@tabler/icons-react";
import { useChat } from "./useChat";

export default function ChatList() {
  const { contacts, activeId, setActive, addContact, createGroup } = useChat();
  const [search, setSearch] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [groupOpen, setGroupOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [contactName, setContactName] = useState("");
  const [groupName, setGroupName] = useState("");
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const setOpenContact = (open: boolean) => setContactOpen(open);

  const list = useMemo(
    () =>
      contacts
        .filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))
        .sort((a, b) => b.lastTs - a.lastTs),
    [contacts, search]
  );

  return (
    <aside className="chat-list">
      <div className="list-header">
        <Title order={4}>消息</Title>
        <Text size="xs" c="dimmed">
          {contacts.length} 个会话
        </Text>
      </div>
      <Group mt={8} gap={8} wrap="nowrap" align="center">
        <TextInput
          placeholder="搜索联系人或群组"
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
          leftSection={<IconSearch size={16} />}
          style={{ flex: 1 }}
        />
        <Menu opened={menuOpen} onChange={setMenuOpen} withinPortal>
          <Menu.Target>
            <ActionIcon
              variant="light"
              aria-label="添加"
              onClick={() => setMenuOpen((o) => !o)}
            >
              <IconPlus size={16} />
            </ActionIcon>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Item
              leftSection={<IconMessageCircle size={16} />}
              onClick={() => {
                setMenuOpen(false);
                setGroupName("");
                setGroupOpen(true);
              }}
            >
              发起群聊
            </Menu.Item>
            <Menu.Item
              leftSection={<IconUsers size={16} />}
              onClick={() => {
                setMenuOpen(false);
                setContactName("");
                setGroupName("");
                setNoteTitle("");
                setNoteContent("");
                setOpenContact(true);
              }}
            >
              添加朋友
            </Menu.Item>
            <Menu.Item
              leftSection={<IconNotebook size={16} />}
              onClick={() => {
                setMenuOpen(false);
                setNoteTitle("");
                setNoteContent("");
                setNoteOpen(true);
              }}
            >
              新建笔记
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Group>

      {/* 添加好友弹窗 */}
      <Modal
        opened={contactOpen}
        onClose={() => {
          setContactOpen(false);
          setContactName("");
        }}
        title="添加朋友"
      >
        <Stack gap={8}>
          <TextInput
            placeholder="好友昵称"
            value={contactName}
            onChange={(e) => setContactName(e.currentTarget.value)}
          />
          <Group justify="flex-end">
            <Button
              variant="light"
              onClick={() => {
                setContactOpen(false);
                setContactName("");
              }}
            >
              取消
            </Button>
            <Button
              onClick={() => {
                if (contactName.trim()) {
                  addContact(contactName);
                  setContactName("");
                  setContactOpen(false);
                }
              }}
            >
              添加
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* 创建群组弹窗 */}
      <Modal
        opened={groupOpen}
        onClose={() => setGroupOpen(false)}
        title="发起群聊"
      >
        <Stack gap={8}>
          <TextInput
            placeholder="群组名称"
            value={groupName}
            onChange={(e) => setGroupName(e.currentTarget.value)}
          />
          <Group justify="flex-end">
            <Button variant="light" onClick={() => setGroupOpen(false)}>
              取消
            </Button>
            <Button
              onClick={() => {
                if (groupName.trim()) {
                  createGroup(groupName);
                  setGroupName("");
                  setGroupOpen(false);
                }
              }}
            >
              创建
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* 新建笔记弹窗（前端模拟） */}
      <Modal
        opened={noteOpen}
        onClose={() => setNoteOpen(false)}
        title="新建笔记"
      >
        <Stack gap={8}>
          <TextInput
            placeholder="标题"
            value={noteTitle}
            onChange={(e) => setNoteTitle(e.currentTarget.value)}
          />
          <Textarea
            placeholder="内容"
            value={noteContent}
            onChange={(e) => setNoteContent(e.currentTarget.value)}
            autosize
            minRows={3}
          />
          <Group justify="flex-end">
            <Button variant="light" onClick={() => setNoteOpen(false)}>
              取消
            </Button>
            <Button
              onClick={() => {
                if (noteTitle.trim()) {
                  setNoteOpen(false);
                  setNoteTitle("");
                  setNoteContent("");
                }
              }}
            >
              保存
            </Button>
          </Group>
        </Stack>
      </Modal>

      <div className="list-items">
        {list.map((c) => (
          <button
            key={c.id}
            className={`list-item ${c.id === activeId ? "active" : ""}`}
            onClick={() => setActive(c.id)}
          >
            <Group gap={10} align="flex-start">
              <Avatar
                radius="xl"
                size={36}
                color={c.isGroup ? "grape" : "blue"}
              >
                {c.isGroup ? "G" : c.name[0]}
              </Avatar>
              <Stack gap={2} className="list-text">
                <Group justify="space-between">
                  <Text fw={600}>
                    {c.name}
                    {c.isGroup && (
                      <Text span ml={6} size="xs" c="dimmed">
                        群组
                      </Text>
                    )}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {new Date(c.lastTs).toLocaleTimeString()}
                  </Text>
                </Group>
                <Group justify="space-between" gap={6}>
                  <Text size="xs" c="dimmed" lineClamp={1}>
                    {c.lastMessage}
                  </Text>
                  {c.unread > 0 && (
                    <Badge size="xs" variant="filled" color="red">
                      {c.unread}
                    </Badge>
                  )}
                </Group>
              </Stack>
            </Group>
          </button>
        ))}
      </div>
    </aside>
  );
}
