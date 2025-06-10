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
  public_key: string;
  private_key: string;
  mnemonic: string;
}

export const mostWallet = (
  username: string,
  password: string,
  danger?: string
): MostWallet => {
  const isDanger = danger === "I know loss mnemonic will lose my wallet.";
  const p = toUtf8Bytes(password);
  const salt = toUtf8Bytes("/most.box/" + username);
  const kdf = pbkdf2(p, salt, 3, 32, "sha512");
  const bytes = getBytes(sha256(kdf));

  // x25519 key pair
  const seed = bytes.slice(0, 32);
  const keyPair = nacl.box.keyPair.fromSecretKey(seed);

  const public_key = hexlify(keyPair.publicKey);
  const private_key = hexlify(keyPair.secretKey);

  // wallet all in one
  const mnemonic = Mnemonic.entropyToPhrase(bytes);
  const wallet = HDNodeWallet.fromPhrase(mnemonic);
  const address = wallet.address;

  const mostWallet: MostWallet = {
    username,
    address,
    public_key,
    private_key,
    mnemonic: isDanger ? mnemonic : "",
  };
  return mostWallet;
};

export const mostEncode = (
  text: string,
  public_key: string,
  private_key: string
) => {
  const bytes = new TextEncoder().encode(text);
  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  const encrypted = nacl.box(
    bytes,
    nonce,
    new Uint8Array(getBytes(public_key)),
    new Uint8Array(getBytes(private_key))
  );
  if (!encrypted) {
    console.error("加密失败");
    return "";
  }
  return ["mp://2", encodeBase64(nonce), encodeBase64(encrypted)].join(".");
};

export const mostDecode = (
  data: string,
  public_key: string,
  private_key: string
) => {
  const [prefix, nonce64, encrypted64] = data.split(".");
  if (prefix !== "mp://2") {
    console.error("无效的密文");
    return "";
  }
  const decrypted = nacl.box.open(
    decodeBase64(encrypted64),
    decodeBase64(nonce64),
    new Uint8Array(getBytes(public_key)),
    new Uint8Array(getBytes(private_key))
  );
  if (!decrypted) {
    console.error("解密失败");
    return "";
  }
  return new TextDecoder().decode(decrypted);
};
