# Deltapex Trading Group 部署文档

本文档介绍如何将本项目部署到独立服务器上，并绑定自定义域名（如 `deltapex.top`）。

> 当前默认线上部署主线为 `Zeabur + deltapex.top`，见 `ZEABUR_DEPLOY.md`。
> 本文档保留为自托管服务器方案。

---

## 一、服务器要求

| 项目 | 最低要求 |
|------|----------|
| 操作系统 | Ubuntu 20.04+ / CentOS 7+ / Debian 11+ |
| Node.js | **v20+**（推荐 v20 LTS） |
| PostgreSQL | **16+** |
| 内存 | 1GB+ |
| 磁盘 | 10GB+ |
| 网络 | 开放 80 和 443 端口 |

---

## 二、安装基础环境

以 Ubuntu 为例：

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装 Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 确认版本
node -v   # 应显示 v20.x.x
npm -v

# 安装 PostgreSQL 16
sudo apt install -y postgresql-16 postgresql-client-16

# 安装 Nginx（反向代理）
sudo apt install -y nginx

# 安装 PM2（进程管理）
sudo npm install -g pm2

# 安装 Certbot（SSL 证书）
sudo apt install -y certbot python3-certbot-nginx
```

---

## 三、配置 PostgreSQL 数据库

```bash
# 切换到 postgres 用户
sudo -u postgres psql

# 创建数据库和用户
CREATE USER deltapex WITH PASSWORD '你的数据库密码';
CREATE DATABASE deltapex_db OWNER deltapex;
GRANT ALL PRIVILEGES ON DATABASE deltapex_db TO deltapex;
\q
```

记住你的数据库连接地址：
```
postgresql://deltapex:你的数据库密码@localhost:5432/deltapex_db
```

---

## 四、部署项目代码

### 4.1 上传代码

将项目代码上传到服务器（建议放在 `/opt/deltapex` 或 `/home/deploy/deltapex`）：

```bash
# 方式一：从 Git 仓库拉取（如果你已推送到 GitHub/Gitee）
cd /opt
git clone <你的仓库地址> deltapex
cd deltapex

# 方式二：从本地上传（在本地执行）
# 先在 Replit 项目中下载 zip，然后上传到服务器
scp deltapex.zip root@你的服务器IP:/opt/
# 在服务器上解压
cd /opt && unzip deltapex.zip -d deltapex && cd deltapex
```

### 4.2 安装依赖

```bash
cd /opt/deltapex
npm install
```

### 4.3 初始化数据库

> 环境变量将在第五步通过 PM2 配置文件管理，此处先配置临时环境变量来初始化数据库。

```bash
# 设置临时环境变量并推送数据库表结构
DATABASE_URL=postgresql://deltapex:你的数据库密码@localhost:5432/deltapex_db npx drizzle-kit push
```

### 4.4 构建项目

```bash
npm run build
```

构建完成后会生成 `dist/` 目录，包含：
- `dist/index.cjs` — 服务端入口
- `dist/public/` — 前端静态文件

### 4.5 测试启动

```bash
# 测试启动（先完成第五步的 PM2 配置后再测试，或者用临时环境变量）
DATABASE_URL=postgresql://deltapex:你的数据库密码@localhost:5432/deltapex_db \
SESSION_SECRET=test_secret \
ADMIN_PASSWORD=test123 \
NODE_ENV=production \
PORT=5000 \
node dist/index.cjs

