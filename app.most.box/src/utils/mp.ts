import {
  toUtf8Bytes,
  encodeBase64,
  decodeBase64,
  toUtf8String,
  ZeroAddress,
  HDNodeWallet,
  getBytes,
} from "ethers";
import { createAvatar } from "@dicebear/core";
import { botttsNeutral, icons } from "@dicebear/collection";
import {
  most25519,
  mostDecode,
  mostEncode,
  type MostWallet,
  mostWallet,
} from "@/utils/MostWallet";
import { useUserStore } from "@/stores/userStore";
import { match } from "pinyin-pro";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/zh-cn";

import { CID } from "multiformats";
import { sha256 } from "multiformats/hashes/sha2";
import * as raw from "multiformats/codecs/raw";

import isoWeek from "dayjs/plugin/isoWeek";
import nacl from "tweetnacl";
dayjs.extend(isoWeek);

dayjs.extend(relativeTime);
dayjs.locale("zh-cn");

// 头像生成
const avatar = (address?: string) => {
  if (!address || address === ZeroAddress) {
    return "/icons/pwa-512x512.png";
  }
  return createAvatar(botttsNeutral, {
    seed: "most.box@" + address,
    flip: true,
    backgroundType: ["gradientLinear"],
  }).toDataUri();
};

// 话题生成
const avatarCID = (cid = "Most") => {
  return createAvatar(icons, {
    seed: "most.box#" + cid,
    flip: true,
    backgroundType: ["gradientLinear", "solid"],
  }).toDataUri();
};

// 时间格式化
const formatTime = (time: number | string) => {
  if (!time) return "";
  const date = dayjs(Number(time));
  const hour = date.hour();
  // 判断当前时间段
  let timeOfDay;
  if (hour >= 0 && hour < 3) {
    timeOfDay = "凌晨";
  } else if (hour >= 3 && hour < 6) {
    timeOfDay = "拂晓";
  } else if (hour >= 6 && hour < 9) {
    timeOfDay = "早晨";
  } else if (hour >= 9 && hour < 12) {
    timeOfDay = "上午";
  } else if (hour >= 12 && hour < 15) {
    timeOfDay = "下午";
  } else if (hour >= 15 && hour < 18) {
    timeOfDay = "傍晚";
  } else if (hour >= 18 && hour < 21) {
    timeOfDay = "薄暮";
  } else {
    timeOfDay = "深夜";
  }
  return date.format(`YYYY年M月D日 ${timeOfDay}h点`);
};

// 日期格式化
const formatDate = (date: string | number) => {
  const input = dayjs(Number(date));
  const today = dayjs();

  if (input.isSame(today, "minute")) {
    return input.format("HH:mm:ss");
  } else if (input.isSame(today, "day")) {
    // 当天显示时间
    return input.format("HH:mm");
  } else if (input.isSame(today.subtract(1, "day"), "day")) {
    return `昨天 ${input.format("HH:mm")}`;
  } else if (input.isoWeek() === today.isoWeek()) {
    // 如果是本周，显示周几
    const weekDays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
    return `${weekDays[input.day()]} ${input.format("HH:mm")}`;
  } else if (input.year() === today.year()) {
    // 同年显示日期和月份
    return input.format("M月D日");
  } else {
    // 跨年显示完整日期
    return input.format("YY年M月D日");
  }
};

// 地址格式化
const formatAddress = (address?: string) => {
  if (address) {
    return address.slice(0, 6) + "..." + address.slice(-4);
  } else {
    return "";
  }
};

// Base64 编码
const enBase64 = (str: string) => encodeBase64(toUtf8Bytes(str));

// Base64 解码
const deBase64 = (str: string) => toUtf8String(decodeBase64(str));

// 创建 JWT
const createJWT = (wallet: MostWallet, template = "YYYYMM") => {
  // 本周有效
  const week = dayjs().isoWeek();
  const time = dayjs().format(template) + week;
  const fingerprint = useUserStore.getState().fingerprint;
  if (!fingerprint) {
    throw new Error("请先获取设备指纹");
  }
  const key = [location.origin, fingerprint].join("/");
  const { danger } = mostWallet(time, key);
  const { public_key, private_key } = most25519(danger);
  const jwt = mostEncode(JSON.stringify(wallet), public_key, private_key);
  return jwt;
};

