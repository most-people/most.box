"use client";
import FingerprintJS from "@fingerprintjs/fingerprintjs";
import { useUserStore } from "@/stores/userStore";
import { useEffect } from "react";
import { api } from "@/constants/api";
import { useComputedColorScheme, useMantineColorScheme } from "@mantine/core";
import { usePathname, useRouter } from "next/navigation";
import { notifications } from "@mantine/notifications";

export default function AppProvider() {
  const initWallet = useUserStore((state) => state.initWallet);
  const setItem = useUserStore((state) => state.setItem);
  const dotAPI = useUserStore((state) => state.dotAPI);
  const updateDot = useUserStore((state) => state.updateDot);
  const pathname = usePathname();
  const router = useRouter();

  const initFinger = async () => {
    try {
      const fp = await FingerprintJS.load();
      const result = await fp.get();
      // 返回唯一的访客标识符
      const fingerprint = result.visitorId;
      sessionStorage.setItem("fingerprint", fingerprint);
      initWallet(fingerprint);
    } catch (error) {
      console.warn("登录失败:", error);
      return "";
    }
  };

  const initDot = () => {
    const host = window.location.hash.slice(1);
    const protocol = `http${host.endsWith(":1976") ? "" : "s"}://`;
    let dot = host ? protocol + host : null;
    // web2 登录 不处理
    if (window.location.hash.includes("=")) dot = null;
    // 节点地址
    const dotAPI = dot || localStorage.getItem("dotAPI");
    // 立刻赋值 便于请求
    if (dotAPI) api.defaults.baseURL = dotAPI;
    // 切换节点
    updateDot(dotAPI || location.origin).then((list) => {
      // 个人主页 不处理
      if (pathname.startsWith("/@")) {
        return;
      }
      // 节点不可用 跳转
      if (list === null) {
        notifications.show({ message: "节点不可用", color: "red" });
        router.push("/dot/?back");
      }
    });
    const dotCID = localStorage.getItem("dotCID");
    if (dotCID) setItem("dotCID", dotCID);
  };

  useEffect(() => {
    initDot();
    initFinger();
    sessionStorage.firstPath = window.location.pathname;
  }, []);

  const { colorScheme } = useMantineColorScheme();
  const computedColorScheme = useComputedColorScheme();
  useEffect(() => {
    const theme = colorScheme === "auto" ? computedColorScheme : colorScheme;
    setItem("nodeDark", theme === "dark" ? "toastui-editor-dark" : "");
  }, [colorScheme, computedColorScheme]);

  return null;
}
