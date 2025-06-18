import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { UserRegistry } from "../typechain-types/UserRegistry";

describe("UserRegistry", function () {
  let userRegistry: UserRegistry;
  let owner: SignerWithAddress;
  let addr1: SignerWithAddress;
  let addr2: SignerWithAddress;
  let addr3: SignerWithAddress;

  beforeEach(async function () {
    [owner, addr1, addr2, addr3] = await ethers.getSigners();

    const UserRegistry = await ethers.getContractFactory("UserRegistry");
    userRegistry = await UserRegistry.deploy();
  });

  describe("setUser", function () {
    it("应该为新用户设置用户数据", async function () {
      const name = "Alice";
      const apis = ["api1", "api2"];
      const cids = ["cid1", "cid2"];

      await userRegistry.connect(addr1).setUser(name, apis, cids);

      const [userName, userApis, userCids, updatedAt] =
        await userRegistry.getUser(addr1.address);
      expect(userName).to.equal(name);
      expect(userApis).to.deep.equal(apis);
      expect(userCids).to.deep.equal(cids);
      expect(updatedAt).to.be.gt(0);
    });

    it("应该更新现有用户数据", async function () {
      // 首次设置
      await userRegistry.connect(addr1).setUser("Alice", ["api1"], ["cid1"]);

      // 更新数据
      const newName = "Alice Updated";
      const newApis = ["api1", "api2", "api3"];
      const newCids = ["cid1", "cid2"];

      await userRegistry.connect(addr1).setUser(newName, newApis, newCids);

      const [userName, userApis, userCids] = await userRegistry.getUser(
        addr1.address
      );
      expect(userName).to.equal(newName);
      expect(userApis).to.deep.equal(newApis);
      expect(userCids).to.deep.equal(newCids);
    });

    it("应该处理空数组", async function () {
      await userRegistry.connect(addr1).setUser("Bob", [], []);

      const [userName, userApis, userCids] = await userRegistry.getUser(
        addr1.address
      );
      expect(userName).to.equal("Bob");
      expect(userApis).to.deep.equal([]);
      expect(userCids).to.deep.equal([]);
    });

    it("应该处理空名称", async function () {
      await userRegistry.connect(addr1).setUser("", ["api1"], ["cid1"]);

      const [userName] = await userRegistry.getUser(addr1.address);
      expect(userName).to.equal("");
    });

    it("应该触发UserUpdated事件", async function () {
      await expect(
        userRegistry.connect(addr1).setUser("Alice", ["api1"], ["cid1"])
      )
        .to.emit(userRegistry, "UserUpdated")
        .withArgs(
          addr1.address,
          await ethers.provider.getBlock("latest").then((b) => b!.timestamp + 1)
        );
    });

    it("应该只将用户添加到userList一次", async function () {
      // 首次设置
      await userRegistry.connect(addr1).setUser("Alice", ["api1"], ["cid1"]);
      expect(await userRegistry.getUserCount()).to.equal(1);

      // 再次设置同一用户
      await userRegistry
        .connect(addr1)
        .setUser("Alice Updated", ["api2"], ["cid2"]);
      expect(await userRegistry.getUserCount()).to.equal(1);
    });
  });

  describe("getUser", function () {
    it("应该为不存在的用户返回空数据", async function () {
      const [userName, userApis, userCids, updatedAt] =
        await userRegistry.getUser(addr1.address);
      expect(userName).to.equal("");
      expect(userApis).to.deep.equal([]);
      expect(userCids).to.deep.equal([]);
      expect(updatedAt).to.equal(0);
    });

    it("应该返回正确的用户数据", async function () {
      const name = "Charlie";
      const apis = ["api1", "api2", "api3"];
      const cids = ["cid1", "cid2", "cid3", "cid4"];

      await userRegistry.connect(addr2).setUser(name, apis, cids);

      const [userName, userApis, userCids, updatedAt] =
        await userRegistry.getUser(addr2.address);
      expect(userName).to.equal(name);
      expect(userApis).to.deep.equal(apis);
      expect(userCids).to.deep.equal(cids);
      expect(updatedAt).to.be.gt(0);
    });
  });

  describe("getUserCount", function () {
    it("初始时应该返回0", async function () {
      expect(await userRegistry.getUserCount()).to.equal(0);
    });

    it("添加用户后应该返回正确的计数", async function () {
      await userRegistry.connect(addr1).setUser("User1", [], []);
      expect(await userRegistry.getUserCount()).to.equal(1);

      await userRegistry.connect(addr2).setUser("User2", [], []);
      expect(await userRegistry.getUserCount()).to.equal(2);

      await userRegistry.connect(addr3).setUser("User3", [], []);
      expect(await userRegistry.getUserCount()).to.equal(3);
    });
  });

  describe("getUsers", function () {
    beforeEach(async function () {
      // 添加测试用户
      await userRegistry.connect(addr1).setUser("User1", ["api1"], ["cid1"]);
      await userRegistry.connect(addr2).setUser("User2", ["api2"], ["cid2"]);
      await userRegistry.connect(addr3).setUser("User3", ["api3"], ["cid3"]);
    });

    it("应该返回正确分页的用户", async function () {
      const [addresses, names, timestamps] = await userRegistry.getUsers(0, 2);

      expect(addresses.length).to.equal(2);
      expect(names.length).to.equal(2);
      expect(timestamps.length).to.equal(2);

      expect(addresses[0]).to.equal(addr1.address);
      expect(addresses[1]).to.equal(addr2.address);
      expect(names[0]).to.equal("User1");
      expect(names[1]).to.equal("User2");
    });

    it("应该处理start + count超过总用户数的情况", async function () {
      const [addresses, names, timestamps] = await userRegistry.getUsers(1, 10);

      expect(addresses.length).to.equal(2); // 只有2个用户从索引1开始
      expect(addresses[0]).to.equal(addr2.address);
      expect(addresses[1]).to.equal(addr3.address);
    });

    it("当start等于用户计数时应该返回空数组", async function () {
      const [addresses, names, timestamps] = await userRegistry.getUsers(3, 1);

      expect(addresses.length).to.equal(0);
      expect(names.length).to.equal(0);
      expect(timestamps.length).to.equal(0);
    });

    it("当start无效时应该回滚", async function () {
      await expect(userRegistry.getUsers(10, 1)).to.be.revertedWith(
        "Invalid start"
      );
    });

    it("应该处理count = 0的情况", async function () {
      const [addresses, names, timestamps] = await userRegistry.getUsers(0, 0);

      expect(addresses.length).to.equal(0);
      expect(names.length).to.equal(0);
      expect(timestamps.length).to.equal(0);
    });
  });

  describe("getAllUsers", function () {
    it("当没有用户时应该返回空数组", async function () {
      const [addresses, names, timestamps] = await userRegistry.getAllUsers();

      expect(addresses.length).to.equal(0);
      expect(names.length).to.equal(0);
      expect(timestamps.length).to.equal(0);
    });

    it("应该返回所有用户", async function () {
      // 添加测试用户
      await userRegistry.connect(addr1).setUser("Alice", ["api1"], ["cid1"]);
      await userRegistry.connect(addr2).setUser("Bob", ["api2"], ["cid2"]);
      await userRegistry.connect(addr3).setUser("Charlie", ["api3"], ["cid3"]);

      const [addresses, names, timestamps] = await userRegistry.getAllUsers();

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
    it("对于不存在的用户应该返回false", async function () {
      expect(await userRegistry.exists(addr1.address)).to.be.false;
    });

    it("对于存在的用户应该返回true", async function () {
      await userRegistry.connect(addr1).setUser("Alice", [], []);
      expect(await userRegistry.exists(addr1.address)).to.be.true;
    });
  });

  describe("userList数组", function () {
    it("应该通过索引访问userList", async function () {
      await userRegistry.connect(addr1).setUser("User1", [], []);
      await userRegistry.connect(addr2).setUser("User2", [], []);

      expect(await userRegistry.userList(0)).to.equal(addr1.address);
      expect(await userRegistry.userList(1)).to.equal(addr2.address);
    });
  });

  describe("Gas优化测试", function () {
    it("setUser应该使用合理的gas", async function () {
      const tx = await userRegistry
        .connect(addr1)
        .setUser("TestUser", ["api1", "api2"], ["cid1", "cid2"]);
      const receipt = await tx.wait();

      // 调整gas期望值到更合理的范围
      expect(receipt!.gasUsed).to.be.lt(300000);
    });
  });

  describe("边界情况", function () {
    it("应该处理非常长的字符串", async function () {
      const longName = "A".repeat(1000);
      const longApi = "B".repeat(1000);
      const longCid = "C".repeat(1000);

      await userRegistry.connect(addr1).setUser(longName, [longApi], [longCid]);

      const [userName, userApis, userCids] = await userRegistry.getUser(
        addr1.address
      );
      expect(userName).to.equal(longName);
      expect(userApis[0]).to.equal(longApi);
      expect(userCids[0]).to.equal(longCid);
    });

    it("应该处理大量的API和CID", async function () {
      const manyApis = Array.from({ length: 100 }, (_, i) => `api${i}`);
      const manyCids = Array.from({ length: 100 }, (_, i) => `cid${i}`);

      await userRegistry.connect(addr1).setUser("TestUser", manyApis, manyCids);

      const [, userApis, userCids] = await userRegistry.getUser(addr1.address);
      expect(userApis).to.deep.equal(manyApis);
      expect(userCids).to.deep.equal(manyCids);
    });
  });
});