// 解析 JWT
const verifyJWT = (jwt: string, template = "YYYYMM") => {
  // 本周有效
  const week = dayjs().isoWeek();
  const time = dayjs().format(template) + week;
  const fingerprint = useUserStore.getState().fingerprint;
  if (!fingerprint) {
    throw new Error("请先获取设备指纹");
  }
  const key = [location.origin, fingerprint].join("/");
  // 获取设备指纹ID
  const { danger } = mostWallet(time, key);
  const { public_key, private_key } = most25519(danger);
  const json = mostDecode(jwt, public_key, private_key);
  if (!json) {
    throw new Error("jwt 解析失败");
  }
  const wallet = JSON.parse(json) as MostWallet;
  if (!wallet.address) {
    throw new Error("jwt json 解析失败");
  }
  return wallet;
};

// 登录
const login = (username: string, password: string): MostWallet | null => {
  const wallet = mostWallet(username, password);
  return loginSave(wallet);
};

// 登录保存
const loginSave = (wallet: MostWallet) => {
  try {
    const jwt = createJWT(wallet); // 24小时有效期

    // 验证并存储
    if (verifyJWT(jwt)?.address === wallet.address) {
      useUserStore.getState().setItem("jwt", jwt);
      return wallet;
    }
  } catch (error) {
    console.error("登录失败:", error);
  }
  return null;
};

// 拼音搜索
const pinyin = (t: string, v: string, jump = 2) => {
  if (v.length < jump) {
    return false;
  }
  if (t.toLowerCase().includes(v.toLowerCase())) {
    return true;
  }
  const pinyin = match(t, v, { continuous: true });
  if (pinyin && pinyin.length >= jump) {
    return true;
  }
  return false;
};

// Ed25519 变长整型编码（protobuf varint）
const encodeVarint = (value: number): number[] => {
  const bytes: number[] = [];
  while (value >= 0x80) {
    bytes.push((value & 0x7f) | 0x80);
    value >>= 7;
  }
  bytes.push(value);
  return bytes;
};
// Ed25519 libp2p-protobuf-cleartext 公钥
const marshalLibp2pPublicKeyEd25519 = (publicKey: Uint8Array): Uint8Array => {
  const header = new Uint8Array([
    0x08,
    0x01,
    0x12,
    ...encodeVarint(publicKey.length),
  ]);
  const out = new Uint8Array(header.length + publicKey.length);
  out.set(header, 0);
  out.set(publicKey, header.length);
  return out;
};
// Ed25519 通用 BaseX 编码（用于 base58btc / base36）
const baseXEncode = (bytes: Uint8Array, alphabet: string): string => {
  if (bytes.length === 0) return "";
  const base = alphabet.length;
  // 统计前导 0（对应编码中的首字符）
  let zeros = 0;
  while (zeros < bytes.length && bytes[zeros] === 0) zeros++;

  // 256 -> base 的进制转换
  const digits: number[] = [0];
  for (let i = zeros; i < bytes.length; i++) {
    let carry = bytes[i];
    for (let j = 0; j < digits.length; j++) {
      const val = digits[j] * 256 + carry;
      digits[j] = val % base;
      carry = Math.floor(val / base);
    }
    while (carry > 0) {
      digits.push(carry % base);
      carry = Math.floor(carry / base);
    }
  }

  // 构造字符串（注意前导零）
  let result = "";
  for (let i = 0; i < zeros; i++) result += alphabet[0];
  for (let i = digits.length - 1; i >= 0; i--) result += alphabet[digits[i]];
  return result;
};
// Ed25519 获取密钥对
const getEdKeyPair = (private_key: string, ed_public_key: string) => {
  const public_key = ed_public_key.slice(2);
  // 从十六进制私钥字符串转换为 Uint8Array
  const secretKey = new Uint8Array(getBytes(private_key + public_key));
  // 使用私钥重新构建密钥对
  const EdKeyPair = nacl.sign.keyPair.fromSecretKey(secretKey);
  return EdKeyPair;
};
// Ed25519 获取 IPNS 地址
const getIPNS = (private_key: string, ed_public_key: string) => {
  const EdKeyPair = getEdKeyPair(private_key, ed_public_key);
  const pubProto = marshalLibp2pPublicKeyEd25519(EdKeyPair.publicKey);
  const mh = new Uint8Array(2 + pubProto.length);
  mh[0] = 0x00; // identity
  mh[1] = 0x24; // 36 bytes
  mh.set(pubProto, 2);
  const cidHeader = new Uint8Array([0x01, 0x72]);
  const cidBytes = new Uint8Array(cidHeader.length + mh.length);
  cidBytes.set(cidHeader, 0);
  cidBytes.set(mh, cidHeader.length);
  const BASE36_LC = "0123456789abcdefghijklmnopqrstuvwxyz";
  const ipnsId = "k" + baseXEncode(cidBytes, BASE36_LC);
  return ipnsId;
};

