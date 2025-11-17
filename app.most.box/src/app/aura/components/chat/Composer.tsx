"use client";
import { ActionIcon, Group, TextInput } from "@mantine/core";
import { IconSend, IconPaperclip } from "@tabler/icons-react";
import { useRef, useState } from "react";
import EmojiPicker from "./EmojiPicker";

export default function Composer({
  onSendText,
  onSendFile,
}: {
  onSendText: (text: string) => void;
  onSendFile: (file: File) => void;
}) {
  const [input, setInput] = useState("");
  const fileRef = useRef<HTMLInputElement | null>(null);

  const insertEmoji = (emoji: string) => {
    setInput((prev) => prev + emoji);
  };

  const send = () => {
    onSendText(input);
    setInput("");
  };

  return (
    <div className="composer">
      <Group gap={8} wrap="nowrap" w="100%" align="center">
        <EmojiPicker onSelect={insertEmoji} />

        <ActionIcon
          variant="light"
          color="gray"
          onClick={() => fileRef.current?.click()}
          style={{ flexShrink: 0 }}
        >
          <IconPaperclip size={18} />
        </ActionIcon>
        <input
          ref={fileRef}
          type="file"
          hidden
          onChange={(e) => {
            const f = e.currentTarget.files?.[0];
            if (f) onSendFile(f);
            if (fileRef.current) fileRef.current.value = "";
          }}
        />

        <TextInput
          placeholder="输入消息..."
          value={input}
          onChange={(e) => setInput(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          style={{ flex: 1, minWidth: 0 }}
        />

        <ActionIcon
          variant="filled"
          color="blue"
          onClick={send}
          style={{ flexShrink: 0 }}
        >
          <IconSend size={16} />
        </ActionIcon>
      </Group>
    </div>
  );
}
