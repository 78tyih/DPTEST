# 一键本地部署指南

## 前提条件

安装 [Docker Desktop](https://www.docker.com/products/docker-desktop/)（Mac / Windows 均可）。

安装完成后确认 Docker 已启动：

```bash
docker --version
docker compose version
```

---

## 部署步骤

### 1. 下载项目代码

将项目文件夹放到本地任意位置，进入项目根目录：

```bash
cd /path/to/deltapex
```

### 2. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env` 文件，填入实际值：

```bash
DB_PASSWORD=deltapex123
SESSION_SECRET=用下面命令生成
ADMIN_PASSWORD=你的管理后台密码
EXTERNAL_API_KEY=你的API密钥（可选）
BASE_URL=https://test.deltapex.cn
WECHAT_WEBHOOK_URL=企业微信群机器人 Webhook（可选，未设置则不推送）
```

生成 SESSION_SECRET：

```bash
openssl rand -hex 32
```

### 3. 一键启动

```bash
docker compose up -d --build
```

等待约 1-2 分钟，看到以下输出即部署成功：

```
✔ Container deltapex-db-1   Started
✔ Container deltapex-app-1  Started
```

### 4. 验证

打开浏览器访问：

```
http://localhost:5000
```

查看日志确认无报错：

```bash
docker compose logs -f app
```

---

## 常用操作

```bash
# 查看状态
docker compose ps

# 查看应用日志
docker compose logs -f app

# 重启应用
docker compose restart app

# 代码更新后重新构建并启动
docker compose up -d --build app

# 停止所有服务
docker compose down

# 停止并清空数据库（谨慎）
docker compose down -v

# 数据库备份
docker compose exec db pg_dump -U deltapex deltapex_db > backup.sql

# 数据库恢复
cat backup.sql | docker compose exec -T db psql -U deltapex deltapex_db
```

---

## 绑定域名（部署到服务器后）

1. 将项目上传到你的 Linux 服务器
2. 按上述步骤启动 Docker
3. 安装 Nginx，添加反向代理：

```nginx
server {
    listen 80;
    server_name test.deltapex.cn;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

4. 配置 SSL：

```bash
sudo certbot --nginx -d test.deltapex.cn
```

5. DNS 解析：在域名管理后台添加 A 记录，主机记录 `test`，记录值填服务器公网 IP。

---

## 故障排查

| 问题 | 解决方法 |
|------|----------|
| `docker compose` 命令不存在 | 确认 Docker Desktop 已安装并启动 |
| 端口 5000 被占用 | 修改 `docker-compose.yaml` 中 `ports` 为 `"5001:5000"`，然后访问 `localhost:5001` |
| 数据库连接失败 | 运行 `docker compose logs db` 检查数据库日志 |
| 构建失败 | 运行 `docker compose build --no-cache` 重新构建 |
| 页面空白 | 运行 `docker compose logs app` 查看应用报错 |
