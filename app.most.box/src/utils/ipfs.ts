
export type DetectionStatus = "success" | "error" | "timeout" | "pending" | "idle";

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
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒超时

  try {
    const response = await fetch(testUrl, {
      // method: "GET",
      // headers: { Range: "bytes=0-0" }, // 请求极小部分数据以测试连通性
      method: "HEAD",
      signal: controller.signal,
    });

    const responseTime = Date.now() - startTime;
    clearTimeout(timeoutId);

    if (response.ok || response.status === 206) {
      return { status: "success", responseTime };
    } else {
      return { status: "error", responseTime };
    }
  } catch (error: unknown) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      return { status: "timeout" };
    }
    return { status: "error" };
  }
};
