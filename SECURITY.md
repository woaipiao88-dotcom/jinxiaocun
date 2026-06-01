# Security Policy

## Supported Versions

当前项目处于早期开源阶段，默认只维护 `main` 分支。

## Sensitive Data

请不要提交以下内容：

- `data/` 目录
- `backups/` 目录
- SQLite 数据库文件，例如 `*.db`、`*.sqlite`
- `.env`、密钥、证书、API Key
- 真实客户、供应商、库存、销售单据或财务记录

## Reporting a Vulnerability

如果你发现安全问题，请不要在公开 Issue 中贴出可利用细节或真实数据。可以先创建一个简短 Issue，说明需要私下沟通，维护者会继续跟进。

## Deployment Notes

本项目默认适合可信局域网环境。公开到互联网前，请至少补充：

- 登录认证
- 权限控制
- HTTPS
- 数据库备份策略
- 访问日志和错误日志
- 防火墙和反向代理配置
