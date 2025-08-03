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
import { useRouter } from "next/navigation";

export default function AuthJWT() {
  const updateDot = useUserStore((state) => state.updateDot);
  const setItem = useUserStore((state) => state.setItem);
  const fingerprint = useUserStore((state) => state.fingerprint);
  const router = useRouter();

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
        setTimeout(() => {
          setItem("wallet", wallet);
        }, 0);
      } catch (error) {
        console.error(error);
      }
    }
    router.replace("/");
  };

  useEffect(() => {
    if (fingerprint) {
      initToken();
      updateDot(location.origin);
    }
  }, [fingerprint]);

  return <AppHeader title="Auth JWT"></AppHeader>;
}
