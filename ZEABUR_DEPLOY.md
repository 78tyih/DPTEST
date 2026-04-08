# Zeabur 部署清单

本文档是 `DPTEST` 当前唯一推荐的线上部署主线，目标域名为 `deltapex.top`。

## 目标架构

- Web 服务：Zeabur 上基于 `Dockerfile` 部署当前仓库
- 数据库：Zeabur Postgres，或当前 Zeabur 项目已绑定的 PostgreSQL
- 域名：`deltapex.top` 绑定到 Zeabur 生成的服务

## 不再作为主线的部署方式

- `Fly.io`：仅保留历史文件，不再作为当前发布路径
- `docker-compose.yaml`：仅用于本地或自托管环境，不用于 Zeabur 线上部署
- `DEPLOY.md`：偏向自托管服务器
- `LOCAL_DEPLOY.md`：偏向本地 Docker 联调

## Zeabur 服务拆分

Zeabur 不直接使用 `docker-compose.yaml` 作为线上编排，线上按两个服务管理：

1. `web`
   - 来源：当前仓库
   - 构建方式：`Dockerfile`
   - 暴露端口：`5000`
2. `postgres`
   - 使用 Zeabur PostgreSQL 服务，或接入当前项目已有数据库

## 必要环境变量

在 Zeabur 的 `web` 服务中至少配置以下变量：

```env
DATABASE_URL=postgresql://<user>:<password>@<host>:5432/<db>
SESSION_SECRET=<openssl rand -hex 32 生成>
ADMIN_PASSWORD=<后台管理密码>
BASE_URL=https://deltapex.top
VECTORENGINE_API_KEY=<DeepSeek/VectorEngine key>
```

按需配置：

```env
EXTERNAL_API_KEY=
WECHAT_WEBHOOK_URL=
SERA_PASSWORD=
DEVEN_PASSWORD=
ANNA_PASSWORD=
```

说明：

- `DATABASE_URL` 是服务端运行必需项
- `docker-entrypoint.sh` 会在容器启动时执行数据库可用性检查、补表与 seed
- 如果要覆盖默认销售账号密码，直接在 Zeabur 环境变量里提供 `SERA_PASSWORD`、`DEVEN_PASSWORD`、`ANNA_PASSWORD`

## 部署步骤

1. 在 Zeabur 里创建或打开当前项目
2. 新建或确认 PostgreSQL 服务可用
3. 新建 `web` 服务，直接连接当前仓库
4. 确认构建方式使用仓库中的 `Dockerfile`
5. 将上面的环境变量填入 `web` 服务
6. 首次部署后查看构建日志和运行日志，确认：
   - 容器启动成功
   - 数据库连接成功
   - `docker-entrypoint.sh` 补表完成
   - 应用开始监听 `5000`
7. 在 Zeabur 中绑定自定义域名 `deltapex.top`
8. 按 Zeabur 提示在 DNS 服务商处添加对应解析记录
9. 等待证书签发完成后，用 `https://deltapex.top` 访问

## 最小上线验证

至少验证以下路径：

- 首页可打开
- `/admin/chat` 可登录
- lead 页面路由可访问：
  - `/lead/mobile`
  - `/lead/ops-import`
  - `/lead/admin`
- 导入预检接口可返回结果
- 销售队列、标记有效、标记无效链路可跑通

更细的发布前检查和发布后验收，见：

- `docs/zeabur-release-checklist.md`
- `docs/customer-sales-boundary.md`

## 仓库重组建议

建议后续继续做这几步：

1. 将 `CLAUDE.md` 中所有旧 Fly 叙述完全替换为 Zeabur
2. 将 `DEPLOY.md` 标记为自托管方案，不再作为默认部署文档
3. 将 `LOCAL_DEPLOY.md` 保留为本地联调用途
4. 条件成熟时删除 `fly.toml` 与 `script/deploy-fly.sh`
