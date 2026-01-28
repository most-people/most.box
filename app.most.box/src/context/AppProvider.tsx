"use client";
import { ProgressProvider } from "@bprogress/next/app";
import FingerprintJS from "@fingerprintjs/fingerprintjs";
import { useUserStore } from "@/stores/userStore";
import { useEffect } from "react";
import { useComputedColorScheme, useMantineColorScheme } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import mp from "@/utils/mp";

const AppProvider = ({ children }: { children: React.ReactNode }) => {
  const exit = useUserStore((state) => state.exit);
  const setWallet = useUserStore((state) => state.setWallet);
  const setItem = useUserStore((state) => state.setItem);

  const initWallet = (fingerprint: string) => {
    setItem("fingerprint", fingerprint);
    const jwt = localStorage.getItem("jwt");
    if (jwt) {
      try {
        const wallet = mp.verifyJWT(jwt);
        if (wallet) {
          setWallet(wallet);
        }
      } catch (error) {
        notifications.show({ message: "登录过期", color: "red" });
        console.warn("登录过期", error);
        exit();
      }
    }
  };

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

  useEffect(() => {
    initFinger();
    sessionStorage.setItem("firstPath", window.location.pathname);
  }, []);

  const { colorScheme } = useMantineColorScheme();
  const computedColorScheme = useComputedColorScheme();
  useEffect(() => {
    const theme = colorScheme === "auto" ? computedColorScheme : colorScheme;
    setItem("nodeDark", theme === "dark" ? "toastui-editor-dark" : "");
  }, [colorScheme, computedColorScheme]);

  return (
    <ProgressProvider
      color="var(--mantine-primary-color-filled)"
      options={{ showSpinner: false }}
      shallowRouting
    >
      {children}
    </ProgressProvider>
  );
};

export default AppProvider;
