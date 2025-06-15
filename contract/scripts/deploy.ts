import { ethers } from "hardhat";

async function main() {
  // 获取合约工厂
  const IPv6Contract = await ethers.getContractFactory("IPv6Contract");

  // 部署合约并等待部署完成
  const ipv6Contract = await IPv6Contract.deploy();

  // 获取合约地址
  // @ts-ignore
  const address = await ipv6Contract.getAddress();

  // 输出合约地址
  console.log("IPv6Contract deployed to:", address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
