import { apiKy } from "@/utils/api";
import { GatewayInfo, IPFS_GATEWAY_LIST } from "@/constants";
import { download, resolveScheme } from "thirdweb/storage";
import { client } from "@/utils/thirdweb";

export type { GatewayInfo };
export const GatewayList: GatewayInfo[] = IPFS_GATEWAY_LIST;

export type DetectionStatus =
  | "success"
  | "error"
  | "timeout"
  | "pending"
  | "idle";

export type DetectionResult = {
  status: DetectionStatus;
  responseTime?: number;
};

/**
 * 通过 Thirdweb 网关极速读取 IPFS 文件
 * @param uri 可以是 "ipfs://<CID>" 或者直接传入 "<CID>"
 */
export async function fetchFromIPFS(uri: string) {
  try {
    // 自动通过 Thirdweb 全球网关拉取
    const response = await download({
      client,
      uri: uri.startsWith("ipfs://") ? uri : `ipfs://${uri}`,
    });

    // 如果是 Markdown 笔记这种文本格式：
    const textData = await response.text();
    return textData;

    // 如果是图片/二进制文件：
    // const blobData = await response.blob();
    // return URL.createObjectURL(blobData);
  } catch (error) {
    console.error("IPFS 读取失败:", error);
    throw error;
  }
}

/**
 * 直接生成加速后的图片 URL
 * @param ipfsUri 比如传入 "ipfs://Qm..."
 * @returns "https://<你的专属网关>.thirdwebstorage.com/ipfs/Qm..."
 */
export function getFastImageUrl(ipfsUri: string) {
  return resolveScheme({
    client,
    uri: ipfsUri,
  });
}

export const checkGateway = async (
  gateway: string,
  cid: string,
): Promise<DetectionResult> => {
  // 移除末尾斜杠
  const baseUrl = gateway.replace(/\/$/, "");
  const testUrl = `${baseUrl}/ipfs/${cid}`;

  const startTime = Date.now();

  try {
    const response = await apiKy.head(testUrl, {
      timeout: 10000,
      throwHttpErrors: false,
    });

    const responseTime = Date.now() - startTime;

    if (response.ok || response.status === 206) {
      return { status: "success", responseTime };
    } else {
      return { status: "error", responseTime };
    }
  } catch (error: any) {
    if (error.name === "TimeoutError") {
      return { status: "timeout" };
    }
    return { status: "error" };
  }
};
