import { apiKy } from "@/utils/api";
import { GatewayInfo, IPFS_GATEWAY_LIST } from "@/constants";

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
