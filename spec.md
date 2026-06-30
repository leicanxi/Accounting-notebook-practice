# 糖豆人记账游戏 (SugarRunner Expense) - 技术设计文档

---

## 一、技术选型

### 1.1 整体架构

```
┌─────────────────────────────────────────────────┐
│                    浏览器 (前端)                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────┐ │
│  │ 登录/注册 │ │ 游戏界面  │ │  侧边面板(账单/  │ │
│  │ (DOM)    │ │ (Canvas) │ │   统计/设置)(DOM) │ │
│  └────┬─────┘ └────┬─────┘ └────────┬─────────┘ │
│       └────────────┴────────────────┘            │
│                      │ HTTP/JSON                  │
└──────────────────────┼───────────────────────────┘
                       │
┌──────────────────────┼───────────────────────────┐
│               Node.js 后端服务                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────┐ │
│  │ 认证模块  │ │ 账单模块  │ │  分类/统计/设置  │ │
│  │ (JWT)    │ │          │ │                  │ │
│  └────┬─────┘ └────┬─────┘ └────────┬─────────┘ │
│       └────────────┴────────────────┘            │
│                      │                            │
│              ┌───────┴───────┐                    │
│              │    SQLite     │                    │
│              └───────────────┘                    │
└──────────────────────────────────────────────────┘
```

### 1.2 技术栈明细

| 层级 | 技术 | 版本 | 选型理由 |
| --- | --- | --- | --- |
| **前端语言** | HTML5 + CSS3 + JavaScript (ES6+) | — | 无框架依赖，游戏交互对 DOM 操作需求少，Canvas 原生 API 足够 |
| **游戏渲染** | Canvas 2D API + requestAnimationFrame | 浏览器内置 | 糖豆人移动、小球动画、星星特效等需要逐帧渲染，Canvas 性能最优 |
| **HTTP 请求** | Fetch API | 浏览器内置 | 轻量，无需引入 axios 等第三方库 |
| **前端路由** | Hash 路由（手写，约 50 行） | — | 仅 3 个页面（登录/游戏主界面/账单详情），无需引入完整路由库 |
| **饼图** | Canvas 2D 手绘 | — | 饼图逻辑简单（arc + fill），避免引入 ECharts 等重型库 |
| **前端部署** | 纯静态文件，Express 托管 | — | 无构建工具，HTML/CSS/JS 直接部署 |
| **后端运行时** | Node.js | v18 LTS+ | 生态成熟，npm 包丰富，JavaScript 前后端统一语言 |
| **后端框架** | Express.js | 4.x | 轻量、灵活，适合中小型 API 服务 |
| **数据库** | SQLite | 3.x | 轻量零配置，单文件存储，无需单独数据库进程，适合个人项目 |
| **SQLite 驱动** | better-sqlite3 | 11.x | 同步 API 简单直观，性能优于异步驱动，适合 Express 同步处理模型 |
| **密码加密** | bcrypt | 5.x | 行业标准，salt 自动管理 |
| **身份认证** | JWT (jsonwebtoken) | 9.x | 无状态认证，前端存 localStorage，每次请求带 Authorization header |
| **邮件服务** | nodemailer + QQ邮箱 SMTP | 6.x | 发送验证码邮件，使用 QQ 邮箱授权码认证 |
| **数据导出** | CSV 字符串拼接（手写） | — | 导出格式简单，无需第三方库 |
| **开发工具** | nodemon | 3.x | 开发时热重载 |

---

## 二、系统架构

### 2.0 关键设计决策（已确认）

| 决策项 | 决定 |
| --- | --- |
| 邮件服务 | QQ 邮箱 SMTP（`smtp.qq.com:465`），用户提供授权码，配置于 `.env` |
| 前端部署 | 纯静态文件，Express 托管 `client/` 目录，无构建工具 |
| 游戏 Canvas | 全屏自适应（`window.innerWidth × window.innerHeight`），resize 时重新计算 |
| 数据库路径 | `data/sugarrunner.db`（项目根目录下，`.gitignore`） |
| 多币种策略 | 内置固定汇率表（2026 年参考值），统一 CNY 存储 + 前端按汇率换算显示，后续可升级 API |
| 代码规范 | 不配置 ESLint/Prettier |
| 糖豆人素材 | 用户提供 SVG 素材，Canvas 绘制时加载渲染，降低手绘复杂度 |
| 右上角余额 | **年度累计花费**，每笔支出累加，不设置预算上限 |
| 统计粒度 | 同时支持本周和本月统计，侧边面板 Tab 切换 |
| 收入记账 | 采用**金色特殊小球**交互，点击后直接记录为收入 |
| 金额输入 | 快捷金额按钮 + 自定义金额输入框并存 |
| 预算/预警 | 暂不实现，后续迭代考虑 |
| 撤销/音效/导入/同步 | 暂不实现 |

### 2.1 前端架构

