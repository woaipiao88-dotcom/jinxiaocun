# Deployment Guide

## Windows 局域网部署

### 1. 安装 Python

建议安装 Python 3.10 或更高版本，并勾选 `Add Python to PATH`。

### 2. 下载项目

```powershell
git clone https://github.com/woaipiao88-dotcom/jinxiaocun.git
cd jinxiaocun
```

如果没有安装 Git，也可以在 GitHub 页面下载 ZIP 后解压。

### 3. 安装依赖

```powershell
python -m pip install -r requirements.txt
```

### 4. 启动

```powershell
python app.py
```

或双击：

```text
start_server.bat
```

### 5. 访问

本机访问：

```text
http://127.0.0.1:5001
```

局域网访问：

```text
http://Windows主机IP:5001
```

查看 Windows 主机 IP：

```powershell
ipconfig
```

通常使用 `IPv4 地址`。

## 防火墙

如果其他电脑无法访问，请在 Windows 防火墙中允许 Python 通过专用网络，或开放端口 `5001`。

PowerShell 管理员模式示例：

```powershell
New-NetFirewallRule -DisplayName "JXC Flask 5001" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 5001
```

## 数据备份

系统数据位于：

```text
data/jxc_v2.db
```

建议定期复制 `data/` 和 `backups/` 到安全位置。不要把真实数据库提交到 GitHub。

## 互联网部署提醒

当前版本默认适合可信局域网，不建议直接暴露到公网。公网部署前需要补充：

- 登录认证
- 角色权限
- HTTPS
- 反向代理
- 数据库备份和恢复方案
- 访问审计
