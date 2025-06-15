# AppVersionContract

一个基于以太坊的智能合约，用于管理应用版本信息和节点网络。

## 功能概述

- **应用信息管理**：存储和更新应用版本号、下载链接和更新内容
- **节点网络管理**：添加、批准和删除节点
- **权限控制系统**：合约拥有者和节点管理员分级权限管理

## 安装

```bash
npm install
```

## 配置

创建 `.env` 文件，添加以下内容：

```
PRIVATE_KEY=你的钱包私钥
```

## 测试

运行测试套件以验证合约功能：

```bash
npx hardhat test
```

## 部署

部署合约到目标网络：

```bash
npx hardhat run scripts/deploy.ts --network <网络名称>
```

支持的网络在 `hardhat.config.ts` 中配置。

## 合约功能

### 应用信息管理

- 更新应用版本、下载链接和更新内容
- 获取完整应用信息

### 节点管理

- 添加新节点（任何人都可以提交）
- 批准待审核节点（仅管理员）
- 批量批准节点（仅管理员）
- 删除节点（仅管理员）
- 批量删除节点（仅管理员）

### 权限管理

- 添加/移除节点管理员
- 转让合约所有权
- 查询管理员列表和所有者

## 调用示例

```javascript
// 使用ethers.js调用合约
const { ethers } = require("ethers");
const abi =
  require("./artifacts/contracts/AppVersionContract.sol/AppVersionContract.json").abi;

// 连接合约
const provider = new ethers.providers.JsonRpcProvider("YOUR_RPC_URL");
const signer = new ethers.Wallet("YOUR_PRIVATE_KEY", provider);
const contract = new ethers.Contract("CONTRACT_ADDRESS", abi, signer);

// 应用信息管理
async function getAppInfo() {
  const [version, link, content] = await contract.getAppInfo();
  console.log("版本号:", version);
  console.log("下载链接:", link);
  console.log("更新内容:", content);
}

async function updateAppInfo(version, link, content) {
  const tx = await contract.updateAppInfo(version, link, content);
  await tx.wait();
  console.log("应用信息已更新");
}

// 节点管理员管理
async function addNodeManager(managerAddress) {
  const tx = await contract.addNodeManager(managerAddress);
  await tx.wait();
  console.log(`已添加节点管理员: ${managerAddress}`);
}

async function removeNodeManager(managerAddress) {
  const tx = await contract.removeNodeManager(managerAddress);
  await tx.wait();
  console.log(`已移除节点管理员: ${managerAddress}`);
}

async function getAllNodeManagers() {
  const managers = await contract.getAllNodeManagers();
  console.log("所有节点管理员:", managers);
}

// 节点管理
async function addNodeUrl(url) {
  const tx = await contract.addNodeUrl(url);
  await tx.wait();
  console.log("节点网址已添加");
}

async function approveNode(url) {
  const tx = await contract.approveNode(url);
  await tx.wait();
  console.log(`节点已批准: ${url}`);
}

async function approveNodes(urls) {
  const tx = await contract.approveNodes(urls);
  await tx.wait();
  console.log("节点已批量批准");
}

async function removeNodeUrl(url) {
  const tx = await contract.removeNodeUrl(url);
  await tx.wait();
  console.log(`节点已删除: ${url}`);
}

async function removeNodeUrls(urls) {
  const tx = await contract.removeNodeUrls(urls);
  await tx.wait();
  console.log("节点已批量删除");
}

// 节点查询
async function getNodeInfo(url) {
  const isApproved = await contract.getNodeInfo(url);
  console.log("节点网址:", url);
  console.log("是否已批准:", isApproved);
}

async function getApprovedNodeUrls() {
  const urls = await contract.getApprovedNodeUrls();
  console.log("已批准的节点网址列表:", urls);
}

async function getPendingNodeUrls() {
  const urls = await contract.getPendingNodeUrls();
  console.log("待审核的节点网址列表:", urls);
}

async function getNodeCounts() {
  const approvedCount = await contract.getApprovedNodeCount();
  const pendingCount = await contract.getPendingNodeCount();
  console.log("已批准节点数量:", approvedCount);
  console.log("待审核节点数量:", pendingCount);
}

// 所有权管理
async function getOwner() {
  const owner = await contract.getOwner();
  console.log("合约拥有者:", owner);
}

async function transferOwnership(newOwner) {
  const tx = await contract.transferOwnership(newOwner);
  await tx.wait();
  console.log("所有权已转让给:", newOwner);
}

// 示例：链下服务自动化节点管理
async function automatedNodeManagement() {
  // 1. 获取所有待审核节点
  const pendingNodes = await contract.getPendingNodeUrls();

  // 2. 健康检查
  const healthyNodes = [];
  const unhealthyNodes = [];

  for (const nodeUrl of pendingNodes) {
    try {
      // 这里实现您的心跳检测逻辑
      const isHealthy = await checkNodeHealth(nodeUrl);
      if (isHealthy) {
        healthyNodes.push(nodeUrl);
      } else {
        unhealthyNodes.push(nodeUrl);
      }
    } catch (error) {
      console.error(`检查节点健康状态失败: ${nodeUrl}`, error);
      unhealthyNodes.push(nodeUrl);
    }
  }

  // 3. 批准健康节点
  if (healthyNodes.length > 0) {
    await approveNodes(healthyNodes);
    console.log(`已批准 ${healthyNodes.length} 个健康节点`);
  }

  // 4. 删除不健康节点
  if (unhealthyNodes.length > 0) {
    await removeNodeUrls(unhealthyNodes);
    console.log(`已删除 ${unhealthyNodes.length} 个不健康节点`);
  }

  // 5. 检查已批准节点的健康状态
  const approvedNodes = await contract.getApprovedNodeUrls();
  const failingApprovedNodes = [];

  for (const nodeUrl of approvedNodes) {
    try {
      const isHealthy = await checkNodeHealth(nodeUrl);
      if (!isHealthy) {
        failingApprovedNodes.push(nodeUrl);
      }
    } catch (error) {
      console.error(`检查已批准节点健康状态失败: ${nodeUrl}`, error);
      failingApprovedNodes.push(nodeUrl);
    }
  }

  // 6. 删除不健康的已批准节点
  if (failingApprovedNodes.length > 0) {
    await removeNodeUrls(failingApprovedNodes);
    console.log(`已删除 ${failingApprovedNodes.length} 个不健康的已批准节点`);
  }
}

// 模拟节点健康检查函数
async function checkNodeHealth(nodeUrl) {
  // 这里实现实际的节点健康检查逻辑
  try {
    // 实际应用中应替换为真实的健康检查请求
    // const response = await fetch(`${nodeUrl}/health`);
    // return response.status === 200;

    return Math.random() > 0.3; // 示例：70%概率健康
  } catch (error) {
    console.error(`节点健康检查错误: ${nodeUrl}`, error);
    return false;
  }
}
```

## 合约架构

- **应用信息结构体**：存储版本号、下载链接和更新内容
- **节点信息结构体**：存储节点批准状态
- **权限系统**：合约拥有者和节点管理员分级权限控制
- **事件系统**：记录所有重要操作，便于链下服务跟踪

## 许可证

MIT