```
前端 (SPA)
├── index.html              # 入口 HTML，含 Canvas + DOM 容器
├── css/
│   └── style.css           # 全局样式（暖色渐变、圆角、毛玻璃、字体）
├── js/
│   ├── app.js              # 入口：路由分发、JWT 管理、全局状态
│   ├── api.js              # HTTP 请求封装（fetch + Authorization header）
│   ├── router.js           # Hash 路由（#/login, #/game）
│   ├── pages/
│   │   ├── login.js        # 登录/注册/验证码页面渲染与交互
│   │   └── game.js         # 游戏主界面初始化
│   ├── game/
│   │   ├── character.js    # 糖豆人角色：SVG加载、移动、状态机
│   │   ├── ball.js         # 小球：绘制、状态、配置面板触发（含金色收入小球）
│   │   ├── panel.js        # 配置面板：分类选择、金额选择(快捷+自定义)、确认
│   │   ├── animation.js    # 进食动画：飞行、爆炸星星、打嗝
│   │   ├── spawner.js      # 小球生成器：随机位置、颜色、补充逻辑、避开糖豆人
│   │   └── loop.js         # 游戏主循环：requestAnimationFrame 调度 + deltaTime
│   ├── sidebar/
│   │   ├── sidebar.js      # 侧边面板：打开/关闭、Tab 切换
│   │   ├── bills.js        # 账单列表（今日/本周/本月）
│   │   ├── stats.js        # 统计页：Cavnas 饼图渲染、时间轴、环比信息
│   │   └── settings.js     # 设置页：导出、分类管理(图标选择)、币种、清空
│   └── utils/
│       ├── currency.js     # 币种符号映射与格式化
│       └── validators.js   # 邮箱格式、密码强度、金额上限校验
├── assets/
│   └── sugar_runner.svg    # 糖豆人 SVG 素材
```

### 2.2 后端架构

```
后端 (Express)
├── server.js               # 入口：Express 初始化、中间件、路由挂载
├── config.js               # 配置：JWT_SECRET、QQ SMTP(授权码)、端口、数据库路径
├── db/
│   ├── database.js         # SQLite 连接初始化 + WAL 模式
│   ├── schema.sql          # 建表语句
│   └── seed.js             # 预设分类数据
├── middleware/
│   └── auth.js             # JWT 验证中间件
├── routes/
│   ├── auth.js             # 注册、登录、验证码、密码重置
│   ├── bills.js            # 账单 CRUD
│   ├── categories.js       # 分类 CRUD
│   ├── stats.js            # 统计数据查询
│   └── settings.js         # 导出、清空、注销
├── services/
│   ├── email.js            # 验证码邮件发送
│   ├── captcha.js          # 验证码生成、存储(内存+过期)、校验
│   └── export.js           # CSV 生成
└── utils/
    ├── hash.js             # bcrypt 封装
    └── token.js            # JWT 签发与验证

数据库文件: ./data/sugarrunner.db  (单文件，.gitignore)
```

---

## 三、数据库设计

### 3.1 ER 图

```
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│    users     │       │    bills     │       │  categories  │
├──────────────┤       ├──────────────┤       ├──────────────┤
│ id (PK)      │──1:N──│ user_id (FK) │       │ id (PK)      │
│ email        │       │ id (PK)      │       │ user_id (FK) │
│ password_hash│       │ category_id  │──N:1──│ name         │
│ currency     │       │  (FK)        │       │ icon         │
│ created_at   │       │ type         │       │ is_preset    │
│              │       │ amount       │       │ created_at   │
└──────────────┘       │ note         │       └──────────────┘
                       │ created_at   │
                       │ updated_at   │
                       └──────────────┘
```

### 3.2 建表语句

```sql
-- 用户表
CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    email         TEXT    NOT NULL UNIQUE,
    password_hash TEXT,              -- 验证码注册用户可为 NULL
    currency      TEXT    NOT NULL DEFAULT 'CNY',  -- 用户偏好币种
    created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- 分类表
CREATE TABLE IF NOT EXISTS categories (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id       INTEGER NOT NULL,
    name          TEXT    NOT NULL,       -- 分类名称
    icon          TEXT    NOT NULL DEFAULT '📦', -- emoji 图标
    is_preset     INTEGER NOT NULL DEFAULT 0,    -- 0=自定义, 1=预设
    created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, name)                 -- 同一用户下分类名唯一
);

-- 账单表
CREATE TABLE IF NOT EXISTS bills (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id       INTEGER NOT NULL,
    category_id   INTEGER NOT NULL,
    type          TEXT    NOT NULL DEFAULT 'expense', -- 'income' | 'expense'
    amount        REAL    NOT NULL CHECK(amount > 0),
    note          TEXT    DEFAULT '',
    created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at    TEXT    NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id)     REFERENCES users(id)     ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS idx_bills_user_date ON bills(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bills_category   ON bills(category_id);

-- 验证码表（仅存于内存，不落盘，此处记录结构供参考）
-- 字段: email, code, expires_at, type('register'|'login'|'reset')
-- 实现: Map<string, {code, expires, type}> 存于 Node.js 进程内存
```

### 3.3 预设分类数据（seed）

```sql
-- 新用户注册后，自动执行以下插入 (user_id 替换为实际值)
INSERT INTO categories (user_id, name, icon, is_preset) VALUES
    (?,'餐饮','🍔',1), ('?','交通','🚌',1), ('?','购物','🛒',1),
    ('?','娱乐','🎮',1), ('?','住房','🏠',1), ('?','收入','💰',1);
```

### 3.4 级联删除说明

| 操作 | 级联行为 |
| --- | --- |
| 删除用户（注销） | 自动删除该用户所有 bills、categories |
| 删除分类 | RESTRICT：若有关联账单则禁止删除，提示"该分类下有 N 笔账单，无法删除" |

---

## 四、API 设计

### 4.1 通用约定

| 项目 | 约定 |
| --- | --- |
| Base URL | `http://localhost:3000/api` |
| 请求格式 | `Content-Type: application/json` |
| 鉴权方式 | `Authorization: Bearer <JWT>` （除登录/注册/验证码外所有接口） |
| 成功响应 | `{ "code": 0, "data": {...} }` |
| 错误响应 | `{ "code": <错误码>, "message": "<描述>" }` |
| JWT 有效期 | 7 天 |

