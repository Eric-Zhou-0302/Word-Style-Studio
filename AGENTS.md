# 项目约定

- React + TypeScript + Vite 的纯客户端应用，使用 npm 和已提交到工作区的 package-lock.json；不需要后端和外部服务。
- 数据和校验集中于 `src/model.ts`。新增字段需同步编辑器、导出、导入、预览或明确预览限制。
- 导出为原生 OOXML。保持 `styles.xml` 与 `numbering.xml` 的双向关联，默认空白文件不得含示例文字；DOTX 必须使用模板主文档 Content Type。
- 模型 booleans 表示用户意图；OOXML 段落/字符样式的 toggle 语义与表格样式的绝对值不同，不能共用未经区分的序列化。
- 默认第九级重启规则省略 `lvlRestart`，避免 Word 的显式值 8 兼容问题。
- 本地验证执行 `npm test` 和 `npm run build`；界面变更需浏览器操作验证，导出变更需 OOXML 检查和 Word 实测。LibreOffice 渲染不替代 Word 验收。
- 开发服务固定 127.0.0.1:5173。CI 与 Vercel 使用 Node.js 24；Vercel 配置见 vercel.json，上线步骤见 docs/deployment.md。提交、推送与部署需用户明确授权。
