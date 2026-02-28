import {
  HDNodeWallet,
  getBytes,
  Mnemonic,
  pbkdf2,
  sha256,
  toUtf8Bytes,
  hexlify,
  encodeBase64,
  decodeBase64,
} from "ethers";
import nacl from "tweetnacl";
import * as sr25519 from "@scure/sr25519";
import { blake2b } from "@noble/hashes/blake2.js";
import { base58 } from "@scure/base";

export interface MostWallet {
  username: string;
  address: string;
  danger: string;
  type?: "From Signature";
}

const PBKDF2_ITERATIONS = 3;

export const mostWallet = (
  username_address: string,
  password_signature: string,
  type?: "From Signature",
): MostWallet => {
  let seed: Uint8Array;
  let address: string;
  let username = username_address;

  if (type === "From Signature") {
    address = username_address;
    username = username_address.slice(-4);
    const signature = password_signature;
    seed = getBytes(sha256(getBytes(signature)));
  } else {
    const password = password_signature;
    const p = toUtf8Bytes(password);
    const salt = toUtf8Bytes("/most.box/" + username);

    const kdf = pbkdf2(p, salt, PBKDF2_ITERATIONS, 32, "sha512");
    seed = getBytes(sha256(getBytes(kdf)));

    // wallet all in one
    const mnemonic = Mnemonic.entropyToPhrase(seed);
    const account = HDNodeWallet.fromPhrase(mnemonic);
    address = account.address;
  }

  return {
    username,
    address,
    danger: hexlify(seed),
    type,
  };
};

// Wallet Mnemonic
export const mostMnemonic = (danger: string) => {
  return Mnemonic.entropyToPhrase(getBytes(danger));
};

// X25519 & Ed25519 key pair
export const most25519 = (danger: string) => {
  const x25519KeyPair = nacl.box.keyPair.fromSecretKey(getBytes(danger));
  const ed25519KeyPair = nacl.sign.keyPair.fromSeed(getBytes(danger));
  return {
    public_key: hexlify(x25519KeyPair.publicKey),
    private_key: hexlify(x25519KeyPair.secretKey),
    ed_public_key: hexlify(ed25519KeyPair.publicKey),
  };
};

// Crust key pair
export const mostCrust = (danger: string) => {
  const entropy = getBytes(danger);
  const mnemonic = Mnemonic.entropyToPhrase(entropy);

  const mnemonicBytes = toUtf8Bytes(mnemonic);
  const salt = toUtf8Bytes("mnemonic");
  const seed = pbkdf2(mnemonicBytes, salt, 2048, 64, "sha512");
  const miniSecret = getBytes(seed).slice(0, 32);

  const secretKey = sr25519.secretFromSeed(miniSecret);
  const publicKey = sr25519.getPublicKey(secretKey);

  // Crust SS58 prefix is 66 (0x42) -> 5080 (0x50, 0x80)
  const prefixBytes = new Uint8Array([0x50, 0x80]);

  const content = new Uint8Array(prefixBytes.length + publicKey.length);
  content.set(prefixBytes);
  content.set(publicKey, prefixBytes.length);

  const SS58PRE = new TextEncoder().encode("SS58PRE");
  const checksumContent = new Uint8Array(SS58PRE.length + content.length);
  checksumContent.set(SS58PRE);
  checksumContent.set(content, SS58PRE.length);

  const checksum = blake2b(checksumContent, { dkLen: 64 }).subarray(0, 2);

  const addressBytes = new Uint8Array(content.length + checksum.length);
  addressBytes.set(content);
  addressBytes.set(checksum, content.length);

  const crust_address = base58.encode(addressBytes);

  return {
    crust_address,
    crust_mnemonic: mnemonic,
    sign: (message: string) => {
      const messageBytes = toUtf8Bytes(message);
      const signature = sr25519.sign(secretKey, messageBytes);
      return hexlify(signature);
    },
  };
};

// 加密本地数据
export const mostEncode = (text: string, danger_seed: string): string => {
  const bytes = new TextEncoder().encode(text);
  const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
  // 直接使用高熵的 danger_seed 作为对称密钥
  const key = getBytes(danger_seed).slice(0, nacl.secretbox.keyLength);
  const encrypted = nacl.secretbox(bytes, nonce, key);

  return ["mp://1", encodeBase64(nonce), encodeBase64(encrypted)].join(".");
};

export const mostDecode = (data: string, danger_seed: string): string => {
  const [prefix, nonce64, encrypted64] = data.split(".");
  if (prefix !== "mp://1") return "";

  const key = getBytes(danger_seed).slice(0, nacl.secretbox.keyLength);
  const decrypted = nacl.secretbox.open(
    decodeBase64(encrypted64),
    decodeBase64(nonce64),
    key,
  );

  return decrypted ? new TextDecoder().decode(decrypted) : "";
};

// 加密端到端通信
export const mostEncodeMessage = (
  text: string,
  public_key: string,
  private_key: string,
): string => {
  const bytes = new TextEncoder().encode(text);
  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  const encrypted = nacl.box(
    bytes,
    nonce,
    new Uint8Array(getBytes(public_key)),
    new Uint8Array(getBytes(private_key)),
  );
  if (!encrypted) {
    console.info("加密失败");
    return "";
  }
  return ["mp://2", encodeBase64(nonce), encodeBase64(encrypted)].join(".");
};

export const mostDecodeMessage = (
  data: string,
  public_key: string,
  private_key: string,
): string => {
  const [prefix, nonce64, encrypted64] = data.split(".");
  if (prefix !== "mp://2") {
    console.info("无效协议");
    return "";
  }
  const decrypted = nacl.box.open(
    decodeBase64(encrypted64),
    decodeBase64(nonce64),
    new Uint8Array(getBytes(public_key)),
    new Uint8Array(getBytes(private_key)),
  );
  if (!decrypted) {
    console.info("无法解密");
    return "";
  }
  return new TextDecoder().decode(decrypted);
};
