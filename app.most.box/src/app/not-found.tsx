"use client";
import { useBack } from "@/hooks/useBack";
import { Button, Container, Stack, Text } from "@mantine/core";
import Image from "next/image";

export default function NotFound() {
  const back = useBack();
  return (
    <Container style={{ textAlign: "center" }}>
      <Image src="/img/404.svg" alt="404" width={300} height={225} />
      <Stack gap="md">
        <Text c="dimmed">抱歉，你要找的页面不见了</Text>
        <Button onClick={back}>返回</Button>
      </Stack>
    </Container>
  );
}
