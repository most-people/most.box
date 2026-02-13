import { formatUnits, parseUnits } from "ethers";
import { create } from "kubo-rpc-client";
import ky from "ky";
import { mostCrust } from "@/utils/MostWallet";

// Crust IPFS Web3 Auth 网关
const CRUST_IPFS_GW = "https://gw.crustfiles.app";
// Crust Pinning 服务
const CRUST_PIN = "https://pin.crustcode.com";
// Crust 链 RPC 节点列表
const CRUST_RPC_NODES = [
  "wss://crust.api.onfinality.io/public-ws",
  "wss://rpc.crust.network",
  "wss://rpc-crust-mainnet.decoo.io",
  "wss://api.decloudf.com",
];
// Subscan 浏览器 API
const CRUST_SUBSCAN_API = "https://crust.api.subscan.io";

/**
 * 创建 Crust Web3 认证头
 * @param address Crust 地址
 * @param signature 地址签名
 * @returns Base64 编码的认证头
 */
const auth = (address: string, signature: string) => {
  const authHeaderRaw = `sub-${address}:${signature}`;
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
      allFiles: results.map((r) => ({
        cid: r.cid.toString(),
        path: r.path,
        size: r.size,
      })),
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
    return await ky
      .post(`${CRUST_PIN}/psa/pins`, {
        json: {
          cid: cid,
          name: name,
        },
        headers: {
          authorization: `Bearer ${authHeader}`,
        },
      })
      .json();
  } catch (pinError) {
    console.warn("Pin 失败。", pinError);
    throw pinError;
  }
};

/**
 * 批量 Pin 文件，带有并发控制
 * @param items 要 Pin 的文件列表 { cid, name }
 * @param authHeader 认证头
 * @param concurrency 最大并发数，默认为 5
 */
