import { Buffer } from "buffer";
import { toHex, toBytes, stringToBytes, sha256 } from "viem";
import { mnemonicToAccount } from "viem/accounts";
import { entropyToMnemonic } from "@scure/bip39";
import { wordlist as english } from "@scure/bip39/wordlists/english.js";
import { pbkdf2 } from "@noble/hashes/pbkdf2.js";
import { sha512 } from "@noble/hashes/sha2.js";
import { ed25519, x25519 } from "@noble/curves/ed25519.js";
import { secp256k1 } from "@noble/curves/secp256k1.js";
import { xsalsa20poly1305, hsalsa } from "@noble/ciphers/salsa.js";
import { randomBytes } from "@noble/ciphers/utils.js";

export interface MostWallet {
  username: string;
  address: string;
  public_key: string;
  private_key: string;
  mnemonic: string;
  // Ed25519 key pair for IPNS publishing
  ed_public_key: string;
}

const encodeBase64 = (data: Uint8Array) => Buffer.from(data).toString("base64");
const decodeBase64 = (base64: string) =>
  new Uint8Array(Buffer.from(base64, "base64"));

// --- Helper functions for NaCl box compatibility ---

function u8to32(u8: Uint8Array): Uint32Array {
  const u32 = new Uint32Array(u8.length / 4);
  const dv = new DataView(u8.buffer, u8.byteOffset, u8.length);
  for (let i = 0; i < u32.length; i++) u32[i] = dv.getUint32(i * 4, true);
  return u32;
}

function u32to8(u32: Uint32Array): Uint8Array {
  const u8 = new Uint8Array(u32.length * 4);
  const dv = new DataView(u8.buffer);
  for (let i = 0; i < u32.length; i++) dv.setUint32(i * 4, u32[i], true);
  return u8;
}

const sigma = new Uint8Array([
  101, 120, 112, 97, 110, 100, 32, 51, 50, 45, 98, 121, 116, 101, 32, 107,
]); // "expand 32-byte k"

function getBoxSharedKey(
  secretKey: Uint8Array,
  publicKey: Uint8Array,
): Uint8Array {
  const sharedPoint = x25519.getSharedSecret(secretKey, publicKey);
  const n = new Uint8Array(16); // Input nonce (all zeros)
  const out32 = new Uint32Array(8);

  hsalsa(u8to32(sigma), u8to32(sharedPoint), u8to32(n), out32);

  return u32to8(out32);
}

// ---------------------------------------------------

export const mostWallet = (
  username_address: string,
  password_signature: string,
  type?: "I know loss mnemonic will lose my wallet." | "From Signature",
): MostWallet => {
  const isDanger = type === "I know loss mnemonic will lose my wallet.";

  let seed: Uint8Array;
  let address: string;
  let mnemonic = "";
  let username = username_address;

  if (type === "From Signature") {
    address = username_address;
    username = username_address.slice(-4).toUpperCase();
    const signature = password_signature;
    seed = toBytes(sha256(toBytes(signature)));
  } else {
    const password = password_signature;
    const p = stringToBytes(password);
    const salt = stringToBytes("/most.box/" + username);
    // noble: pbkdf2(hash, password, salt, { c: iterations, dkLen: keylen })
    const kdf = pbkdf2(sha512, p, salt, { c: 3, dkLen: 32 });
    const bytes = toBytes(sha256(kdf));

    // wallet all in one
    mnemonic = entropyToMnemonic(bytes, english);
    const account = mnemonicToAccount(mnemonic);
    address = account.address;

    // seed
    const message = stringToBytes("most.box");
    const messageHash = toBytes(sha256(message));
    const sig = secp256k1.sign(messageHash, account.getHdKey().privateKey!);
    seed = toBytes(sha256(sig));
  }

  // x25519 key pair
  const x25519Pub = x25519.getPublicKey(seed);
  const public_key = toHex(x25519Pub);
  const private_key = toHex(seed); // Seed is used as secret key in NaCl box

  // Ed25519 key pair
  const edPub = ed25519.getPublicKey(seed);
  const ed_public_key = toHex(edPub);

  const mostWallet: MostWallet = {
    username,
    address,
    public_key,
    private_key,
    mnemonic: isDanger ? mnemonic : "",
    ed_public_key,
  };
  return mostWallet;
};

export const mostEncode = (
  text: string,
  public_key: string,
  private_key: string,
) => {
  try {
    const bytes = new TextEncoder().encode(text);
    const nonce = randomBytes(24);

    const sharedKey = getBoxSharedKey(
      toBytes(private_key),
      toBytes(public_key),
    );
    const encrypted = xsalsa20poly1305(sharedKey, nonce).encrypt(bytes);

    return ["mp://2", encodeBase64(nonce), encodeBase64(encrypted)].join(".");
  } catch (e) {
    console.info("加密失败", e);
    return "";
  }
};

export const mostDecode = (
  data: string,
  public_key: string,
  private_key: string,
) => {
  const [prefix, nonce64, encrypted64] = data.split(".");
  if (prefix !== "mp://2") {
    console.info("无效协议");
    return "";
  }
  try {
    const sharedKey = getBoxSharedKey(
      toBytes(private_key),
      toBytes(public_key),
    );
    const nonce = decodeBase64(nonce64);
    const encrypted = decodeBase64(encrypted64);

    const decrypted = xsalsa20poly1305(sharedKey, nonce).decrypt(encrypted);

    return new TextDecoder().decode(decrypted);
  } catch (e) {
    console.info("无法解密", e);
    return "";
  }
};
