"use client";
import { AppHeader } from "@/components/AppHeader";
import { useBack } from "@/hooks/useBack";
import { Button, Container, Stack, Text } from "@mantine/core";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

export default function NotFound() {
  const back = useBack();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    console.log(window.location);
  }, [router]);

  return (
    <Container py="xl">
      <AppHeader title={pathname} />
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
