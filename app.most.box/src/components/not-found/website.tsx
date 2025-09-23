import {
  CONTRACT_ABI_NAME,
  CONTRACT_ADDRESS_NAME,
  NETWORK_CONFIG,
} from "@/constants/dot";
import { Box, Stack, Text } from "@mantine/core";
import { Contract, isAddress, JsonRpcProvider } from "ethers";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import mp from "@/constants/mp";
import { api } from "@/constants/api";
import { useUserStore } from "@/stores/userStore";
import { useMarkdown } from "@/hooks/useMarkdown";

export default function PageWebsite() {
  const pathname = usePathname();
  const uid = pathname.split("/")[1].slice(1);
  const RPC = NETWORK_CONFIG["mainnet"].rpc;

  const provider = useMemo(() => new JsonRpcProvider(RPC), [RPC]);
  const contract = useMemo(
    () => new Contract(CONTRACT_ADDRESS_NAME, CONTRACT_ABI_NAME, provider),
    [provider]
  );

  const [owner, setOwner] = useState("");
  const [username, setUsername] = useState("");

  const fetchOwner = async (name: string) => {
    try {
      const owner = await contract.getOwner(name);
      setOwner(owner);
      fetchName(owner);
    } catch (err) {
      console.warn("获取地址失败", err);
    }
  };
  const fetchName = async (address: string) => {
    try {
      const name = await contract.getName(address);
      updateName(name);
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
    if (isAddress(uid)) {
      setOwner(uid);
      fetchName(uid);
    } else {
      fetchOwner(uid);
      setUsername(uid);
    }
  }, [contract, uid]);

  const dotCID = useUserStore((state) => state.dotCID);
  const nodeDark = useUserStore((state) => state.nodeDark);
  const profileElement = useRef<HTMLDivElement>(null);
  const markdown = useMarkdown();
  const fetchNote = async (uid: string) => {
    try {
      const res = await api.get(`/files.cid/${uid}/.note/.profile`);
      const cid = res.data;
      if (cid) {
        const response = await fetch(`${dotCID}/ipfs/${cid}/index.md`);
        const content = await response.text();
        if (content && profileElement.current) {
          const viewer = await markdown.initViewer(profileElement.current);
          viewer.setMarkdown(content);
        }
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  useEffect(() => {
    if (owner) {
      fetchNote(owner);
    }
  }, [owner]);

  return (
    <Stack>
      <AppHeader title={username || mp.formatAddress(owner)} />
      <Text>用户名：{username}</Text>
      <Text>地址：{owner}</Text>
      <Box className={nodeDark} ref={profileElement} />
    </Stack>
  );
}