### 4.2 接口清单

#### 认证模块 `/api/auth`

| 方法 | 路径 | 说明 | 鉴权 | 
| --- | --- | --- | --- |
| POST | `/register` | 邮箱+密码注册 | 否 |
| POST | `/register/captcha` | 邮箱+验证码注册 | 否 |
| POST | `/login` | 邮箱+密码登录 | 否 |
| POST | `/login/captcha` | 邮箱+验证码登录（未注册自动创建） | 否 |
| POST | `/captcha/send` | 发送验证码 | 否 |
| POST | `/password/reset` | 重置密码（需验证码） | 否 |
| POST | `/logout` | 退出登录 | 是 |

**POST /register** 请求体：
```json
{ "email": "user@example.com", "password": "123456", "confirm_password": "123456" }
```
响应：`{ "code": 0, "data": { "token": "jwt...", "user": {"id":1,"email":"..."} } }`

**POST /captcha/send** 请求体：
```json
{ "email": "user@example.com", "type": "register|login|reset" }
```
限制：同一邮箱 60 秒内不可重复发送，同一 IP 单日上限 20 次

**POST /login/captcha** 请求体：
```json
{ "email": "user@example.com", "captcha": "123456" }
```
逻辑：查用户是否存在 → 不存在则自动创建（无密码） → 签发 JWT

#### 账单模块 `/api/bills`

| 方法 | 路径 | 说明 | 鉴权 |
| --- | --- | --- | --- |
| GET | `/` | 获取账单列表 | 是 |
| POST | `/` | 创建账单 | 是 |
| PUT | `/:id` | 编辑账单 | 是 |
| DELETE | `/:id` | 删除账单 | 是 |

**GET /api/bills** Query 参数：
| 参数 | 说明 | 默认值 |
| --- | --- | --- |
| `date` | 日期过滤，格式 `YYYY-MM-DD` | 今天 |
| `month` | 月份过滤，格式 `YYYY-MM` | 当月 |
| `category_id` | 分类过滤 | 全部 |
| `page` | 页码 | 1 |
| `page_size` | 每页条数 | 20 |

**POST /api/bills** 请求体：
```json
{ "category_id": 1, "type": "expense", "amount": 35.00, "note": "午餐" }
```

#### 分类模块 `/api/categories`

| 方法 | 路径 | 说明 | 鉴权 |
| --- | --- | --- | --- |
| GET | `/` | 获取用户全部分类 | 是 |
| POST | `/` | 添加自定义分类 | 是 |
| PUT | `/:id` | 编辑分类 | 是 |
| DELETE | `/:id` | 删除分类（RESTRICT） | 是 |

**POST /api/categories** 请求体：
```json
{ "name": "宠物", "icon": "🐱" }
```

#### 统计模块 `/api/stats`

| 方法 | 路径 | 说明 | 鉴权 |
| --- | --- | --- | --- |
| GET | `/summary` | 收支汇总（支持周/月） | 是 |
| GET | `/category-pie` | 分类支出饼图数据 | 是 |
| GET | `/timeline` | 消费趋势时间轴 | 是 |

**GET /api/stats/summary** Query: `period=2026-06&granularity=month` 或 `period=2026-W26&granularity=week`
响应：
```json
{ "code":0, "data": { "income_total":5000, "expense_total":3200, "balance":1800, "last_period_expense":2900, "change_percent":10.3 } }
```

**GET /api/stats/category-pie** Query: `month=2026-06`
响应：
```json
{ "code":0, "data": [
  {"category_name":"餐饮","icon":"🍔","total":960,"percent":30},
  {"category_name":"交通","icon":"🚌","total":384,"percent":12}
]}
```

**GET /api/stats/timeline** Query: `start=2026-01&end=2026-06&granularity=month`
响应：
```json
{ "code":0, "data": [
  {"period":"2026-01","expense":2800}, {"period":"2026-02","expense":3100}
]}
```

#### 设置模块 `/api/settings`

| 方法 | 路径 | 说明 | 鉴权 |
| --- | --- | --- | --- |
| POST | `/export` | 导出账单 CSV | 是 |
| POST | `/clear` | 清空所有数据 | 是 |
| POST | `/delete-account` | 注销账号 | 是 |

---

## 五、核心模块详细设计

### 5.1 Canvas 游戏渲染架构

```
┌──────────────────────────────────────────┐
│               Canvas (全屏)               │
│                                           │
│  渲染层:                                   │
│  1. 背景渐变 (每帧重绘)                    │
│  2. 彩色小球 (支出, z-index: 低)           │
│  3. 金色小球 (收入, z-index: 低, 特殊色)   │
│  4. 糖豆人 (z-index: 中, SVG素材渲染)      │
│  5. 星星粒子 (z-index: 高, 进食特效)       │
│  6. 年度余额 HUD (z-index: 顶层, 右上角)  │
│                                           │
│  事件层 (DOM 覆盖在 Canvas 之上):           │
│  - click 事件: 小球点击 / 糖豆人点击       │
│  - 彩色小球: 弹出毛玻璃配置面板            │
│  - 金色小球: 直接弹出金额面板(无分类选择)   │
│  - 侧边面板: DOM 元素, 右侧 transform     │
└──────────────────────────────────────────┘
```

### 5.2 糖豆人状态机

