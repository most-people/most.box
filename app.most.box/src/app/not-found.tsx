"use client";
import { AppHeader } from "@/components/AppHeader";
import { useBack } from "@/hooks/useBack";
import { Button, Container, Loader, Stack, Text } from "@mantine/core";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function PageNotFound() {
  const back = useBack();
  const pathname = usePathname();
  const router = useRouter();
  const [inited, setInited] = useState(false);

  useEffect(() => {
    if (pathname.startsWith("/ipfs/")) {
      const cid = pathname.split("/")[2];
      if (cid) {
        const url = new URL(window.location.href);
        const filename = url.searchParams.get("filename");
        url.searchParams.set("cid", cid);
        if (filename) {
          url.searchParams.delete("filename");
          url.searchParams.set("filename", filename);
        }
        router.replace("/ipfs/?" + url.searchParams.toString());
        return;
      }
    }
    setInited(true);
  }, [pathname]);

  return (
    <Container py="xl">
      <AppHeader title={inited ? "404" : ""} />
      {inited ? (
        <>
          <Image src="/img/404.svg" alt="404" width={300} height={225} />
          <Stack gap="md" align="center">
            <Text c="dimmed">抱歉，你要找的页面不见了</Text>
            <Button onClick={back} w="100%">
              返回
            </Button>
          </Stack>
        </>
      ) : (
        <Stack align="center">
          <Loader size="lg" />
          <Text>正在处理...</Text>
        </Stack>
      )}
    </Container>
  );
}
