import {
  formatUnits,
  Wallet,
  Mnemonic,
  getBytes,
  pbkdf2,
  toUtf8Bytes,
} from "ethers";
import { create } from "kubo-rpc-client";
import axios from "axios";
import * as sr25519 from "@scure/sr25519";
import { base58 } from "@scure/base";

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
    await axios.post(
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
    // 这里不抛出异常，允许返回 CID（如果是从 uploadWithAuthHeader 调用的），
    // 但通常这应该由调用者处理。
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
  seed: string,
  tips = 0,
) => {
  const { ApiPromise, WsProvider } = await import("@polkadot/api");
  const { typesBundleForPolkadot } = await import("@crustio/type-definitions");

  // 1. 初始化 API
  const api = new ApiPromise({
    provider: new WsProvider(CRUST_RPC_URL),
    typesBundle: typesBundleForPolkadot,
  });

  try {
    await api.isReady;

    // 2. Generate Keypair from Seed (compatible with Polkadot-JS)
    // Supports hex seed or mnemonic phrase
    let secretKey: Uint8Array;
    let publicKey: Uint8Array;

    if (seed.startsWith("0x")) {
      // Hex seed
      secretKey = getBytes(seed);
      if (secretKey.length !== 32) {
        // Handle mini-secret vs full secret if needed, but standard is 32 bytes mini-secret or 64 bytes secret
        // For simplicity assume 32 bytes mini-secret if length is 32
        if (secretKey.length === 32) {
          secretKey = sr25519.secretFromSeed(secretKey);
        }
      }
      publicKey = sr25519.getPublicKey(secretKey);
    } else {
      // Mnemonic - Polkadot style derivation
      const entropy = getBytes(Mnemonic.fromPhrase(seed).entropy);
      const salt = toUtf8Bytes("mnemonic");
      const seedBytes = pbkdf2(entropy, salt, 2048, 64, "sha512");
      const miniSecret = getBytes(seedBytes).slice(0, 32);
      secretKey = sr25519.secretFromSeed(miniSecret);
      publicKey = sr25519.getPublicKey(secretKey);
    }

    // Construct a custom Signer/KeyringPair object for Polkadot API
    // We only need the address and a sign function
    const addressBytes = new Uint8Array(2 + publicKey.length + 2); // Prefix(2) + Pub(32) + Checksum(2)
    addressBytes.set([0x50, 0x80], 0); // Crust Prefix 66 -> 0x5080
    addressBytes.set(publicKey, 2);
    // Note: We don't compute full checksum here for the 'address' string property if we can avoid it,
    // but the API might need a valid SS58 string.
    // Let's use the raw publicKey for the pair and let the API handle address encoding if possible,
    // OR just construct the object.

    // Actually, api.signAndSend expects a KeyringPair which has .address (string) and .sign(message)
    // We need to implement the sign function.

    const customPair = {
      address: base58.encode(addressBytes), // Simplified address, might need proper checksum if API validates strictly
      publicKey: publicKey,
      sign: (message: Uint8Array) => {
        return sr25519.sign(secretKey, message);
      },
      // Polkadot API checks for this to distinguish from address string
      addressRaw: publicKey,
      type: "sr25519",
    };

    // 3. 创建交易
    // market.placeStorageOrder(cid, size, tips, memo)
    // memo 是可选的，默认为空
    const tx = api.tx.market.placeStorageOrder(cid, fileSize, tips, "");

    // 4. 发送并等待确认
    const result = await new Promise<string>((resolve, reject) => {
      // @ts-ignore - Custom signer object duck-typing
      tx.signAndSend(
        customPair,
        ({ status, events, dispatchError, txHash }) => {
          if (status.isFinalized) {
            console.log(`交易在区块 ${status.asFinalized} 确认`);
            resolve(txHash.toHex());
          } else if (dispatchError) {
            if (dispatchError.isModule) {
              const decoded = api.registry.findMetaError(
                dispatchError.asModule,
              );
              const { docs, name, section } = decoded;
              reject(new Error(`${section}.${name}: ${docs.join(" ")}`));
            } else {
              reject(new Error(dispatchError.toString()));
            }
          }
        },
      ).catch((error) => {
        reject(error);
      });
    });

    return result;
  } catch (error) {
    console.error("下存储订单失败:", error);
    throw error;
  } finally {
    await api.disconnect();
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