```
          ┌─────────┐
          │  IDLE   │ ← 空闲随机走动 (每 2-4 秒随机换方向)
          └────┬────┘
               │ 检测到已配置小球
               ▼
          ┌─────────┐
          │ MOVING  │ → 计算方向向量，平滑移动
          └────┬────┘
               │ 到达小球位置
               ▼
          ┌─────────┐
          │ EATING  │ → 0.3s 张嘴 → 0.5s 星星爆炸 → 0.2s 打嗝上跳
          └────┬────┘
               │ 动画结束，检查排队
               ▼
          ┌─────────┐
          │  IDLE   │ ← 若有排队小球则回到 MOVING
          └─────────┘
```

### 5.3 糖豆人绘制方案

使用用户提供的 SVG 素材 (`sugar_runner.svg`) 作为糖豆人形象。Canvas 加载 SVG 后通过 `drawImage()` 渲染。

**SVG 素材需求**：
- 尺寸：约 80x100px（可在 Canvas 中缩放）
- 至少包含两个变体：普通表情（微笑眨眼）和进食表情（嘴巴张大）
- 格式：SVG (矢量，Canvas 缩放不失真)

**实现方案**：
1. 页面初始化时将 SVG 预加载到 Image 对象
2. 游戏循环中根据角色状态（IDLE/EATING）切换绘制不同变体
3. `ctx.drawImage(sugarImg, x, y, w, h)` 绘制到 Canvas

> 若 SVG 素材未就绪，开发初期可用 Canvas 2D 几何图形（arc + roundRect）作为占位糖豆人，后续替换。

### 5.4 小球设计

#### 彩色小球（支出）

| 属性 | 说明 |
| --- | --- |
| 默认半径 | 25px |
| 配置后半径 | 32px |
| 颜色 | 随机从 6 种暖色调选取（#FF6B6B, #FFA94D, #FFD43B, #69DB7C, #74C0FC, #DA77F2） |
| 配置后颜色 | 原色加深 20%（HSL 调整 L 分量） |
| 金额显示 | 配置后小球中心绘制金额文字（白色，bold，16px） |
| 移动动画 | 进食时小球沿贝塞尔曲线飞向糖豆人 |

#### 金色小球（收入）

| 属性 | 说明 |
| --- | --- |
| 默认半径 | 25px |
| 配置后半径 | 32px |
| 颜色 | 固定金色（#FFD700）+ 光泽渐变效果 |
| 配置后颜色 | 深金色（#DAA520） |
| 交互 | 点击后弹出简化面板：仅金额选择（快捷+自定义）+ 确认按钮，无分类选择 |
| 生成规则 | 彩色小球中随机混入 0-2 个金色小球（约 20% 概率） |
| 金额显示 | 配置后小球中心绘制金额文字（深色，bold，16px） |

#### 配置面板交互

| 功能 | 描述 |
| --- | --- |
| 分类选择（仅彩色小球） | 一行分类图标，点击选中高亮 |
| 快捷金额 | 一行数字按钮（默认 10/20/50/100/200），点击选中高亮 |
| 自定义金额 | 快捷金额行末尾的输入框，用户可直接输入任意金额（>0 且 ≤999,999.99） |
| 收入面板（金色小球） | 无分类选择，仅快捷金额 + 自定义金额 + 确认 |
| 确认按钮 | 底部确认按钮，点击后配置生效、面板关闭；未选择时置灰 |

### 5.5 星星爆炸特效

```
进食完成后，糖豆人位置生成 12-16 个星星粒子:
  - 每个粒子: 随机方向 (0-360°), 随机速度 (80-200px/s)
  - 粒子形状: 五角星 (4px), 随机颜色 (金/橙/黄/白)
  - 生命周期: 0.6s, 渐隐 + 缩小
  - 使用粒子池复用，避免 GC
```

### 5.6 游戏主循环伪代码

```javascript
let balls = [];           // 小球数组
let configuredBalls = []; // 已配置待进食队列
let character = { x, y, state, targetBall };
let particles = [];       // 星星粒子池

function gameLoop(timestamp) {
    // 1. 清空画布 + 绘制暖色渐变背景
    clearCanvas();

    // 2. 更新逻辑
    updateCharacter(character, configuredBalls);  // 状态机驱动
    updateBalls(balls);                           // 检查是否需要补充
    updateParticles(particles);                   // 粒子生命周期衰减

    // 3. 渲染
    balls.forEach(b => b.draw(ctx));
    character.draw(ctx);
    particles.forEach(p => p.draw(ctx));
    drawHUD(ctx);  // 右上角年度花费（累计支出）

    // 4. 继续循环
    requestAnimationFrame(gameLoop);
}
```

### 5.7 前端路由设计

```
路由表:
  #/login          → 登录页（默认）
  #/register       → 注册页
  #/captcha-login  → 验证码登录页
  #/reset-password → 密码重置页
  #/game           → 游戏主界面（需登录）

路由守卫:
  - 访问 #/game 时检查 localStorage 是否有 JWT
  - 无 JWT → 重定向到 #/login
  - JWT 过期（API 返回 401）→ 清除 token → 重定向到 #/login
```

### 5.8 侧边面板与游戏联动

```
点击糖豆人 → 触发 panel.open():
  1. 暂停糖豆人移动（设置 character.paused = true）
  2. 从右侧 transform 滑入面板 DOM（宽度 min(480px, 40vw)）
  3. 面板内发起 API 请求加载账单数据
  4. 游戏 Canvas 继续渲染（不暂停），但糖豆人静止

关闭面板 → 触发 panel.close():
  1. 恢复 character.paused = false
  2. 面板 transform 滑出
```

### 5.9 登录过渡动画

登录成功后，糖豆人从登录页吉祥物位置跳跃过渡到游戏主界面：
1. 登录表单淡出
2. 糖豆人吉祥物放大 + 弹跳 2 次（约 0.8s）
3. Canvas 从透明渐入（0.4s）
4. 小球逐个弹出（stagger 动画，每个间隔 0.1s）

