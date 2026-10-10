# AURIUS 数据库设计说明

> 数据库模型定义于 `database/schema/schema.prisma`，通过 Prisma Migrate 管理。
> 本项目甲方资料中未提供现成的 SQL/CDR 数据库文件（目录内的 `.cdr` 均为 CorelDRAW
> 设计源文件），因此数据模型依据需求文档（第三~七十五节）从零建模，并采用
> 软删除（status/archive）保证业务数据长期可追溯、不做物理删除。

## 技术说明

- 数据库：SQLite（开发默认），`DATABASE_URL` 可切换 MySQL/PostgreSQL。
- ORM：Prisma 6。
- 敏感字段（ABN、执照号、电话）使用 AES-256-GCM 加密后存储（见 `backend/src/lib/crypto.ts`）。
- 密码使用 bcrypt 单向哈希，绝不使用 AES 保存密码。

## 枚举

| 枚举 | 值 |
|---|---|
| `AccountStatus` | PENDING_REVIEW / ACTIVE / REJECTED / MORE_INFO_REQUIRED / FROZEN / SUSPENDED |
| `UserRole` | ADMIN / REGIONAL_AGENT / LICENSED_TRADESMAN / SUB_DEALER |
| `TradeType` | LICENSED_PLUMPER / LICENSED_ELECTRICIAN / NOT_APPLICABLE |
| `LicenceType` | INDIVIDUAL / COMPANY |
| `ApplicationChannel` | VIP / TRADE |
| `ApplicationStatus` | SUBMITTED / UNDER_REVIEW / APPROVED / REJECTED / MORE_INFO_REQUIRED / WITHDRAWN |
| `VerificationStatus` | UNVERIFIED / PENDING / VERIFIED / FAILED / NOT_APPLICABLE |
| `OrderStatus` | PENDING_PAYMENT / PAYMENT_PROCESSING / PAID / PREPARING / SHIPPED / DELIVERED / CANCELLED / REFUNDED / AFTER_SALES |
| `PaymentStatus` | UNPAID / PROCESSING / PAID / REFUNDED / CLOSED |
| `ShipmentStatus` | PENDING / SHIPPED / DELIVERED / RETURNED |
| `PaymentMethod` / `PaymentProvider` | PAYPAL / CREDIT_CARD / BANK_TRANSFER / SANDBOX |
| `AdjustmentType` | REFUND / MANUAL_CORRECTION / ORDER_CANCELLATION / OTHER |
| `DownloadCategory` | WATERMARK_CERTIFICATION / PRODUCT_CATALOGUE / INSTALLATION_DRAWINGS / INSTALLATION_GUIDE / DEALER_CONTRACT_TEMPLATE / TECHNICAL_DOCUMENTS / OTHER |

## 表清单

### 账号与认证

| 表 | 作用 | 关键字段 |
|---|---|---|
| `User` | 统一账号 | email(唯一)、passwordHash、accountStatus、role、memberLevel、failedLogins、lockedUntil、lastLoginAt |
| `RefreshToken` | 刷新令牌 | tokenHash、expiresAt、revokedAt |
| `PasswordResetToken` | 密码重置 | tokenHash、expiresAt、usedAt |

### 申请与会员

| 表 | 作用 | 关键字段 |
|---|---|---|
| `PartnerApplication` | VIP/Trade 注册申请 | channel、applicationNo、tradeType、state、licenceType、licenceNumber(加密)、abnNumber(加密)、yearsExperience、smartToiletExp、waterPurifExp、businessInterest、privacyConsent/dealerAgreement/marketingConsent、status、rejectReason、requestedInfo |
| `ApplicationReviewLog` | 审核记录 | reviewerId、previousStatus、newStatus、reviewNotes、action、ip |
| `MemberProfile` | 会员资料（含业绩缓存） | firstName、companyName、state、totalSales、totalOrders、monthSales、yearSales、totalInstalledUnits |
| `MemberId` | 唯一永久会员 ID | aurId(唯一)、prefix(AUR-DE/TR/SD)、year、sequence |
| `Licence` | 执照记录 | tradeType、licenceType、licenceNumber(加密)、filePath、verificationStatus |
| `VerificationRecord` | ABN/执照核验记录 | targetType、method、result、verifiedBy、notes |

### 商品与价格

