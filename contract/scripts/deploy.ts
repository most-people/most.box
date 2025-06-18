import { ethers } from "hardhat";

async function main() {
  // 获取合约工厂
  const DotContract = await ethers.getContractFactory("DotContract");

  // 部署合约并等待部署完成
  const dotContract = await DotContract.deploy();

  // 获取合约地址
  // @ts-ignore
  const address = await dotContract.getAddress();

  // 输出合约地址
  console.log("Contract deployed to:", address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
