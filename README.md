# Most.Box - 如影随形

——「轻松简单、开源免费、部署自己的节点」

[Windows 部署教程](/app.most.box/src/app/build/windows.md)

[Linux 部署教程](/app.most.box/src/app/build/linux.md)

app.most.box@gmail.com

## IPFS

```bash
# 测试启动
ipfs daemon --enable-gc

# 静默启动
nohup ipfs daemon --enable-gc > ~/ipfs.log 2>&1 &

# 关闭
ipfs shutdown
```

## Most.Box

```bash
# 下载
wget https://github.com/most-people/most.box/releases/download/v0.0.1/dot-linux-amd64

# 给 dot-linux-amd64 添加可执行权限
chmod +x dot-linux-amd64

# 测试启动
./dot-linux-amd64

# 静默启动
nohup ./dot-linux-amd64 > ~/dot.log 2>&1 &

# 关闭
kill -9 $(pgrep -f dot-linux-amd64)
```
