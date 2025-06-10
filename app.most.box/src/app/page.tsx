"use client";
import { useEffect, useState } from "react";
import { Tabs, Text } from "@mantine/core";
import { Icon } from "@/components/Icon";
import HomeMine from "@/components/home/mine";
import HomeChat from "@/components/home/chat";

import "./page.scss";
import HomeNote from "@/components/home/note";
import HomeExplore from "@/components/home/explore";
import { useHash } from "@mantine/hooks";
import { useRouter } from "next/navigation";

export default function PageHome() {
  const router = useRouter();
  const [hash] = useHash();
  const [homeTab, setHomeTab] = useState<string | null>(null);

  const tabChange = (value: string | null) => {
    setHomeTab(value);
    localStorage.setItem("homeTab", value || "chat");
  };

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const activeTab = localStorage.getItem("homeTab");
    setHomeTab(activeTab || "chat");
    const keyword = Array.from(query.keys());
    if (keyword.length > 0) {
      router.replace("/search?q=" + keyword[0]);
    }
  }, []);

  useEffect(() => {
    if (hash) {
      router.replace("/topic" + hash);
    }
  }, [hash]);

  return (
    <Tabs
      id="page-home"
      variant="pills"
      radius={0}
      value={homeTab}
      onChange={tabChange}
    >
      <Tabs.Panel keepMounted value="chat">
        <HomeChat />
      </Tabs.Panel>

      <Tabs.Panel keepMounted value="note">
        <HomeNote />
      </Tabs.Panel>

      <Tabs.Panel keepMounted value="explore">
        <HomeExplore />
      </Tabs.Panel>

      <Tabs.Panel keepMounted value="mine">
        <HomeMine />
      </Tabs.Panel>

      <Tabs.List>
        <Tabs.Tab value="chat">
          <Icon name={homeTab === "chat" ? "chat-active" : "chat"} />
          <Text>聊天</Text>
        </Tabs.Tab>
        <Tabs.Tab value="note">
          <Icon name={homeTab === "note" ? "note-active" : "note"} />
          <Text>笔记</Text>
        </Tabs.Tab>
        <Tabs.Tab value="explore">
          <Icon name={homeTab === "explore" ? "explore-active" : "explore"} />
          <Text>探索</Text>
        </Tabs.Tab>
        <Tabs.Tab value="mine">
          <Icon name={homeTab === "mine" ? "mine-active" : "mine"} />
          <Text>我的</Text>
        </Tabs.Tab>
      </Tabs.List>
    </Tabs>
  );
}
