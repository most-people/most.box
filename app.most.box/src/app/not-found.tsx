"use client";
import { AppHeader } from "@/components/AppHeader";
import { useBack } from "@/hooks/useBack";
import { Button, Container, Stack, Text } from "@mantine/core";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

export default function PageNotFound() {
  const back = useBack();
  const pathname = usePathname();

  useEffect(() => {
    if (pathname.startsWith("/ipfs/")) {
      const cid = pathname.split("/")[2];
      if (cid) {
        const url = new URL(window.location.href);
        url.pathname = "/ipfs";
        const filename = url.searchParams.get("filename");
        url.searchParams.set("cid", cid);
        if (filename) {
          url.searchParams.delete("filename");
          url.searchParams.set("filename", filename);
        }
        window.location.replace(url.href);
      }
    }
  }, [pathname]);

  return (
    <Container py="xl">
      <AppHeader title="404" />
      <Image src="/img/404.svg" alt="404" width={300} height={225} />
      <Stack gap="md" align="center">
        <Text c="dimmed">抱歉，你要找的页面不见了</Text>
        <Button onClick={back} w="100%">
          返回
        </Button>
      </Stack>
    </Container>
  );
}
