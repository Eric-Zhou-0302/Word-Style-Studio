# Vercel 部署

本项目是 React + Vite 静态站点。构建结果为 `dist/`，没有后端、数据库、Serverless Function，也不需要应用环境变量或 API 密钥。以下为部署操作说明；仓库内的配置文件不代表已建立 Vercel 项目或已经上线。

## 构建配置

在 Vercel 导入实际 GitHub 仓库时，以仓库根目录作为 Root Directory，并核对以下设置：

| 设置 | 值 |
| --- | --- |
| Framework Preset | Vite |
| Node.js Version | 24.x，与 `package.json`、`.nvmrc` 和 CI 保持一致 |
| Install Command | `npm ci` |
| Build Command | `npm test && npm run build` |
| Output Directory | `dist` |
| Production Branch | `main`，首次创建远端后核对实际分支 |
| Environment Variables | 留空 |

安装、构建和输出目录已写入根目录 `vercel.json`。Node 主版本由 `package.json` 的 `engines.node` 指定；Vercel 自动更新该主版本内的次版本和补丁版本。Vercel 官方支持 [Vite 静态构建](https://vercel.com/docs/frameworks/frontend/vite) 和 [Node.js 24.x](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions)。

首页位于 `/`，工作区和使用文档通过 `/#workspace`、`/#guide`、`/#guide-start` 等 URL fragment 切换；fragment 不发送给服务器，因此直接打开或刷新仍请求 `/`。当前无需把任意路径重写到 `index.html`，未知路径可以正常返回 404。以后若引入 History API 路由，再按官方 Vite 指引添加 SPA rewrite 并验证深层链接。不要把 `npm run dev` 或 `npm run preview` 用作线上服务。

## 通过 GitHub 连接 Vercel

1. 项目仓库为 [Eric-Zhou-0302/Word-Style-Studio](https://github.com/Eric-Zhou-0302/Word-Style-Studio)，生产分支使用 `main`。
2. 在 Vercel 选择对应个人账户或团队，导入该 GitHub 仓库；仅授予集成所需的仓库访问权限。
3. 核对上表设置。点击首次部署会创建可访问的部署，属于发布操作；应在发布授权后执行。
4. 首次构建成功后，记录真实项目地址、部署 URL、生产分支和提交 SHA，再补充 README 中的访问链接。
5. 在功能分支提交后打开 PR，检查 Vercel Preview 与 CI；验收通过后合并到 `main`，由 Git 集成创建生产部署。

连接后，功能分支更新通常创建 Preview，生产分支更新创建 Production；实际行为受项目设置和访问权限影响。详见 [Vercel Git 集成](https://vercel.com/docs/git)。无需在 GitHub Actions 中保存 `VERCEL_TOKEN`，本项目也未配置基于令牌的部署 workflow。

## CI 与部署门禁

GitHub Actions 的 `CI` workflow 中，`Test and build` job 执行安装、测试和构建。GitHub 分支规则可以要求该检查通过才允许合并，但不会仅凭 workflow 文件就自动阻止 Vercel 发布；规则需要在仓库设置中启用。

Vercel 默认会把成功的生产构建自动发布。本项目的 Vercel Build Command 自身执行 `npm test && npm run build`，因此任一测试、类型检查或构建失败都会阻止本次构建成功。它与 GitHub Actions 是两次独立运行。

若还要强制等待 GitHub 检查，在 Vercel 项目设置的 Deployment Checks 中将实际出现的 `Test and build` 检查设为 required，并确认 Production 的自动域名分配已启用。配置后应通过一次受控失败验证：生产域名仍指向旧部署，失败提交未被推广。修改 job 名称后必须同步更新检查选择。该设置不包含在 `vercel.json` 中，尚需远端操作。[官方 Deployment Checks 文档](https://vercel.com/docs/deployment-checks)

## 首次上线与后续发布验收

- 确认部署显示 Ready，提交 SHA 与拟发布版本一致，构建日志中的测试、类型检查和构建均成功。
- 在真实部署 URL 打开 `/`、`/#workspace`、`/#guide` 和一个章节链接，刷新后确认页面和按需加载资源正常；不存在的路径应返回 404。
- 用独立浏览器配置或测试方案验证：样式编辑、保存刷新、JSON 导出/恢复、DOCX 与 DOTX 下载，以及窄屏布局。上线验收不要覆盖真实工作方案。
- 核对 `/LICENSE.txt` 与 `/THIRD_PARTY_NOTICES.txt` 可访问，浏览器控制台没有运行时异常。
- 导出逻辑有改动时检查 OOXML，并使用 Microsoft Word 验收；网页构建成功和 LibreOffice 渲染不能替代 Word 验收。既有兼容性限制见 README。
- 确认生产域名实际指向本次部署；若之后绑定自定义域名，分别检查 DNS、Vercel 域名归属和 HTTPS。不要仅凭 DNS 或 GitHub 推送成功认定上线完成。

方案保存在浏览器的本地存储，按站点 origin 隔离。Preview 地址、生产地址和自定义域名之间不会自动共享方案；换地址前先导出 JSON 备份。部署或回滚也不会自动迁移、清空或恢复用户本地方案。

应用内的 DOCX/DOTX 解析与导出在浏览器执行，没有文件上传接口。正常访问仍会向托管平台请求网页资源；该实现说明不等于对托管平台访问日志的承诺。不要将密钥放入 `VITE_*` 变量，Vite 会把这类值暴露到客户端构建中。[Vite 环境变量说明](https://vite.dev/guide/env-and-mode)

## 回滚

发现线上问题时，在 Vercel 项目的 Production Deployment 中选择 Instant Rollback，核对目标提交与受影响域名后恢复之前的生产部署，再重新完成关键操作验收。当前官方说明中，Hobby 可回滚到紧邻的上一生产部署，其他计划的可选范围以控制台显示为准。[Instant Rollback 文档](https://vercel.com/docs/instant-rollback)

回滚不会还原 Git 历史或用户本地数据。应另行提交修复或 revert 并通过 CI；还要考虑新版本保存的本地数据能否被旧版本读取。Vercel 在回滚后会关闭生产域名自动分配，新推送不一定自动上线；修复版验收后通过 Undo Rollback / Promote 恢复正常发布。不要用强制推送改写历史来代替回滚。

## 发布前仍需确定

GitHub 仓库为公开的 `Eric-Zhou-0302/Word-Style-Studio`，生产分支为 `main`。Vercel 账户或团队、项目名以及自定义域名仍需在导入项目时选择。上述内容不应使用推测值写入站点链接、徽章或配置；首次在 Vercel 导入仓库建立 Git 集成后，后续推送才会自动部署。
