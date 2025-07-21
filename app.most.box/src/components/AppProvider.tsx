"use client";
import FingerprintJS from "@fingerprintjs/fingerprintjs";
import { useUserStore } from "@/stores/userStore";
import { useEffect } from "react";
import { api } from "@/constants/api";

export default function AppProvider() {
  const initWallet = useUserStore((state) => state.initWallet);
  const setItem = useUserStore((state) => state.setItem);
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

  const initDot = () => {
    const dotAPI = localStorage.getItem("dotAPI");
    if (dotAPI) {
      api.defaults.baseURL = dotAPI;
      setItem("dotAPI", dotAPI);
      const dotCID = localStorage.getItem("dotCID");
      if (dotCID) {
        setItem("dotCID", dotCID);
      }
    }
  };

  useEffect(() => {
    initDot();
    initFinger();
    sessionStorage.firstPath = window.location.pathname;
  }, []);

  return null;
}
