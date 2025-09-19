import { ethers } from "ethers";
import os from "os";
import DotContractABI from "./abi/DotContractABI.json" with { type: "json" };

const PORT = 1976;
const CONTRACT_ADDRESS_DOT = "0xB67662F0d2BB106B055503062e1dba4f072f5781";

/**
 * 验证 token 并返回地址
 * @param {string} token - 格式为 "address.message.signature" 的 token
 * @returns {string | null} - 验证成功返回地址，失败返回空字符串
 */
const getAddress = (token) => {
  if (token && typeof token === "string") {
    try {
      const [address, t, sig] = token.split(".");
      // token 有效期为 4 小时
      if (Date.now() - parseInt(t) > 1000 * 60 * 60 * 4) {
        return null;
      }
      if (address && t && sig) {
        const ethAddress = ethers.verifyMessage(t, sig).toLowerCase();
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

/**
 * 判断数组相等
 * @param {string[]} a
 * @param {string[]} b
 * @returns {boolean}
 */
const arrayEqual = (a, b) => {
  if (a.length !== b.length) {
    return false;
  }
  const set1 = new Set(a);
  const set2 = new Set(b);
  return set1.size === set2.size && [...set1].every((x) => set2.has(x));
};

const network = {
  ipv4: [`http://localhost:${PORT}`],
  ipv6: [`http://[::1]:${PORT}`],
};

const initIP = () => {
  // 重置
  network.ipv4 = [`http://localhost:${PORT}`]
  network.ipv6 = [`http://[::1]:${PORT}`]
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // 获取 IPv4 地址
      if (iface.family === "IPv4" && !iface.internal) {
        network.ipv4.push(`http://${iface.address}:${PORT}`);
      }
      // 获取 IPv6 地址
      if (
        iface.family === "IPv6" &&
        !iface.internal &&
        !iface.address.startsWith("fe80")
      ) {
        network.ipv6.push(`http://[${iface.address}]:${PORT}`);
      }
    }
  }
  // 推送 IP 地址
  postIP("https://sepolia.base.org")
  postIP('https://mainnet.base.org')
};

const getIP = () => {
  const { DOT_NAME, API_URLS, CID_URLS } = process.env
  const dot = {
    name: DOT_NAME || '',
    APIs: network.ipv6.slice(1),
    CIDs: [],
  }
  if (API_URLS) {
    dot.APIs.unshift(...API_URLS.split(','));
  }
  if (CID_URLS) {
    dot.CIDs.unshift(...CID_URLS.split(','));
  }
  return dot
}

const postIP = async (RPC) => {
  const { PRIVATE_KEY, DOT_NAME } = process.env
  if (!PRIVATE_KEY || !DOT_NAME) {
    console.error('请在 .env 文件设置 PRIVATE_KEY 和 DOT_NAME');
    return;
  }
  const provider = new ethers.JsonRpcProvider(RPC);
  const dotContract = new ethers.Contract(CONTRACT_ADDRESS_DOT, DotContractABI, provider);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  const contract = dotContract.connect(wallet);

  // 更新
  try {
    const [name, APIs, CIDs, update] = await contract.getDot(wallet.address);
    const dot = getIP()

    if (arrayEqual(APIs, dot.APIs) && arrayEqual(CIDs, dot.CIDs)) {
      console.log(RPC, "节点无变化");
      return;
    }

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

const isOwner = (token) => {
  const { PRIVATE_KEY } = process.env;
  if (!PRIVATE_KEY) return false;
  const address = getAddress(token);
  if (!address) return false;
  const wallet = new ethers.Wallet(PRIVATE_KEY);
  return wallet.address.toLowerCase() === address;
}

export default {
  PORT,
  isOwner,
  network,
  getIP,
  initIP,
  getAddress,
  arrayEqual,
};
