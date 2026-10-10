# AURIUS API 说明

统一响应结构：

```json
{ "success": true, "message": "", "data": {} }
```

错误：

```json
{ "success": false, "message": "Permission denied", "errors": [] }
```

认证：登录后返回 `accessToken`，前端通过 `Authorization: Bearer <token>` 传递；
刷新令牌通过 httpOnly Cookie `aurius_refresh`（path `/api/auth`）管理。

---

## 认证 Auth

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/api/auth/login` | 登录（body: email, password） |
| POST | `/api/auth/refresh` | 刷新 access token |
| POST | `/api/auth/logout` | 退出 |
| GET | `/api/auth/me` | 当前用户信息 |
| POST | `/api/auth/forgot-password` | 忘记密码 |
| POST | `/api/auth/reset-password` | 重置密码（body: token, password, confirmPassword） |
| POST | `/api/auth/change-password` | 修改密码（需登录） |

## 注册 Registration

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/api/applications` | 提交 VIP/Trade 注册申请（多字段，见注册表单） |
| POST | `/api/applications/resubmit` | 驳回/补充后重新提交 |
| GET | `/api/applications/me` | 我的申请状态 |
| POST | `/api/applications/me/licence-file` | 上传执照文件（multipart `file`） |
| GET | `/api/applications/me/licence` | 我的执照信息 |

## 商品 Products / 价格 Prices

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/products` | 商品列表（`category`/`search`/`page`/`pageSize`；按登录者角色注入自身价格） |
| GET | `/api/products/categories` | 分类列表 |
| GET | `/api/products/:id` | 商品详情 |

价格安全：价格接口**从不**接受客户端指定等级；后端根据已验证 JWT 的角色推导唯一价格等级。

### 商品选项

`GET /api/products` 和 `GET /api/products/:id` 会额外返回仅包含有效选项的
`variants` 数组：

```json
{
  "id": 12,
  "name": "900 mm / Graphite",
  "attributes": { "length": "900 mm", "colour": "Graphite" },
  "stock": 8
}
```

该数组不会暴露选项价格调整额或其他会员等级价格。

## 购物车 Cart

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/cart` | 购物车（价格服务端重算） |
| POST | `/api/cart` | 加入（`productId`, `quantity`, 可选 `variantId`） |
| PUT | `/api/cart/:itemId` | 修改数量 |
| DELETE | `/api/cart/:itemId` | 删除单项 |
| DELETE | `/api/cart` | 清空 |

传入 `variantId` 时，服务端会验证该选项属于请求的有效商品、选项本身有效，并在选项设置了数值库存时检查库存。价格始终由当前登录会员的角色基础价加上服务端保存的选项调整额重新计算。

## 订单 Orders

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/shipping-methods` | 物流方式 |
| POST | `/api/orders` | 结算下单（服务端重算价格/库存） |
| GET | `/api/orders` | 我的订单（分页/筛选） |
| GET | `/api/orders/:id` | 订单详情 |
| POST | `/api/orders/:id/cancel` | 取消未支付订单 |
| GET | `/api/orders/:id/payment-options` | 支付方式与银行信息 |
| POST | `/api/orders/:id/pay` | 选择支付（method: PAYPAL/CREDIT_CARD/BANK_TRANSFER/SANDBOX） |
| POST | `/api/orders/:id/bank-receipt` | 上传银行转账凭证 |
| GET | `/api/payments/paypal/return/:id` | PayPal 回调 |
| POST | `/api/payments/stripe/webhook` | Stripe webhook |

## 业绩 / 推荐 / 安装 Performance

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/performance` | 我的业绩 |
| GET | `/api/referrals` | 我的推荐销售 |
| POST | `/api/installations` | 报备安装 |
| GET | `/api/installations` | 我的安装记录 |

## 会员中心 Member

| 方法 | 路径 | 说明 |
|---|---|---|
| GET/PUT | `/api/profile` | 个人资料 |
| GET/POST | `/api/addresses` | 收货地址 |
| DELETE | `/api/addresses/:id` | 删除地址 |
| GET | `/api/downloads` | 下载专区列表 |
| GET | `/api/downloads/:id/file` | 下载文件（鉴权） |

## 后台 Admin（需 ADMIN 角色）

### 看板与审核

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/admin/dashboard` | 数据看板 |
| GET | `/api/admin/applications` | 申请列表 |
| GET | `/api/admin/applications/:id` | 申请详情 |
| POST | `/api/admin/applications/:id/review` | 审核（APPROVE/REJECT/REQUEST_MORE_INFO/FREEZE） |
| POST | `/api/admin/applications/:id/abn-check` | ABN 核验（VERIFY_ABR/MANUAL/REJECT） |

### 会员

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/admin/members` | 会员总表 |
| GET | `/api/admin/members/export` | 导出 Excel |
| GET | `/api/admin/members/:id` | 会员详情 |
| POST | `/api/admin/members/:id/status` | 冻结/解冻/暂停 |
| POST | `/api/admin/members/:id/role` | 变更角色 |

### 商品与价格

| 方法 | 路径 | 说明 |
|---|---|---|
| GET/POST | `/api/admin/products` | 商品列表/新增 |
| PUT | `/api/admin/products/:id` | 修改商品 |
| DELETE | `/api/admin/products/:id` | 软删除商品（归档） |
| DELETE | `/api/admin/products/:id/permanent` | 永久删除已归档且没有订单记录的商品 |
| PUT | `/api/admin/products/reorder` | 交换两个商品的展示顺序（`id`/`targetId`） |
| POST | `/api/admin/products/images` | 上传商品图 |
| GET/POST | `/api/admin/price-rules` | 价格规则 |
| PUT/DELETE | `/api/admin/price-rules/:id` | 修改/停用规则 |

### 订单 / 支付 / 物流

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/admin/orders` | 订单流水 |
| GET | `/api/admin/orders/export` | 导出 Excel |
| GET | `/api/admin/orders/:id` | 订单详情 |
| POST | `/api/admin/orders/:id/ship` | 发货 |
| POST | `/api/admin/orders/:id/deliver` | 标记送达 |
| POST | `/api/admin/orders/:id/refund` | 退款（生成业绩调整） |
| GET | `/api/admin/payments` | 支付流水 |
| POST | `/api/admin/receipts/:receiptId/verify` | 审核银行凭证 |

### 业绩 / 安装 / 推荐 / 下载 / 日志 / 设置

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/admin/performance` | 业绩看板（groupBy 多维） |
| GET | `/api/admin/performance/export` | 导出 Excel/PDF |
| GET | `/api/admin/installations` | 安装记录 |
| POST | `/api/admin/installations/:id/confirm` | 确认安装 |
| GET | `/api/admin/referrals` | 推荐记录 |
| GET/POST | `/api/admin/downloads` | 下载专区管理 |
| PUT/DELETE | `/api/admin/downloads/:id` | 修改/归档 |
| GET | `/api/admin/email-logs` | 邮件日志 |
| GET | `/api/admin/audit-logs` | 操作日志 |
| GET | `/api/admin/security-logs` | 安全告警 |
| GET/PUT | `/api/admin/settings` | 系统设置 |

## 公共

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/config` | 前端配置（reCAPTCHA/支付可用性） |
| POST | `/api/contact` | 联系表单 |
| GET | `/api/company-info` | 公司联系信息 |
| GET | `/health` | 健康检查 |