### 5.10 Canvas resize 处理

```
window resize → debounce 200ms →
  1. Canvas.width/height 重置为 window.innerWidth/Height
  2. 重算 HUD 位置（右上角固定偏移）
  3. 重算小球坐标（按比例缩放，保持相对位置）
  4. 切除屏幕外的小球坐标，补充不足 3 个时生成
  5. 糖豆人保持当前位置（不在屏幕边界外即可）
  6. 进行中的进食动画不受影响（仅重绘）
```

### 5.11 事件穿透处理

Canvas 层与 DOM 面板层的事件协调：
- Canvas 全局 click 事件 → 先做 hitTest（小球/糖豆人坐标检测）
- 若命中配置面板区域 → 调用 `e.stopPropagation()` → 面板层处理
- 若命中侧边面板区域 → 面板层处理，Canvas 层 ignore
- 若面板打开状态 → Canvas 小球点击仅关闭面板，不触发新配置面板

---

## 六、固定汇率表

统一以 CNY（人民币）存储，前端按以下固定汇率换算显示：

| 币种 | 代码 | 符号 | 对 CNY 汇率 | 
| --- | --- | --- | --- |
| 人民币 | CNY | ¥ | 1.00 |
| 美元 | USD | $ | 0.14 |
| 欧元 | EUR | € | 0.13 |
| 日元 | JPY | ¥ | 20.50 |
| 英镑 | GBP | £ | 0.11 |
| 港币 | HKD | HK$ | 1.09 |

换算逻辑：`显示金额 = CNY 存储金额 × 目标币种汇率`

示例：CNY 100 = USD 14.00 / EUR 13.00 / JPY 2,050 / GBP 11.00 / HKD 109.00

> **注**：汇率为 2026 年参考值，后续可升级为实时汇率 API。

---

## 七、安全设计

| 安全项 | 措施 |
| --- | --- |
| 密码存储 | bcrypt hash + salt（cost=10），不可逆 |
| JWT 签名 | HS256，服务端 `JWT_SECRET` 环境变量；启动时检测是否为默认值，若是则拒绝启动（生产模式） |
| SQL 注入 | better-sqlite3 使用参数化查询（`stmt.run(email, hash)`） |
| 验证码爆破 | 单邮箱 60s 内不可重发；单邮箱 5 次错误后锁定 15 分钟 |
| 越权访问 | 所有 API 通过 JWT 提取 `user_id`，查询时强制带 `WHERE user_id = ?` |
| CORS | 仅允许前端域名 |
| CSP | Express 配置 Content-Security-Policy header，限制 script-src 仅 `'self'` |
| 请求频率 | express-rate-limit：登录类接口 20次/分钟，通用接口 100次/分钟 |
| 请求体大小 | `express.json({ limit: '1mb' })`，防止大 payload 攻击 |
| 错误响应 | 自定义错误处理中间件，生产环境不暴露堆栈信息 |
| 生产部署 | 必须使用 HTTPS（Nginx 反向代理 + Let's Encrypt），API base URL 使用 https |
| `.env` 泄露 | `.gitignore` 已包含；错误响应/日志中不输出环境变量值 |
| JWT 存储 | localStorage 存储，配合 CSP header 降低 XSS 风险 |

---

## 八、边界条件与校验规则

### 8.1 输入校验

| 校验项 | 规则 | 说明 |
| --- | --- | --- |
| 邮箱格式 | `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` | 前端即时校验 + 后端校验 |
| 密码长度 | ≥ 6 位 | 前端即时校验 |
| 金额范围 | > 0 且 ≤ 999,999.99 | 前端自定义输入框限制 + 后端 CHECK 约束 |
| 分类名称长度 | ≤ 20 字符 | 前端 maxlength + 后端校验 |
| 账单备注长度 | ≤ 100 字符 | 前端 textarea maxlength + 后端校验 |
| 验证码格式 | 6 位数字 | 后端验证 |

### 8.2 服务端边界

| 异常场景 | 风险 | 处理方式 |
| --- | --- | --- |
| 服务重启后验证码丢失 | 用户收到邮件但无法验证 | 验证码错误时提示"验证码已过期，请重新获取"（统一提示，不暴露原因） |
| better-sqlite3 编译失败 | 项目无法启动 | README 注明需 Python 3.x + C++ 编译工具；Windows 需 `windows-build-tools` |
| 邮箱唯一性并发竞态 | 验证码登录自动创建时重复插入 | 依赖 `UNIQUE(email)` 约束，INSERT 失败时回退为查询已有用户并登录 |
| SQLite 并发写入 | 单用户操作不会高并发，风险低 | 使用 WAL 模式，单连接足够 |

### 8.3 前端边界

| 异常场景 | 处理方式 |
| --- | --- |
| localStorage 读写异常 | try-catch 包裹，失败时提示"浏览器存储不可用" |
| Canvas resize 时动画进行中 | debounce 200ms 后重算，粒子状态保持 |
| requestAnimationFrame 暂停 | 后台标签页暂停时使用 `deltaTime` 避免时间跳跃 |
| emoji 渲染不一致 | README 注明"建议使用 Chrome/Edge，emoji 显示效果最佳" |
| 小球全部被吃掉 | 自动补充逻辑已覆盖（<3 触发），生成时避开糖豆人位置（≥ 80px 距离） |
| 窗口过小 < 1024px | 显示顶部横幅提示，不阻断使用 |
| 后端 5xx 错误 | 前端统一展示"服务异常，请稍后重试"，不暴露后端细节 |

