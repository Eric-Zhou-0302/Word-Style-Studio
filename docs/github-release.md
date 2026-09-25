# GitHub 仓库与发布准备

本文件描述首次建仓和后续发布的操作顺序。工作区中的 CI、许可证和说明文件不代表 GitHub 仓库、远端检查或网站已经创建完成。

## 首次建仓

1. 确认仓库名称、所有者、可见性，以及 [LICENSE](../LICENSE) 和[许可证说明](licensing.md)。本项目采用限制商业用途的源码许可，介绍项目时不要标称为 OSI 开源许可。
2. 检查待发布源码、文档、图片和测试夹具，排除凭据、个人或业务信息、本机绝对路径和第三方未获授权内容。`.gitignore` 是提交边界，不会自动清理已经跟踪的文件。
3. 在 Node.js 24 环境执行 `npm ci`、`npm test`、`npm run build`，记录结果。界面和 Word 行为按 [CONTRIBUTING.md](../CONTRIBUTING.md) 补充验收。
4. 维护者确认后，初始化 Git、创建真实远端并首次推送。提交清单应包括源码、测试、`package-lock.json`、项目配置、许可证和说明文件；不要使用未经审查的整目录暂存来跳过检查。
5. 首次推送后检查 Actions 中对应提交的 `CI` 工作流。确认任务 **Test and build** 成功后，再配置目标分支的规则集或分支保护，将该检查设为合并前必需项。检查名称以仓库实际出现的状态为准；需要更改名称时同步更新规则。
6. 按仓库权限和账户支持情况启用依赖漏洞提醒、secret scanning/push protection 以及私密漏洞报告。配置完成后核对实际状态，不把文档中的建议视为已经启用。
7. 用真实仓库和部署地址更新项目说明；网站部署步骤见 [deployment.md](deployment.md)。

## CI 的范围

`.github/workflows/ci.yml` 在所有分支推送、PR 和手动触发时执行；分支推送触发不包括标签推送。工作流使用 `.nvmrc` 指定的 Node.js 24，按顺序运行 `npm ci`、`npm test`、`npm run build`，仅授予 `contents: read`，不需要配置部署 secret。

官方 Action 固定到经核验的完整提交 SHA。更新 Action 时应检查官方发行说明并同步注释。依赖缓存以 `package-lock.json` 为键，不将 `node_modules/` 放入仓库。参考 [setup-node 官方用法](https://github.com/actions/setup-node)、[checkout 官方用法](https://github.com/actions/checkout)及 [GitHub 工作流语法](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax)。

当前尚未取得 GitHub CI 或 Vercel 中 Node.js 24 的实际运行记录，需在首次接入后核验。本地其他 Node.js 版本下的验证不能替代这一步。

CI 通过仅证明该提交的自动化测试和构建成功，不代表 Word 客户端验收、GitHub 规则或 Vercel 部署门禁已经生效。GitHub 分支保护的配置方式见[官方说明](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/managing-a-branch-protection-rule)。

## 首次及后续版本发布

1. 选择已通过 CI、完成所需浏览器和 Word 验收的具体提交，并保留未完成项的明确说明。
2. 将 [CHANGELOG.md](../CHANGELOG.md) 的适用内容从 `Unreleased` 整理到实际选定的版本和发布日期；同步包元数据与锁文件中的版本。不要用工作区初始版本号推断既有发布记录。
3. 维护者确认版本与发布内容后，才创建版本标签和 GitHub Release。Release 写明新增功能、修复、兼容性限制及验证范围；不要附带真实用户导出文件。
4. 如同时发布网站，确认部署对应的提交、构建状态和实际访问结果。GitHub Release 与网站部署分别核验。

当前没有自动发布或 npm 发布工作流；`package.json` 的 `private` 设置应保留，网站部署使用静态构建产物。
