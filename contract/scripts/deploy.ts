import { ethers } from "hardhat";

const main = async (contractName: "NameContract" | "DotContract") => {
  // 获取合约工厂
  const NameContract = await ethers.getContractFactory(contractName);

  // 部署合约并等待部署完成
  const nameContract = await NameContract.deploy();

  // 获取合约地址
  const address = await nameContract.getAddress();

  // 输出合约地址
  console.log("Contract deployed to:", address);
};

main("NameContract").catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