# 看到 "serving on port 5000" 后按 Ctrl+C 停止
```

---

## 五、使用 PM2 管理进程

### 5.1 创建 PM2 配置文件

```bash
cat > /opt/deltapex/ecosystem.config.cjs << 'EOF'
module.exports = {
  apps: [{
    name: 'deltapex',
    script: './dist/index.cjs',
    cwd: '/opt/deltapex',
    env: {
      NODE_ENV: 'production',
      PORT: '5000',
      DATABASE_URL: 'postgresql://deltapex:你的数据库密码@localhost:5432/deltapex_db',
      SESSION_SECRET: '替换为一个随机字符串_至少32个字符',
      ADMIN_PASSWORD: '你的管理后台密码',
      EXTERNAL_API_KEY: '你的外部API密钥',
      BASE_URL: 'https://deltapex.top'
    },
    instances: 1,
    autorestart: true,
    max_memory_restart: '500M',
    log_date_format: 'YYYY-MM-DD HH:mm:ss'
  }]
};
EOF
```

> **重要**：请将上述占位符替换为实际的值。`SESSION_SECRET` 建议使用 `openssl rand -hex 32` 生成。
> 此文件包含敏感信息，请勿提交到 Git 仓库。

### 5.2 启动应用

```bash
cd /opt/deltapex
pm2 start ecosystem.config.cjs

# 查看状态
pm2 status

# 查看日志
pm2 logs deltapex

