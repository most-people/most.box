[Ubuntu 安装 Caddy](https://caddyserver.com/docs/install#debian-ubuntu-raspbian)

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

Windows 安装

下载 caddy.exe 放在 D:\caddy\caddy.exe

添加环境变量 D:\caddy

```cmd
# 查看版本
caddy --version

# 验证
caddy validate --config D:\caddy\Caddyfile

# 格式化
caddy fmt --overwrite D:\caddy\Caddyfile

# 启动
caddy start --config D:\caddy\Caddyfile

caddy status
```
