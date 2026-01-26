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

export interface MostWallet {
  username: string;
  address: string;
  danger: string;
  type?: "From Signature";
}

export const mostWallet = (
  username_address: string,
  password_signature: string,
  type?: "From Signature",
): MostWallet => {
  let seed: Uint8Array;
  let address: string;
  let username = username_address;
  let sign = false;

  if (type === "From Signature") {
    sign = true;
    address = username_address;
    username = username_address.slice(-4);
    const signature = password_signature;
    seed = getBytes(sha256(getBytes(signature)));
  } else {
    const password = password_signature;
    const p = toUtf8Bytes(password);
    const salt = toUtf8Bytes("/most.box/" + username);
    const kdf = pbkdf2(p, salt, 3, 32, "sha512");
    seed = getBytes(sha256(getBytes(kdf)));

    // wallet all in one
    const mnemonic = Mnemonic.entropyToPhrase(seed);
    const account = HDNodeWallet.fromPhrase(mnemonic);
    address = account.address;
  }

  const mostWallet: MostWallet = {
    username,
    address,
    danger: hexlify(seed),
    type,
  };
  return mostWallet;
};

// Wallet Mnemonic
export const mostMnemonic = (danger: string) => {
  const mnemonic = Mnemonic.entropyToPhrase(getBytes(danger));
  return mnemonic;
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
export const mostCrust = async (danger: string) => {
  // const { Keyring } = await import("@polkadot/keyring");
  // Crust 的 SS58 前缀是 66
  // const keyring = new Keyring({ type: "sr25519", ss58Format: 66 });
  // const crust_mnemonic = Mnemonic.entropyToPhrase(getBytes(danger));
  // const crustPair = keyring.addFromUri(crust_mnemonic);
  // const crust_address = crustPair.address;
  return {
    crust_address: "",
    crust_mnemonic: "",
  };
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
