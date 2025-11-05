import { Contract, formatEther, JsonRpcProvider, verifyMessage, Wallet } from "ethers";
import os from "os";
import { create } from "kubo-rpc-client";
import DotContractABI from "./abi/DotContractABI.json" with { type: "json" };

const PORT = 1976;
const CONTRACT_ADDRESS_DOT = "0xB67662F0d2BB106B055503062e1dba4f072f5781";
// 创建 IPFS 客户端
const ipfs = create({ url: "http://127.0.0.1:5001" });

/**
 * 验证 token 并返回地址
 * @param token 格式为 "address.message.signature"
 */
const getAddress = (token: string | undefined | null): string | null => {
  if (token && typeof token === "string") {
    try {
      const [address, t, sig] = token.split(".");
      // token 有效期为 4 小时
      if (Date.now() - parseInt(t) > 1000 * 60 * 60 * 4) {
        return null;
      }
      if (address && t && sig) {
        const ethAddress = verifyMessage(t, sig).toLowerCase();
        if (address.toLowerCase() === ethAddress) {
          return ethAddress;
        }
      }
    } catch (error) {
      console.error("Token验证失败:", error);
    }
  }

  return null;
};

/** 判断数组相等 */
const arrayEqual = (a: string[], b: string[]) => {
  if (a.length !== b.length) {
    return false;
  }
  const set1 = new Set(a);
  const set2 = new Set(b);
  return set1.size === set2.size && [...set1].every((x) => set2.has(x));
};

const network = {
  ipv4: [`http://127.0.0.1:${PORT}`],
  ipv6: [`http://[::1]:${PORT}`],
};

const initIP = () => {
  // 重置
  network.ipv4 = [`http://127.0.0.1:${PORT}`];
  network.ipv6 = [`http://[::1]:${PORT}`];
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      // 获取 IPv4 地址
      if ((iface as any).family === "IPv4" && !(iface as any).internal) {
        network.ipv4.push(`http://${(iface as any).address}:${PORT}`);
      }
      // 获取 IPv6 地址
      if (
        (iface as any).family === "IPv6" &&
        !(iface as any).internal &&
        !String((iface as any).address).startsWith("fe80")
      ) {
        network.ipv6.push(`http://[${(iface as any).address}]:${PORT}`);
      }
    }
  }
  // 推送 IP 地址
  postIP("https://sepolia.base.org");
  postIP("https://mainnet.base.org");
};

const getIP = async () => {
  const peer = await ipfs.id();
  const IPFS_ID = peer.id.toString();
  const { DOT_NAME, API_URLS, CID_URLS } = process.env;
  const dot = {
    name: `${DOT_NAME || "Unknown"}-${IPFS_ID}` || "",
    APIs: network.ipv6.slice(1),
    CIDs: [] as string[],
  };
  if (API_URLS) {
    dot.APIs.unshift(...API_URLS.split(","));
  }
  if (CID_URLS) {
    dot.CIDs.unshift(...CID_URLS.split(","));
  }
  return dot;
};

const postIP = async (RPC: string) => {
  const { PRIVATE_KEY, DOT_NAME, API_URLS } = process.env;
  if (!(PRIVATE_KEY && DOT_NAME && API_URLS)) {
    console.error('请在 .env 文件设置 PRIVATE_KEY, DOT_NAME 和 API_URLS');
    return;
  }

  const provider = new JsonRpcProvider(RPC);
  const dotContract = new Contract(CONTRACT_ADDRESS_DOT, DotContractABI, provider);
  const wallet = new Wallet(PRIVATE_KEY, provider);
  const contract = dotContract.connect(wallet) as any;

  // 更新
  try {
    const [name, APIs, CIDs] = await contract.getDot(wallet.address);
    const dot = await getIP();

    if (name === dot.name && arrayEqual(APIs, dot.APIs) && arrayEqual(CIDs, dot.CIDs)) {
      console.log(RPC, "节点无变化");
      return;
    }

    // 估算gas费用
    const gasEstimate = await contract.setDot.estimateGas(dot.name, dot.APIs, dot.CIDs);
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || 0n;
    const estimatedCost = gasEstimate * gasPrice;

    // 检查余额是否足够
    const balance = await provider.getBalance(wallet.address);

    if (balance < estimatedCost) {
      console.error(RPC, `手续费不足: 需要 ${formatEther(estimatedCost)} ETH，但余额只有 ${formatEther(balance)} ETH`);
      return;
    }

    await contract.setDot(dot.name, dot.APIs, dot.CIDs);
    console.log(RPC, "节点信息已更新到合约");
  } catch (error) {
    console.error(RPC, "更新节点信息失败:", error);
  }
};

const isOwner = (token: string | undefined | null) => {
  const { PRIVATE_KEY } = process.env;
  if (!PRIVATE_KEY) return false;
  const address = getAddress(token || "");
  if (!address) return false;
  const wallet = new Wallet(PRIVATE_KEY);
  return wallet.address.toLowerCase() === address;
}

interface Dot {
  address: string;
  name: string;
  APIs: string[];
  CIDs: string[];
  lastUpdate: number;
}

const getAllDots = async () => {
  const provider = new JsonRpcProvider("https://mainnet.base.org");
  const contract = new Contract(CONTRACT_ADDRESS_DOT, DotContractABI, provider);
  const [addresses, names, APIss, CIDss, updates] = await contract.getAllDots();
  const dots: Dot[] = addresses.map((address: string, index: number) => {
    return {
      address,
      name: names[index] || '',
      APIs: APIss[index] || [],
      CIDs: CIDss[index] || [],
      lastUpdate: Number(updates[index]),
    };
  });
  return dots;
}

export default {
  PORT,
  isOwner,
  network,
  getIP,
  initIP,
  getAddress,
  getAllDots,
  arrayEqual,
};
