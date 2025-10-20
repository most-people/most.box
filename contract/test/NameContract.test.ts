import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { NameContract } from "../typechain-types/NameContract";

describe("NameContract", function () {
  let nameContract: NameContract;
  let owner: SignerWithAddress;
  let addr1: SignerWithAddress;
  let addr2: SignerWithAddress;

  const MIN_NAME_LENGTH = 1;
  const MAX_NAME_LENGTH = 63;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();

    const NameContractFactory = await ethers.getContractFactory("NameContract");
    nameContract = await NameContractFactory.deploy();
  });

  describe("setName", function () {
    it("应该成功设置一个新名字", async function () {
      const newName = "Alice";
      await nameContract.connect(addr1).setName(newName);
      expect(await nameContract.getName(addr1.address)).to.equal(newName);
      expect(await nameContract.getOwner(newName)).to.equal(addr1.address);
    });

    it("应该成功更新一个已有的名字", async function () {
      const oldName = "Alice";
      const newName = "Alicia";

      await nameContract.connect(addr1).setName(oldName);
      await nameContract.connect(addr1).setName(newName);

      expect(await nameContract.getName(addr1.address)).to.equal(newName);
      expect(await nameContract.getOwner(oldName)).to.equal(ethers.ZeroAddress);
      expect(await nameContract.getOwner(newName)).to.equal(addr1.address);
    });

    it("应该因为名字太短而失败", async function () {
      const shortName = "".repeat(MIN_NAME_LENGTH - 1);
      await expect(
        nameContract.connect(addr1).setName(shortName)
      ).to.be.revertedWith("Name too short");
    });

    it("应该因为名字太长而失败", async function () {
      const longName = "a".repeat(MAX_NAME_LENGTH + 1);
      await expect(
        nameContract.connect(addr1).setName(longName)
      ).to.be.revertedWith("Name too long");
    });

    it("应该因为名字已被占用而失败", async function () {
      const name = "Bob";
      await nameContract.connect(addr1).setName(name);
      await expect(
        nameContract.connect(addr2).setName(name)
      ).to.be.revertedWith("Name already taken");
    });

    it("用户可以重新设置自己的名字", async function () {
      const name = "Alice";
      await nameContract.connect(addr1).setName(name);
      await expect(nameContract.connect(addr1).setName(name)).to.not.be
        .reverted;
    });
  });

  describe("getName", function () {
    it("应该返回指定地址的名字", async function () {
      const name = "Charlie";
      await nameContract.connect(addr1).setName(name);
      expect(await nameContract.getName(addr1.address)).to.equal(name);
    });

    it("对于没有设置名字的地址应该返回空字符串", async function () {
      expect(await nameContract.getName(addr2.address)).to.equal("");
    });
  });

  describe("getOwner", function () {
    it("应该返回指定名字的拥有者地址", async function () {
      const name = "David";
      await nameContract.connect(addr1).setName(name);
      expect(await nameContract.getOwner(name)).to.equal(addr1.address);
    });

    it("对于不存在的名字应该返回零地址", async function () {
      expect(await nameContract.getOwner("Unknown")).to.equal(
        ethers.ZeroAddress
      );
    });
  });

  describe("delName", function () {
    it("应该成功删除一个已有的名字", async function () {
      const name = "Eve";
      await nameContract.connect(addr1).setName(name);

      await nameContract.connect(addr1).delName();

      expect(await nameContract.getName(addr1.address)).to.equal("");
      expect(await nameContract.getOwner(name)).to.equal(ethers.ZeroAddress);
    });

    it("当用户没有名字时应该失败", async function () {
      await expect(nameContract.connect(addr1).delName()).to.be.revertedWith(
        "Name not set"
      );
    });
  });

  describe("Case Insensitivity", function () {
    it("设置名字时不应该区分大小写", async function () {
      const nameLower = "frank";
      const nameUpper = "Frank";

      await nameContract.connect(addr1).setName(nameLower);

      // addr2 无法设置 "Frank" 因为 "frank" 已被占用
      await expect(
        nameContract.connect(addr2).setName(nameUpper)
      ).to.be.revertedWith("Name already taken");
    });

    it("getOwner 不应该区分大小写", async function () {
      const nameLower = "grace";
      const nameUpper = "Grace";

      await nameContract.connect(addr1).setName(nameLower);

      expect(await nameContract.getOwner(nameUpper)).to.equal(addr1.address);
    });

    it("更新名字时不应该区分大小写", async function () {
      const oldName = "Heidi";
      const newName = "Ivan";

      await nameContract.connect(addr1).setName(oldName);
      expect(await nameContract.getOwner("heidi")).to.equal(addr1.address);

      await nameContract.connect(addr1).setName(newName);
      expect(await nameContract.getOwner("heidi")).to.equal(ethers.ZeroAddress);
      expect(await nameContract.getOwner("ivan")).to.equal(addr1.address);
    });

    it("删除名字时不应该区分大小写", async function () {
      const name = "Judy";
      await nameContract.connect(addr1).setName(name);

      // 即使旧名字的大小写不同，也应该能正确删除
      const oldNameFromContract = await nameContract.getName(addr1.address);
      await nameContract.connect(addr1).delName();

      expect(
        await nameContract.getOwner(oldNameFromContract.toLowerCase())
      ).to.equal(ethers.ZeroAddress);
    });
  });

  describe("Data", function () {
    it("getData: 对未设置的地址返回空字符串", async function () {
      expect(await nameContract.getData(addr1.address)).to.equal("");
    });

    it("setData: 能设置并读取调用者的 Data", async function () {
      await nameContract.connect(addr1).setData("hello");
      expect(await nameContract.getData(addr1.address)).to.equal("hello");
    });

    it("setData: 再次设置会更新旧值", async function () {
      await nameContract.connect(addr1).setData("v1");
      await nameContract.connect(addr1).setData("v2");
      expect(await nameContract.getData(addr1.address)).to.equal("v2");
    });

    it("delData: 未设置时应 revert", async function () {
      await expect(nameContract.connect(addr1).delData()).to.be.revertedWith(
        "Data not set"
      );
    });

    it("delData: 已设置则成功删除", async function () {
      await nameContract.connect(addr1).setData("payload");
      await nameContract.connect(addr1).delData();
      expect(await nameContract.getData(addr1.address)).to.equal("");
    });

    it("setData: 超过最大长度应 revert", async function () {
      const tooLong = "a".repeat(1025);
      await expect(
        nameContract.connect(addr1).setData(tooLong)
      ).to.be.revertedWith("Data too long");
    });
  });

  // 新增 CID 相关测试
  describe("CID", function () {
    it("getCID: 对未设置的地址返回空字符串", async function () {
      expect(await nameContract.getCID(addr1.address)).to.equal("");
    });

    it("setCID: 能设置并读取调用者的 CID", async function () {
      await nameContract.connect(addr1).setCID("cid-v1");
      expect(await nameContract.getCID(addr1.address)).to.equal("cid-v1");
    });

    it("setCID: 再次设置会更新旧值", async function () {
      await nameContract.connect(addr1).setCID("cid-v1");
      await nameContract.connect(addr1).setCID("cid-v2");
      expect(await nameContract.getCID(addr1.address)).to.equal("cid-v2");
    });

    it("setCID: 超过最大长度应 revert (140)", async function () {
      const tooLongCID = "a".repeat(141);
      await expect(
        nameContract.connect(addr1).setCID(tooLongCID)
      ).to.be.revertedWith("CID too long");
    });

    it("setCID: 边界长度 140 应成功", async function () {
      const boundaryCID = "a".repeat(140);
      await expect(nameContract.connect(addr1).setCID(boundaryCID)).to.not.be
        .reverted;
      expect(await nameContract.getCID(addr1.address)).to.equal(boundaryCID);
    });

    it("delCID: 未设置时应 revert", async function () {
      await expect(nameContract.connect(addr1).delCID()).to.be.revertedWith(
        "CID not set"
      );
    });

    it("delCID: 已设置则成功删除", async function () {
      await nameContract.connect(addr1).setCID("cid-v1");
      await nameContract.connect(addr1).delCID();
      expect(await nameContract.getCID(addr1.address)).to.equal("");
    });
  });
});
