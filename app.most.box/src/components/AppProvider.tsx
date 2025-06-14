"use client";
import FingerprintJS from "@fingerprintjs/fingerprintjs";
import { useAccountStore } from "@/stores/accountStore";
import { useUserStore } from "@/stores/userStore";
import { useEffect } from "react";
import { api } from "@/constants/api";

export default function AppProvider() {
  const setItem = useUserStore((state) => state.setItem);
  const initWallet = useUserStore((state) => state.initWallet);
  const initAccount = useAccountStore((state) => state.initAccount);

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
    const dotCID = localStorage.dotCID;
    if (dotAPI && dotCID) {
      const res = await api(dotAPI + "/ipv6");
      if (res.data?.length > 0) {
        api.defaults.baseURL = dotAPI;
        setItem("dotAPI", dotAPI);
        setItem("dotCID", dotCID);
      }
    }
  };

  useEffect(() => {
    initFinger();
    initAccount();
    initDot();
    setItem("firstPath", window.location.pathname);
  }, []);

  return null;
}
