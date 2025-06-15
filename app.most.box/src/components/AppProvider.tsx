"use client";
import FingerprintJS from "@fingerprintjs/fingerprintjs";
import { useAccountStore } from "@/stores/accountStore";
import { useUserStore } from "@/stores/userStore";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AppProvider() {
  const initWallet = useUserStore((state) => state.initWallet);
  const updateDot = useUserStore((state) => state.updateDot);
  const initAccount = useAccountStore((state) => state.initAccount);
  const router = useRouter();

  const initFinger = async () => {
    try {
      const fp = await FingerprintJS.load();
      const result = await fp.get();
      // 返回唯一的访客标识符
      sessionStorage.setItem("fingerprint", result.visitorId);
      initWallet();
    } catch (error) {
      console.warn("获取设备指纹失败:", error);
      return "";
    }
  };

  const initDot = async () => {
    const dotAPI = localStorage.dotAPI;
    if (dotAPI) {
      const list = await updateDot(dotAPI, true);
      if (list) {
        return;
      }
    }
    router.push("/dot");
  };

  useEffect(() => {
    initFinger();
    initAccount();
    initDot();
    sessionStorage.firstPath = window.location.pathname;
  }, []);

  return null;
}
