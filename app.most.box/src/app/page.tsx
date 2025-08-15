"use client";
import { useEffect, useMemo, useState } from "react";
import { ActionIcon, Tabs, Text } from "@mantine/core";
import { Icon } from "@/components/Icon";
import HomeMine from "@/components/home/mine";
import HomeFile from "@/components/home/file";

import "./page.scss";
import HomeNote from "@/components/home/note";
import HomeExplore from "@/components/home/explore";
import { AppHeader } from "@/components/AppHeader";
import { useUserStore } from "@/stores/userStore";
import Link from "next/link";
import HomeMore from "@/components/home/more";

export default function PageHome() {
  const [homeTab, setHomeTab] = useState<string | null>(null);
  const dotAPI = useUserStore((state) => state.dotAPI);

  const tabChange = (value: string | null) => {
    setHomeTab(value);
    localStorage.setItem("homeTab", value || "explore");
  };

  useEffect(() => {
    const activeTab = localStorage.getItem("homeTab");
    setHomeTab(activeTab || "explore");
  }, []);

  const title = useMemo(() => {
    try {
      return new URL(dotAPI).hostname.toUpperCase();
    } catch {
      return "MOST.BOX";
    }
  }, [dotAPI]);

  return (
    <>
      <AppHeader
        title={title}
        left={
          <ActionIcon
            variant="transparent"
            color="--text-color"
            component={Link}
            href="/dot"
          >
            <Icon name="Earth" size={24} />
          </ActionIcon>
        }
        right={<HomeMore homeTab={homeTab} />}
      />
      <Tabs
        id="page-home"
        variant="pills"
        radius={0}
        value={homeTab}
        onChange={tabChange}
      >
        <Tabs.Panel keepMounted value="file">
          <HomeFile />
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
          <Tabs.Tab value="file">
            <Icon name={homeTab === "file" ? "FileActive" : "File"} />
            <Text>文件</Text>
          </Tabs.Tab>
          <Tabs.Tab value="note">
            <Icon name={homeTab === "note" ? "NoteActive" : "Note"} />
            <Text>笔记</Text>
          </Tabs.Tab>
          <Tabs.Tab value="explore">
            <Icon name={homeTab === "explore" ? "ExploreActive" : "Explore"} />
            <Text>探索</Text>
          </Tabs.Tab>
          <Tabs.Tab value="mine">
            <Icon name={homeTab === "mine" ? "MineActive" : "Mine"} />
            <Text>我的</Text>
          </Tabs.Tab>
        </Tabs.List>
      </Tabs>
    </>
  );
}
