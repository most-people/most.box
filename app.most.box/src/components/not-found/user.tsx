import { CONTRACT_ABI_NAME, CONTRACT_ADDRESS_NAME } from "@/constants/dot";
import {
  ActionIcon,
  Anchor,
  Box,
  Button,
  Divider,
  Group,
  Menu,
  Stack,
  Text,
} from "@mantine/core";
import { Contract, isAddress, JsonRpcProvider } from "ethers";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import mp from "@/constants/mp";
import { api } from "@/constants/api";
import { useUserStore } from "@/stores/userStore";
import { useMarkdown } from "@/hooks/useMarkdown";
import { Icon } from "../Icon";
import { notifications } from "@mantine/notifications";
import { Dot, useDotStore } from "@/stores/dotStore";
import Link from "next/link";

export default function PageUser() {
  const pathname = usePathname();
  const [uid, setUid] = useState("");
  const RPC = useDotStore((state) => state.RPC);
  const Explorer = useDotStore((state) => state.Explorer);

  const [dotAPI, setDotAPI] = useState("");
  const [owner, setOwner] = useState("");
  const [username, setUsername] = useState("");

  const noteName = pathname?.split("/")[2] || ".profile";
  const [CID, setCID] = useState("");

  useEffect(() => {
    if (pathname) {
      setUid(pathname.split("/")[1].slice(1));
    }
  }, [pathname]);

  const fetchOwner = async (name: string, filter = "") => {
    try {
      const provider = new JsonRpcProvider(RPC);
      const contract = new Contract(
        CONTRACT_ADDRESS_NAME,
        CONTRACT_ABI_NAME,
        provider
      );

      const owners = await contract.getOwners(name, filter);
      if (owners.length > 0) {
        setOwner(owners[0]);
        fetchName(owners[0], filter);
      } else {
        notifications.show({
          message: `没有绑定用户名`,
        });
      }
    } catch (err) {
      console.warn("获取地址失败", err);
      notifications.show({
        message: `获取地址失败`,
        color: "red",
      });
    }
  };
  const fetchName = async (address: string, filter = "") => {
    try {
      const provider = new JsonRpcProvider(RPC);
      const contract = new Contract(
        CONTRACT_ADDRESS_NAME,
        CONTRACT_ABI_NAME,
        provider
      );

      const name = await contract.getName(address);
      if (name) {
        updateName(name, filter);
      } else {
        notifications.show({
          message: `没有绑定用户名`,
        });
      }
    } catch (err) {
      console.warn("获取用户名失败", err);
    }
  };
  const updateName = (name: string, filter = "") => {
    const uid = name + (filter ? "-" + filter : "");
    setUsername(uid);
    const list = pathname?.split("/") || [];
    list[1] = "@" + uid;
    const url = new URL(window.location.href);
    url.pathname = list.join("/");
    window.history.replaceState(null, "", url.href);
  };

  useEffect(() => {
    if (uid) {
      const [name, filter] = uid.split("-");
      if (isAddress(uid)) {
        setOwner(uid);
        fetchName(uid, uid.slice(-3).toUpperCase());
      } else {
        fetchOwner(name, filter);
        setUsername(uid);
      }
    }
  }, [uid]);

  const nodeDark = useUserStore((state) => state.nodeDark);
  const profileElement = useRef<HTMLDivElement>(null);
  const markdown = useMarkdown();

  const fetchNote = async (uid: string, url: string, dotCID: string) => {
    try {
      const res = await api.get(`/files.cid/${uid}/.note/${noteName}`, {
        baseURL: url,
      });
      const cid = res.data;
      if (cid) {
        setCID(cid);
        const response = await fetch(`${dotCID}/ipfs/${cid}/index.md`);
        const content = await response.text();
        if (content && profileElement.current) {
          const viewer = await markdown.initViewer(profileElement.current);
          viewer.setMarkdown(content);
        }
      } else {
        setCID(" ");
        throw new Error(`cid 不存在`);
      }
    } catch (error) {
      console.warn(`获取笔记 ${noteName} 失败`, error);
      notifications.show({
        message: `获取笔记 ${noteName} 失败`,
        color: "red",
      });
    }
  };

  const fetchData = async (owner: string) => {
    try {
      const provider = new JsonRpcProvider(RPC);
      const contract = new Contract(
        CONTRACT_ADDRESS_NAME,
        CONTRACT_ABI_NAME,
        provider
      );

      const dotAPI = await contract.getDot(owner);
      if (dotAPI) {
        setDotAPI(dotAPI);
        const res = await api.get("/api.dot", { baseURL: dotAPI });
        const dot = res.data as Dot;
        if (dot) {
          let dotCID = dot.CIDs[0];
          if (dotAPI.endsWith(":1976")) {
            dotCID = dotAPI.slice(0, -5) + ":8080";
          }
          if (dotCID) {
            fetchNote(owner, dotAPI, dotCID);
          } else {
            throw new Error("获取 IPFS 网关失败");
          }
        } else {
          throw new Error("获取节点失败");
        }
      } else {
        throw new Error("获取 data.dot 失败");
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

            <Menu.Dropdown>
              <Menu.Item
                leftSection="✏️"
                component={Link}
                href={`/note/?uid=${owner}&name=${noteName}&cid=${CID}`}
                target="_blank"
              >
                编辑
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        }
      />
      <Text>用户名：{username}</Text>
      <Text>地址：{owner}</Text>
      <Text>节点：{dotAPI}</Text>
      <Text>CID：{CID}</Text>

      {CID === " " ? (
        <Button
          variant="outline"
          size="small"
          component={Link}
          href={`/note/?uid=${owner}&name=${noteName}&cid=${CID}`}
          target="_blank"
        >
          ✏️ 请先创建笔记「{noteName}」
        </Button>
      ) : CID === "" ? (
        <Text>加载中...</Text>
      ) : null}

      <Divider variant="dashed" labelPosition="center" my="md" />

      <Box className={nodeDark} ref={profileElement} />

      <Divider variant="dashed" labelPosition="center" my="md" />

      <Group mt={10}>
        <Anchor
          size="sm"
          c="blue"
          component={Link}
          href={Explorer + "/address/" + CONTRACT_ADDRESS_NAME}
          target="_blank"
        >
          合约地址 {mp.formatAddress(CONTRACT_ADDRESS_NAME)}
        </Anchor>
        <Anchor
          size="sm"
          c="blue"
          component={Link}
          href={`https://most.box/@${username}/${noteName}`}
          target="_blank"
        >
          分享网址 https://most.box/@{username}/{noteName}
        </Anchor>
      </Group>
    </Stack>
  );
}
