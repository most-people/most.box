"use client";
import { createContext, useContext, useMemo, useState } from "react";
import {
  Conversation,
  Message,
  Attachment,
  minutes,
  hours,
  days,
} from "./types";

type ChatContextValue = {
  contacts: Conversation[];
  active?: Conversation;
  activeId: string;
  setActive: (id: string) => void;
  sendText: (text: string) => void;
  sendFile: (file: File) => void;
  addContact: (name: string) => void;
  createGroup: (name: string) => void;
};

const ChatContext = createContext<ChatContextValue | null>(null);

// 仅在模块加载时获取一次时间戳，避免在渲染期间调用非纯函数
const MOCK_BASE_TS = Date.now();

function initialData(): Conversation[] {
  return [
    {
      id: "alice",
      name: "Alice",
      lastMessage: "好的，明天见！",
      lastTs: MOCK_BASE_TS - minutes(3),
      unread: 2,
      messages: [
        {
          id: "m1",
          from: "them",
          kind: "text",
          text: "嗨，周末一起徒步吗？",
          ts: MOCK_BASE_TS - days(1),
        },
        {
          id: "m2",
          from: "me",
          kind: "text",
          text: "可以的！路线你来定～",
          ts: MOCK_BASE_TS - hours(23.5),
        },
        {
          id: "m3",
          from: "them",
          kind: "text",
          text: "好的，明天见！",
          ts: MOCK_BASE_TS - minutes(3),
        },
      ],
    },
    {
      id: "bob",
      name: "Bob",
      lastMessage: "合约审计报告已发你邮箱。",
      lastTs: MOCK_BASE_TS - minutes(40),
      unread: 0,
      messages: [
        {
          id: "b1",
          from: "them",
          kind: "text",
          text: "新版本部署进度如何？",
          ts: MOCK_BASE_TS - hours(12),
        },
        {
          id: "b2",
          from: "me",
          kind: "text",
          text: "CI 通过了，准备明天灰度。",
          ts: MOCK_BASE_TS - hours(11.5),
        },
        {
          id: "b3",
          from: "them",
          kind: "text",
          text: "合约审计报告已发你邮箱。",
          ts: MOCK_BASE_TS - minutes(40),
        },
      ],
    },
    {
      id: "group",
      name: "Dev DAO",
      isGroup: true,
      lastMessage: "周会改到周三下午。",
      lastTs: MOCK_BASE_TS - minutes(15),
      unread: 5,
      messages: [
        {
          id: "g1",
          from: "them",
          kind: "text",
          text: "记得提 PR 到 `develop` 分支。",
          senderName: "Gavin",
          ts: MOCK_BASE_TS - hours(6),
        },
        {
          id: "g2",
          from: "them",
          kind: "text",
          text: "周会改到周三下午。",
          senderName: "Daisy",
          ts: MOCK_BASE_TS - minutes(15),
        },
      ],
    },
  ];
}

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [contacts, setContacts] = useState<Conversation[]>(initialData());
  const [activeId, setActiveId] = useState<string>(contacts[0]?.id ?? "");

  const active = useMemo(
    () => contacts.find((c) => c.id === activeId),
    [contacts, activeId]
  );

  const setActive = (id: string) => {
    setActiveId(id);
    setContacts((prev) =>
      prev.map((c) => (c.id === id ? { ...c, unread: 0 } : c))
    );
  };

  const sendText = (text: string) => {
    if (!text.trim() || !activeId) return;
    setContacts((prev) => {
      return prev.map((c) => {
        if (c.id !== activeId) return c;
        const msg: Message = {
          id: `${c.id}-${Date.now()}`,
          from: "me",
          kind: "text",
          text,
          senderName: c.isGroup ? "我" : undefined,
          ts: Date.now(),
        };
        return {
          ...c,
          lastMessage: text,
          lastTs: msg.ts,
          messages: [...c.messages, msg],
        };
      });
    });

    // 简单自动回复
    setTimeout(() => {
      setContacts((prev) =>
        prev.map((c) => {
          if (c.id !== activeId) return c;
          const replyText = c.isGroup
            ? "收到～群里稍后跟进。"
            : "收到～我们稍后跟进。";
          const msg: Message = {
            id: `${c.id}-r-${Date.now()}`,
            from: "them",
            kind: "text",
            text: replyText,
            senderName: c.isGroup ? "助手" : undefined,
            ts: Date.now(),
          };
          return {
            ...c,
            lastMessage: replyText,
            lastTs: msg.ts,
            unread: 0,
            messages: [...c.messages, msg],
          };
        })
      );
    }, 800);
  };

  const sendFile = (file: File) => {
    if (!file || !activeId) return;
    const url = URL.createObjectURL(file);
    const att: Attachment = {
      id: `${activeId}-file-${Date.now()}`,
      name: file.name,
      size: file.size,
      mime: file.type,
      url,
    };
    const label = file.type?.startsWith("image/")
      ? "[图片]"
      : file.type?.startsWith("video/")
      ? "[视频]"
      : "[文件]";
    setContacts((prev) =>
      prev.map((c) => {
        if (c.id !== activeId) return c;
        const msg: Message = {
          id: att.id,
          from: "me",
          kind: "file",
          file: att,
          senderName: c.isGroup ? "我" : undefined,
          ts: Date.now(),
        };
        return {
          ...c,
          lastMessage: `${label} ${att.name}`,
          lastTs: msg.ts,
          messages: [...c.messages, msg],
        };
      })
    );
  };

  const addContact = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const id = trimmed.toLowerCase().replace(/\s+/g, "-");
    const exists = contacts.some((c) => c.id === id);
    if (exists) {
      setActive(id);
      return;
    }
    const now = Date.now();
    const convo: Conversation = {
      id,
      name: trimmed,
      lastMessage: "已添加联系人，开始聊天吧！",
      lastTs: now,
      unread: 0,
      messages: [
        {
          id: `${id}-welcome-${now}`,
          from: "them",
          kind: "text",
          text: "你好～这是一个模拟联系人。",
          ts: now,
        },
      ],
    };
    setContacts((prev) => [convo, ...prev]);
    setActive(id);
  };

  const createGroup = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const id = `group-${Date.now()}`;
    const now = Date.now();
    const convo: Conversation = {
      id,
      name: trimmed,
      isGroup: true,
      lastMessage: "已创建群组，邀请成员加入～",
      lastTs: now,
      unread: 0,
      messages: [
        {
          id: `${id}-welcome-${now}`,
          from: "them",
          kind: "text",
          text: "欢迎加入群组，此处为前端模拟消息。",
          senderName: "系统",
          ts: now,
        },
      ],
    };
    setContacts((prev) => [convo, ...prev]);
    setActive(id);
  };

  const value: ChatContextValue = {
    contacts,
    active,
    activeId,
    setActive,
    sendText,
    sendFile,
    addContact,
    createGroup,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat must be used within ChatProvider");
  return ctx;
}
