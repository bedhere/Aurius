# AURIUS 官网及 B2B 经销商系统

AURIUS（澳瑞斯）官网 + VIP 持证技师系统 + Trade 经销商/合作伙伴 B2B 系统 + 后台管理系统。

> "Australia Quality" brings you the finest premium experience!

品牌：澳洲高端卫浴品牌，主打 **智能马桶（Smart Toilet）** 与 **全屋净水（Whole-House Water Filtration）**。

---

## 技术架构

| 层 | 技术 | 说明 |
|---|---|---|
| 前端 | React 18 + TypeScript + Vite + React Router | 官网 / 会员中心 / 后台 |
| 后端 | Node.js + Express + TypeScript（tsx 运行） | REST API |
| 数据库 | Prisma 6 + SQLite（`DATABASE_URL` 可切换 MySQL/PostgreSQL） | 迁移 + Seed |
| 认证 | JWT（access 2h + refresh 7d httpOnly Cookie）+ bcrypt | 统一账号体系 |
| 敏感字段 | AES-256-GCM 加密（ABN / 执照号 / 电话） | 可恢复加密 |
| 支付 | PayPal / Stripe Adapter（env 驱动）+ Bank Transfer + Sandbox | 不保存卡号/CVV |
| 邮件 | Nodemailer（SMTP env）+ 开发模式日志 | 统一 Mail Service |
| 导出 | `xlsx`（Excel）+ `pdfkit`（PDF） | 后台台账导出 |
| 测试 | Vitest + Supertest | 核心业务自动化测试 |

品牌主色：青色 `#0DA19E`。

---

## 商品目录与选项

- Seed 商品覆盖智能马桶、马桶盖、全屋净水、滤芯和工程定制地漏。
- 商品媒体使用 `uploads/products/` 中的本地位图，不再生成文字型 SVG 占位商品图。
- 支持商品选项。前端只提交 `variantId`，后端确认选项归属于有效商品，并仅在服务端将选项调整额加入当前会员角色对应的基础采购价。
- 购物车和订单会保存选项名称、属性快照。所有商品均校验总库存；仅设置了数值库存的选项才额外校验和锁定选项库存。

---

## 目录结构

```
AURIUS/
├─ frontend/            # React 前端
│  └─ src/
│     ├─ pages/         # public / auth / member / admin 页面
│     ├─ components/    # Header / Footer / 通用 UI
│     ├─ layouts/       # PublicLayout / MemberLayout / AdminLayout
│     ├─ router/        # (App.tsx 内路由)
│     ├─ api/           # client.ts + types.ts
│     ├─ context/       # AuthContext
│     ├─ i18n/          # 文案常量
│     ├─ utils/         # 格式化工具
│     └─ assets/styles/ # 设计系统 CSS
├─ backend/             # Express 后端
│  └─ src/
│     ├─ controllers/   # 控制器
│     ├─ services/      # 业务服务
│     ├─ middleware/    # 鉴权 / 校验 / 上传 / 限流
│     ├─ routes/        # 路由
│     ├─ validators/    # Zod 校验
│     ├─ jobs/          # (预留)
│     ├─ mail/          # 邮件模板
│     └─ lib/           # Prisma / 加密 / 响应 / 错误处理
├─ database/
│  ├─ schema/schema.prisma  # 数据模型（含 migrations/）
│  └─ seeds/seed.ts         # 开发 Seed
├─ uploads/             # 上传文件（产品图 / 执照 / 凭证 / 资料）
├─ docs/                # database.md / api.md / business-flow.md
├─ scripts/             # create-admin.ts / e2e-check.ts
├─ .env.example
└─ README.md
```

---

## 环境要求

- Node.js ≥ 20（开发环境验证：v24）
- npm ≥ 10

---

## 快速开始

```bash
# 1. 安装依赖（根目录 workspaces）
npm install

# 2. 配置环境变量
cp .env.example backend/.env   # 填写 JWT_SECRET / AES_KEY 等（开发可先用默认）

# 3. 初始化数据库（迁移 + 生成 Prisma Client）
cd backend
npx prisma migrate dev --schema ../database/schema/schema.prisma

# 4. 写入开发 Seed（管理员 + 测试账号 + 产品 + 资料）
npx tsx ../database/seeds/seed.ts

# 5. 启动后端（端口 4000）
npx tsx src/index.ts

# 6. 启动前端（端口 5173，自动代理 /api）
cd ../frontend
npm run dev
```

访问 `http://localhost:5173`。

> 一键启动（Windows PowerShell）：在项目根目录运行
> `powershell -ExecutionPolicy Bypass -File scripts/start.ps1`（停止：`scripts/stop.ps1`）。
> 或手动分别启动 backend 与 frontend（见上）。