---

## 九、项目目录结构

```
sugarrunner-expense/
├── client/                     # 前端代码
│   ├── index.html
│   ├── css/
│   │   └── style.css
│   ├── js/
│   │   ├── app.js
│   │   ├── api.js
│   │   ├── router.js
│   │   ├── pages/
│   │   │   ├── login.js
│   │   │   └── game.js
│   │   ├── game/
│   │   │   ├── character.js
│   │   │   ├── ball.js
│   │   │   ├── panel.js
│   │   │   ├── animation.js
│   │   │   ├── spawner.js
│   │   │   └── loop.js
│   │   ├── sidebar/
│   │   │   ├── sidebar.js
│   │   │   ├── bills.js
│   │   │   ├── stats.js
│   │   │   └── settings.js
│   │   └── utils/
│   │       ├── currency.js
│   │       └── validators.js
│   └── assets/
├── server/                     # 后端代码
│   ├── server.js
│   ├── config.js
│   ├── db/
│   │   ├── database.js
│   │   ├── schema.sql
│   │   └── seed.js
│   ├── middleware/
│   │   └── auth.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── bills.js
│   │   ├── categories.js
│   │   ├── stats.js
│   │   └── settings.js
│   ├── services/
│   │   ├── email.js
│   │   ├── captcha.js
│   │   └── export.js
│   └── utils/
│       ├── hash.js
│       └── token.js
├── data/                       # SQLite 数据库文件 (gitignore)
├── package.json
├── .env                        # 环境变量 (gitignore)
├── .env.example                # 环境变量模板
├── .gitignore
└── README.md
```

---

## 十、实施计划

### 阶段划分（共 4 个阶段）

#### 阶段 0：项目基础设施（预计 0.5 天）

| 编号 | 任务 | 产出 |
| --- | --- | --- |
| T0-1 | 初始化项目：`npm init`，安装依赖 | `package.json` |
| T0-2 | 配置 `.env.example`、`.gitignore` | 配置文件 |
| T0-3 | 搭建 Express 骨架：`server.js` + `config.js` | 服务可启动 |
| T0-4 | SQLite 初始化：建表 `schema.sql` + 连接 `database.js` | 数据库就绪 |
| T0-5 | 预设分类种子脚本 `seed.js` | 新用户自动有 6 个分类 |
| T0-6 | 前端骨架：`index.html` + CSS 基础样式 + 暖色背景 | 页面可打开 |
| T0-7 | hash 路由 + JWT 守卫 | 未登录跳转登录页 |
| T0-8 | README 编写：Node.js 版本要求、better-sqlite3 编译前提、启动步骤 | 开发环境文档 |

#### 阶段 1：认证系统（预计 0.5 天）

| 编号 | 任务 | 产出 |
| --- | --- | --- |
| T1-1 | bcrypt 封装 `hash.js`，JWT 封装 `token.js` | 工具函数 |
| T1-2 | `POST /api/auth/register` — 邮箱+密码注册 | 可注册 |
| T1-3 | `POST /api/auth/login` — 邮箱+密码登录 | 可登录 |
| T1-4 | JWT 验证中间件 `auth.js` | 鉴权就绪 |
| T1-5 | 验证码服务：生成、存储(内存)、过期、发送(`services/captcha.js` + `email.js`) | 可发验证码 |
| T1-6 | `POST /api/auth/register/captcha` — 验证码注册 | 无密码注册 |
| T1-7 | `POST /api/auth/login/captcha` — 验证码登录(含自动注册) | 验证码登录 |
| T1-8 | `POST /api/auth/password/reset` — 密码重置 | 可重置密码 |
| T1-9 | 前端登录/注册/验证码页面 (`pages/login.js`) | 登录页可交互 |
| T1-10 | 前端 JWT 存储与 API 请求封装 (`api.js`) | 鉴权请求通 |

#### 阶段 2：游戏核心（预计 1.5 天）

| 编号 | 任务 | 产出 |
| --- | --- | --- |
| T2-1 | Canvas 初始化 + 暖色渐变背景渲染 (`loop.js`) | Canvas 画面 |
| T2-2 | 糖豆人绘制 (`character.js`)：身体+眼睛+微笑+短腿 | 糖豆人可见 |
| T2-3 | 糖豆人 IDLE 状态：随机走动 + 偶尔跳跃 | 糖豆人动起来 |
| T2-4 | 小球绘制 (`ball.js`) + 随机生成 (`spawner.js`) | 5-8 个小球 |
| T2-5 | 小球点击检测（坐标命中） + 配置面板弹出 (`panel.js`) | 面板浮出 |
| T2-6 | 配置面板交互：分类选择、快捷金额、自定义金额输入、确认按钮、置灰 | 可配置小球 |
| T2-7 | 金色收入小球：独立绘制、简化面板、收入记录 | 收入可记 |
| T2-8 | 小球已配置状态：显示金额、变大、颜色加深 | 小球变化 |
| T2-9 | 糖豆人 MOVING 状态：检测已配置小球 → 移动路径计算 | 糖豆人走向小球 |
| T2-10 | EATING 动画 (`animation.js`)：张嘴 → 小球飞行 → 星星爆炸 → 打嗝 | 完整吃球动画 |
| T2-11 | 账单 API 对接：进食完成后 POST `/api/bills` + 年度花费更新 | 账单保存 |
| T2-12 | 小球补充逻辑：剩余 <3 → 自动生成新小球，避开糖豆人位置 | 小球无限 |
| T2-13 | 排队处理：糖豆人进食中配置新小球 → 进入队列 | 不丢球 |

