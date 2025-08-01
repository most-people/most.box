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

export default function AuthJWT() {
  const updateDot = useUserStore((state) => state.updateDot);

  const initToken = async () => {
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
        const jwt = mp.createJWT(wallet);
        localStorage.setItem("jwt", jwt);
        mp.createToken(wallet);
      } catch (error) {
        console.error(error);
      } finally {
        await updateDot(location.origin);
        window.location.replace("/dot");
      }
    }
  };

  useEffect(() => {
    initToken();
  }, []);

  return <AppHeader title="Auth JWT"></AppHeader>;
}
