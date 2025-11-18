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

```bash
curl http://localhost:1976/ipfs.config.update -X PUT
curl http://localhost:1976/ipfs.shutdown -X POST
curl http://localhost:1976/ipfs.restart -X POST

curl http://localhost:1976/app.update -X PUT
curl http://localhost:1976/app.restart -X POST
```

Linux

```bash
# ipfs
pm2 start ipfs --interpreter none -- daemon --enable-gc

# dot
# 上传 dot-linux-amd64 到服务器
scp ./dot-linux-amd64 ubuntu@most.box:~
# dot-linux-amd64 添加可执行权限
chmod +x dot-linux-amd64

pm2 start dot-linux-amd64 --interpreter none
```

Windows Git Bash

```bash
# path C:\Users\<用户名>\AppData\Local\Programs\IPFS Desktop\resources\app.asar.unpacked\node_modules\kubo\kubo

# ipfs
pm2 start ipfs --interpreter none -- daemon --enable-gc

# dot
pm2 start dot-windows-amd64.exe --interpreter none

# caddy
cd /c/caddy
pm2 start caddy.exe --interpreter none -- run
```
