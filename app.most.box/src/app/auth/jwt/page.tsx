"use client";

import { AppHeader } from "@/components/AppHeader";
import {
  type MostWallet,
  mostDecode,
  mostWallet,
} from "@/constants/MostWallet";
import dayjs from "dayjs";
import { useEffect } from "react";
import mp from "@/constants/mp";
import { useUserStore } from "@/stores/userStore";
import { Container, Loader, Stack } from "@mantine/core";

export default function AuthJWT() {
  const fingerprint = useUserStore((state) => state.fingerprint);

  const initToken = () => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (token) {
      // 移除 token
      window.history.replaceState(null, "", window.location.pathname);
      // 当前分钟有效
      const key = dayjs().format("YY/M/D HH:mm");
      const { public_key, private_key } = mostWallet("auth/jwt", key);
      const json = mostDecode(token, public_key, private_key);
      try {
        const wallet = JSON.parse(json) as MostWallet;
        mp.loginSave(wallet);
      } catch (error) {
        console.error(error);
      }
    }
    window.location.replace("/");
  };

  useEffect(() => {
    if (fingerprint) {
      initToken();
    }
  }, [fingerprint]);

  return (
    <Container py="xl">
      <AppHeader title="Auth JWT" />
      <Stack align="center">
        <Loader color="black" size="lg" type="dots" />
      </Stack>
    </Container>
  );
}
