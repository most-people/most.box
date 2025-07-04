import 'dotenv/config';
import fastify from "fastify";
import fastifyStatic from "@fastify/static";
import fastifyMultipart from "@fastify/multipart";
import fastifyCors from "@fastify/cors";
import { create } from "kubo-rpc-client";
import { ethers } from "ethers";
import path from "path";
import os from "os";
import { fileURLToPath } from "url";
import { registerFiles } from "./files.mjs";
import mp from "./mp.mjs";
import DotContract from "./abi/DotContract.json" with { type: "json" };

// 创建 IPFS 客户端
const ipfs = create({ url: "http://localhost:5001" });

const port = 1976;

const server = fastify();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 注册 CORS 插件
server.register(fastifyCors, {
  origin: true, // 允许所有来源，生产环境建议指定具体域名
  credentials: true, // 允许携带凭证
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
});

// 注册静态文件服务
server.register(fastifyStatic, {
  root: path.join(__dirname, "../..", "app.most.box/out"),
  prefix: "/",
});

// 注册 multipart 插件用于文件上传
server.register(fastifyMultipart, {
  limits: {
    fileSize: 200 * 1024 * 1024, // 设置单个文件大小限制为200MB
    files: 1, // 限制同时上传的文件数量
  },
});

// 注册文件路由
registerFiles(server, ipfs);

const network = {
  ipv4: [`http://localhost:${port}`],
  ipv6: [`http://[::1]:${port}`],
};

// 获取 IPv6
server.get("/ipv6", async () => {
  return network.ipv6.slice(1);
});

const initIP = () => {
  // 重置
  network.ipv4 = [`http://localhost:${port}`]
  network.ipv6 = [`http://[::1]:${port}`]
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // 获取 IPv4 地址
      if (iface.family === "IPv4" && !iface.internal) {
        network.ipv4.push(`http://${iface.address}:${port}`);
      }
      // 获取 IPv6 地址
      if (
        iface.family === "IPv6" &&
        !iface.internal &&
        !iface.address.startsWith("fe80")
      ) {
        network.ipv6.push(`http://[${iface.address}]:${port}`);
      }
    }
  }
  // 推送 IP 地址
  postIP("https://sepolia.base.org");
  postIP('https://mainnet.base.org');
};

const postIP = async (RPC) => {
  const { PRIVATE_KEY, DOT_NAME, API_URL, CID_URL } = process.env
  if (!PRIVATE_KEY || !DOT_NAME) {
    console.error('请在 .env 文件设置 PRIVATE_KEY 和 DOT_NAME');
    return;
  }
  const CONTRACT_ADDRESS = "0xdc82cef1a8416210afb87caeec908a4df843f016";
  const provider = new ethers.JsonRpcProvider(RPC);
  const dotContract = new ethers.Contract(CONTRACT_ADDRESS, DotContract.abi, provider);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  const contract = dotContract.connect(wallet);


  // 开始获取
  const [name, APIs, CIDs, update] = await contract.getDot(wallet.address);

  const dot = {
    name: DOT_NAME,
    APIs: network.ipv6.slice(1),
    CIDs: [],
  }
  if (API_URL) {
    dot.APIs.push(API_URL);
  }
  if (CID_URL) {
    dot.CIDs.push(CID_URL);
  }

  if (mp.arrayEqual(APIs, dot.APIs) && mp.arrayEqual(CIDs, dot.CIDs)) {
    console.log(RPC, "节点无变化");
    return;
  }

  // 开始更新
  try {
    // 估算gas费用
    const gasEstimate = await contract.setDot.estimateGas(dot.name, dot.APIs, dot.CIDs);
    const gasPrice = await provider.getFeeData();
    const estimatedCost = gasEstimate * gasPrice.gasPrice;

    // 检查余额是否足够
    const balance = await provider.getBalance(wallet.address);

    if (balance < estimatedCost) {
      console.error(RPC, `手续费不足: 需要 ${ethers.formatEther(estimatedCost)} ETH，但余额只有 ${ethers.formatEther(balance)} ETH`);
      return;
    }

    await contract.setDot(dot.name, dot.APIs, dot.CIDs);
    console.log(RPC, "节点信息已更新到合约");
  } catch (error) {
    console.error(RPC, "更新节点信息失败:", error);
  }
};

const start = async () => {
  // 运行 DOT.MOST.BOX
  try {
    const peer = await ipfs.id();
    console.log("IPFS", peer.id);
    await server.listen({ port, host: "::" });

    // 获取 IP 地址
    initIP();
    console.log(network);

    // 更新 IP 地址
    setInterval(() => {
      console.log('定时更新IP地址...');
      initIP();
    }, 1 * 60 * 60 * 1000); // 每1小时执行一次
  } catch (error) {
    console.error(error);
    server.log.error(error);
    process.exit(1);
  }
};

start();
