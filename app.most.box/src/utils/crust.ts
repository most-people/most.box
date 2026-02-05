import { formatUnits, Wallet } from "ethers";
import { create } from "kubo-rpc-client";
import axios from "axios";
import { mostCrust } from "@/utils/MostWallet";

// Crust IPFS Web3 Auth 网关
const CRUST_IPFS_GW = "https://gw.crustfiles.app";
// Crust Pinning 服务
const CRUST_PIN = "https://pin.crustcode.com/psa";
// Crust 链 RPC 节点
const CRUST_RPC = "wss://rpc.crust.network";
// Subscan 浏览器 API
const CRUST_SUBSCAN_API = "https://crust.api.subscan.io";

/**
 * 创建 Crust Web3 认证头
 * @param address 以太坊地址
 * @param signature 地址签名
 * @returns Base64 编码的认证头
 */
const auth = (address: string, signature: string) => {
  const authHeaderRaw = `eth-${address}:${signature}`;
  return Buffer.from(authHeaderRaw).toString("base64");
};

/**
 * 上传文件到 IPFS 网关（不进行 Pin）
 * @param file 要上传的文件对象
 * @param authHeader Base64 编码的认证头
 * @returns 包含 CID 和大小的上传结果
 */
const ipfs = async (file: File, authHeader: string) => {
  // 创建连接到 Crust 网关的 IPFS 客户端
  const ipfsClient = create({
    url: `${CRUST_IPFS_GW}/api/v0`,
    headers: {
      authorization: `Basic ${authHeader}`,
    },
  });

  try {
    const result = await ipfsClient.add(file, { cidVersion: 1 });
    return {
      cid: result.cid.toString(),
      size: result.size,
      url: `${CRUST_IPFS_GW}/ipfs/${result.cid.toString()}`,
    };
  } catch (error) {
    console.error("IPFS 上传失败:", error);
    throw error;
  }
};

/**
 * 上传文件夹到 IPFS 网关
 * @param files 文件列表 { path: string, content: string | Blob | Buffer }
 * @param authHeader Base64 编码的认证头
 * @returns 包含 Root CID 的上传结果
 */
const ipfsDir = async (
  files: { path: string; content: string | Blob | Buffer }[],
  authHeader: string,
) => {
  const ipfsClient = create({
    url: `${CRUST_IPFS_GW}/api/v0`,
    headers: {
      authorization: `Basic ${authHeader}`,
    },
  });

  try {
    const results = [];
    // wrapWithDirectory: true 会把所有文件包裹在一个空路径的文件夹中
    for await (const result of ipfsClient.addAll(files, {
      cidVersion: 1,
      wrapWithDirectory: true,
    })) {
      results.push(result);
    }

    // 找到根目录（path 为 "" 的项）
    const root = results.find((r) => r.path === "");
    if (!root) {
      throw new Error("无法获取根目录 CID");
    }

    return {
      cid: root.cid.toString(),
      size: root.size,
      url: `${CRUST_IPFS_GW}/ipfs/${root.cid.toString()}`,
    };
  } catch (error) {
    console.error("IPFS 文件夹上传失败:", error);
    throw error;
  }
};

/**
 * 使用网关 Pinning 服务将文件 Pin 到 Crust 网络
 * @param cid IPFS 内容 ID
 * @param name 文件名
 * @param authHeader Base64 编码的认证头
 */