#### 阶段 3：账单与统计（预计 1 天）

| 编号 | 任务 | 产出 |
| --- | --- | --- |
| T3-1 | 后端账单 CRUD API (`routes/bills.js`) | 账单接口完整 |
| T3-2 | 后端分类 CRUD API (`routes/categories.js`) | 分类接口完整 |
| T3-3 | 后端统计 API (`routes/stats.js`)：支持周/月粒度 | 统计接口完整 |
| T3-4 | 侧边面板骨架 (`sidebar/sidebar.js`)：宽度 min(480px,40vw)、打开/关闭动画 + Tab 切换 | 面板可开关 |
| T3-5 | 账单列表 (`sidebar/bills.js`)：今日/本周/本月 API 请求 + 列表渲染 | 账单可见 |
| T3-6 | 账单编辑/删除功能 | 可编辑删除 |
| T3-7 | 统计页：Canvas 饼图绘制 (`sidebar/stats.js`) + 环比信息（比上周期 ±X%） | 饼图+对比可见 |
| T3-8 | 统计页：消费时间轴 + 周/月切换 | 时间轴可拖动 |
| T3-9 | 设置页：导出 CSV、管理分类(含图标选择)、币种切换、清空数据、注销 (`sidebar/settings.js`) | 设置完整 |
| T3-10 | 币种切换：前端格式化 + 后端币种偏好存取 | 多币种 |

#### 阶段 4：打磨与联调（预计 0.5 天）

| 编号 | 任务 | 产出 |
| --- | --- | --- |
| T4-1 | 全流程联调：注册 → 登录 → 登录过渡动画 → 记账(含收入) → 查看统计 → 设置 | 端到端通 |
| T4-2 | 边界处理：网络断开提示、Token 过期重定向、空数据状态、窗口过小提示 | 异常体验好 |
| T4-3 | 性能优化：粒子池复用、debounce resize、deltaTime 处理、减少不必要的 Canvas 重绘 | 流畅 60fps |
| T4-4 | 安全加固：CSP header、body limit、JWT_SECRET 检测、错误中间件、CORS | 安全基线 |
| T4-5 | 最终测试（按 `checklist.md` 逐项检查） | 验收通过 |

---

## 十一、验证清单

### 9.1 认证系统

| 编号 | 验证项 | 预期结果 |
| --- | --- | --- |
| V-01 | 使用未注册邮箱+密码注册 | 注册成功，自动登录，跳转游戏界面 |
| V-02 | 使用已注册邮箱+密码注册 | 提示"该邮箱已注册" |
| V-03 | 邮箱格式错误（如 `abc`）注册 | 前端提示"邮箱格式不正确" |
| V-04 | 密码不足 6 位注册 | 前端提示"密码至少 6 位" |
| V-05 | 确认密码不一致注册 | 前端提示"两次密码不一致" |
| V-06 | 正确邮箱+密码登录 | 登录成功，跳转游戏界面 |
| V-07 | 错误密码登录 | 提示"邮箱或密码错误" |
| V-08 | 未注册邮箱+密码登录 | 提示"邮箱或密码错误"（不暴露"未注册"） |
| V-09 | 发送验证码到邮箱 | 收到 6 位数字验证码邮件 |
| V-10 | 60 秒内重复发送验证码 | 前端按钮倒计时置灰，后端返回频率限制错误 |
| V-11 | 验证码注册（新邮箱+正确验证码） | 注册成功，自动登录 |
| V-12 | 验证码登录（已注册邮箱+正确验证码） | 登录成功 |
| V-13 | 验证码登录（未注册邮箱+正确验证码） | 自动创建账号并登录 |
| V-14 | 错误验证码登录 | 提示"验证码错误或已过期" |
| V-15 | 忘记密码 → 验证码验证 → 设置新密码 | 密码重置成功，可用新密码登录 |
| V-16 | 退出登录 | 清除 token，跳转登录页，无法访问游戏界面 |
| V-17 | 手动清除 JWT 后访问游戏页 | 重定向到登录页 |

### 9.2 游戏核心

| 编号 | 验证项 | 预期结果 |
| --- | --- | --- |
| V-18 | 登录后进入游戏界面 | Canvas 有暖色渐变背景 + 5-8 个彩色小球 + 糖豆人 |
| V-19 | 刷新页面 | 小球重新随机生成，糖豆人位置重置，余额保留 |
| V-20 | 糖豆人空闲行为 | 平滑随机走动，偶尔原地跳跃 |
| V-21 | 点击小球 | 小球旁边浮出毛玻璃配置面板 |
| V-22 | 未选择分类/金额点确认 | 确认按钮置灰，不可点击 |
| V-23 | 选择分类和金额后点确认 | 面板关闭，小球变大显示金额、颜色加深 |
| V-24 | 配置面板点击外部空白区域 | 面板关闭 |
| V-25 | 打开面板时点击另一个小球 | 当前面板关闭，新面板在新小球旁边打开 |
| V-26 | 配置后 2 秒内 | 糖豆人自动走向最近已配置小球 |
| V-27 | 糖豆人到达小球 | 小球飞向糖豆人 → 嘴巴张开 → 星星爆炸 → 打嗝上跳 |
| V-28 | 进食完成后 | 小球消失，右上角余额数字滚动更新 |
| V-29 | 连续配置多个小球 | 糖豆人按距离顺序依次走向并吃掉 |
| V-30 | 糖豆人进食中配置新小球 | 排队等待，当前进食完成后处理下一个 |
| V-31 | 小球剩余 <3 个 | 自动生成新小球补充至 5-8 个 |
| V-32 | 主界面无任何文字或按钮 | 纯视觉，无引导文字 |

