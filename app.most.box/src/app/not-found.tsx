"use client";

import { useBack } from "@/hooks/useBack";
import {
  Button,
  Container,
  Image,
  Loader,
  Stack,
  Text,
  Box,
} from "@mantine/core";
import { usePathname } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import PageIPFS from "@/components/not-found/ipfs";
import PageUser from "@/components/not-found/user";

const Page404 = () => {
  const back = useBack();
  return (
    <Stack gap="md" align="center" py={50}>
      <Image src="/imgs/404.svg" alt="404" w={300} h={225} />
      <Text c="dimmed">抱歉，你要找的页面不见了</Text>
      <Button onClick={back} variant="gradient">
        返回首页
      </Button>
    </Stack>
  );
};

const NotFoundContent = () => {
  const pathname = usePathname();
  const [type, setType] = useState<"ipfs" | "ipns" | "user" | "404" | "">("");

  useEffect(() => {
    if (pathname) {
      if (pathname.startsWith("/ipfs/")) {
        setType("ipfs");
      } else if (pathname.startsWith("/ipns/")) {
        setType("ipns");
      } else if (pathname.startsWith("/@")) {
        // 修复解析逻辑：支持带或不带末尾斜杠的情况，不再使用固定长度切片
        const name = pathname.slice(2).replace(/\/$/, "");
        if (name) {
          setType("user");
        } else {
          setType("404");
        }
      } else {
        setType("404");
      }
    }
  }, [pathname]);

  return (
    <Box>
      {type === "" ? (
        <Stack align="center" py={50}>
          <Loader size="lg" type="dots" />
        </Stack>
      ) : type === "user" ? (
        <PageUser />
      ) : type === "ipfs" || type === "ipns" ? (
        <PageIPFS />
      ) : (
        <Page404 />
      )}
    </Box>
  );
};

export default function PageNotFound() {
  return (
    <Suspense
      fallback={
        <Stack align="center" py={50}>
          <Loader size="lg" type="dots" />
        </Stack>
      }
    >
      <NotFoundContent />
    </Suspense>
  );
}
