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
import { Keyring } from "@polkadot/keyring";

export interface MostWallet {
  username: string;
  address: string;
  public_key: string;
  private_key: string;
  mnemonic: string | null;
  // Ed25519 key pair for IPNS publishing
  ed_public_key: string;
  // Polka address
  crust_address: string;
  // polka mnemonic
  crust_mnemonic: string;
}

export const mostWallet = (
  username_address: string,
  password_signature: string,
  type?: "I know loss mnemonic will lose my wallet." | "From Signature",
): MostWallet => {
  const isDanger = type === "I know loss mnemonic will lose my wallet.";

  let seed: Uint8Array;
  let address: string;
  let mnemonic: string | null = null;
  let username = username_address;

  if (type === "From Signature") {
    address = username_address;
    username = username_address.slice(-4).toUpperCase();
    const signature = password_signature;
    seed = getBytes(sha256(getBytes(signature)));
  } else {
    const password = password_signature;
    const p = toUtf8Bytes(password);
    const salt = toUtf8Bytes("/most.box/" + username);
    const kdf = pbkdf2(p, salt, 3, 32, "sha512");
    seed = getBytes(sha256(getBytes(kdf)));
  }

  // wallet all in one
  mnemonic = Mnemonic.entropyToPhrase(seed);
  const account = HDNodeWallet.fromPhrase(mnemonic);
  address = account.address;

  // x25519 key pair
  const x25519KeyPair = nacl.box.keyPair.fromSecretKey(seed);
  const public_key = hexlify(x25519KeyPair.publicKey);
  const private_key = hexlify(x25519KeyPair.secretKey); // Seed is used as secret key in NaCl box

  // Ed25519 key pair
  const ed25519KeyPair = nacl.sign.keyPair.fromSeed(seed);
  const ed_public_key = hexlify(ed25519KeyPair.publicKey);

  // 生成 Crust Wallet
  // Crust 的 SS58 前缀是 66
  const keyring = new Keyring({ type: "sr25519", ss58Format: 66 });
  const crust_mnemonic = Mnemonic.entropyToPhrase(seed);
  const crustPair = keyring.addFromUri(crust_mnemonic);
  const crust_address = crustPair.address;

  const mostWallet: MostWallet = {
    username,
    address,
    public_key,
    private_key,
    mnemonic: isDanger ? mnemonic : null,
    ed_public_key,
    crust_address,
    crust_mnemonic,
  };
  return mostWallet;
};

export const mostWalletAddress = (username: string, password: string) => {
  const p = toUtf8Bytes(password);
  const salt = toUtf8Bytes("/most.box/" + username);
  const kdf = pbkdf2(p, salt, 3, 32, "sha512");
  const bytes = getBytes(sha256(kdf));
  const mnemonic = Mnemonic.entropyToPhrase(bytes);
  const account = HDNodeWallet.fromPhrase(mnemonic);
  const address = account.address;
  return address;
};

export const mostEncode = (
  text: string,
  public_key: string,
  private_key: string,
) => {
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
