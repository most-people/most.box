"use client";
import { ActionIcon, Avatar, Group, Modal, Stack, Text } from "@mantine/core";
import { IconArrowLeft, IconPhoneCall, IconVideo } from "@tabler/icons-react";
import { useState, useEffect, useRef } from "react";
import { useChat } from "./useChat";
import Composer from "./Composer";

export default function ChatDetail() {
  const { active, activeId, setActive, sendText, sendFile } = useChat();
  const msgBoxRef = useRef<HTMLDivElement | null>(null);
  const [callType, setCallType] = useState<"voice" | "video" | null>(null);

  // 滚动到消息底部
  const scrollToBottom = () => {
    const el = msgBoxRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  };

  // 在会话切换或消息条数变化时滚底（包含一次延迟，等待布局完成）
  useEffect(() => {
    scrollToBottom();
    const t = setTimeout(scrollToBottom, 50);
    return () => clearTimeout(t);
  }, [activeId, active?.messages.length]);

  // 媒体加载完成后也滚底，避免图片/视频晚加载导致位置变化
  useEffect(() => {
    const box = msgBoxRef.current;
    if (!box) return;
    const imgs = Array.from(box.querySelectorAll<HTMLImageElement>("img"));
    const vids = Array.from(box.querySelectorAll<HTMLVideoElement>("video"));
    const onImgLoad = () => scrollToBottom();
    const onVidLoad = () => scrollToBottom();
    imgs.forEach((img) => img.addEventListener("load", onImgLoad));
    vids.forEach((v) => v.addEventListener("loadeddata", onVidLoad));
    return () => {
      imgs.forEach((img) => img.removeEventListener("load", onImgLoad));
      vids.forEach((v) => v.removeEventListener("loadeddata", onVidLoad));
    };
  }, [activeId, active?.messages.length]);

  return (
    <main className="chat-detail">
      {active ? (
        <>
          <div className="chat-header">
            <Group gap={8} justify="space-between">
              <Group gap={8}>
                <ActionIcon
                  className="back-mobile"
                  variant="subtle"
                  onClick={() => setActive("")}
                >
                  <IconArrowLeft size={16} />
                </ActionIcon>
                <Avatar radius="xl" color={active.isGroup ? "grape" : "blue"}>
                  {active.isGroup ? "G" : active.name[0]}
                </Avatar>
                <Stack gap={0}>
                  <Text fw={600}>{active.name}</Text>
                  <Text size="xs" c="dimmed">
                    最近活跃 {new Date(active.lastTs).toLocaleTimeString()}
                  </Text>
                </Stack>
              </Group>
              <Group gap={8}>
                <ActionIcon
                  variant="light"
                  color="teal"
                  onClick={() => setCallType("voice")}
                >
                  <IconPhoneCall size={18} />
                </ActionIcon>
                <ActionIcon
                  variant="light"
                  color="indigo"
                  onClick={() => setCallType("video")}
                >
                  <IconVideo size={18} />
                </ActionIcon>
              </Group>
            </Group>
          </div>

          <div className="messages" ref={msgBoxRef}>
            {active.messages.map((m) => {
              const mime = m.file?.mime ?? "";
              const isImage = !!mime && mime.startsWith("image/");
              const isVideo = !!mime && mime.startsWith("video/");
              const isFile = m.kind === "file" && !isImage && !isVideo;
              return (
                <div
                  key={m.id}
                  className={`msg ${m.from === "me" ? "me" : "them"}`}
                >
                  <div
                    className={`bubble ${
                      isImage || isVideo ? "media" : isFile ? "file" : ""
                    }`}
                  >
                    {m.kind === "text" && <Text size="sm">{m.text}</Text>}
                    {isImage && m.file?.url && (
                      <a
                        href={m.file.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <img
                          src={m.file.url}
                          alt={m.file.name}
                          style={{ display: "block", width: "100%" }}
                        />
                      </a>
                    )}
                    {isVideo && m.file?.url && (
                      <video
                        src={m.file.url}
                        controls
                        style={{ display: "block", width: "100%" }}
                      />
                    )}
                    {isFile && (
                      <Stack gap={2}>
                        <Text size="sm">📎 {m.file?.name}</Text>
                        <Text size="xs" c="dimmed">
                          {Math.round((m.file?.size ?? 0) / 1024)} KB
                        </Text>
                      </Stack>
                    )}
                  </div>
                  <Text size="xs" c="dimmed" className="time">
                    {new Date(m.ts).toLocaleTimeString()}
                  </Text>
                </div>
              );
            })}
          </div>
          <Composer onSendText={sendText} onSendFile={sendFile} />

          <Modal
            opened={!!callType}
            onClose={() => setCallType(null)}
            title={callType === "voice" ? "语音通话" : "视频通话"}
            centered
          >
            <Stack align="center" gap={12}>
              <Avatar
                radius="xl"
                size={64}
                color={active.isGroup ? "grape" : "blue"}
              >
                {active.isGroup ? "G" : active.name[0]}
              </Avatar>
              <Text fw={600}>{active.name}</Text>
              <Text size="sm" c="dimmed">
                前端模拟通话界面（未接入后端）
              </Text>
              <Group>
                <ActionIcon
                  variant="filled"
                  color="red"
                  onClick={() => setCallType(null)}
                >
                  结束
                </ActionIcon>
              </Group>
            </Stack>
          </Modal>
        </>
      ) : (
        <div className="empty">
          <Text c="dimmed">选择左侧联系人开始聊天</Text>
        </div>
      )}
    </main>
  );
}