| 表 | 作用 | 关键字段 |
|---|---|---|
| `Product` | 商品 | productCode、sku、name、category、model、description、images(JSON)、stock、status |
| `ProductVariant` | 商品可选配置 | productId、skuSuffix、name、attributes(JSON string)、priceAdjustment、stock（null 表示不单独限库存）、status、sortOrder |
| `ProductPrice` | 三级价格 | level1Price、level2Price、level3Price、rrp |
| `PriceChangeLog` | 价格变更历史 | field、oldValue、newValue、changedBy、reason |
| `RegionalPriceRule` | 区域/阶梯价格规则 | type(REGIONAL_DISCOUNT/VOLUME_DISCOUNT/REMOTE_AREA_SURCHARGE)、state、minQuantity、maxQuantity、percentValue |

### 交易

| 表 | 作用 | 关键字段 |
|---|---|---|
| `ShoppingCart` / `CartItem` | 购物车 | status、productId、variantId、variantName、variantAttributes、quantity、unitPrice(快照) |
| `Order` | 订单 | orderNumber(唯一)、memberAurId、priceLevel、subtotal/discount/shippingFee/total、status/paymentStatus/shipmentStatus、shipping*、referralTechId/Email |
| `OrderItem` | 订单明细 | productId、productName、sku、variantId、variantName、variantAttributes、quantity、unitPrice(锁定)、lineTotal |
| `OrderStatusHistory` | 状态历史 | fromStatus、toStatus、note、changedBy |
| `Payment` | 支付 | method、provider、amount、status、gatewayStatus、transactionId、reference、refundedAmount |
| `BankTransferReceipt` | 银行转账凭证 | filePath、status(PENDING_REVIEW/VERIFIED/REJECTED)、verifiedBy |
| `Shipment` | 物流 | carrier、trackingNumber、trackingUrl、status |

### 业绩 / 推荐 / 安装

| 表 | 作用 | 关键字段 |
|---|---|---|
| `PerformanceRecord` | 业绩快照（仅已支付订单） | orderId(唯一)、salesAmount、creditedAt、status |
| `PerformanceAdjustment` | 业绩调整记录 | performanceId、type、originalAmount、adjustedAmount、resultingAmount、reason、adjustedBy |
| `ReferralSale` | 推荐销售 | orderId(唯一)、referralTechId/Email、technicianUserId、orderAmount、status |
| `InstallationRecord` | 安装报备 | technicianAurId、productId、productName、serialNumber、status(REPORTED/CONFIRMED) |

### 下载 / 日志 / 设置

| 表 | 作用 | 关键字段 |
|---|---|---|
| `DownloadFile` | 下载专区资料 | category、filePath、allowedRoles(逗号分隔)、status |
| `DownloadAccessLog` | 下载访问日志 | fileId、userId、aurId、ip |
| `ShippingAddress` | 收货地址 | label、contactName、isDefault |
| `EmailLog` | 邮件日志 | recipient、subject、template、status、errorMessage |
| `AuditLog` | 操作审计 | action、targetType/targetId、details(JSON)、ip |
| `SecurityLog` | 安全告警 | level、eventType、details、ip、userId |
| `SystemSetting` | 系统设置 | key(唯一)、value(JSON) |
| `SequenceCounter` | 业务编号计数器 | key(如 AUR-TR:2026)、value |

## 核心关系

```
User
 ├─ PartnerApplication (1:1)
 ├─ MemberProfile (1:1)
 ├─ MemberId (1:1)          → AUR-XX-YYYYXXXXXX
 ├─ Licence (1:N)
 └─ Orders (1:N)
      ├─ OrderItems (1:N)
      ├─ Payments (1:N)
      │    └─ BankTransferReceipt (1:N)
      ├─ Shipment (1:1)
      ├─ OrderStatusHistory (1:N)
      ├─ PerformanceRecord (1:1)
      │    └─ PerformanceAdjustment (1:N)
      └─ ReferralSale (1:1)
```

所有关键业务均通过 `MemberId.aurId` 追溯。

## 会员 ID 规则

| 角色 | 前缀 | 价格等级 |
|---|---|---|
| 一级区域总代理 REGIONAL_AGENT | `AUR-DE-YYYYXXXXXX` | Level 1 |
| 持证水工/电工 LICENSED_TRADESMAN | `AUR-TR-YYYYXXXXXX` | Level 2 |
| 二级分销商 SUB_DEALER | `AUR-SD-YYYYXXXXXX` | Level 3 |

- YYYY = 年份，XXXXXX = 6 位流水号（按 prefix+year 独立计数）。
- 订单号：`AUR-ORD-YYYYMMDD-XXXXXX`；申请号：`APP-YYYYMMDD-XXXXXX`。

## 新增字段说明

因甲方未提供现成数据库，本次所有表均为按需求新建。若后续接入甲方既有 CDR 数据库，
应保持表名/字段名映射（本 schema 字段名已尽量采用需求文档术语），通过 Migration
增量扩展，不破坏既有主键与外键。
