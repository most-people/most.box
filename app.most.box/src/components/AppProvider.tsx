"use client";
import FingerprintJS from "@fingerprintjs/fingerprintjs";
import { useUserStore } from "@/stores/userStore";
import { checkNode, useDotStore } from "@/stores/dotStore";
import { useEffect } from "react";
import { api } from "@/constants/api";
import { useComputedColorScheme, useMantineColorScheme } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import mp from "@/constants/mp";

export default function AppProvider() {
  const exit = useUserStore((state) => state.exit);
  const setWallet = useUserStore((state) => state.setWallet);
  const setItem = useUserStore((state) => state.setItem);
  const setDotItem = useDotStore((state) => state.setItem);
  const setNetwork = useDotStore((state) => state.setNetwork);
  const updateDot = useDotStore((state) => state.updateDot);
  const fetchNodes = useDotStore((state) => state.fetchNodes);

  const initWallet = (fingerprint: string) => {
    setItem("fingerprint", fingerprint);
    const jwt = localStorage.getItem("jwt");
    if (jwt) {
      try {
        const wallet = mp.verifyJWT(jwt);
        if (wallet) {
          mp.createToken(wallet);
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

  const autoDot = async () => {
    const nodes = await fetchNodes();
    const dotNodes = await Promise.all(
      nodes.map(async (node) => {
        const { isOnline, responseTime } = await checkNode(node);
        return { ...node, isOnline, responseTime };
      })
    );
    const node = dotNodes.sort((a, b) => a.responseTime - b.responseTime)[0];
    const url = node?.APIs?.[0];
    if (url) {
      updateDot(url);
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
      if (list === null) {
        autoDot();
      }
    });
    const dotCID = localStorage.getItem("dotCID");
    if (dotCID) setDotItem("dotCID", dotCID);
  };

  useEffect(() => {
    initDot();
    initFinger();
    sessionStorage.setItem("firstPath", window.location.pathname);
    const network =
      localStorage.getItem("network") === "mainnet" ? "mainnet" : "testnet";
    setNetwork(network);
  }, []);

  const { colorScheme } = useMantineColorScheme();
  const computedColorScheme = useComputedColorScheme();
  useEffect(() => {
    const theme = colorScheme === "auto" ? computedColorScheme : colorScheme;
    setItem("nodeDark", theme === "dark" ? "toastui-editor-dark" : "");
  }, [colorScheme, computedColorScheme]);

  return null;
}
