import { HDNodeWallet, toUtf8Bytes, encodeBase64 } from "ethers";
import { create } from "kubo-rpc-client";
import axios from "axios";

// Crust IPFS Web3 Auth Gateway
const CRUST_GW = "https://gw.crustfiles.app";
const CRUST_PIN_URL = "https://pin.crustcode.com/psa";

/**
 * Upload file to Crust Network via Web3 Auth Gateway
 * @param file File object to upload
 * @param mnemonic Wallet mnemonic to sign the request
 * @returns Upload result with CID
 */
export const uploadToCrust = async (file: File, mnemonic: string) => {
  if (!mnemonic) throw new Error("Wallet mnemonic is required");

  // Create signer from mnemonic
  const signer = HDNodeWallet.fromPhrase(mnemonic);
  const address = signer.address;
  // Sign the address itself as the message
  const signature = await signer.signMessage(address);

  // Construct Auth Header
  // Format: eth-{address}:{signature}
  const authHeaderRaw = `eth-${address}:${signature}`;
  const authHeader = encodeBase64(toUtf8Bytes(authHeaderRaw));

  // Create IPFS client connected to Crust Gateway
  const ipfs = create({
    url: `${CRUST_GW}/api/v0`,
    headers: {
      authorization: `Basic ${authHeader}`,
    },
  });

  try {
    // 1. Upload to IPFS Gateway
    const result = await ipfs.add(file);
    const cid = result.cid.toString();

    // 2. Pin file to Crust Network
    try {
      await axios.post(
        `${CRUST_PIN_URL}/pins`,
        {
          cid: cid,
          name: file.name,
        },
        {
          headers: {
            authorization: `Bearer ${authHeader}`,
          },
        },
      );
    } catch (pinError) {
      console.warn(
        "Pinning failed, possibly due to insufficient balance:",
        pinError,
      );
      // We don't throw here to allow returning the CID, but user should know pinning failed
    }

    return {
      cid: cid,
      size: result.size,
      url: `${CRUST_GW}/ipfs/${cid}`,
    };
  } catch (error) {
    console.error("Crust upload failed:", error);
    throw error;
  }
};
