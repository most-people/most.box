import { most25519, mostDecode, mostEncode } from "./MostWallet";

export const encryptBackup = (data: any, danger: string): string => {
  const { public_key, private_key } = most25519(danger);
  const encrypted = mostEncode(JSON.stringify(data), public_key, private_key);

  if (!encrypted) {
    throw new Error("数据加密失败");
  }

  return encrypted;
};

export const decryptBackup = (content: string, danger: string): any => {
  if (!content.startsWith("mp://2")) {
    throw new Error("无效的备份数据格式");
  }

  const { public_key, private_key } = most25519(danger);
  const decrypted = mostDecode(content, public_key, private_key);

  if (!decrypted) {
    throw new Error("解密失败，请确保使用正确的钱包账户");
  }

  try {
    return JSON.parse(decrypted);
  } catch (error) {
    throw new Error("数据解析失败");
  }
};
