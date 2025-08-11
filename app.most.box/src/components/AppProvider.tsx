"use client";
import FingerprintJS from "@fingerprintjs/fingerprintjs";
import { useUserStore } from "@/stores/userStore";
import { useEffect } from "react";
import { api } from "@/constants/api";
import { getDotNodes } from "@/constants/dot";

export default function AppProvider() {
  const initWallet = useUserStore((state) => state.initWallet);
  const setItem = useUserStore((state) => state.setItem);
  const initFinger = async () => {
    try {
      const fp = await FingerprintJS.load();
      const result = await fp.get();
      // 返回唯一的访客标识符
      const fingerprint = result.visitorId;
      sessionStorage.setItem("fingerprint", fingerprint);
      initWallet(fingerprint);
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

  const dotNodes = useUserStore((state) => state.dotNodes);

  const initNodes = () => {
    if (dotNodes.length > 0) {
      return;
    }

    // 尝试从缓存加载
    const nodes = localStorage.getItem("dotNodes");
    if (nodes) {
      try {
        setItem("dotNodes", JSON.parse(nodes));
        return;
      } catch {}
    }

    // 从区块链获取最新数据
    getDotNodes().then((nodes) => {
      if (nodes) setItem("dotNodes", nodes);
    });
  };

  useEffect(() => {
    initDot();
    initNodes();
    initFinger();
    sessionStorage.firstPath = window.location.pathname;
  }, []);

  return null;
}
