import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("IPv6Contract", function () {
  let ipv6Contract: any;
  let owner: SignerWithAddress;
  let addr1: SignerWithAddress;

  beforeEach(async function () {
    [owner, addr1] = await ethers.getSigners();

    const IPv6Contract = await ethers.getContractFactory("IPv6Contract");
    ipv6Contract = await IPv6Contract.deploy();
  });

  it("Should set and get ipv6 for the sender", async function () {
    const ipv6 =
      '{"ipv6":"http://[240e:359:833:2200::f80]:1949","ipv4":"http://192.168.31.100:1949"}';
    await ipv6Contract.setIPv6(ipv6);
    expect(await ipv6Contract.getIPv6()).to.equal(ipv6);
  });

  it("Should get ipv6 for a specific address", async function () {
    const ipv6 = '{"ipv6":"http://[240e:359:833:2200::f80]:1949"}';
    await ipv6Contract.connect(addr1).setIPv6(ipv6);
    expect(await ipv6Contract.getIPv6Of(addr1.address)).to.equal(ipv6);
  });

  it("Should return empty string for unset ipv6s", async function () {
    expect(await ipv6Contract.getIPv6()).to.equal("");
  });
});
