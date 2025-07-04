import { verifyMessage } from "ethers";

/**
 * 验证 token 并返回地址
 * @param {string} token - 格式为 "address.message.signature" 的 token
 * @returns {string | null} - 验证成功返回地址，失败返回空字符串
 */
export const getAddress = (token) => {
  if (token && typeof token === "string") {
    try {
      const [address, t, sig] = token.split(".");
      // token 有效期为 24 小时
      if (Date.now() - parseInt(t) > 1000 * 60 * 60 * 24) {
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

/**
 * 判断数组相等
 * @param {string[]} a
 * @param {string[]} b
 * @returns {boolean}
 */
export const arrayEqual = (a, b) => {
  if (a.length !== b.length) {
    return false;
  }
  const set1 = new Set(a);
  const set2 = new Set(b);
  return set1.size === set2.size && [...set1].every((x) => set2.has(x));
};

export default {
  getAddress,
  arrayEqual,
};
