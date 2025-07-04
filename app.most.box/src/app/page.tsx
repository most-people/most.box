"use client";
import { useEffect, useState } from "react";
import { Tabs, Text } from "@mantine/core";
import { Icon } from "@/components/Icon";
import HomeMine from "@/components/home/mine";
import HomeDisk from "@/components/home/disk";

import "./page.scss";
import HomeNote from "@/components/home/note";
import HomeExplore from "@/components/home/explore";
// import { useHash } from "@mantine/hooks";
// import { useRouter } from "next/navigation";

export default function PageHome() {
  // const router = useRouter();
  // const [hash] = useHash();
  const [homeTab, setHomeTab] = useState<string | null>(null);

  const tabChange = (value: string | null) => {
    setHomeTab(value);
    localStorage.setItem("homeTab", value || "disk");
  };

  useEffect(() => {
    const activeTab = localStorage.getItem("homeTab");
    setHomeTab(activeTab || "disk");
    // const query = new URLSearchParams(window.location.search);
    // const keyword = Array.from(query.keys());
    // if (keyword.length > 0) {
    //   router.replace("/search?q=" + keyword[0]);
    // }
  }, []);

  return (
    <Tabs
      id="page-home"
      variant="pills"
      radius={0}
      value={homeTab}
      onChange={tabChange}
    >
      <Tabs.Panel keepMounted value="disk">
        <HomeDisk />
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
        <Tabs.Tab value="disk">
          <Icon name={homeTab === "disk" ? "ChatActive" : "Chat"} />
          <Text>网盘</Text>
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
  );
}
