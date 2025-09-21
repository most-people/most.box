"use client";
import { AppHeader } from "@/components/AppHeader";
import { useBack } from "@/hooks/useBack";
import { Button, Container, Loader, Stack, Text } from "@mantine/core";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import PageIPFS from "@/components/not-found/ipfs";
import PageUser from "@/components/not-found/user";

const Page404 = () => {
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

  const title = useMemo(() => {
    if (type === "") {
      return "";
    } else if (type === "ipfs") {
      return pathname.split("/")[2];
    } else if (type === "user") {
      return pathname.slice(2, -1);
    } else {
      return "404";
    }
  }, [type, pathname]);

  return (
    <Container w="100%">
      <AppHeader title={title} />
      {type === "" ? (
        <Stack align="center">
          <Loader color="black" size="lg" type="bars" />
        </Stack>
      ) : type === "user" ? (
        <PageUser />
      ) : type === "ipfs" ? (
        <PageIPFS />
      ) : (
        <Page404 />
      )}
    </Container>
  );
}
