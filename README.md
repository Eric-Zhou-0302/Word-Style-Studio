<div align="center">

**简体中文** &nbsp; / &nbsp; [English](README.en.md)

<img src="public/favicon.svg" width="72" height="72" alt="字序 Logo" />

# 字序

**Word Style Studio**

### 把格式设好，让写作更专注。

在浏览器中建立样式与编号规则，<br />
把每一次精心排版，变成下一份文档的起点。

**本地处理** &nbsp; · &nbsp; **无需账号** &nbsp; · &nbsp; **原生 Word 样式**

[在线使用](https://docxstyle.com/) &nbsp; / &nbsp; [开始使用](#开始使用) &nbsp; / &nbsp; [下载版本](https://github.com/Eric-Zhou-0302/Word-Style-Studio/releases/latest) &nbsp; / &nbsp; [反馈建议](https://github.com/Eric-Zhou-0302/Word-Style-Studio/issues)

<br />

<img src="public/images/workspace-preview.png" width="960" alt="字序工作区：样式目录、格式设置与文档实时预览" />

<sub>样式、列表与预览，在一个工作区中完成。</sub>

</div>

<br />

## 一套规则，多次复用

报告标题、正文缩进、图表题注、多级编号……不用每次重新调整。字序将这些格式保存为 Word 原生样式，导出后，在 Word 中应用样式即可开始写作。

| 建立样式 | 整理编号 |
| :--- | :--- |
| 配置段落、字符、链接和表格样式，管理字体、段落、继承关系与快速样式。 | 创建项目符号、单级编号及九级多级列表，将列表层级与段落样式关联。 |
| **统一表格** | **保存为模板** |
| 设置边框、底纹、单元格文字，以及表头、末行、条带等区域格式。 | 配置页面尺寸和页边距，导出 DOCX 或 DOTX；用 JSON 备份完整方案。 |

## 开始使用

访问 **[docxstyle.com](https://docxstyle.com/)**，无需安装或注册账号，即可在浏览器中使用。

### 01 / 选择一个起点

**从示例开始** — 内置 **29 个独立样式、3 套列表**，覆盖报告标题、目录条目、六级标题、正文、图表说明与表格。适合在现成规范上调整。

**从空白开始** — 仅保留基础正文样式，逐步建立自己的格式。

**继续编辑** — 恢复当前浏览器保存的方案，也可以导入 JSON、DOCX 或 DOTX。

### 02 / 调整并预览

在左侧选择样式或列表，设置字体、段落、编号和页面。右侧查看实时预览，用编号测试检查层级与重启规则。

第一次使用时，建议导出一份**包含样式示例**的文件，在 Word 中检查实际效果。

### 03 / 导出，开始写作

关闭“包含样式示例”，获得一份正文为空、格式已就绪的文档或模板。

| 你想要…… | 选择 |
| :--- | :--- |
| 打开文件，直接开始写作 | **DOCX 文档** |
| 每次新建都使用同一套格式 | **DOTX 模板** |
| 备份设置，或换设备继续编辑 | **JSON 方案** |

> 使用方法与 Word 样式基础知识，可在首页“使用文档”或工作区“使用说明”中查看。

## 在自己的电脑上运行

下载 [最新版本源码](https://github.com/Eric-Zhou-0302/Word-Style-Studio/releases/latest) 并解压。安装 **Node.js 24** 后，在项目目录运行：

```sh
npm ci
npm run dev
```

打开 **[127.0.0.1:5173](http://127.0.0.1:5173)**，即可开始使用。

## 文件留在本地，方案记得备份

文档解析与导出在浏览器内完成，不上传文档内容。修改会自动保存在当前浏览器；更换设备、浏览器或网站地址时，请通过 JSON 迁移。

> **重要：**新建方案会替换当前方案，操作前会提示确认。清理浏览器数据前请先备份；刷新或关闭页面后，原来的撤销历史不再保留。

## 使用前，你可能想了解

<details>
<summary><strong>字序可以直接编辑 Word 正文吗？</strong></summary>

字序用于设置格式与模板，正文写作在 Word 中完成。目录样式不会自动生成目录，脚注样式也不会自动插入脚注。

</details>

<details>
<summary><strong>网页预览与 Word 中的效果完全一致吗？</strong></summary>

网页预览用于辅助检查，不等同于 Word 排版引擎。分页、字体、制表位和部分表格效果可能不同，重要文档请在实际使用的 Word 中检查。使用设备也需要安装对应字体。

</details>

<details>
<summary><strong>能导入已有的 Word 文件吗？</strong></summary>

可以导入 DOCX、DOTX 和方案 JSON。外部 Word 文件只提取支持的样式、列表与页面设置，不导入正文，也不能完整还原全部 Word 功能。导入前会显示说明，请保留原文件。

**本工具导出的 Word 文件包含内嵌方案，回导时优先恢复它。** 在 Word 中修改样式不会同步更新内嵌方案，因此回导可能恢复较早的网页设置。

</details>

<details>
<summary><strong>为什么文字居中了，表格却没有居中？</strong></summary>

“单元格段落”控制单元格内的文字。要让整张表格在页面中居中，请在“表格区域” → “整个表格”中设置“整张表格对齐”。

</details>

<br />

---

**一起把字序做得更好** &nbsp; · &nbsp; [问题与建议](https://github.com/Eric-Zhou-0302/Word-Style-Studio/issues) &nbsp; · &nbsp; [更新记录](CHANGELOG.md) &nbsp; · &nbsp; [安全反馈](SECURITY.md)

本项目采用 [PolyForm Noncommercial 1.0.0](LICENSE) 非商业许可，商业用途需另行授权。[许可说明](docs/licensing.md) · [第三方声明](public/THIRD_PARTY_NOTICES.txt)

<div align="center">

<br />

[Eric Zhou](https://ericzhou.net/)

</div>
