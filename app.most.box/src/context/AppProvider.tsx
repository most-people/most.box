"use client";
import { ProgressProvider } from "@bprogress/next/app";
import FingerprintJS from "@fingerprintjs/fingerprintjs";
import { useUserStore } from "@/stores/userStore";
import { useEffect } from "react";
import { notifications } from "@mantine/notifications";
import mp from "@/utils/mp";
import { useHydrated } from "@/hooks/useHydrated";
import {
  Stack,
  Loader,
  useComputedColorScheme,
  useMantineColorScheme,
} from "@mantine/core";
import { AppHeader } from "@/components/AppHeader";

const AppProvider = ({ children }: { children: React.ReactNode }) => {
  const hydrated = useHydrated();
  // const exit = useUserStore((state) => state.exit);
  const setWallet = useUserStore((state) => state.setWallet);
  const setItem = useUserStore((state) => state.setItem);

  const initWallet = (fingerprint: string) => {
    setItem("fingerprint", fingerprint);
    const jwt = useUserStore.getState().jwt;
    if (jwt) {
      try {
        const wallet = mp.verifyJWT(jwt);
        if (wallet) {
          setWallet(wallet);
        }
      } catch (error) {
        // exit();
        notifications.show({ message: "登录过期", color: "red" });
        console.warn("登录过期", error);
      }
    }
  };

  const initFinger = async () => {
    try {
      const fp = await FingerprintJS.load();
      const result = await fp.get();
      // 返回唯一的访客标识符
      const fingerprint = result.visitorId;
      initWallet(fingerprint);
    } catch (error) {
      console.warn("登录失败:", error);
      return "";
    }
  };

  useEffect(() => {
    if (hydrated) {
      initFinger();
      setItem("firstPath", window.location.pathname);
    }
  }, [hydrated]);

  const { colorScheme } = useMantineColorScheme();
  const computedColorScheme = useComputedColorScheme();
  useEffect(() => {
    if (hydrated) {
      const theme = colorScheme === "auto" ? computedColorScheme : colorScheme;
      setItem("notesDark", theme === "dark" ? "toastui-editor-dark" : "");
    }
  }, [hydrated, colorScheme, computedColorScheme]);

  if (!hydrated) {
    return (
      <Stack>
        <AppHeader title="Most People" />
        <Loader size="xl" type="dots" />
      </Stack>
    );
  }

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
