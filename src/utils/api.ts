import ky from "ky";
import { mostCrust, type MostWallet } from "@/utils/MostWallet";
import { useUserStore } from "@/stores/userStore";

export const isDev = process.env.NODE_ENV === "development";

/**
 * 生成 Web3 鉴权 Headers
 * 为了防止重放攻击，签名内容包含：timestamp:method:path
 */
export const getAuthHeaders = async (
  wallet: MostWallet,
  method: string,
  url: string,
) => {
  const { crust_address, sign } = mostCrust(wallet.danger);
  const timestamp = Date.now().toString();
  const path = new URL(url).pathname;
  const message = `${timestamp}:${method.toUpperCase()}:${path}`;
  const signature = sign(message);
  return {
    Authorization: `${crust_address},${timestamp},${signature}`,
  };
};

export const apiKy = ky.create({
  timeout: false,
});

import { API_PREFIX_URL, API_LOCAL_PREFIX_URL } from "@/constants";

export const apiAuth = apiKy.extend({
  // prefixUrl: isDev ? API_LOCAL_PREFIX_URL : API_PREFIX_URL,
  prefixUrl: API_PREFIX_URL,
  hooks: {
    beforeRequest: [
      async (request) => {
        // 自动加载 Web3 鉴权 Headers
        const wallet = useUserStore.getState().wallet;
        if (wallet) {
          const headers = await getAuthHeaders(
            wallet,
            request.method,
            request.url,
          );
          Object.entries(headers).forEach(([key, value]) => {
            request.headers.set(key, value);
          });
        }
      },
    ],
  },
});
