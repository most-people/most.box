import axios from "axios";
import { Wallet } from "ethers";
import { mostMnemonic, type MostWallet } from "@/utils/MostWallet";
import { useUserStore } from "@/stores/userStore";

export const isDev = process.env.NODE_ENV === "development";

/**
 * 生成 Web3 鉴权 Headers
 */
export const getAuthHeaders = async (wallet: MostWallet) => {
  const mnemonic = mostMnemonic(wallet.danger);
  const account = Wallet.fromPhrase(mnemonic);
  const timestamp = Date.now().toString();
  const signature = await account.signMessage(timestamp);
  return {
    Authorization: `${account.address},${timestamp},${signature}`,
  };
};

export const api = axios.create({
  baseURL: isDev ? "http://localhost:8787" : "https://api.most.box",
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
