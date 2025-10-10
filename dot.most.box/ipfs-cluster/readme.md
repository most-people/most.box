# [IPFS Cluster 集群](https://ipfscluster.io) 部署指南

使用 CRDT 模式部署 IPFS 集群

## Windows PowerShell 部署

### 1. 开放防火墙 9096 端口

```powershell
netsh advfirewall firewall add rule name="IPFS Cluster 9096" dir=in action=allow protocol=TCP localport=9096
```

### 2. 初始化并启动集群

```powershell
# 引导节点
ipfs-cluster-service init --consensus crdt
ipfs-cluster-service daemon

# 查看节点信息
type ~\.ipfs-cluster\identity.json
```

## Linux 部署

### 1. 开放防火墙端口

```bash
sudo ufw allow 9096
```

### 2. 初始化并启动集群

```bash
# 引导节点（第一台）
ipfs-cluster-service init --consensus crdt
ipfs-cluster-service daemon

# 查看节点信息
nano ~/.ipfs-cluster/identity.json
```

## 集群状态检查

- 健康检查：http://localhost:9094/health/graph

## 配置准备

1. 获取 IPFS 节点 ID

   - 打开 http://localhost:5001
   - 在浏览器控制台执行：`fetch('http://localhost:5001/api/v0/id',{method:'POST'})`

2. 生成集群密钥（所有节点需使用相同密钥）

   ```powershell
   $b = New-Object byte[] 32

   [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b)

   ($b | ForEach-Object { $_.ToString('x2') }) -join ''

   # 示例：f9fbb797e54bb741a31658aa176ed21b0cb488e35478814f5ceda259d6636228
   ```
