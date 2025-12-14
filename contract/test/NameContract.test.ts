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
      const owners = await nameContract.getOwners(newName, "");
      expect(owners).to.deep.equal([addr1.address]);
    });

    it("应该成功更新一个已有的名字", async function () {
      const oldName = "Alice";
      const newName = "Alicia";

      await nameContract.connect(addr1).setName(oldName);
      await nameContract.connect(addr1).setName(newName);

      expect(await nameContract.getName(addr1.address)).to.equal(newName);

      const oldOwners = await nameContract.getOwners(oldName, "");
      expect(oldOwners).to.be.empty;

      const newOwners = await nameContract.getOwners(newName, "");
      expect(newOwners).to.deep.equal([addr1.address]);
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

    it("应该允许重复名字", async function () {
      const name = "Bob";
      await nameContract.connect(addr1).setName(name);
      // addr2 设置相同的名字，不应该失败
      await expect(nameContract.connect(addr2).setName(name)).to.not.be
        .reverted;

      const owners = await nameContract.getOwners(name, "");
      expect(owners.length).to.equal(2);
      expect(owners).to.include(addr1.address);
      expect(owners).to.include(addr2.address);
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

  describe("getOwners", function () {
    it("应该返回指定名字的拥有者地址列表", async function () {
      const name = "David";
      await nameContract.connect(addr1).setName(name);
      const owners = await nameContract.getOwners(name, "");
      expect(owners).to.deep.equal([addr1.address]);
    });

    it("对于不存在的名字应该返回空数组", async function () {
      const owners = await nameContract.getOwners("Unknown", "");
      expect(owners).to.be.empty;
    });

    it("应该支持过滤查询 (Suffix Match)", async function () {
      const name = "FilterTest";
      // Addr1 and Addr2 both use name
      await nameContract.connect(addr1).setName(name);
      await nameContract.connect(addr2).setName(name);

      // Get last 2 bytes (4 chars) of addr1
      const addr1Hex = addr1.address.toLowerCase();
      const suffix1 = addr1Hex.slice(-4);

      // Get last 2 bytes of addr2
      const addr2Hex = addr2.address.toLowerCase();
      const suffix2 = addr2Hex.slice(-4);

      // Assuming they are different (highly likely)
      if (suffix1 !== suffix2) {
        const owners1 = await nameContract.getOwners(name, suffix1);
        expect(owners1).to.include(addr1.address);
        expect(owners1).to.not.include(addr2.address);

        const owners2 = await nameContract.getOwners(name, suffix2);
        expect(owners2).to.include(addr2.address);
        expect(owners2).to.not.include(addr1.address);
      }
    });
  });

  describe("delName", function () {
    it("应该成功删除一个已有的名字", async function () {
      const name = "Eve";
      await nameContract.connect(addr1).setName(name);

      await nameContract.connect(addr1).delName();

      expect(await nameContract.getName(addr1.address)).to.equal("");
      const owners = await nameContract.getOwners(name, "");
      expect(owners).to.be.empty;
    });

    it("当用户没有名字时应该失败", async function () {
      await expect(nameContract.connect(addr1).delName()).to.be.revertedWith(
        "Name not set"
      );
    });

    it("删除名字应该只移除调用者", async function () {
      const name = "Shared";
      await nameContract.connect(addr1).setName(name);
      await nameContract.connect(addr2).setName(name);

      await nameContract.connect(addr1).delName();

      const owners = await nameContract.getOwners(name, "");
      expect(owners).to.deep.equal([addr2.address]);
      expect(await nameContract.getName(addr1.address)).to.equal("");
      expect(await nameContract.getName(addr2.address)).to.equal(name);
    });
  });

  describe("Case Insensitivity", function () {
    it("设置名字时不应该区分大小写", async function () {
      const nameLower = "frank";
      const nameUpper = "Frank";

      await nameContract.connect(addr1).setName(nameLower);
      await nameContract.connect(addr2).setName(nameUpper); // Allowed now

      const owners = await nameContract.getOwners(nameLower, "");
      expect(owners.length).to.equal(2);
    });

    it("getOwners 不应该区分大小写", async function () {
      const nameLower = "grace";
      const nameUpper = "Grace";

      await nameContract.connect(addr1).setName(nameLower);

      const owners = await nameContract.getOwners(nameUpper, "");
      expect(owners).to.deep.equal([addr1.address]);
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

  // 新增 Dot 相关测试
  describe("Dot", function () {
    it("getDot: 对未设置的地址返回空字符串", async function () {
      expect(await nameContract.getDot(addr1.address)).to.equal("");
    });

    it("setDot: 能设置并读取调用者的 Dot", async function () {
      await nameContract.connect(addr1).setDot("dot-v1");
      expect(await nameContract.getDot(addr1.address)).to.equal("dot-v1");
    });

    it("setDot: 再次设置会更新旧值", async function () {
      await nameContract.connect(addr1).setDot("dot-v1");
      await nameContract.connect(addr1).setDot("dot-v2");
      expect(await nameContract.getDot(addr1.address)).to.equal("dot-v2");
    });

    it("setDot: 超过最大长度应 revert (140)", async function () {
      const tooLongDot = "a".repeat(141);
      await expect(
        nameContract.connect(addr1).setDot(tooLongDot)
      ).to.be.revertedWith("Dot too long");
    });

    it("setDot: 边界长度 140 应成功", async function () {
      const boundaryDot = "a".repeat(140);
      await expect(nameContract.connect(addr1).setDot(boundaryDot)).to.not.be
        .reverted;
      expect(await nameContract.getDot(addr1.address)).to.equal(boundaryDot);
    });

    it("delDot: 未设置时应 revert", async function () {
      await expect(nameContract.connect(addr1).delDot()).to.be.revertedWith(
        "Dot not set"
      );
    });

    it("delDot: 已设置则成功删除", async function () {
      await nameContract.connect(addr1).setDot("dot-v1");
      await nameContract.connect(addr1).delDot();
      expect(await nameContract.getDot(addr1.address)).to.equal("");
    });
  });
});
