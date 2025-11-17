"use client";
import { Box } from "@mantine/core";
import "./chat.scss";
import ChatList from "@/app/aura/components/chat/ChatList";
import ChatDetail from "@/app/aura/components/chat/ChatDetail";
import { ChatProvider } from "@/app/aura/components/chat/useChat";
import { useChat } from "@/app/aura/components/chat/useChat";

function ChatAppInner() {
  const { activeId } = useChat();
  const cls = activeId ? "has-active" : "no-active";
  return (
    <div className={`chat-app ${cls}`}>
      <ChatList />
      <ChatDetail />
    </div>
  );
}

export default function PageIM() {
  return (
    <Box>
      <ChatProvider>
        <ChatAppInner />
      </ChatProvider>
    </Box>
  );
}
