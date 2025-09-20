"use client";
import { AppHeader } from "@/components/AppHeader";
import {
  CONTRACT_ABI_NAME,
  CONTRACT_ADDRESS_NAME,
  NETWORK_CONFIG,
} from "@/constants/dot";
import { useBack } from "@/hooks/useBack";
import { Button, Container, Loader, Stack, Text } from "@mantine/core";
import { Contract, JsonRpcProvider } from "ethers";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

const NotFound = () => {
  const back = useBack();
  return (
    <>
      <Image src="/img/404.svg" alt="404" width={300} height={225} />
      <Stack gap="md" align="center">
        <Text c="dimmed">抱歉，你要找的页面不见了</Text>
        <Button onClick={back} w="100%">
          返回
        </Button>
      </Stack>
    </>
  );
};

const UserData = () => {
  const pathname = usePathname();
  const name = pathname.slice(2, -1);

  const RPC = NETWORK_CONFIG["mainnet"].rpc;

  const provider = useMemo(() => new JsonRpcProvider(RPC), [RPC]);
  const contract = useMemo(
    () => new Contract(CONTRACT_ADDRESS_NAME, CONTRACT_ABI_NAME, provider),
    [provider]
  );

  const [owner, setOwner] = useState("");

  useEffect(() => {
    const fetchOwner = async () => {
      try {
        const owner = await contract.getOwner(name);
        setOwner(owner);
      } catch (err) {
        console.warn("获取用户所有者失败", err);
      }
    };
    fetchOwner();
  }, [contract, name]);

  return <>用户地址： {owner}</>;
};

const IPFS = () => {
  const pathname = usePathname();
  const cid = pathname.split("/")[2];

  useEffect(() => {
    if (cid) {
      const url = new URL(window.location.href);
      const filename = url.searchParams.get("filename");
      const type = url.searchParams.get("type");
      console.log("🌊", filename, type);
    }
  }, []);

  return <Stack align="center">{cid}</Stack>;
};

export default function PageNotFound() {
  const pathname = usePathname();
  const [type, setType] = useState<"ipfs" | "user" | "404" | "">("");

  useEffect(() => {
    if (pathname.startsWith("/ipfs/")) {
      setType("ipfs");
    } else if (pathname.startsWith("/@")) {
      const name = pathname.slice(2, -1);
      if (name) {
        setType("user");
      }
    } else {
      setType("404");
    }
  }, [pathname]);

  return (
    <Container py="xl">
      {type === "" ? (
        <>
          <AppHeader title="" />
          <Stack align="center">
            <Loader color="black" size="lg" type="bars" />
          </Stack>
        </>
      ) : type === "user" ? (
        <>
          <AppHeader title={pathname.slice(1, -1)} />
          <UserData />
        </>
      ) : type === "ipfs" ? (
        <>
          <AppHeader title={pathname.split("/")[2]} />
          <IPFS />
        </>
      ) : (
        <>
          <AppHeader title="404" />
          <NotFound />
        </>
      )}
    </Container>
  );
}
