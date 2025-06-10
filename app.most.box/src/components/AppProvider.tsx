"use client";
import { useAccountStore } from "@/stores/accountStore";
import { useUserStore } from "@/stores/userStore";
import { useEffect } from "react";

export default function AppProvider() {
  const setItem = useUserStore((state) => state.setItem);
  const initWallet = useUserStore((state) => state.initWallet);
  const initAccount = useAccountStore((state) => state.initAccount);

  useEffect(() => {
    initWallet();
    initAccount();
    setItem("firstPath", window.location.pathname);
  }, []);

  return null;
}
