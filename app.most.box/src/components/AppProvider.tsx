"use client";
import FingerprintJS from "@fingerprintjs/fingerprintjs";
import { useUserStore } from "@/stores/userStore";
import { useEffect } from "react";
import { api, setRouterPush } from "@/constants/api";
import { useComputedColorScheme, useMantineColorScheme } from "@mantine/core";
import { usePathname, useRouter } from "next/navigation";

export default function AppProvider() {
  const initWallet = useUserStore((state) => state.initWallet);
  const setItem = useUserStore((state) => state.setItem);
  const dotAPI = useUserStore((state) => state.dotAPI);
  const updateDot = useUserStore((state) => state.updateDot);
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
      console.warn("获取设备指纹失败:", error);
      return "";
    }
  };

  const initDot = async () => {
    const hash = window.location.hash.slice(1);
    const dot = hash
      ? `http${hash.endsWith(":1976") ? "" : "s"}://` + hash
      : hash;
    const dotAPI = dot || localStorage.getItem("dotAPI");
    if (dotAPI) {
      api.defaults.baseURL = dotAPI;
      updateDot(dotAPI).then((list) => {
        if (list === null) {
          router.push("/dot");
        }
      });
    } else {
      router.push("/dot");
    }
    const dotCID = localStorage.getItem("dotCID");
    if (dotCID) {
      setItem("dotCID", dotCID);
    }
  };

  useEffect(() => {
    setRouterPush(router.push);
    initDot();
    initFinger();
    sessionStorage.firstPath = window.location.pathname;
  }, []);

  const pathname = usePathname();

  useEffect(() => {
    if (pathname && dotAPI) {
      try {
        const url = new URL(window.location.href);
        const dot = new URL(dotAPI);
        if (url.hash !== "#" + dot.host) {
          if (url.host === dot.host) {
            url.hash = "";
          } else {
            url.hash = dot.host;
          }
          router.replace(url.href, { scroll: false });
        }
      } catch {}
    }
  }, [pathname, dotAPI]);

  const { colorScheme } = useMantineColorScheme();
  const computedColorScheme = useComputedColorScheme();
  useEffect(() => {
    const theme = colorScheme === "auto" ? computedColorScheme : colorScheme;
    setItem("nodeDark", theme === "dark" ? "toastui-editor-dark" : "");
  }, [colorScheme, computedColorScheme]);

  return null;
}
