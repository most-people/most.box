import { CONTRACT_ABI_NAME, CONTRACT_ADDRESS_NAME } from "@/constants/dot";
import { ActionIcon, Anchor, Box, Menu, Stack, Text } from "@mantine/core";
import { Contract, isAddress, JsonRpcProvider } from "ethers";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import mp from "@/constants/mp";
// import { api } from "@/constants/api";
import { useUserStore } from "@/stores/userStore";
// import { useMarkdown } from "@/hooks/useMarkdown";
import { Icon } from "../Icon";
// import Link from "next/link";
import { notifications } from "@mantine/notifications";
import { useDotStore } from "@/stores/dotStore";
import Link from "next/link";

export default function PageUser() {
  const pathname = usePathname();
  const [uid, setUid] = useState("");
  const RPC = useDotStore((state) => state.RPC);
  const Explorer = useDotStore((state) => state.Explorer);
  const [API, setAPI] = useState("");

  const [owner, setOwner] = useState("");
  const [username, setUsername] = useState("");

  useEffect(() => {
    setUid(pathname.split("/")[1].slice(1));
  }, [pathname]);

  const fetchOwner = async (name: string) => {
    try {
      const provider = new JsonRpcProvider(RPC);
      const contract = new Contract(
        CONTRACT_ADDRESS_NAME,
        CONTRACT_ABI_NAME,
        provider
      );

      const owner = await contract.getOwner(name);
      setOwner(owner);
      fetchName(owner);
    } catch (err) {
      console.warn("获取地址失败", err);
      notifications.show({
        message: `获取地址失败`,
        color: "red",
      });
    }
  };
  const fetchName = async (address: string) => {
    try {
      const provider = new JsonRpcProvider(RPC);
      const contract = new Contract(
        CONTRACT_ADDRESS_NAME,
        CONTRACT_ABI_NAME,
        provider
      );

      const name = await contract.getName(address);
      if (name) {
        updateName(name);
      } else {
        notifications.show({
          message: `没有绑定用户名`,
        });
      }
    } catch (err) {
      console.warn("获取用户名失败", err);
    }
  };
  const updateName = (name: string) => {
    setUsername(name);
    const list = pathname.split("/");
    list[1] = "@" + name;
    const url = new URL(window.location.href);
    url.pathname = list.join("/");
    window.history.replaceState(null, "", url.href);
  };

  useEffect(() => {
    if (uid) {
      if (isAddress(uid)) {
        setOwner(uid);
        fetchName(uid);
      } else {
        fetchOwner(uid);
        setUsername(uid);
      }
    }
  }, [uid]);

  const nodeDark = useUserStore((state) => state.nodeDark);
  // const dotAPI = useDotStore((state) => state.dotAPI);
  // const updateDot = useDotStore((state) => state.updateDot);
  const profileElement = useRef<HTMLDivElement>(null);
  // const markdown = useMarkdown();
  // const noteName = pathname.split("/")[2] || ".profile";

  // const [cid, setCid] = useState("");
  // const fetchNote = async (uid: string, url: string, dotCID: string) => {
  //   // 没有节点 自动切换
  //   if (!dotAPI) {
  //     updateDot(url);
  //   }
  //   try {
  //     const res = await api.get(`/files.cid/${uid}/.note/${noteName}`, {
  //       baseURL: url,
  //     });
  //     const cid = res.data;
  //     if (cid) {
  //       setCid(cid);
  //       const response = await fetch(`${dotCID}/ipfs/${cid}/index.md`);
  //       const content = await response.text();
  //       if (content && profileElement.current) {
  //         const viewer = await markdown.initViewer(profileElement.current);
  //         viewer.setMarkdown(content);
  //       }
  //     } else {
  //       throw new Error(`cid 不存在`);
  //     }
  //   } catch (error) {
  //     console.warn("获取笔记失败", error);
  //     notifications.show({
  //       message: `获取笔记 ${noteName} 失败`,
  //       color: "red",
  //     });
  //   }
  // };

  const fetchData = async (owner: string) => {
    try {
      const provider = new JsonRpcProvider(RPC);
      const contract = new Contract(
        CONTRACT_ADDRESS_NAME,
        CONTRACT_ABI_NAME,
        provider
      );

      const json = await contract.getData(owner);
      if (json) {
        const data = JSON.parse(json);
        if (data?.dot) {
          setAPI(data.dot);
          // const res = await api.get("/api.dot", { baseURL: data.dot });
          // const dot = res.data as Dot;
          // if (dot) {
          //   let dotCID = dot.CIDs[0];
          //   if (dotAPI.endsWith(":1976")) {
          //     dotCID = dotAPI.slice(0, -5) + ":8080";
          //   }
          //   fetchNote(owner, data.dot, dotCID);
          // } else {
          //   throw new Error("获取 api.dot 失败");
          // }
        } else {
          // throw new Error("获取 data.dot 失败");
        }
      }
    } catch (error: any) {
      notifications.show({
        message: error.message || "获取数据失败",
        color: "red",
      });
    }
  };

  useEffect(() => {
    if (owner) {
      fetchData(owner);
    }
  }, [owner]);

  return (
    <Stack>
      <AppHeader
        title={username || mp.formatAddress(owner)}
        right={
          <Menu shadow="md">
            <Menu.Target>
              <ActionIcon variant="transparent" color="--text-color">
                <Icon name="More" size={24} />
              </ActionIcon>
            </Menu.Target>

            {/* <Menu.Dropdown>
              <Menu.Item
                leftSection="✏️"
                component={Link}
                href={`/note/?uid=${owner}&name=${noteName}&cid=${cid}`}
                target="_blank"
              >
                编辑
              </Menu.Item>
            </Menu.Dropdown> */}
          </Menu>
        }
      />
      <Anchor
        size="sm"
        c="blue"
        component={Link}
        href={Explorer + "/address/" + CONTRACT_ADDRESS_NAME}
        target="_blank"
      >
        合约地址 {mp.formatAddress(CONTRACT_ADDRESS_NAME)}
      </Anchor>
      <Text>用户名：{username}</Text>
      <Text>地址：{owner}</Text>
      <Text>推荐节点：{API}</Text>
      <Box className={nodeDark} ref={profileElement} />
    </Stack>
  );
}
