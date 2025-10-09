"use client";

import { useBack } from "@/hooks/useBack";
import { Button, Container, Loader, Stack, Text } from "@mantine/core";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import PageIPFS from "@/components/not-found/ipfs";
import PageIPNS from "@/components/not-found/ipns";
import PageUser from "@/components/not-found/user";

const Page404 = () => {
  const back = useBack();
  return (
    <Stack gap="md" align="center">
      <Image src="/img/404.svg" alt="404" width={300} height={225} />
      <Text c="dimmed">抱歉，你要找的页面不见了</Text>
      <Button onClick={back} variant="gradient">
        返回首页
      </Button>
    </Stack>
  );
};

export default function PageNotFound() {
  const pathname = usePathname();
  const [type, setType] = useState<"ipfs" | "ipns" | "user" | "404" | "">("");

  useEffect(() => {
    if (pathname.startsWith("/ipfs/")) {
      setType("ipfs");
    } else if (pathname.startsWith("/ipns/")) {
      setType("ipns");
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
    <Container w="100%" p="md">
      {type === "" ? (
        <Stack align="center">
          <Loader color="black" size="lg" type="bars" />
        </Stack>
      ) : type === "user" ? (
        <PageUser />
      ) : type === "ipfs" ? (
        <PageIPFS />
      ) : type === "ipns" ? (
        <PageIPNS />
      ) : (
        <Page404 />
      )}
    </Container>
  );
}
