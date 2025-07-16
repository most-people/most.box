## IPFS Desktop

https://docs.ipfs.tech/install/ipfs-desktop/

[下载安装](https://github.com/ipfs/ipfs-desktop/releases) ipfs-desktop-setup-0.43.0-win-x64.exe

### 修改 IPFS 配置

```json
{
  "Addresses": {
    "Gateway": "/ip4/0.0.0.0/tcp/8080"
  }
}
```

### 打开防火墙 1976,8080

### 开机启动

C:\ProgramData\Microsoft\Windows\Start Menu\Programs\Startup

放入 IFPS Desktop 快捷方式

## Caddy

### Caddyfile

```caddy
cid.most.box {
    reverse_proxy 127.0.0.1:8080
}

dot.most.box {
    reverse_proxy 127.0.0.1:1976
}
```

### [Windows 安装](https://caddyserver.com/download)

下载 caddy_windows_amd64.exe 放在 C:\caddy\caddy.exe

添加环境变量 C:\caddy

```cmd
# 查看版本
caddy --version

# 验证
caddy validate --config C:\caddy\Caddyfile

# 格式化
caddy fmt --overwrite C:\caddy\Caddyfile

# 启动
caddy start --config C:\caddy\Caddyfile

caddy status
```

### [Ubuntu 安装](https://caddyserver.com/docs/install#debian-ubuntu-raspbian)

```bash
# 安装
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install caddy

# 查看版本
caddy --version

# 编辑
sudo nano /etc/caddy/Caddyfile
# 验证
sudo caddy validate --config /etc/caddy/Caddyfile
# 格式化
sudo caddy fmt --overwrite /etc/caddy/Caddyfile
# 重启
sudo systemctl reload caddy
# 查看
sudo systemctl status caddy
```
