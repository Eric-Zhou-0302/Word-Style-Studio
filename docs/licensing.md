# 许可证与第三方声明

字序 Word 样式工作室采用 **PolyForm Noncommercial License 1.0.0**。许可范围以根目录 [LICENSE](../LICENSE) 的英文完整条款为准；本说明是使用提示，不替代或修改条款。商业用途不在该标准许可授权范围内，需要事先获得 Eric Zhou 的另行授权。

这是允许特定用途的源码可用（source-available）项目，不称为 OSI 意义上的开源软件。OSI 的开放源代码定义要求不得限制商业等使用领域；本项目选择了非商业限制。[OSI 定义第 6 项](https://opensource.org/osd#6-no-discrimination-against-fields-of-endeavor)

## 非商业许可的边界

- 标准条款允许非商业用途，以及无预期商业应用的个人学习、研究、实验、测试、娱乐和业余项目等用途。
- 标准条款明确允许所列慈善、教育、公共研究、公共安全或卫生、环保及政府机构使用，不受其资金来源或资金附带义务影响。这是原文固有的许可范围，不能把“禁止商用”自行扩大成对这些机构的全面禁止。
- 向客户收费提供基于本软件的服务、转售、商业产品集成等用途，应先取得另行授权。“免费提供”本身不等于“非商业”；企业内部使用或制作商业交付物也不能仅因没有单独出售软件就视为已获许可。
- 复制、修改及再分发仍须符合条款，保留许可全文或其官方 URL，以及所有 `Required Notice:` 声明。
- 该许可约束本软件及其受保护的改编作品，不把用户独立创作的正文自动改为本项目源码；也不额外授予第三方字体、导入文档、图片或其他内容的权利。使用软件本身仍须处于许可范围内。

商业授权联系维护者的 [GitHub 主页](https://github.com/Eric-Zhou-0302)。未获得明确的另行授权前，应遵守现有非商业条款。

## 原文来源与分发

`LICENSE` 包含项目的 `Required Notice: Copyright (c) 2026 Eric Zhou. 字序 Word 样式工作室.`，随后完整保留官方标准文本；没有改写其定义或条款。标准原文取自 [PolyForm 官方源仓库的 1.0.0 文件](https://github.com/polyformproject/polyform-licenses/blob/1.0.0/PolyForm-Noncommercial-1.0.0.md)。正文中的示例 `Yoyodyne, Inc.` 是官方条款的原有例子，不是本项目著作权人。

[public/LICENSE.txt](../public/LICENSE.txt) 是项目许可的相同副本，构建时由 Vite 复制到站点根路径 `/LICENSE.txt`。[public/THIRD_PARTY_NOTICES.txt](../public/THIRD_PARTY_NOTICES.txt) 随部署提供第三方运行依赖的完整许可和版权声明。再分发站点或构建文件时须一起保留这些文件。

## 依赖许可核对

以下版本以当前 `package-lock.json` 为准；核对了锁文件元数据及已安装 npm 包的许可证原文。项目的非商业许可不改变第三方依赖自身的许可，也不声称拥有第三方代码版权。

| 进入浏览器运行依赖集合的包 | 锁定版本 | 许可 |
| --- | --- | --- |
| `fflate` | 0.8.3 | MIT |
| `lucide-react` | 0.468.0 | ISC；包内说明其中 Feather 来源部分适用 MIT |
| `react` | 19.3.0 | MIT |
| `react-dom` | 19.3.0 | MIT |
| `scheduler`（间接依赖） | 0.28.0 | MIT |
| `zod` | 4.6.5 | MIT |

第三方声明保留上述包的完整许可，同时保留 Lucide 声明涉及的 Feather MIT 许可。构建结果还含有 Vite 7.3.6 生成的浏览器预加载辅助代码，因此附带 Vite core 的 MIT 许可；这不表示站点分发了整个 Vite 开发服务器。不能用本项目 LICENSE 代替这些声明。

开发与构建依赖还包含 Apache-2.0、BSD-3-Clause、ISC、MIT 和 CC-BY-4.0（`caniuse-lite` 数据）。它们的原始许可仍由相应 npm 包提供。当前部署只发布 `dist/`，不打包 `node_modules/` 或开发工具；若以后再分发构建工具、依赖源码或容器镜像，应按实际分发内容重新核对并附带相应声明。

## 升级依赖时

1. 更新 `package-lock.json` 后运行 `npm ci`，重新核对生产依赖及其间接依赖的许可证文件，不能只看顶层包名或 SPDX 字段。
2. 同步更新上表和 `public/THIRD_PARTY_NOTICES.txt` 中的版本、许可全文与版权声明；新增依赖、内嵌代码、字体或素材也要检查。
3. 若修改项目 LICENSE，同步 `public/LICENSE.txt`，并确认它们完全相同。
4. 执行 `npm test` 与 `npm run build`，检查 `dist/LICENSE.txt`、`dist/THIRD_PARTY_NOTICES.txt` 仍与 `public/` 中的文件一致。