const pinBatch = async (
  items: { cid: string; name: string }[],
  authHeader: string,
  concurrency = 5,
) => {
  const queue = [...items];
  const results: { cid: string; status: "success" | "error"; error?: any }[] =
    [];

  const worker = async () => {
    while (queue.length > 0) {
      const item = queue.shift();
      if (!item) break;
      try {
        await pin(item.cid, item.name, authHeader);
        results.push({ cid: item.cid, status: "success" });
      } catch (error) {
        console.warn(`Failed to pin ${item.cid}:`, error);
        results.push({ cid: item.cid, status: "error", error });
      }
    }
  };

  const workers = [];
  for (let i = 0; i < Math.min(items.length, concurrency); i++) {
    workers.push(worker());
  }

  await Promise.all(workers);
  return results;
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
 * @param crustWallet mostCrust 返回的钱包对象 { crust_address, sign }
 * @returns 带 CID 的上传结果
 */
const upload = async (
  file: File | { path: string; content: string | Blob | Buffer }[],
  crustWallet: { crust_address: string; sign: (msg: string) => string },
) => {
  const { crust_address, sign } = crustWallet;

  // 签名地址本身作为消息
  const signature = sign(crust_address);

  // 构造认证头
  const authHeader = auth(crust_address, signature);

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
 * @param currentBalance 当前余额（可选，如果提供则不再查询链上余额）
 * @returns 交易哈希
 */
const order = async (
  cid: string,
  fileSize: number,
  danger: string,
  tips = 0,
  currentBalance: string,
) => {
  const { ApiPromise, WsProvider } = await import("@polkadot/api");
  const { typesBundleForPolkadot } = await import("@crustio/type-definitions");
  const { Keyring } = await import("@polkadot/keyring");

  // 1. 初始化 API
  const crust = new ApiPromise({
    provider: new WsProvider(CRUST_RPC_NODES),
    typesBundle: typesBundleForPolkadot,
  });

  try {
    // 检查余额
    const balance = parseUnits(currentBalance, 12);
    if (balance <= 0) {
      const error = new Error(`新用户，请先领取 CRU 代币。`, {
        cause: "INSUFFICIENT_BALANCE",
      });
      throw error;
    }

    await crust.isReady;

    // 2. 创建 Keyring
    const keyring = new Keyring({ type: "sr25519" });
    const { crust_mnemonic } = mostCrust(danger);
    const krp = keyring.addFromUri(crust_mnemonic);

    // 3. 创建交易
    // market.placeStorageOrder(cid, size, tips, memo)
    // memo 是可选的，默认为空
    const tx = crust.tx.market.placeStorageOrder(cid, fileSize, tips, "");

    // 计算存储费
    // let unitPriceBigInt = BigInt(0);
    // try {
    //   if (crust.query?.market?.unitPrice) {
    //     const unitPrice = await crust.query.market.unitPrice();
    //     unitPriceBigInt = BigInt(unitPrice.toString());
    //   } else {
    //     console.warn("crust.query.market.unitPrice 不存在，跳过存储费估算");
    //   }
    // } catch (e) {
    //   console.warn("获取存储单价失败:", e);
    // }

    // const sizeBigInt = BigInt(fileSize);
    // const MB = BigInt(1024 * 1024);
    // // 向上取整计算存储费
    // const storageFee = (unitPriceBigInt * sizeBigInt + MB - 1n) / MB;

    // // 估算交易费
    // const paymentInfo = await tx.paymentInfo(krp);
    // const txFee = BigInt(paymentInfo.partialFee.toString());

    // const tipsBigInt = BigInt(tips);
    // const totalCost = storageFee + txFee + tipsBigInt;

    // if (balance < totalCost) {
    //   const error = new Error(
    //     `需要 ${formatUnits(totalCost, 12)} CRU，但只有 ${formatUnits(balance, 12)} CRU。`,
    //     { cause: "INSUFFICIENT_BALANCE" },
    //   );
    //   throw error;
    // }

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
 * 批量下存储订单 (使用 utility.batch)
 * @param files 文件列表 { cid: string, size: number }
 * @param danger Substrate 账户种子/助记词
 * @param tips 订单小费（每个订单）
 * @param currentBalance 当前余额
 * @returns 交易哈希
 */
const orderBatch = async (
  files: { cid: string; size: number }[],
  danger: string,
  tips = 0,
  currentBalance: string,
) => {
  const { ApiPromise, WsProvider } = await import("@polkadot/api");
  const { typesBundleForPolkadot } = await import("@crustio/type-definitions");
  const { Keyring } = await import("@polkadot/keyring");

  const crust = new ApiPromise({
    provider: new WsProvider(CRUST_RPC_NODES),
    typesBundle: typesBundleForPolkadot,
  });

  try {
    const balance = parseUnits(currentBalance, 12);
    if (balance <= 0) {
      throw new Error(`新用户，请先领取 CRU 代币。`, {
        cause: "INSUFFICIENT_BALANCE",
      });
    }

    await crust.isReady;

    const keyring = new Keyring({ type: "sr25519" });
    const { crust_mnemonic } = mostCrust(danger);
    const krp = keyring.addFromUri(crust_mnemonic);

    // 构造批量交易调用
    // 注意：一次 batch 的交易数量受限于区块大小，建议不要超过 100 个
    const BATCH_LIMIT = 50;
    const results = [];

    // 分批处理，防止单次 batch 过大
    for (let i = 0; i < files.length; i += BATCH_LIMIT) {
      const chunk = files.slice(i, i + BATCH_LIMIT);
      const calls = chunk.map((file) =>
        crust.tx.market.placeStorageOrder(file.cid, file.size, tips, ""),
      );

      // 使用 utility.batch (允许部分成功) 或 utility.batchAll (原子性)
      // 这里使用 batch，因为不同文件的存储订单是独立的
      const tx = crust.tx.utility.batch(calls);

      const txHash = await new Promise<string>((resolve, reject) => {
        tx.signAndSend(krp, ({ status, dispatchError, txHash }) => {
          if (status.isFinalized) {
            console.log(`批量订单交易在区块 ${status.asFinalized} 确认`);
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
        }).catch(reject);
      });

      results.push(txHash);
    }

    // 返回所有 hash
    return results;
  } catch (error) {
    console.error("批量下存储订单失败:", error);
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
    const res = await ky
      .post(CRUST_SUBSCAN_API + "/api/scan/account/tokens", {
        json: {
          address,
        },
      })
      .json<any>();
    const balance = res.data?.native?.[0]?.balance ?? "0";
    return formatUnits(balance, 12);
  } catch (error) {
    console.info("查询余额失败:", error);
    throw error;
  }
};

/**
 * 将 CID 作为 Remark (Memo) 写入 Crust 链上
 * @param cid IPFS 内容 ID
 * @param danger 钱包私钥/种子
 * @param currentBalance 当前余额（可选，如果提供则不再查询链上余额）
 * @returns 交易哈希
 */
const saveRemark = async (
  cid: string,
  danger: string,
  currentBalance: string,
) => {
  // 检查余额
  const balance = parseUnits(currentBalance, 12);
  if (balance <= 0) {
    const error = new Error(`新用户，请先领取 CRU 代币。`, {
      cause: "INSUFFICIENT_BALANCE",
    });
    throw error;
  }

  const { ApiPromise, WsProvider } = await import("@polkadot/api");
  const { typesBundleForPolkadot } = await import("@crustio/type-definitions");
  const { Keyring } = await import("@polkadot/keyring");

  const crust = new ApiPromise({
    provider: new WsProvider(CRUST_RPC_NODES),
    typesBundle: typesBundleForPolkadot,
  });

  try {
    await crust.isReady;

    const keyring = new Keyring({ type: "sr25519" });
    const { crust_mnemonic } = mostCrust(danger);
    const krp = keyring.addFromUri(crust_mnemonic);

    // 构造备注内容：most-box:v1:CID
    const memo = `most-box:v1:${cid}`;
    const tx = crust.tx.system.remark(memo);

    // 估算交易费
    const paymentInfo = await tx.paymentInfo(krp);
    const txFee = BigInt(paymentInfo.partialFee.toString());

    if (balance < txFee) {
      const error = new Error(
        `需要 ${formatUnits(txFee, 12)} CRU，但只有 ${formatUnits(balance, 12)} CRU。`,
        { cause: "INSUFFICIENT_BALANCE" },
      );
      throw error;
    }

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
    const res = await ky
      .post(CRUST_SUBSCAN_API + "/api/v2/scan/extrinsics", {
        json: {
          address,
          row: 20,
          page: 0,
          module: "system",
          call: "remark",
        },
        headers: {
          "Content-Type": "application/json",
        },
      })
      .json<any>();

    const extrinsics = res.data?.extrinsics || [];
    for (const ext of extrinsics) {
      if (ext.success) {
        // 2. 获取交易详情以读取 params
        try {
          const detailRes = await ky
            .post(CRUST_SUBSCAN_API + "/api/scan/extrinsic", {
              json: { extrinsic_index: ext.extrinsic_index },
              headers: {
                "Content-Type": "application/json",
              },
            })
            .json<any>();

          const params = detailRes.data?.params;
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

/**
 * 获取文件存储状态和过期时间
 * @param cid IPFS CID
 * @returns { expiredAt: number, fileSize: number } | null
 */
const getFileStatus = async (cid: string) => {
  const { ApiPromise, WsProvider } = await import("@polkadot/api");
  const { typesBundleForPolkadot } = await import("@crustio/type-definitions");

  const crust = new ApiPromise({
    provider: new WsProvider(CRUST_RPC_NODES),
    typesBundle: typesBundleForPolkadot,
  });

  try {
    await crust.isReady;

    // 1. 获取当前区块高度
    const header = await crust.rpc.chain.getHeader();
    const currentBlock = header.number.toNumber();

    // 2. 获取文件订单信息
    // 优先尝试 filesV2
    let res = await crust.query.market.filesV2(cid);
    if (res.isEmpty) {
      // 兼容旧版
      res = await crust.query.market.files(cid);
    }

    if (res.isEmpty) {
      return null;
    }

    const data = res.toJSON() as any;
    // data.expired_at 是过期区块高度
    const expiredBlock = data.expired_at;

    // Crust 出块时间约 6 秒
    const BLOCK_TIME = 6000;
    const remainingBlocks = expiredBlock - currentBlock;
    const expiredAt = Date.now() + remainingBlocks * BLOCK_TIME;

    return {
      expiredAt,
      fileSize: data.file_size,
    };
  } catch (error) {
    console.error("获取文件状态失败:", error);
    return null;
  } finally {
    await crust.disconnect();
  }
};

const crust = {
  auth,
  ipfs,
  ipfsDir,
  pin,
  pinBatch,
  upload,
  order,
  orderBatch,
  balance,
  saveRemark,
  getRemark,
  getFileStatus,
};

export default crust;