---

## 数据库初始化 / Migration / Seed

- **Schema**：`database/schema/schema.prisma`
- **Migration**：`database/schema/migrations/`（`prisma migrate dev/deploy` 自动生成）
- **Seed**：`database/seeds/seed.ts` —— 清空并重建开发数据

```bash
cd backend
npx prisma migrate dev --name <name> --schema ../database/schema/schema.prisma
npx tsx ../database/seeds/seed.ts
```

---

## 环境变量

完整清单见 `.env.example`。关键项：

| 变量 | 说明 |
|---|---|
| `DATABASE_URL` | 数据库连接串（SQLite：`file:./dev.db`） |
| `JWT_SECRET` | JWT 签名密钥 |
| `AES_KEY` | AES-256 加密密钥（64 位 hex） |
| `SMTP_HOST/PORT/USER/PASSWORD` | 邮件服务器（留空则进入开发日志模式） |
| `ADMIN_EMAIL` | 后台运营邮箱 |
| `PAYPAL_CLIENT_ID/SECRET` | PayPal（留空禁用） |
| `STRIPE_SECRET_KEY` | Stripe 信用卡网关（留空禁用） |
| `RECAPTCHA_SITE_KEY/SECRET_KEY` | reCAPTCHA v2（留空则跳过） |
| `ABR_API_KEY/ABR_GUID` | 澳洲 ABN 官方核验（留空则人工核验） |
| `SANDBOX_PAYMENTS_ENABLED` | 本地沙箱支付（仅开发） |
| `UPLOAD_PATH` | 上传目录 |

---

## 初始化管理员

管理员密码不硬编码，通过环境变量安全初始化：

```bash
# PowerShell
$env:CREATE_ADMIN_PASSWORD="YourStrongPass123!"
# 或 cmd
set CREATE_ADMIN_PASSWORD=YourStrongPass123!

cd backend
npx tsx ../scripts/create-admin.ts
```

管理员邮箱来自 `ADMIN_EMAIL`（默认 `admin@aurius.com.au`）。

---

## 测试账号（仅开发 Seed）

| 角色 | 邮箱 | 密码 |
|---|---|---|
| 管理员 | `admin@aurius.com.au` | `Admin@1234` |
| 一级总代理 | `agent@aurius-demo.com.au` | `Demo@1234` |
| 持证水工 | `plumber@aurius-demo.com.au` | `Demo@1234` |
| 持证电工 | `electrician@aurius-demo.com.au` | `Demo@1234` |
| 二级分销商 | `subdealer@aurius-demo.com.au` | `Demo@1234` |
| 待审核 | `pending@aurius-demo.com.au` | `Demo@1234` |

---

## 测试方法

```bash
# 后端单元/集成测试（27 项）
cd backend
npm test

# 端到端业务验收（60 项，需后端已运行在 4000）
npx tsx ../scripts/e2e-check.ts
```

覆盖：注册校验、审核流程、会员 ID 生成与唯一性、三级价格隔离、服务端价格重算、
订单/库存校验、业绩计入口径、退款扣减与调整记录、推荐销售、下载权限、导出等。

---

## 第三方接口配置

| 服务 | 说明 |
|---|---|
| ABR API | 配置 `ABR_API_KEY/ABR_GUID` 后启用官方 ABN 核验；否则后台提供人工核验 |
| PayPal | 配置 `PAYPAL_CLIENT_ID/SECRET` 后前端显示 PayPal 入口 |
| Stripe | 配置 `STRIPE_SECRET_KEY/WEBHOOK_SECRET` 后启用信用卡 |
| SMTP | 配置后发送真实邮件；否则进入开发日志模式（`uploads/_devmail/`） |
| reCAPTCHA | 配置后注册页渲染 Google reCAPTCHA v2 |

所有密钥均通过 `.env` 读取，代码中无硬编码生产密钥。

---

## 生产部署建议

1. `NODE_ENV=production`，`DATABASE_URL` 切换为 MySQL/PostgreSQL。
2. 运行 `npx prisma migrate deploy`，前端 `npm run build` 后由 Nginx 静态托管。
3. 配置真实 SMTP / PayPal / Stripe / reCAPTCHA / ABR 密钥。
4. 在入口层（Cloudflare / AWS WAF）加 WAF 与更细粒度限流。
5. 使用 HTTPS，`JWT_SECRET` / `AES_KEY` 使用强随机值。
6. 后端仅放行 `FRONTEND_URL` 来源的 CORS。

---

## 文档

- `docs/database.md` — 数据库表结构与关系
- `docs/api.md` — API 接口说明
- `docs/business-flow.md` — 业务流程图
