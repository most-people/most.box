# Most.Box - 如影随形

——「轻松简单、开源免费、部署自己的节点」

## [Windows 部署教程](/app.most.box/src/app/build/windows.md)

## [Linux 部署教程](/app.most.box/src/app/build/linux.md)

app.most.box@gmail.com

# IPFS 集群

CRDT 模式

**每台服务器** 打开 管理员：Windows PowerShell

1. 获取节点 id

打开：http://localhost:5001
控制台输入：fetch('http://localhost:5001/api/v0/id',{method:'POST'})

小钢炮
12D3KooWH7XfLRRoMzMqrcPsSn8DBJpwdPjMvm8bM6EfZRkTfzdh

生产力
12D3KooWEfhngz9JqycJXmrxtozE3qKvwBpTW8cusoU7SWixgeEc

2. 开放防火墙端口 9096

```powershell
netsh advfirewall firewall add rule name="IPFS Cluster 9096" dir=in action=allow protocol=TCP localport=9096
```

3. 生成并统一设置 Cluster Secret（在第一台生成，然后在三台都设置相同的值）

```powershell
$b = New-Object byte[] 32
[Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b)
($b | ForEach-Object { $_.ToString('x2') }) -join ''
```

在每台服务器的当前终端会话设置同一个值（上一步输出）

```powershell
set CLUSTER_SECRET=f9fbb797e54bb741a31658aa176ed21b0cb488e35478814f5ceda259d6636228
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

小钢炮
12D3KooWRr6fHdy7G1BywyizVzyWjMwVYJf7fxnXa8ijumJ4N5uL

生产力
12D3KooWCWcWuGpp4fFWAfEcMhkuYNXYkayENEgaUySgeuy2TCkz
