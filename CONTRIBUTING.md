# 参与开发

本项目是浏览器端 Word 样式与列表编辑器。使用和修改源码须遵守 [LICENSE](LICENSE)；非商业使用范围及商业授权说明见[许可证说明](docs/licensing.md)。提交改动前请阅读 [AGENTS.md](AGENTS.md)。

## 本地开发

使用 Node.js 24 和 npm，版本提示保存在 `.nvmrc`。如果已安装 nvm，可运行 `nvm use`；本项目不要求安装全局 npm 工具。

```sh
npm ci
npm run dev
```

开发服务位于 `http://127.0.0.1:5173`。依赖以 `package-lock.json` 为准；仅在确实需要变更依赖时同步更新锁文件。

## 改动约束

- 数据结构和校验集中在 `src/model.ts`。新增字段需同步编辑器、导入、导出和预览；预览无法表达的行为需明确说明。
- DOCX/DOTX 保留原生 OOXML 样式和动态编号，段落样式与列表层级必须双向关联。默认空白导出不得加入示例文字；DOTX 必须使用模板 Content Type。
- 模型布尔值表示用户意图。段落/字符样式采用 OOXML toggle 语义，表格样式使用绝对值，不能不加区分地复用序列化逻辑。
- 默认第九级重启规则省略 `lvlRestart`，避免 Word 对显式值 `8` 的兼容问题。
- 修改浏览器存档结构时保留旧数据兼容路径，并使用脱敏的最小夹具验证。

## 验证与提交

```sh
npm test
npm run build
```

界面变更需要浏览器实际操作验证；导出变更需要检查 OOXML，并在 Microsoft Word 中打开、操作、保存重开。记录操作系统、Word 版本、测试范围和未通过项。网页预览和 LibreOffice 渲染不能代替 Word 验收。

提交应聚焦一个可说明的问题，PR 描述包含行为变化、验证结果和剩余限制。新增测试应覆盖真实风险或回归，不为文案、文档等低风险修改机械地增加测试。尚未完成的 Word 验收应保留在说明中。

`node_modules/`、`dist/`、`.qa/`、`.vercel/`、本地环境文件、日志和用户导出的 DOCX/DOTX 不进入源码仓库。确有必要的 Word 测试夹具放在 `tests/fixtures/`，确认无个人或业务信息后再提交。

漏洞反馈请阅读 [SECURITY.md](SECURITY.md)，不要在公开 Issue 中上传敏感复现文件。
