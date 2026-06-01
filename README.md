# 管家婆风格进销存 V2

一个面向中文小微企业、门店和局域网环境的轻量级进销存系统。项目采用 Python Flask + SQLite + 原生 JavaScript 实现，可以在 Windows 主机上运行服务端，局域网内其他电脑通过浏览器访问同一套库存和单据数据。

> 当前项目处于早期开源阶段，请先使用演示数据或测试账套验证流程，再用于真实业务。

## 功能特性

- 商品资料、客户资料、供应商资料维护
- 采购入库、采购退货、销售出库、销售退货
- 单据自动生成编号，保存后自动更新库存
- 库存查询、库存金额、低库存辅助统计
- 库存流水和经营历程追踪
- 单据作废和删除时自动反向冲回库存
- 打印模板在线编辑
- 数据助手接口：统一搜索商品、客户、供应商、单据和库存
- SQLite 本地数据库，支持一键备份到 `backups/`
- 无前端构建依赖，兼容较旧浏览器环境

## 技术栈

- 后端：Python 3.10+、Flask
- 数据库：SQLite
- 前端：HTML、CSS、原生 JavaScript
- 桌面壳：可选 `pywebview`
- 打包：可选 PyInstaller

## 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/woaipiao88-dotcom/jinxiaocun.git
cd jinxiaocun
```

### 2. 安装依赖

```bash
python -m pip install -r requirements.txt
```

### 3. 启动服务

```bash
python app.py
```

启动后本机访问：

```text
http://127.0.0.1:5001
```

局域网其他电脑访问：

```text
http://运行服务的电脑IP:5001
```

Windows 用户也可以双击：

```text
start_server.bat
```

### 可选：桌面壳

如果需要用桌面窗口打开同一套 Web 系统，可以安装桌面依赖：

```bash
python -m pip install -r requirements-desktop.txt
python local_desktop.py
```

## 局域网部署

1. 在一台 Windows 主机上运行 `python app.py` 或 `start_server.bat`。
2. 查看服务窗口中的端口，默认是 `5001`。
3. 在同一局域网内的其他电脑浏览器打开 `http://主机IP:5001`。
4. 如果无法访问，请检查 Windows 防火墙是否允许 Python 或端口 `5001` 进入连接。

## 数据文件

首次启动时会自动创建：

```text
data/jxc_v2.db
data/打印单模板.html
backups/
```

这些文件可能包含真实业务数据，默认不应提交到 Git。项目已经通过 `.gitignore` 排除 `data/`、`backups/`、`*.db`、`*.sqlite` 等文件。

## API 文档

常用接口见 [docs/API.md](docs/API.md)。

健康检查：

```bash
curl http://127.0.0.1:5001/api/health
```

数据助手搜索：

```bash
curl "http://127.0.0.1:5001/api/assistant/search?q=SP001"
```

## 项目结构

```text
.
├── app.py                    # Flask 服务端、数据库初始化和业务接口
├── local_desktop.py          # 可选桌面壳入口
├── static/
│   ├── index.html            # 前端入口
│   ├── app.js                # 前端业务逻辑
│   └── styles.css            # 样式
├── start_server.bat          # Windows 一键启动脚本
├── requirements.txt          # 服务端依赖
├── docs/
│   ├── API.md
│   └── DEPLOYMENT.md
└── README.md
```

## 开发计划

- 登录与角色权限
- 多账套和多仓库管理增强
- Excel 导入导出
- 报表导出和打印预览优化
- 单据审核流
- 自动化测试和发布流程
- 数据库迁移脚本

## 贡献

欢迎提交 Issue 和 Pull Request。贡献前请阅读 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 安全

请不要提交真实客户、供应商、库存、销售单据或 API Key。安全问题请参考 [SECURITY.md](SECURITY.md)。

## 许可证

本项目采用 MIT License，详见 [LICENSE](LICENSE)。
