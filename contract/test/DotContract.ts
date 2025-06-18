import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { DotContract } from "../typechain-types/DotContract";

describe("DotContract", function () {
  let dotContract: DotContract;
  let owner: SignerWithAddress;
  let addr1: SignerWithAddress;
  let addr2: SignerWithAddress;
  let addr3: SignerWithAddress;

  beforeEach(async function () {
    [owner, addr1, addr2, addr3] = await ethers.getSigners();

    const DotContract = await ethers.getContractFactory("DotContract");
    dotContract = await DotContract.deploy();
  });

  describe("setDot", function () {
    it("应该为新节点设置节点数据", async function () {
      const name = "Alice";
      const APIs = ["api1", "api2"];
      const CIDs = ["cid1", "cid2"];

      await dotContract.connect(addr1).setDot(name, APIs, CIDs);

      const [dotName, dotAPIs, dotCIDs, updatedAt] = await dotContract.getDot(
        addr1.address
      );
      expect(dotName).to.equal(name);
      expect(dotAPIs).to.deep.equal(APIs);
      expect(dotCIDs).to.deep.equal(CIDs);
      expect(updatedAt).to.be.gt(0);
    });

    it("应该更新现有节点数据", async function () {
      // 首次设置
      await dotContract.connect(addr1).setDot("Alice", ["api1"], ["cid1"]);

      // 更新数据
      const newName = "Alice Updated";
      const newAPIs = ["api1", "api2", "api3"];
      const newCIDs = ["cid1", "cid2"];

      await dotContract.connect(addr1).setDot(newName, newAPIs, newCIDs);

      const [dotName, dotAPIs, dotCIDs] = await dotContract.getDot(
        addr1.address
      );
      expect(dotName).to.equal(newName);
      expect(dotAPIs).to.deep.equal(newAPIs);
      expect(dotCIDs).to.deep.equal(newCIDs);
    });

    it("应该处理空数组", async function () {
      await dotContract.connect(addr1).setDot("Bob", [], []);

      const [dotName, dotAPIs, dotCIDs] = await dotContract.getDot(
        addr1.address
      );
      expect(dotName).to.equal("Bob");
      expect(dotAPIs).to.deep.equal([]);
      expect(dotCIDs).to.deep.equal([]);
    });

    it("应该处理空名称", async function () {
      await dotContract.connect(addr1).setDot("", ["api1"], ["cid1"]);

      const [dotName] = await dotContract.getDot(addr1.address);
      expect(dotName).to.equal("");
    });

    it("应该触发DotUpdated事件", async function () {
      await expect(
        dotContract.connect(addr1).setDot("Alice", ["api1"], ["cid1"])
      )
        .to.emit(dotContract, "DotUpdated")
        .withArgs(
          addr1.address,
          await ethers.provider.getBlock("latest").then((b) => b!.timestamp + 1)
        );
    });

    it("应该只将节点添加到dotList一次", async function () {
      // 首次设置
      await dotContract.connect(addr1).setDot("Alice", ["api1"], ["cid1"]);
      expect(await dotContract.getDotCount()).to.equal(1);

      // 再次设置同一节点
      await dotContract
        .connect(addr1)
        .setDot("Alice Updated", ["api2"], ["cid2"]);
      expect(await dotContract.getDotCount()).to.equal(1);
    });
  });

  describe("getDot", function () {
    it("应该为不存在的节点返回空数据", async function () {
      const [dotName, dotAPIs, dotCIDs, updatedAt] = await dotContract.getDot(
        addr1.address
      );
      expect(dotName).to.equal("");
      expect(dotAPIs).to.deep.equal([]);
      expect(dotCIDs).to.deep.equal([]);
      expect(updatedAt).to.equal(0);
    });

    it("应该返回正确的节点数据", async function () {
      const name = "Charlie";
      const APIs = ["api1", "api2", "api3"];
      const CIDs = ["cid1", "cid2", "cid3", "cid4"];

      await dotContract.connect(addr2).setDot(name, APIs, CIDs);

      const [dotName, dotAPIs, dotCIDs, updatedAt] = await dotContract.getDot(
        addr2.address
      );
      expect(dotName).to.equal(name);
      expect(dotAPIs).to.deep.equal(APIs);
      expect(dotCIDs).to.deep.equal(CIDs);
      expect(updatedAt).to.be.gt(0);
    });
  });

  describe("getDotCount", function () {
    it("初始时应该返回0", async function () {
      expect(await dotContract.getDotCount()).to.equal(0);
    });

    it("添加节点后应该返回正确的计数", async function () {
      await dotContract.connect(addr1).setDot("Dot1", [], []);
      expect(await dotContract.getDotCount()).to.equal(1);

      await dotContract.connect(addr2).setDot("Dot2", [], []);
      expect(await dotContract.getDotCount()).to.equal(2);

      await dotContract.connect(addr3).setDot("Dot3", [], []);
      expect(await dotContract.getDotCount()).to.equal(3);
    });
  });

  describe("getDots", function () {
    beforeEach(async function () {
      // 添加测试节点
      await dotContract.connect(addr1).setDot("Dot1", ["api1"], ["cid1"]);
      await dotContract.connect(addr2).setDot("Dot2", ["api2"], ["cid2"]);
      await dotContract.connect(addr3).setDot("Dot3", ["api3"], ["cid3"]);
    });

    it("应该返回正确分页的节点", async function () {
      const [addresses, names, timestamps] = await dotContract.getDots(0, 2);

      expect(addresses.length).to.equal(2);
      expect(names.length).to.equal(2);
      expect(timestamps.length).to.equal(2);

      expect(addresses[0]).to.equal(addr1.address);
      expect(addresses[1]).to.equal(addr2.address);
      expect(names[0]).to.equal("Dot1");
      expect(names[1]).to.equal("Dot2");
    });

    it("应该处理start + count超过总节点数的情况", async function () {
      const [addresses, names, timestamps] = await dotContract.getDots(1, 10);

      expect(addresses.length).to.equal(2); // 只有2个节点从索引1开始
      expect(addresses[0]).to.equal(addr2.address);
      expect(addresses[1]).to.equal(addr3.address);
    });

    it("当start等于节点计数时应该返回空数组", async function () {
      const [addresses, names, timestamps] = await dotContract.getDots(3, 1);

      expect(addresses.length).to.equal(0);
      expect(names.length).to.equal(0);
      expect(timestamps.length).to.equal(0);
    });

    it("当start无效时应该回滚", async function () {
      await expect(dotContract.getDots(10, 1)).to.be.revertedWith(
        "Invalid start"
      );
    });

    it("应该处理count = 0的情况", async function () {
      const [addresses, names, timestamps] = await dotContract.getDots(0, 0);

      expect(addresses.length).to.equal(0);
      expect(names.length).to.equal(0);
      expect(timestamps.length).to.equal(0);
    });
  });

  describe("getAllDots", function () {
    it("当没有节点时应该返回空数组", async function () {
      const [addresses, names, timestamps] = await dotContract.getAllDots();

      expect(addresses.length).to.equal(0);
      expect(names.length).to.equal(0);
      expect(timestamps.length).to.equal(0);
    });

    it("应该返回所有节点", async function () {
      // 添加测试节点
      await dotContract.connect(addr1).setDot("Alice", ["api1"], ["cid1"]);
      await dotContract.connect(addr2).setDot("Bob", ["api2"], ["cid2"]);
      await dotContract.connect(addr3).setDot("Charlie", ["api3"], ["cid3"]);

      const [addresses, names, timestamps] = await dotContract.getAllDots();

      expect(addresses.length).to.equal(3);
      expect(names.length).to.equal(3);
      expect(timestamps.length).to.equal(3);

      expect(addresses).to.deep.equal([
        addr1.address,
        addr2.address,
        addr3.address,
      ]);
      expect(names).to.deep.equal(["Alice", "Bob", "Charlie"]);

      // 验证时间戳都大于0
      timestamps.forEach((timestamp: bigint) => {
        expect(timestamp).to.be.gt(0);
      });
    });
  });

  describe("exists映射", function () {
    it("对于不存在的节点应该返回false", async function () {
      expect(await dotContract.exists(addr1.address)).to.be.false;
    });

    it("对于存在的节点应该返回true", async function () {
      await dotContract.connect(addr1).setDot("Alice", [], []);
      expect(await dotContract.exists(addr1.address)).to.be.true;
    });
  });

  describe("dotList数组", function () {
    it("应该通过索引访问dotList", async function () {
      await dotContract.connect(addr1).setDot("Dot1", [], []);
      await dotContract.connect(addr2).setDot("Dot2", [], []);

      expect(await dotContract.dotList(0)).to.equal(addr1.address);
      expect(await dotContract.dotList(1)).to.equal(addr2.address);
    });
  });

  describe("Gas优化测试", function () {
    it("setDot应该使用合理的gas", async function () {
      const tx = await dotContract
        .connect(addr1)
        .setDot("TestDot", ["api1", "api2"], ["cid1", "cid2"]);
      const receipt = await tx.wait();

      // 调整gas期望值到更合理的范围
      expect(receipt!.gasUsed).to.be.lt(300000);
    });
  });

  describe("边界情况", function () {
    it("应该处理非常长的字符串", async function () {
      const longName = "A".repeat(100); // 在限制范围内
      const longApi = "B".repeat(100);
      const longCid = "C".repeat(100);

      await dotContract.connect(addr1).setDot(longName, [longApi], [longCid]);

      const [dotName, dotAPIs, dotCIDs] = await dotContract.getDot(
        addr1.address
      );
      expect(dotName).to.equal(longName);
      expect(dotAPIs[0]).to.equal(longApi);
      expect(dotCIDs[0]).to.equal(longCid);
    });

    it("应该处理大量的API和CID", async function () {
      const manyAPIs = Array.from({ length: 50 }, (_, i) => `api${i}`); // 在限制范围内
      const manyCIDs = Array.from({ length: 50 }, (_, i) => `cid${i}`);

      await dotContract.connect(addr1).setDot("TestDot", manyAPIs, manyCIDs);

      const [, dotAPIs, dotCIDs] = await dotContract.getDot(addr1.address);
      expect(dotAPIs).to.deep.equal(manyAPIs);
      expect(dotCIDs).to.deep.equal(manyCIDs);
    });
  });

  describe("安全性测试", function () {
    it("应该拒绝过长的名称", async function () {
      const longName = "A".repeat(101);
      await expect(
        dotContract.connect(addr1).setDot(longName, [], [])
      ).to.be.revertedWith("Name too long");
    });

    it("应该拒绝过多的API", async function () {
      const manyAPIs = Array.from({ length: 51 }, (_, i) => `api${i}`);
      await expect(
        dotContract.connect(addr1).setDot("Test", manyAPIs, [])
      ).to.be.revertedWith("Too many APIs");
    });
  });
});
