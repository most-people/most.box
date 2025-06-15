import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const PrivateKey = "";

const config: HardhatUserConfig = {
  solidity: "0.8.24",
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {},
    Sepolia: {
      // RPC
      url: "https://sepolia.drpc.org",
      accounts: [PrivateKey],
    },
  },
};

export default config;
