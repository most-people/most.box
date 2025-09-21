import {
  CONTRACT_ABI_NAME,
  CONTRACT_ADDRESS_NAME,
  NETWORK_CONFIG,
} from "@/constants/dot";
import { Anchor, Group, Stack, Text } from "@mantine/core";
import { Contract, isAddress, JsonRpcProvider } from "ethers";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import Link from "next/link";
import mp from "@/constants/mp";

export default function PageWebsite() {
  const pathname = usePathname();
  const uid = pathname.split("/")[1].slice(1);
  const RPC = NETWORK_CONFIG["mainnet"].rpc;
  const Explorer = NETWORK_CONFIG["mainnet"].explorer;

  const provider = useMemo(() => new JsonRpcProvider(RPC), [RPC]);
  const contract = useMemo(
    () => new Contract(CONTRACT_ADDRESS_NAME, CONTRACT_ABI_NAME, provider),
    [provider]
  );

  const [owner, setOwner] = useState("");
  const [name, setName] = useState("");

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
    setName(name);
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
      setName(uid);
    }
  }, [contract, uid]);

  return (
    <Stack>
      <AppHeader title={name || mp.formatAddress(owner)} />
      <Text>用户名：{name}</Text>
      <Text>地址：{owner}</Text>
      <Group>
        <Anchor
          c="blue"
          component={Link}
          href={Explorer + "/address/" + CONTRACT_ADDRESS_NAME}
          target="_blank"
        >
          合约地址：{mp.formatAddress(CONTRACT_ADDRESS_NAME)}
        </Anchor>
      </Group>
    </Stack>
  );
}
