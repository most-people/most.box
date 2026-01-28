import axios from "axios";
import { Wallet } from "ethers";
import { mostMnemonic, type MostWallet } from "./MostWallet";
import { useUserStore } from "@/stores/userStore";

export const isDev = process.env.NODE_ENV !== "production";

/**
 * 生成 Web3 鉴权 Headers
 */
export const getAuthHeaders = async (wallet: MostWallet) => {
  const mnemonic = mostMnemonic(wallet.danger);
  const account = Wallet.fromPhrase(mnemonic);
  const timestamp = Date.now().toString();
  // 签名消息为当前时间戳字符串
  const signature = await account.signMessage(timestamp);

  return {
    "x-address": account.address,
    "x-signature": signature,
    "x-timestamp": timestamp,
  };
};

export const api = axios.create({
  baseURL: "http://localhost:7878",
});

// 添加请求拦截器，自动在 header 中加载 Authorization
api.interceptors.request.use(
  async (config) => {
    // 自动加载 Web3 鉴权 Headers
    const wallet = useUserStore.getState().wallet;
    if (wallet) {
      const headers = await getAuthHeaders(wallet);
      Object.assign(config.headers, headers);
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// 添加响应拦截器，自动处理 token 失效
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    return Promise.reject(error);
  },
);
