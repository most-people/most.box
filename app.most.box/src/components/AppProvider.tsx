"use client";
import FingerprintJS from "@fingerprintjs/fingerprintjs";
import { useUserStore } from "@/stores/userStore";
import { useEffect } from "react";
import { api } from "@/constants/api";
import Script from "next/script";

export default function AppProvider() {
  const initWallet = useUserStore((state) => state.initWallet);
  const setItem = useUserStore((state) => state.setItem);
  const noteReady = useUserStore((state) => state.noteReady);
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

  useEffect(() => {
    initDot();
    initFinger();
    sessionStorage.firstPath = window.location.pathname;
  }, []);

  return (
    <>
      {/* https://uicdn.toast.com/editor/latest/toastui-editor-all.min.js */}
      <Script src="/toast-ui/toastui-editor-all.min.js" />
      {/* https://uicdn.toast.com/editor-plugin-code-syntax-highlight/latest/toastui-editor-plugin-code-syntax-highlight-all.min.js */}
      <Script
        strategy="lazyOnload"
        src="/toast-ui/toastui-editor-plugin-code-syntax-highlight-all.min.js"
        onLoad={() => setItem("noteReady", true)}
      />
      {/* https://uicdn.toast.com/editor/latest/i18n/zh-cn.js */}
      {noteReady && <Script strategy="lazyOnload" src="/toast-ui/zh-cn.js" />}
    </>
  );
}
