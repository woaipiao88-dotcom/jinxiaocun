# API Reference

默认服务地址：

```text
http://127.0.0.1:5001
```

所有请求和响应默认使用 JSON，除静态页面和打印模板接口外。

## Health

### GET `/api/health`

返回服务状态。

```json
{
  "ok": true,
  "time": "2026-06-01 12:00:00"
}
```

## Products

### GET `/api/products`

获取商品列表。

可选参数：

- `q`: 按商品编号或名称搜索

### POST `/api/products`

新增商品。

```json
{
  "code": "SP001",
  "name": "测试商品A",
  "category": "分类1",
  "spec": "500g",
  "unit": "件",
  "cost_price": 10,
  "sale_price": 15,
  "min_stock": 5,
  "remark": ""
}
```

### PUT `/api/products/{id}`

修改商品。

### DELETE `/api/products/{id}`

删除商品。已有业务记录或库存时会停用商品，而不是硬删除。

## Partners

客户和供应商共用伙伴接口。

### GET `/api/partners/customer`

获取客户列表。

### GET `/api/partners/supplier`

获取供应商列表。

### POST `/api/partners/{kind}`

新增客户或供应商，`kind` 为 `customer` 或 `supplier`。

```json
{
  "code": "KH001",
  "name": "测试客户A",
  "contact": "张三",
  "phone": "13800138001",
  "address": "",
  "remark": ""
}
```

### PUT `/api/partners/{kind}/{id}`

修改客户或供应商。

### DELETE `/api/partners/{kind}/{id}`

删除客户或供应商。已有业务记录时会停用。

## Inventory

### GET `/api/warehouses`

获取仓库列表。

### GET `/api/inventory`

获取库存余额、成本价和库存金额。

### GET `/api/movements`

获取最近 500 条库存流水。

## Documents

支持的单据类型：

- `purchase_in`: 采购入库，增加库存
- `purchase_return`: 采购退货，减少库存
- `sale_out`: 销售出库，减少库存
- `sale_return`: 销售退货，增加库存

### GET `/api/documents`

获取业务单据列表。

可选参数：

- `doc_type`: 单据类型

### POST `/api/documents`

创建单据并更新库存。

```json
{
  "doc_type": "sale_out",
  "partner_id": 1,
  "warehouse_id": 1,
  "operator": "admin",
  "department": "",
  "discount_rate": 0,
  "paid_amount": 0,
  "remark": "",
  "items": [
    {
      "product_id": 1,
      "quantity": 2,
      "unit_price": 15,
      "remark": ""
    }
  ]
}
```

### GET `/api/documents/{id}`

获取单据详情和明细。

### POST `/api/documents/{id}/void`

作废单据并反向冲回库存。

### DELETE `/api/documents/{id}`

删除单据。未作废单据会先反向冲回库存。

## Assistant

### GET `/api/assistant/search?q=关键词`

统一搜索商品、客户、供应商、单据和库存。

### GET `/api/assistant/summary`

获取库存分类、低库存、单据金额和未分类商品摘要。

### POST `/api/assistant/products/category`

批量设置商品分类。

```json
{
  "ids": [1, 2, 3],
  "category": "食品"
}
```

## Backup

### POST `/api/backup`

复制当前 SQLite 数据库到 `backups/` 目录。

## Print Template

### GET `/api/print-template`

读取打印模板 HTML。

### POST `/api/print-template`

保存打印模板 HTML。

```json
{
  "content": "<html>...</html>"
}
```
