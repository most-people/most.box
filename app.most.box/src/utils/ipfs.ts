export type GatewayInfo = {
  key: string;
  title: string;
  description: string;
  gateways: string[];
};

export const GatewayList: GatewayInfo[] = [
  {
    key: "custom",
    title: "自定义网关",
    description: "用户自定义的 IPFS 网关",
    gateways: ["https://mp9.io", "http://localhost:8080"],
  },
  {
    key: "crust",
    title: "Crust 官方网关",
    description: "由 Crust Network 提供的高速稳定网关",
    gateways: ["https://gw.crust-gateway.xyz", "https://gw.crust-gateway.com"],
  },
  {
    key: "public",
    title: "公共网关",
    description: "由社区或第三方服务商提供的公共网关",
    gateways: [
      "https://cloudflare-ipfs.com",
      "https://nftstorage.link",
      "https://ipfs.runfission.com",
      "https://cid.most.red",
      "https://ipfs.io",
      "https://dweb.link",
      "https://gateway.pinata.cloud",
      "https://ipfs.filebase.io",
      "https://w3s.link",
      "https://4everland.io",
      "https://apac.orbitor.dev",
      "https://eu.orbitor.dev",
      "https://latam.orbitor.dev",
      "https://dget.top",
    ],
  },
];

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
