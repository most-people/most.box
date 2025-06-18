import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

// 加载 .env 文件
dotenv.config();

const PRIVATE_KEY = process.env.PRIVATE_KEY || "";

// 确保私钥存在
if (!PRIVATE_KEY) {
  console.error("错误: 未设置私钥。请在 .env 文件中设置 PRIVATE_KEY");
  process.exit(1); // 终止程序
}

const config: HardhatUserConfig = {
  solidity: "0.8.24",
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {},
    // https://docs.base.org/chain/connecting-to-base
    BaseMainnet: {
      // RPC
      url: "https://mainnet.base.org",
      accounts: [PRIVATE_KEY],
      chainId: 8453,
    },
    BaseTestnetSepolia: {
      // RPC
      url: "https://sepolia.base.org",
      accounts: [PRIVATE_KEY],
      chainId: 84532,
    },
  },
};

export default config;