/**
 * 标准化路径格式：去掉开头和结尾的斜杠
 * @param s 原始路径
 * @returns 标准化后的路径，例如 "/foo/bar/" -> "foo/bar"
 */
const normalizePath = (s: string) => (s || "").replace(/^\/+|\/+$/g, "");

/**
 * 计算字符串的 CIDv1 (Raw 编码)
 * @param content 字符串内容
 * @returns CID 字符串
 */
const calculateCID = async (content: string) => {
  const bytes = new TextEncoder().encode(content);
  const hash = await sha256.digest(bytes);
  const cid = CID.create(1, raw.code, hash);
  return cid.toString();
};

/**
 * 根据路径过滤文件并推导目录结构
 * @param items 文件/笔记列表
 * @param currentPath 当前路径
 * @param query 搜索关键词
 * @returns 过滤后的列表（包含推导出的目录）
 */
const filterFilesByPath = <T extends { name: string; path: string; type: string; createdAt: number }>(
  items: T[],
  currentPath: string,
  query?: string,
): T[] => {
  const normalizedCurrentPath = normalizePath(currentPath);

  if (query) {
    return items
      .filter((item) => pinyin(item.name, query, 0))
      .sort((a, b) => {
        if (a.type === "directory" && b.type !== "directory") return -1;
        if (a.type !== "directory" && b.type === "directory") return 1;
        return 0;
      });
  }

  const directItems: T[] = [];
  const inferredDirs = new Map<string, T>();

  items.forEach((item) => {
    const fPath = normalizePath(item.path);

    // 如果是在当前目录下的项
    if (fPath === normalizedCurrentPath) {
      if (item.type === "file") {
        directItems.push(item);
      }
      return;
    }

    // 如果是在子目录下的项，推导该层级的目录
    if (
      normalizedCurrentPath === "" ||
      fPath.startsWith(normalizedCurrentPath + "/")
    ) {
      const relativePath =
        normalizedCurrentPath === ""
          ? fPath
          : fPath.slice(normalizedCurrentPath.length + 1);
      if (relativePath) {
        const firstSegment = relativePath.split("/")[0];
        if (!inferredDirs.has(firstSegment)) {
          inferredDirs.set(firstSegment, {
            name: firstSegment,
            type: "directory",
            path: normalizedCurrentPath,
            size: 0,
            createdAt: item.createdAt,
          } as unknown as T);
        }
      }
    }
  });

  return [...Array.from(inferredDirs.values()), ...directItems].sort((a, b) => {
    if (a.type === "directory" && b.type !== "directory") return -1;
    if (a.type !== "directory" && b.type === "directory") return 1;
    return b.createdAt - a.createdAt;
  });
};

/**
 * 格式化文件大小
 * @param bytes 字节数
 * @returns 格式化后的字符串，如 "1.2 MB"
 */
const formatFileSize = (bytes: number) => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

/**
 * 格式化上传文件路径
 * @param file 文件对象
 * @param currentPath 当前所在路径
 * @returns 相对路径
 */
const formatFilePath = (file: File, currentPath: string) => {
  const rel = (file.webkitRelativePath || "").replace(/\\/g, "/");
  const dir = rel ? rel.split("/").slice(0, -1).join("/") : "";
  const parts: string[] = [];
  if (currentPath) parts.push(currentPath);
  if (dir) parts.push(dir);
  parts.push(file.name);
  return parts.join("/");
};

const mp = {
  avatar,
  avatarCID,
  formatTime,
  formatDate,
  formatAddress,
  enBase64,
  deBase64,
  createJWT,
  verifyJWT,
  login,
  loginSave,
  ZeroAddress,
  // createToken,
  pinyin,
  getEdKeyPair,
  getIPNS,
  normalizePath,
  calculateCID,
  filterFilesByPath,
  formatFileSize,
  formatFilePath,
};

export default mp;
