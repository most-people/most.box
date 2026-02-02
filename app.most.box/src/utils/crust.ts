import { formatUnits, Wallet } from "ethers";
import { create } from "kubo-rpc-client";
import axios from "axios";
import { mostCrust } from "./MostWallet";

// Crust IPFS Web3 Auth 网关
const CRUST_GW = "https://gw.crustfiles.app";
const CRUST_PIN_URL = "https://pin.crustcode.com/psa";
const CRUST_RPC_URL = "wss://rpc.crust.network";

/**
 * 创建 Crust Web3 认证头
 * @param address 以太坊地址
 * @param signature 地址签名
 * @returns Base64 编码的认证头
 */
export const createCrustAuthHeader = (address: string, signature: string) => {
  const authHeaderRaw = `eth-${address}:${signature}`;
  return Buffer.from(authHeaderRaw).toString("base64");
};

/**
 * 上传文件到 IPFS 网关（不进行 Pin）
 * @param file 要上传的文件对象
 * @param authHeader Base64 编码的认证头
 * @returns 包含 CID 和大小的上传结果
 */
export const uploadToIpfsGateway = async (file: File, authHeader: string) => {
  // 创建连接到 Crust 网关的 IPFS 客户端
  const ipfs = create({
    url: `${CRUST_GW}/api/v0`,
    headers: {
      authorization: `Basic ${authHeader}`,
    },
  });

  try {
    const result = await ipfs.add(file, { cidVersion: 1 });
    return {
      cid: result.cid.toString(),
      size: result.size,
      url: `${CRUST_GW}/ipfs/${result.cid.toString()}`,
    };
  } catch (error) {
    console.error("IPFS 上传失败:", error);
    throw error;
  }
};

/**
 * 使用网关 Pinning 服务将文件 Pin 到 Crust 网络
 * @param cid IPFS 内容 ID
 * @param name 文件名
 * @param authHeader Base64 编码的认证头
 */
export const pinToCrustGateway = async (
  cid: string,
  name: string,
  authHeader: string,
) => {
  try {
    return await axios.post(
      `${CRUST_PIN_URL}/pins`,
      {
        cid: cid,
        name: name,
      },
      {
        headers: {
          authorization: `Bearer ${authHeader}`,
        },
      },
    );
  } catch (pinError) {
    console.warn("Pin 失败，可能是因为余额不足:", pinError);
    throw pinError;
  }
};

/**
 * 使用预计算的认证头上传文件到 Crust 网络
 * @param file 要上传的文件对象
 * @param authHeader Base64 编码的认证头
 * @returns 带 CID 的上传结果
 */
export const uploadWithAuthHeader = async (file: File, authHeader: string) => {
  try {
    // 1. 上传到 IPFS 网关
    const result = await uploadToIpfsGateway(file, authHeader);

    // 2. 将文件 Pin 到 Crust 网络
    await pinToCrustGateway(result.cid, file.name, authHeader);

    return result;
  } catch (error) {
    console.error("Crust 上传失败:", error);
    throw error;
  }
};

/**
 * 通过 Web3 Auth 网关上传文件到 Crust 网络
 * @param file 要上传的文件对象
 * @param mnemonic 签名请求的钱包助记词
 * @returns 带 CID 的上传结果
 */
export const uploadToCrust = async (file: File, mnemonic: string) => {
  if (!mnemonic) throw new Error("需要钱包助记词");

  // 从助记词创建签名者
  const account = Wallet.fromPhrase(mnemonic);
  const address = account.address;
  // 签名地址本身作为消息
  const signature = await account.signMessage(address);

  // 构造认证头
  const authHeader = createCrustAuthHeader(address, signature);

  return uploadWithAuthHeader(file, authHeader);
};

/**
 * 使用 CRU 代币在 Crust 网络上下存储订单（自费）
 * @param cid IPFS 内容 ID
 * @param fileSize 文件大小（字节）
 * @param seed Substrate 账户种子/助记词（注意：通常与 ETH 助记词不同）
 * @param tips 订单小费（可选）
 * @returns 交易哈希
 */
export const placeStorageOrder = async (
  cid: string,
  fileSize: number,
  danger: string,
  tips = 0,
) => {
  const { ApiPromise, WsProvider } = await import("@polkadot/api");
  const { typesBundleForPolkadot } = await import("@crustio/type-definitions");
  const { Keyring } = await import("@polkadot/keyring");

  // 1. 初始化 API
  const crust = new ApiPromise({
    provider: new WsProvider(CRUST_RPC_URL),
    typesBundle: typesBundleForPolkadot,
  });

  try {
    await crust.isReady;

    // 2. 创建 Keyring
    const keyring = new Keyring({ type: "sr25519" });
    const { crust_mnemonic } = await mostCrust(danger);
    const krp = keyring.addFromUri(crust_mnemonic);

    // 3. 创建交易
    // market.placeStorageOrder(cid, size, tips, memo)
    // memo 是可选的，默认为空
    const tx = crust.tx.market.placeStorageOrder(cid, fileSize, tips, "");

    // 4. 发送并等待确认
    const result = await new Promise<string>((resolve, reject) => {
      tx.signAndSend(krp, ({ status, events, dispatchError, txHash }) => {
        if (status.isFinalized) {
          console.log(`交易在区块 ${status.asFinalized} 确认`);
          resolve(txHash.toHex());
        } else if (dispatchError) {
          if (dispatchError.isModule) {
            const decoded = crust.registry.findMetaError(
              dispatchError.asModule,
            );
            const { docs, name, section } = decoded;
            reject(new Error(`${section}.${name}: ${docs.join(" ")}`));
          } else {
            reject(new Error(dispatchError.toString()));
          }
        }
      }).catch((error) => {
        reject(error);
      });
    });

    return result;
  } catch (error) {
    console.error("下存储订单失败:", error);
    throw error;
  } finally {
    await crust.disconnect();
  }
};

/**
 * 查询 Crust 账户余额
 * @param address Crust 地址
 * @returns 余额（单位：CRU，类型：string）
 */
export const getCrustBalance = async (address: string): Promise<string> => {
  try {
    const res = await axios.post(
      "https://crust.api.subscan.io/api/scan/account/tokens",
      { address },
    );
    const balance = res.data?.data?.native?.[0]?.balance ?? "0";
    return formatUnits(balance, 12);
  } catch (error) {
    console.error("查询余额失败:", error);
    throw error;
  }
};