# 设置开机自启
pm2 startup
pm2 save
```

PM2 常用命令：

```bash
pm2 restart deltapex   # 重启
pm2 stop deltapex      # 停止
pm2 delete deltapex    # 删除
pm2 logs deltapex      # 查看日志
pm2 monit              # 监控面板
```

---

## 六、配置 Nginx 反向代理

### 6.1 创建 Nginx 配置

```bash
sudo nano /etc/nginx/sites-available/deltapex
```

写入以下内容（将 `deltapex.top` 替换为你实际使用的域名）：

```nginx
server {
    listen 80;
    server_name deltapex.top;

    # 限制请求体大小（上传文件等）
    client_max_body_size 10M;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 6.2 启用配置

```bash
# 创建符号链接
sudo ln -s /etc/nginx/sites-available/deltapex /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 重载 Nginx
sudo systemctl reload nginx
```

### 6.3 配置 SSL 证书（HTTPS）

```bash
# 使用 Certbot 自动获取 Let's Encrypt 免费证书
sudo certbot --nginx -d deltapex.top

# 按提示操作，选择自动重定向 HTTP 到 HTTPS

# 证书会自动续期，可以测试：
sudo certbot renew --dry-run
```

---

## 七、DNS 域名解析

在你的域名管理后台（deltapex.cn 的 DNS 管理处）添加：

| 记录类型 | 主机记录 | 记录值 | TTL |
|----------|----------|--------|-----|
| A | test | 你的服务器公网 IP | 600 |

> 如果使用 CDN（如阿里云 CDN、Cloudflare），则按 CDN 提供商的要求配置 CNAME 记录。

---

## 八、防火墙配置

```bash
# UFW 防火墙（Ubuntu）
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 22/tcp    # SSH
sudo ufw enable
sudo ufw status

# 注意：5000 端口不需要对外开放，Nginx 会通过内部转发访问
```

---

## 九、更新部署

当代码有更新时：

```bash
cd /opt/deltapex

# 1. 拉取最新代码（如果用 Git）
git pull

# 2. 安装依赖（如果有新增依赖）
npm install

# 3. 推送数据库变更（如果 schema 有变化）
DATABASE_URL=postgresql://deltapex:你的数据库密码@localhost:5432/deltapex_db npx drizzle-kit push

# 4. 重新构建
npm run build

# 5. 重启应用
pm2 restart deltapex
```

---

## 十、常见问题

### Q: 启动报错 "DATABASE_URL, ensure the database is provisioned"
确保 `.env` 文件中的 `DATABASE_URL` 配置正确，且 PostgreSQL 服务正在运行：
```bash
sudo systemctl status postgresql
```

### Q: 页面打不开，显示 502 Bad Gateway
检查应用是否在运行：
```bash
pm2 status
pm2 logs deltapex
```

### Q: 如何查看应用日志
```bash
pm2 logs deltapex          # 实时日志
pm2 logs deltapex --lines 100  # 最近100行
```

### Q: 数据库如何备份
```bash
# 备份
pg_dump -U deltapex deltapex_db > backup_$(date +%Y%m%d).sql

# 恢复
psql -U deltapex deltapex_db < backup_20260306.sql
```

### Q: 如何修改管理后台密码
编辑 `.env` 文件中的 `ADMIN_PASSWORD`，然后重启：
```bash
pm2 restart deltapex
```

---

## 十一、环境变量说明

| 变量名 | 必须 | 说明 |
|--------|------|------|
| `DATABASE_URL` | 是 | PostgreSQL 连接地址 |
| `SESSION_SECRET` | 是 | 会话加密密钥，建议至少32位随机字符串 |
| `ADMIN_PASSWORD` | 是 | 管理后台登录密码 |
| `EXTERNAL_API_KEY` | 否 | 外部 API 集成密钥 |
| `PORT` | 否 | 应用端口，默认 5000 |
| `NODE_ENV` | 是 | 设为 `production` |
| `BASE_URL` | 否 | 站点完整域名（含 https://），用于生成分享链接 |
| `WECHAT_WEBHOOK_URL` | 否 | 企业微信群机器人 Webhook 地址（已有默认值） |

---

## 十二、Docker 部署（推荐）

项目已包含 `Dockerfile` 和 `docker-compose.yaml`，可以一键部署。

### 12.1 前提条件

在 Mac 上安装 [Docker Desktop](https://www.docker.com/products/docker-desktop/)，或者在 Linux 服务器上安装 Docker 和 Docker Compose。

### 12.2 配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑 .env 文件，填入实际值
nano .env
```

`.env` 文件内容说明：

```bash
DB_PASSWORD=deltapex123                           # 数据库密码
SESSION_SECRET=change_me_to_a_random_string       # 会话密钥（openssl rand -hex 32 生成）
ADMIN_PASSWORD=1212                               # 管理后台密码
EXTERNAL_API_KEY=                                 # 外部 API 密钥（可选）
BASE_URL=https://deltapex.top                     # 站点域名
WECHAT_WEBHOOK_URL=                               # 企微 Webhook（可选）
```

### 12.3 启动

```bash
# 构建并启动（后台运行）
docker compose up -d --build

# 首次启动会自动：
# 1. 创建 PostgreSQL 数据库
# 2. 推送数据库表结构（drizzle-kit push）
# 3. 启动 Node.js 应用
```

启动后访问 `http://localhost:5000` 确认应用正常运行。

### 12.4 常用命令

```bash
# 查看运行状态
docker compose ps

# 查看应用日志
docker compose logs -f app

# 查看数据库日志
docker compose logs -f db

# 重启应用（代码更新后）
docker compose up -d --build app

# 停止所有服务
docker compose down

# 停止并删除数据（谨慎！会清空数据库）
docker compose down -v
```

### 12.5 配合 Nginx 和 SSL

在宿主机上安装 Nginx，配置反向代理到 `127.0.0.1:5000`（参考第六节的 Nginx 配置）。
然后使用 Certbot 配置 SSL 证书（参考第六节第三步）。

### 12.6 数据库备份

```bash
# 备份
docker compose exec db pg_dump -U deltapex deltapex_db > backup_$(date +%Y%m%d).sql

# 恢复
cat backup_20260306.sql | docker compose exec -T db psql -U deltapex deltapex_db
```

---

## 十三、项目结构简要说明

```
deltapex/
├── client/              # 前端源码（React + Vite）
├── server/              # 后端源码（Express）
├── shared/              # 前后端共享类型和 schema
├── dist/                # 构建产物（npm run build 后生成）
│   ├── index.cjs        # 服务端打包入口
│   └── public/          # 前端静态文件
├── Dockerfile           # Docker 镜像构建
├── docker-compose.yaml  # Docker Compose 编排
├── docker-entrypoint.sh # 容器启动脚本（自动迁移数据库）
├── .env.example         # 环境变量模板
├── package.json
├── drizzle.config.ts    # 数据库迁移配置
└── DEPLOY.md            # 本文档
```
