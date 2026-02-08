"use client";
import { ProgressProvider } from "@bprogress/next/app";
import { useUserStore } from "@/stores/userStore";
import { useEffect } from "react";
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
  const setItem = useUserStore((state) => state.setItem);
  const fetchBalance = useUserStore((state) => state.fetchBalance);
  const wallet = useUserStore((state) => state.wallet);

  useEffect(() => {
    if (hydrated) {
      setItem("firstPath", window.location.pathname);
    }
  }, [hydrated]);

  useEffect(() => {
    if (wallet) {
      fetchBalance();
    }
  }, [wallet]);

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