### 9.3 账单与统计

| 编号 | 验证项 | 预期结果 |
| --- | --- | --- |
| V-33 | 点击糖豆人本体 | 右侧滑出面板（约 35% 宽），糖豆人暂停移动 |
| V-34 | 今日账单 Tab | 按时间倒序展示账单，含金额、分类图标、时间 |
| V-35 | 统计 Tab | 饼图展示各分类支出占比，颜色温暖 |
| V-36 | 消费时间轴 | 可拖动查看各月消费 |
| V-37 | 月份切换 | 点击切换到不同月份，数据和饼图更新 |
| V-38 | 关闭面板 | 点击面板外游戏区域或关闭按钮，糖豆人恢复移动 |
| V-39 | 编辑账单 | 修改金额或分类后保存成功 |
| V-40 | 删除账单 | 账单从列表移除，余额更新 |

### 9.4 分类管理

| 编号 | 验证项 | 预期结果 |
| --- | --- | --- |
| V-41 | 新用户首次登录 | 自动有 6 个预设分类（餐饮/交通/购物/娱乐/住房/收入） |
| V-42 | 添加自定义分类 | 设置页新增分类，小球配置面板出现新分类图标 |
| V-43 | 删除无账单的分类 | 删除成功 |
| V-44 | 删除有账单的分类 | 提示"该分类下有 N 笔账单，无法删除" |
| V-45 | 用户 A 的分类 | 用户 B 登录后不可见 |

### 9.5 设置与数据

| 编号 | 验证项 | 预期结果 |
| --- | --- | --- |
| V-46 | 导出数据 | 下载 CSV 文件，内容包含全部账单 |
| V-47 | 清空数据 → 取消 | 数据保留 |
| V-48 | 清空数据 → 确认 | 所有账单被删除，余额归零，分类保留 |
| V-49 | 账号注销 → 确认 | 账号+账单+分类全部删除，跳转登录页 |
| V-50 | 切换币种（CNY→USD） | 余额和金额按选中币种符号显示 |

### 9.6 边界与异常

| 编号 | 验证项 | 预期结果 |
| --- | --- | --- |
| V-51 | 网络断开时记账 | 提示"网络异常，请稍后重试"，小球恢复未配置状态 |
| V-52 | JWT 过期后操作 | API 返回 401，前端清除 token 并重定向登录页 |
| V-53 | 窗口缩小到 <1024px | 提示"建议更大屏幕"，可继续使用但布局压缩 |
| V-54 | 浏览器切到后台再切回 | 糖豆人恢复移动 |
| V-55 | 首次登录无任何账单时 | 统计页饼图显示空状态，今日账单列表展示空状态 |

### 9.7 性能

| 编号 | 验证项 | 预期结果 |
| --- | --- | --- |
| V-56 | 首次加载时间 | ≤ 3 秒 |
| V-57 | 糖豆人移动帧率 | ≥ 30fps（肉眼流畅） |
| V-58 | 进食动画总时长 | ≤ 1.5 秒 |
| V-59 | 配置面板弹出/关闭 | 即时响应，无延迟 |
| V-60 | 100+ 条账单下列表滚动 | 无卡顿 |

---

## 已确认决策

以下事项已与产品方确认，记录于此供开发参考：

| # | 决策项 | 决定 |
|---|--------|------|
| 1 | 邮件发送服务 | QQ 邮箱 SMTP（`smtp.qq.com:465`），用户提供授权码，配置于 `.env` 的 `SMTP_USER` 和 `SMTP_PASS` |
| 2 | 前端打包方式 | 纯静态 HTML/CSS/JS，无构建工具，Express 直接托管 `client/` 目录 |
| 3 | 游戏主界面尺寸 | Canvas 撑满浏览器窗口（`window.innerWidth × window.innerHeight`），resize 自适应 |
| 4 | 数据库文件路径 | `data/sugarrunner.db`（项目根目录下） |
| 5 | 多币种汇率策略 | 内置固定汇率表（2026 年参考值），统一 CNY 存储，前端按汇率换算显示，后续可升级实时 API |
| 6 | ESLint/Prettier | 不配置 |
| 7 | 糖豆人素材 | 用户提供 SVG（普通 + 进食两态），Canvas 加载渲染 |
| 8 | 右上角余额 | 年度累计花费（年支出总额），模拟游戏分数 |
| 9 | 统计粒度 | 本周 + 本月，侧边面板 Tab 切换 |
| 10 | 收入记账 | 金色特殊小球（约 20% 出现概率），简化面板仅选金额 |
| 11 | 金额输入 | 快捷金额按钮 + 自定义金额输入框（>0 且 ≤999,999.99） |
| 12 | 撤销功能 | 暂不纳入 |
| 13 | 音效 | 暂不纳入 |
| 14 | 快捷金额自定义 | 暂不实现，保持默认快捷金额 |
| 15 | 预算/消费预警 | 暂不实现 |
| 16 | 账单备注搜索/筛选 | 暂不实现 |
| 17 | 数据导入 | 暂不支持 |
| 18 | 多端同步 | 暂不支持 |

---

> **文档状态**：已确认（经评审修订）  
> **版本**：v1.2  
> **更新日期**：2026-06-30  
> **项目名称**：糖豆人记账游戏 (SugarRunner Expense)  
> **变更说明**：v1.2 - 评审修订：补充金色收入小球、自定义金额、周/月统计、SVG素材、边界条件、安全加固、UX改进
