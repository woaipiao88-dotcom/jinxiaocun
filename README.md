# 管家婆风格进销存 V2

这是重新实现的局域网进销存系统第一版。设计目标是：

- Win10 电脑运行服务端和数据库
- XP / Win10 电脑通过浏览器访问
- 不使用 Vue3、React、Element Plus 等现代前端依赖
- 库存通过单据和库存流水驱动，避免直接算乱

## 启动

```powershell
cd C:\Users\xq\Documents\Codex\2026-05-25\new-chat\jxc-v2
python -m pip install -r requirements.txt
python app.py
```

本机访问：

```text
http://127.0.0.1:5001
```

局域网其他电脑访问：

```text
http://Win10主机IP:5001
```

也可以直接双击：

```text
start_server.bat
```

## 已包含

- 商品资料、客户资料、供应商资料
- 采购入库、采购退货、销售出库、销售退货
- 库存查询、库存流水
- 业务历史、单据作废
- 数据库备份
- 管家婆风格主界面、窗口标签、表格列宽记忆
- 本地桌面版和网页版共用同一套界面、接口和数据库