const pin = async (cid: string, name: string, authHeader: string) => {
  try {
    return await axios.post(
      `${CRUST_PIN}/pins`,
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
const uploadWithAuth = async (file: File, authHeader: string) => {
  try {
    // 1. 上传到 IPFS 网关
    const result = await ipfs(file, authHeader);

    // 2. 将文件 Pin 到 Crust 网络
    await pin(result.cid, file.name, authHeader);

    return result;
  } catch (error) {
    console.error("Crust 上传失败:", error);
    throw error;
  }
};

/**
 * 使用预计算的认证头上传文件夹到 Crust 网络
 * @param files 文件列表
 * @param authHeader Base64 编码的认证头
 * @returns 带 CID 的上传结果
 */
const uploadDirWithAuth = async (
  files: { path: string; content: string | Blob | Buffer }[],
  authHeader: string,
) => {
  try {
    // 1. 上传到 IPFS 网关
    const result = await ipfsDir(files, authHeader);

    // 2. 将文件夹 Pin 到 Crust 网络 (使用根 CID)
    await pin(result.cid, "most-box-backup", authHeader);

    return result;
  } catch (error) {
    console.error("Crust 文件夹上传失败:", error);
    throw error;
  }
};

/**
 * 通过 Web3 Auth 网关上传文件到 Crust 网络
 * @param file 要上传的文件对象
 * @param mnemonic 签名请求的钱包助记词
 * @returns 带 CID 的上传结果
 */
const upload = async (
  file: File | { path: string; content: string | Blob | Buffer }[],
  mnemonic: string,
) => {
  if (!mnemonic) throw new Error("需要钱包助记词");

  // 从助记词创建签名者
  const account = Wallet.fromPhrase(mnemonic);
  const address = account.address;
  // 签名地址本身作为消息
  const signature = await account.signMessage(address);

  // 构造认证头
  const authHeader = auth(address, signature);

  if (Array.isArray(file)) {
    return uploadDirWithAuth(file, authHeader);
  } else {
    return uploadWithAuth(file, authHeader);
  }
};

/**
 * 使用 CRU 代币在 Crust 网络上下存储订单（自费）
 * @param cid IPFS 内容 ID
 * @param fileSize 文件大小（字节）
 * @param seed Substrate 账户种子/助记词（注意：通常与 ETH 助记词不同）
 * @param tips 订单小费（可选）
 * @returns 交易哈希
 */
const order = async (
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
    provider: new WsProvider(CRUST_RPC),
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
const balance = async (address: string): Promise<string> => {
  try {
    const res = await axios.post(
      CRUST_SUBSCAN_API + "/api/scan/account/tokens",
      {
        address,
      },
    );
    const balance = res.data?.data?.native?.[0]?.balance ?? "0";
    return formatUnits(balance, 12);
  } catch (error) {
    console.error("查询余额失败:", error);
    throw error;
  }
};

/**
 * 将 CID 作为 Remark (Memo) 写入 Crust 链上
 * @param cid IPFS 内容 ID
 * @param danger 钱包私钥/种子
 * @returns 交易哈希
 */
const saveRemark = async (cid: string, danger: string) => {
  const { ApiPromise, WsProvider } = await import("@polkadot/api");
  const { typesBundleForPolkadot } = await import("@crustio/type-definitions");
  const { Keyring } = await import("@polkadot/keyring");

  const crust = new ApiPromise({
    provider: new WsProvider(CRUST_RPC),
    typesBundle: typesBundleForPolkadot,
  });

  try {
    await crust.isReady;

    const keyring = new Keyring({ type: "sr25519" });
    const { crust_mnemonic } = await mostCrust(danger);
    const krp = keyring.addFromUri(crust_mnemonic);

    // 构造备注内容：most-box:v1:CID
    const memo = `most-box:v1:${cid}`;
    const tx = crust.tx.system.remark(memo);

    const result = await new Promise<string>((resolve, reject) => {
      tx.signAndSend(krp, ({ status, dispatchError, txHash }) => {
        if (status.isFinalized) {
          resolve(txHash.toHex());
        } else if (dispatchError) {
          if (dispatchError.isModule) {
            const decoded = crust.registry.findMetaError(
              dispatchError.asModule,
            );
            reject(new Error(`${decoded.section}.${decoded.name}`));
          } else {
            reject(new Error(dispatchError.toString()));
          }
        }
      }).catch(reject);
    });

    return result;
  } catch (error) {
    console.error("写入链上 Remark 失败:", error);
    throw error;
  } finally {
    await crust.disconnect();
  }
};

/**
 * 从 Crust 链上获取最近一次备份的 CID
 * @param address Crust 地址 (SS58 格式)
 * @returns 最近一次备份的 CID，如果未找到则返回 null
 */
const getRemark = async (address: string) => {
  try {
    // 1. 获取 Remark 交易列表
    const res = await axios.post(
      CRUST_SUBSCAN_API + "/api/v2/scan/extrinsics",
      {
        address,
        row: 20,
        page: 0,
        module: "system",
        call: "remark",
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    const extrinsics = res.data?.data?.extrinsics || [];
    for (const ext of extrinsics) {
      if (ext.success) {
        // 2. 获取交易详情以读取 params
        try {
          const detailRes = await axios.post(
            CRUST_SUBSCAN_API + "/api/scan/extrinsic",
            { extrinsic_index: ext.extrinsic_index },
            {
              headers: {
                "Content-Type": "application/json",
              },
            },
          );

          const params = detailRes.data?.data?.params;
          let remarkValue;

          if (Array.isArray(params)) {
            remarkValue = params[0]?.value;
          } else if (typeof params === "string") {
            try {
              const parsed = JSON.parse(params);
              remarkValue = parsed[0]?.value;
            } catch (e) {
              // ignore
            }
          }

          if (
            remarkValue &&
            typeof remarkValue === "string" &&
            remarkValue.startsWith("most-box:v1:")
          ) {
            return remarkValue.replace("most-box:v1:", "");
          }
        } catch (detailError) {
          console.warn(`获取交易详情失败 ${ext.extrinsic_index}:`, detailError);
        }
      }
    }
    return null;
  } catch (error) {
    console.error("从 Subscan 获取 Remark 失败:", error);
    return null;
  }
};

const crust = {
  auth,
  ipfs,
  pin,
  uploadWithAuth,
  upload,
  order,
  balance,
  saveRemark,
  getRemark,
};

export default crust;
