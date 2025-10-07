# [IPFS 集群](https://ipfscluster.io)

CRDT 模式

**每台服务器** 打开 管理员：Windows PowerShell

1. 获取节点 id

```bash
# 打开 http://localhost:5001
# 控制台输入：
fetch('http://localhost:5001/api/v0/id',{method:'POST'})
```

2. 开放防火墙端口 9096

Windows

```powershell
netsh advfirewall firewall add rule name="IPFS Cluster 9096" dir=in action=allow protocol=TCP localport=9096
```

Linux

```bash
sudo ufw allow 9096
```

3. 生成并统一设置 Cluster Secret（在第一台生成，然后在三台都设置相同的值）

```powershell
$b = New-Object byte[] 32

[Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b)

($b | ForEach-Object { $_.ToString('x2') }) -join ''
```

在每台服务器的当前终端会话设置同一个值（上一步输出）

Windows PowerShell

```powershell
set CLUSTER_SECRET=f9fbb797e54bb741a31658aa176ed21b0cb488e35478814f5ceda259d6636228
```

Linux

```bash
export CLUSTER_SECRET=f9fbb797e54bb741a31658aa176ed21b0cb488e35478814f5ceda259d6636228
```

4. 在“引导节点”（第一台）初始化并启动（CRDT）

```powershell
ipfs-cluster-service init --consensus crdt
ipfs-cluster-service daemon
```

记录本机 Cluster Peer ID

```powershell
type ~\.ipfs-cluster\identity.json
type ~\.ipfs-cluster\service.json
```

```json
{
  "peername": "DOT",
  "secret": "037a9bb5e4e13916dfa24911a2495074a690e1085eb0fb74cd46192489c977a0",
  "trusted_peers": [
    "12D3KooWRr6fHdy7G1BywyizVzyWjMwVYJf7fxnXa8ijumJ4N5uL",
    "12D3KooWCWcWuGpp4fFWAfEcMhkuYNXYkayENEgaUySgeuy2TCkz",
    "12D3KooWMj7b6vDJm2DppdwAuWxEbdKH7aJgnUDJGkhzkbwQpddU"
  ]
}
```

通过 HTTP API 检查 IPFS 集群状态

http://localhost:9094/health/graph
