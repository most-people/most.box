import ky from "ky";
import { mostCrust, type MostWallet } from "@/utils/MostWallet";
import { useUserStore } from "@/stores/userStore";

export const isDev = process.env.NODE_ENV === "development";

/**
 * 生成 Web3 鉴权 Headers
 */
export const getAuthHeaders = async (wallet: MostWallet) => {
  const { crust_address, sign } = mostCrust(wallet.danger);
  const timestamp = Date.now().toString();
  const signature = sign(timestamp);
  return {
    Authorization: `${crust_address},${timestamp},${signature}`,
  };
};

export const api = ky.create({
  // prefixUrl: isDev ? "http://localhost:8787/api" : "https://api.most.box/api",
  prefixUrl: "https://api.most.box/api",
  hooks: {
    beforeRequest: [
      async (request) => {
        // 自动加载 Web3 鉴权 Headers
        const wallet = useUserStore.getState().wallet;
        if (wallet) {
          const headers = await getAuthHeaders(wallet);
          Object.entries(headers).forEach(([key, value]) => {
            request.headers.set(key, value);
          });
        }
      },
    ],
  },
});
