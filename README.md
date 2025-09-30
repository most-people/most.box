# Most.Box - 如影随形

——「轻松简单、开源免费、部署自己的节点」

## [Windows 部署教程](/app.most.box/src/app/build/windows.md)

## [Linux 部署教程](/app.most.box/src/app/build/linux.md)

app.most.box@gmail.com

# IPFS 集群

CRDT 模式

**每台服务器** 打开 管理员：Windows PowerShell

1. 获取节点 id

小钢炮
12D3KooWH7XfLRRoMzMqrcPsSn8DBJpwdPjMvm8bM6EfZRkTfzdh

2. 开放防火墙端口 9096

```powershell
netsh advfirewall firewall add rule name="IPFS Cluster 9096" dir=in action=allow protocol=TCP localport=9096
```

```
powershell -Command "$b=New-Object byte[] 32; [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b); ($b|ForEach-Object{ $_.ToString('x2') }) -join ''"
```
