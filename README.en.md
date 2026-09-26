<div align="center">

[简体中文](README.md) &nbsp; / &nbsp; **English**

<img src="public/favicon.svg" width="72" height="72" alt="Word Style Studio logo" />

# 字序

**Word Style Studio**

### Set your styles. Focus on your writing.

Create styles and numbering rules in your browser,<br />
and make thoughtful formatting the starting point for your next document.

**Local processing** &nbsp; · &nbsp; **No account required** &nbsp; · &nbsp; **Native Word styles**

[Use online](https://docxstyle.com/) &nbsp; / &nbsp; [Get started](#get-started) &nbsp; / &nbsp; [Download](https://github.com/Eric-Zhou-0302/Word-Style-Studio/releases/latest) &nbsp; / &nbsp; [Share feedback](https://github.com/Eric-Zhou-0302/Word-Style-Studio/issues)

<br />

<img src="public/images/workspace-preview.png" width="960" alt="Word Style Studio workspace with a style library, formatting controls, and live document preview" />

<sub>Styles, lists, and preview — together in one workspace.</sub>

</div>

<br />

## Define once, reuse across documents

Report titles, paragraph indents, figure captions, multilevel numbering — stop setting them up from scratch. Word Style Studio saves your formatting as native Word styles. Export a file, apply your styles in Word, and start writing.

| Create styles | Organize numbering |
| :--- | :--- |
| Configure paragraph, character, linked, and table styles, including fonts, paragraph formatting, inheritance, and the Quick Styles gallery. | Create bulleted lists, single-level numbering, and multilevel lists with up to nine levels. Link list levels to paragraph styles. |
| **Keep tables consistent** | **Save reusable templates** |
| Set borders, shading, cell text, and formatting for regions such as header rows, last rows, and alternating bands. | Configure page size and margins, export DOCX or DOTX files, and back up your complete configuration as JSON. |

## Get started

Open **[docxstyle.com](https://docxstyle.com/)** to use Word Style Studio in your browser. No installation or account is required.

The app interface and built-in user guide are currently in Chinese. Chinese labels are included below to help you find the relevant controls.

### 01 / Choose a starting point

**Start from an example (从示例开始)** — Use **29 independent styles and 3 list definitions** covering report titles, table-of-contents entries, six heading levels, body text, figure and table captions, and tables. A starting point for adapting an existing formatting scheme.

**Start blank (从空白开始)** — Begin with only the basic body-text style and build your own configuration.

**Continue editing (继续编辑)** — Resume the configuration saved in your browser, or import JSON, DOCX, or DOTX files.

### 02 / Adjust and preview

Select a style or list in the left sidebar, then configure fonts, paragraphs, numbering, and page settings. Check the live preview on the right and use the numbering test to inspect levels and restart rules.

For your first export, enable **Include style examples (包含样式示例)** and check the result in Word.

### 03 / Export and start writing

Turn off “Include style examples” to create a document or template with an empty body and your formatting ready to use.

| What you want to do | Choose |
| :--- | :--- |
| Open the file and start writing | **DOCX document** |
| Reuse the same formatting for new documents | **DOTX template** |
| Back up your settings or continue on another device | **JSON configuration** |

> For detailed instructions and an introduction to Word styles, open “使用文档” on the home page or “使用说明” in the workspace.

## Run on your computer

Download and extract the [latest source release](https://github.com/Eric-Zhou-0302/Word-Style-Studio/releases/latest). Install **Node.js 24**, then run these commands in the project folder:

```sh
npm ci
npm run dev
```

Open **[127.0.0.1:5173](http://127.0.0.1:5173)** to get started.

## Keep your files local — and your settings backed up

Documents are parsed and exported in your browser; their contents are not uploaded. Changes are saved automatically in the current browser. Use JSON to transfer your configuration when switching devices, browsers, or website addresses.

> **Important:** Creating a new configuration replaces the current one after confirmation. Back up your settings before clearing browser data. Undo history does not survive a page refresh or closing the page.

## A few things to know

<details>
<summary><strong>Can I edit the body of a Word document here?</strong></summary>

Word Style Studio configures formatting and templates. Write the document itself in Word. Defining table-of-contents styles does not generate a table of contents, and defining footnote styles does not insert footnotes.

</details>

<details>
<summary><strong>Will the browser preview look exactly like Word?</strong></summary>

The preview helps you inspect formatting, but it is not Word’s layout engine. Pagination, fonts, tab stops, and some table effects may differ. Check important documents in the version of Word you use, and make sure the required fonts are installed on your device.

</details>

<details>
<summary><strong>Can I import an existing Word file?</strong></summary>

You can import DOCX, DOTX, and JSON configurations. For external Word files, the app extracts supported styles, lists, and page settings. It does not import body content or reproduce every Word feature. Review the information shown before importing and keep the original file.

**Word files exported by this app contain an embedded configuration, which takes priority when imported again.** Editing styles in Word does not update that embedded configuration, so importing the file again may restore earlier settings from the app.

</details>

<details>
<summary><strong>Why is the text centered but the table is not?</strong></summary>

“单元格段落” (Cell paragraphs) controls the text inside cells. To center the table itself on the page, go to “表格区域” → “整个表格” (Table region → Whole table) and set “整张表格对齐” (Whole-table alignment).

</details>

<br />

---

**Help make Word Style Studio better** &nbsp; · &nbsp; [Issues and suggestions](https://github.com/Eric-Zhou-0302/Word-Style-Studio/issues) &nbsp; · &nbsp; [Changelog](CHANGELOG.md) &nbsp; · &nbsp; [Security](SECURITY.md)

Licensed under [PolyForm Noncommercial 1.0.0](LICENSE). Commercial use requires separate permission. [Licensing details](docs/licensing.md) · [Third-party notices](public/THIRD_PARTY_NOTICES.txt)

<div align="center">

<br />

[Eric Zhou](https://ericzhou.net/)

</div>
