"use client";

import { useBack } from "@/hooks/useBack";
import { Button, Container, Image, Loader, Stack, Text } from "@mantine/core";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import PageIPFS from "@/components/not-found/ipfs";
import PageUser from "@/components/not-found/user";

const Page404 = () => {
  const back = useBack();
  return (
    <Stack gap="md" align="center">
      <Image src="/imgs/404.svg" alt="404" w={300} h={225} />
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
    if (pathname) {
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
    }
  }, [pathname]);

  return (
    <Container w="100%" p="md">
      {type === "" ? (
        <Stack align="center">
          <Loader color="black" size="lg" type="dots" />
        </Stack>
      ) : type === "user" ? (
        <PageUser />
      ) : type === "ipfs" ? (
        <PageIPFS />
      ) : type === "ipns" ? (
        <PageIPFS />
      ) : (
        <Page404 />
      )}
    </Container>
  );
}
