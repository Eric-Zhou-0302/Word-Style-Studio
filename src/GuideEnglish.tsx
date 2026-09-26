import { Section, Table } from './GuideParts';

export default function GuideEnglish() {
 return <>
 <Section id="start" title="01 · Get started">
 <ol>
 <li><strong>Open the workspace and choose a starting point.</strong> Continue a saved project, start from the example, or start blank. In the example, select “报告正文” (Report body) to adjust fonts and paragraphs; its report styles are independent of one another. A blank project begins with Normal.</li>
 <li><strong>Set up your headings.</strong> Select “一级标题” (Heading 1), “二级标题” (Heading 2), and so on to set font sizes, paragraph spacing, and page-break rules. You can also create a style in the left sidebar.</li>
 <li><strong>Configure your lists.</strong> Use a multilevel list for chapters, a numbered list for steps, and bullets for unordered items. The example’s “标题层级” (Heading hierarchy) already links its first six levels to the corresponding headings; body numbering has two levels, with a separate bulleted list.</li>
 <li><strong>Preview and export a sample.</strong> The right panel shows the overall layout, the selected style or list, and a numbering test. For your first export, enable “Include style samples” in “Export Word” and inspect the downloaded file in Word.</li>
 <li><strong>Export your final file.</strong> Turn off “Include style samples” and choose DOCX or DOTX to download a blank document or template with your style and list definitions.</li>
 </ol>
 <p className="guide-callout">To start from scratch, click the project name at the top and choose “Create blank project.” To remove only styles and lists while keeping body formatting and page settings, use “Clear styles and lists” at the top of the left sidebar.</p>
 <p>The interface language applies to the home page, workspace, and this guide, and is remembered in this browser. Switching languages does not translate style names, list names, or other project content. Names in Chinese below identify the original styles in the Chinese report example.</p>
 </Section>
 <Section id="concepts" title="02 · Understand the essentials">
 <h3>A style gives a set of formatting a name</h3>
 <p>For example, “报告正文” (Report body) can mean SimSun, 12 pt, and 1.5-line spacing, while “一级标题” (Heading 1) can mean SimHei, 20 pt, with space above. Styles let you change similar content together. Formatting selected text directly, such as making it bold or changing its color, can override the style. For Word’s own controls, see <a href="https://support.microsoft.com/en-us/word/customize-or-create-new-styles" target="_blank" rel="noreferrer">Microsoft’s guide to styles</a>.</p>
 <Table heads={['Type', 'Applies to', 'Useful for']} rows={[
 ['Paragraph', 'An entire paragraph, including font and paragraph settings', 'Body text, quotations, captions, list paragraphs'],
 ['Character', 'Selected text, primarily its font formatting', 'Emphasis, terminology, special text'],
 ['Linked', 'Paragraphs or selected text, depending on the selection in Word', 'Formatting that can apply to an entire heading or a short passage'],
 ['Table', 'An entire table and its specified regions', 'Header rows, banding, borders, and shading'],
 ]}/>
 <h3>Inheritance, following paragraphs, and Quick Styles</h3>
 <p><strong>Based on</strong> identifies the source of inherited formatting. If a heading is based on a body style, any property you have not set explicitly follows that body style. Once you set a font size for the heading, changing the body’s size no longer changes it. Use the reset button beside a field to restore inheritance. Without a base style, fields show “Document default”; switches show their effective on/off value, and resetting restores the document default. With a base style, the field shows “Inherited,” and its tooltip identifies the source. <strong>Style for following paragraph</strong> determines the style used after you press Enter in Word. The example’s report headings return to “报告正文” (Report body).</p>
 <p><strong>Quick Styles</strong> are styles marked for convenient access. “Add to Quick Styles” sets that flag; it does not create a second style. Their visibility and order in Word also depend on client settings. See <a href="https://support.microsoft.com/en-us/word/add-and-remove-styles-from-the-quick-styles-gallery" target="_blank" rel="noreferrer">Microsoft’s Quick Styles guide</a>.</p>
 <h3>A list level is different from an outline level</h3>
 <p>Lists determine the bullet or dynamic number before a paragraph. Outline levels describe document structure and are commonly used for navigation and tables of contents. Large text is not automatically a structural heading, and list level 1 does not automatically mean outline level 1. Configure both for structured headings. This app does not generate the contents of a table of contents.</p>
 <p className="guide-callout">Use styles to define how text looks and lists to define how numbers progress, then link them. Typing “1.1” into a heading name or paragraph does not replace dynamic numbering.</p>
 </Section>
 <Section id="workspace" title="03 · Workspace and projects">
 <Table heads={['Area', 'What you can do']} rows={[
 ['Top bar', 'Click the project name to manage it; undo, redo, import, or export Word files'],
 ['Left sidebar', 'Find, select, and create styles or lists; clear or collapse the library at the top; open page settings and the guide at the bottom'],
 ['Center editor', 'Edit the selected item; duplicate or delete it at the top right; use tabs for style settings'],
 ['Right preview', 'Inspect formatting and numbering; collapse the panel at the top right and expand it using the side rail'],
 ['Narrow screens', 'Switch between the style library, settings, and preview'],
 ]}/>
 <h3>The Chinese report example</h3>
 <p>On a first visit to the workspace, or when you create a project from the example, the app loads 29 independent report styles without Normal. None is based on another style. They cover the cover title, contents entries, six heading levels, report body, figure and table captions, sources, footnotes, and table text. “标准表格” (Standard table) is also independent and controls borders, cell padding, and related properties. Separate paragraph styles format header, body, and footer text within cells.</p>
 <p>This example uses A4 portrait, top and bottom margins of 2.75 cm, left and right margins of 2.5 cm, and header and footer distances of 1.5 cm. Latin text and digits inherit Times New Roman; Chinese text uses SimSun, SimHei, or KaiTi according to the style. Report body text has a two-character first-line indent, and headings are followed by the report body style. Contents styles include a right-aligned tab stop with a dotted leader at 16 cm, but no table-of-contents field is created. The footnote style does not insert footnotes. This is a Chinese report example, not a default English-language document standard.</p>
 <p>A saved project takes priority and is never automatically replaced by new defaults. To load the report example, back up your current project, then choose “Use report example” from the project menu.</p>
 <h3>Saving, backups, and undo</h3>
 <p>Valid changes are saved automatically in the current browser. “Saved locally” confirms browser storage, not a downloaded Word file. Resolve any “Needs attention” or save-failure notice first. Different browsers, devices, and website addresses do not share projects automatically. Private browsing or clearing site data can remove saved settings.</p>
 <p>Use “Back up project” at the bottom, or the project name → “Export project backup,” to download JSON. JSON preserves editable settings for transfer and recovery; do not rely on browser storage alone. The top arrows support undo and redo. When an input is not focused, use ⌘Z / Ctrl+Z, adding Shift to redo. Undo history lasts only for the current page session and is lost on refresh.</p>
 <Table heads={['Action', 'Result']} rows={[
 ['Use report example (project menu)', 'Replaces the current project with 29 report styles, 3 list definitions, and example page settings'],
 ['Create blank project (project menu)', 'Replaces it with an untitled project containing only Normal and no lists. Base fonts: SimSun 12 pt and Times New Roman for Latin text; 1.5-line spacing; A4 portrait; 2.54 cm margins; header/footer distances of 1.27 cm'],
 ['Clear styles and lists (sidebar trash icon)', 'Removes all styles except Normal and all lists, keeping body formatting, the project name, and page settings. Creates a basic Normal style if absent and sets its following paragraph style to itself'],
 ['Delete selected item (editor, top right)', 'Removes only that style or list and adjusts inheritance, following-paragraph styles, and list references. Normal can also be deleted'],
 ['Apply imported project', 'Replaces the current project after showing an import report; it does not merge projects'],
 ]}/>
 <p>Replacements and deletions can be undone within the current session’s history, which retains up to 80 edits. Clearing, creating a new project, and deleting an item require confirmation. Opening this guide preserves your editing state; choose “Back to workspace” to continue.</p>
 <p>A project must keep at least one style, so the last style cannot be deleted. If Normal is absent, export adds a default paragraph style.</p>
 <p>If the status says “Recovery needed,” previously saved data could not be read or validated. The app temporarily loads the default example and pauses automatic saving to preserve the original data. Choose “Download recovery file and continue,” then check that the browser saved the file. Automatic saving of the current project resumes afterward. The recovery file preserves raw data; it may need repair before it can be imported again.</p>
 </Section>
 <Section id="styles" title="04 · Create and manage styles">
 <ol><li>Choose “New style” or the plus button in the left sidebar. Enter a name, choose paragraph, character, linked, or table, and select a base style.</li><li>In “General,” check the name, aliases, base style, and following paragraph style. The type is fixed at creation; create another style if you chose the wrong type.</li><li>Adjust fonts, paragraphs, borders, and tab stops as needed. Table styles also have a “Table regions” tab. Character styles do not have paragraph settings.</li><li>For a similar variant, choose “Duplicate style” at the editor’s top right, then change the copy’s name and formatting. It retains the original base and following paragraph styles, but list links must be configured separately.</li></ol>
 <Table heads={['Basic setting', 'Meaning and usage']} rows={[
 ['Name and aliases', 'Style names must be unique across all style types; list names must be unique among lists. A name cannot contain a comma. Separate aliases with commas'],
 ['Based on', 'Only compatible types are allowed, and circular inheritance is not allowed. Normal is an independent base style'],
 ['Style for following paragraph', 'Available for paragraph and linked styles. Body paragraphs usually follow themselves; headings often lead to body text'],
 ['Add to Quick Styles', 'Marks a style for convenient access; enabling it removes the hidden flag'],
 ['Recommended order', 'Lower numbers come first when Word uses the recommended sort order'],
 ['Hide style / Show when used', 'Controls style visibility. Hidden and Quick Style are mutually exclusive'],
 ['Automatically update style', 'Changing the formatting of a paragraph in Word may update the style and other paragraphs using it. Use carefully when maintaining a fixed specification'],
 ]}/>
 <p>For paragraph or linked styles that need numbering, use “General → List link” to select a list level. List links do not inherit from a base style: bind each style that needs numbering separately. Normal cannot be linked to a list, preserving unnumbered blank body text. Create a dedicated list paragraph style instead.</p>
 </Section>
 <Section id="format" title="05 · Fonts, paragraphs, and borders">
 <h3>Fonts</h3>
 <p>Set Chinese and Latin fonts separately, such as SimSun and Times New Roman. Font sizes use points (pt). Bold, italic, underline, text color, and text shading control basic appearance. Naming a font does not embed its files; the device opening the document still needs that font.</p>
 <p>“Character spacing” controls spacing, horizontal scaling, vertical position, and kerning. Strikethrough, superscript, and subscript appear under “Font”; “Text effects and proofing” covers case, hidden text, outline, shadow, proofing language, and related options. OpenType ligatures, number forms, and number spacing depend on font support and may not be fully previewed in the browser. Check them in Word. Text shading is different from highlighter-style highlighting, which is not offered as a style property.</p>
 <h3>Paragraphs</h3>
 <Table heads={['Settings', 'How they work']} rows={[
 ['Alignment and indentation', 'Choose left, justified, or another alignment. Left/right indents set the paragraph area; a first-line indent affects only the first line, and a negative value creates a hanging indent. Use centimeters or characters'],
 ['Spacing and line spacing', 'Before/after spacing adds space between paragraphs, in points or lines. Multiple line spacing follows font size; Exactly fixes line height; At least allows taller content'],
 ['Line and page breaks', 'Keep with next helps headings stay with the next paragraph; Keep lines together keeps a paragraph intact; Page break before starts a new page; widow/orphan control reduces isolated lines at page boundaries'],
 ['Outline level', 'Use body-text level for body paragraphs and the appropriate level for structural headings. Configure it separately from the list level'],
 ['Chinese typography and advanced settings', 'Controls punctuation overflow, line-break rules, spacing between Chinese and Latin text, grid alignment, and related options. Results depend on Word’s layout environment'],
 ]}/>
 <h3>Borders, shading, and tab stops</h3>
 <p>Use “Borders and tabs” to set paragraph borders by side, line style, color, width, and distance from text, or add paragraph shading. Tab stops determine where text aligns after Tab. They support left, center, right, decimal, and other alignments, with optional leaders such as dots.</p>
 <p>Tab stops inherit by position. Set a position to “Clear this position” to remove an inherited stop; leaving the current style’s tab list empty does not clear its base style’s stops. Paragraph tab stops are separate from a list’s “Follow number with” tab and list tab position. If numbers do not align, check the list’s positioning first.</p>
 </Section>
 <Section id="tables" title="06 · Table styles">
 <p>Alignment in “Cell paragraphs” controls text inside cells. To center the entire table on the page, open “Table regions → Whole table” and set “Table alignment” to “Center.”</p>
 <ol><li>Create a table style and open “Table regions.”</li><li>Under “Whole table,” set whole-table alignment, cell padding on all four sides, cell spacing, vertical alignment, borders, and shading.</li><li>Select the header row, last row, first or last column, odd/even row or column bands, or corner cells, then enable formatting for that region.</li><li>Set that region’s shading, borders, fonts, and paragraphs. Disabling the region removes only its own settings; the whole table, base style, and overlapping regions can still affect it.</li><li>After exporting, insert a table in Word, apply the table style, and enable the matching Header Row, Banded Rows, or other options in Table Design. Paragraph styles applied inside cells may override table text formatting.</li></ol>
 <p>Row and column band sizes determine how many rows or columns form each alternating band; supported sizes are 1–3. Regions can overlap: the top-left cell is also in the header row and first column. Check the combined result in Word. A blank export does not insert a table; enable “Include style samples” to generate a sample table.</p>
 </Section>
 <Section id="lists" title="07 · Bullets and numbered lists">
 <Table heads={['List type', 'Purpose', 'Example']} rows={[
 ['Bullets', 'Unordered items without increasing numbers', '• Complete materials  • Consistent formatting'],
 ['Numbered list', 'A single sequence of steps', '1. Prepare  2. Review  3. Submit'],
 ['Multilevel list', 'Hierarchical structures', '1 → 1.1 → 1.1.1; numbers and bullets can be mixed'],
 ]}/>
 <h3>Bullets</h3>
 <p>Choose “New bulleted list,” name it, and select a dot, hollow circle, square, diamond, or another preset. You can also enter a custom bullet character. Picture bullets support PNG/JPG files up to 1 MB; adjust the image’s width and height or remove it. Choosing a text-bullet preset removes the previous image.</p>
 <p>Bullets do not have increasing numbers, so “Start at,” “Restart numbering,” and “Legal-style numbering” are hidden. The same applies to a bullet level in a multilevel list. Switching back to numeric numbering retains the previous starting value.</p>
 <h3>Numbered lists</h3>
 <p>Choose “New numbered list,” select decimal, zero-padded decimal, Roman, letter, Chinese, or another number format, and set “Start at.” For example, a starting value of 5 and format text <code>%1.</code> produces 5., 6., 7. Placeholders represent dynamic numbers; parentheses and other literal text appear unchanged. A single-level list uses only <code>%1</code>.</p>
 <h3>Position, font, and style links</h3>
 <p>“Number alignment” aligns the marker itself left, center, or right. “Text indent” places the item’s text, and “Number position” places its marker. “Follow number with” supports a tab, a space, or nothing; when using a tab, set its position too. The numbering font follows the linked style or the paragraph it is applied to by default. Following values are read-only; linked-style values are only preview references. Choose “Override” for a property to edit and fix it, or “Follow paragraph” to remove its override. The heading shows how many properties are set separately, and “Reset all to follow paragraph” clears them together.</p>
 <p>Link a dedicated paragraph style, such as “Steps” or “Bullet text.” Applying that style in the exported Word file brings in the list definition. For background, see <a href="https://support.microsoft.com/en-au/word/define-new-bullets-numbers-and-multilevel-lists" target="_blank" rel="noreferrer">Microsoft’s guide to defining lists</a>.</p>
 </Section>
 <Section id="multilevel" title="08 · Multilevel lists and style links">
 <ol><li>Create a multilevel list or select the example’s “标题层级” (Heading hierarchy). Each multilevel list has nine levels; you can use only those you need.</li><li>Select 1–9 to edit a level. Configure its number format, format text, starting value, and positions separately.</li><li>Use “Link to style” to connect that level to a heading or body style. You can also set the link from the style’s “List link” controls.</li><li>Choose whether lower levels restart after a higher level appears, then inspect a sequence in the right panel’s numbering test.</li></ol>
 <Table heads={['Example level', 'Number format / format text', 'Initial result']} rows={[
 ['Level 1', 'Chinese numbers / 第%1章', '第一章 (Chapter One)'],
 ['Level 2', 'Decimal / %1.%2', '一.1 (preserves the higher level’s Chinese format)'],
 ['Level 2 with legal-style numbering', 'Decimal / %1.%2', '1.1 (referenced numbers use decimal digits)'],
 ['Level 3', 'Decimal / （%3）', '（1）'],
 ]}/>
 <p><code>%1</code> is the level 1 counter, <code>%2</code> is level 2, and so on. A level may reference itself and higher levels, but not a lower level that has not been reached. Enter your own separators, for example <code>%1.%2</code> or <code>%1-%2</code>.</p>
 <h3>Restarting numbers</h3>
 <p>If level 2 starts at 1 and restarts after level 1, moving from chapter one to chapter two resets level 2 to 1. Choose “Never restart” to keep counting. These settings define the list rule. Continuing or restarting numbering for an individual paragraph in Word is a body-editing operation outside this app.</p>
 <h3>Linking rules and advanced settings</h3>
 <p>Each level can link to one paragraph or linked style, and each style can link to one level. If a link conflicts, a confirmation asks whether to transfer it. Character styles, table styles, and Normal cannot link to lists. Duplicating a list clears the copy’s style links; select them again.</p>
 <p>“Default list level” determines the level used when applying a named list style. “LISTNUM name” is for Word’s LISTNUM field and is usually unnecessary for ordinary heading numbering; leaving it blank uses the list name. Named lists may appear differently in Word’s galleries depending on its version and settings. A fixed gallery position is not guaranteed.</p>
 </Section>
 <Section id="preview" title="09 · Page settings and live preview">
 <p>“Page setup” supports A4, A5, and Letter; portrait or landscape; all four margins; a gutter; header distance from the top; footer distance from the bottom; and default tab spacing. Values that consume too much of the page’s text area produce validation errors and must be corrected before export. Header and footer distances are exported, but the app does not add their content or preview those areas.</p>
 <Table heads={['Preview mode', 'What it shows']} rows={[
 ['Document', 'For the report example, switch among cover, contents, body, and figure/table scenes. Selecting a matching style switches scenes. Samples are not the body of your imported file'],
 ['Selected style / Selected list', 'Focuses on the selected item to inspect its settings'],
 ['Numbering test', 'Available when a list is selected. Test progression and returns across all nine levels, repeat the current level, change parent levels, or enter a custom sequence of levels 1–9 with up to 100 items. Single-level lists accept only level 1. Tests use the current start values, formats, and restart rules'],
 ]}/>
 <p className="guide-callout">The preview helps you understand style relationships; it is not Word’s layout engine. Pages grow with sample content instead of paginating like Word. Check “Page break before,” “Keep with next,” and other pagination rules in Word. Tabs and advanced font effects are approximations; hidden text remains visible in a lighter color.</p>
 <p>Table previews combine fonts, paragraph settings, shading, and borders from base styles and conditional regions, grouping bands by their sizes. Samples expand to show two bands. In “Selected style,” toggle the header row, last row, first/last columns, and row/column bands separately. These switches affect only the preview, not the export. Overlapping regions follow precedence rules; turn off column bands when inspecting row bands if needed. Browser border conflict handling and table positioning may differ from Word, so export samples to verify. Browser report scenes and exported inspection samples use different content and do not correspond item by item.</p>
 </Section>
 <Section id="import" title="10 · Import existing files">
 <ol><li>Choose “Import” in the top bar or “Import project or Word file” from the project menu.</li><li>Select JSON, DOCX, or DOTX up to 10 MB. Uncompressed Word contents must not exceed 40 MB. Legacy .doc, macro-enabled formats, and encrypted files are unsupported.</li><li>Read the import review: check the project name, style and list counts, and every import note.</li><li>Only “Apply project” replaces your current settings; canceling leaves them unchanged. Download a JSON backup of your current project first.</li></ol>
 <Table heads={['Source', 'Import behavior']} rows={[
 ['This app’s JSON backup', 'Restores the complete editable project, including styles, lists, and page settings, after validation. Invalid settings need repair first'],
 ['DOCX / DOTX exported by this app', 'Prioritizes the embedded project backup to recover the app’s settings'],
 ['Other Word documents / templates', 'Parses supported styles, lists, and page properties. Unsupported or incomplete mappings are reported'],
 ]}/>
 <p><strong>Body content is not preserved.</strong> Importing is not editing the original Word file online. Body text, headers, footers, comments, tracked changes, macros, and similar content are not retained in a new export. External picture bullets are not imported, and other special settings may be lost. This is not a lossless converter.</p>
 <p>External Word imports are limited to 200 styles and 30 lists; missing levels in multilevel lists are filled out to nine. For multi-section documents, only the last section’s page settings are used. Custom paper sizes become A4. These adjustments appear in the import notes. An external file’s automatically-update-style flag is restored as defined and can be checked under “General.”</p>
 <p><strong>Take care when reimporting an app-exported file edited in Word.</strong> Editing in Word does not update the embedded project, so importing may restore the original browser settings rather than your latest Word formatting. There is currently no interface option to ignore the embedded project; the import report explains this. The app only falls back to parsing supported Word styles when the embedded project is absent or invalid. Keep the original file and check the result.</p>
 </Section>
 <Section id="export" title="11 · Export and use files in Word">
 <ol><li>Resolve any “Needs attention” status, then choose “Export Word.”</li><li>Select a DOCX document or DOTX template and optionally enable “Include style samples.”</li><li>Open the download in desktop Word. By default, the body is blank, but style and list definitions are already in the file.</li><li>When writing, place the cursor in a paragraph and apply a paragraph or heading style. Apply character styles to selected text and table styles to tables. A style linked to numbering brings in its list formatting.</li></ol>
 <Table heads={['Format', 'Best used for']} rows={[
 ['DOCX', 'Opening the file and writing directly in that document'],
 ['DOTX', 'Creating new documents from a reusable template. This is a real template format, not just a renamed extension'],
 ['JSON', 'Backing up browser settings, transferring to another device, or continuing to edit. It is not a Word document'],
 ]}/>
 <p>Use Word’s template workflow to create documents from a DOTX; the entry point differs between systems. See <a href="https://support.microsoft.com/en-us/word/save-a-word-document-as-a-template" target="_blank" rel="noreferrer">Microsoft’s Word template guide</a>. Exports do not contain macros, install fonts, or modify Word’s global default template.</p>
 <p>If a style does not appear in the Quick Styles gallery, find it in Word’s Styles pane and check “Add to Quick Styles,” “Hide style,” and Word’s display and sorting settings. Apply numbering through a style or list instead of typing numbers manually over it.</p>
 </Section>
 <Section id="example" title="12 · Build a three-level report template">
 <p>Goal: consistent body formatting, automatic headings numbered 1, 1.1, and 1.1.1, with lower levels restarting at 1 in each new chapter. Start from the Chinese report example. The font choices below illustrate that example; adapt them to your own document’s language and requirements.</p>
 <ol><li><strong>Body:</strong> select “报告正文” (Report body). Set the Chinese font to SimSun, Latin font to Times New Roman, size to 12 pt, and line spacing to 1.5.</li><li><strong>Headings:</strong> select “一级标题,” “二级标题,” and “三级标题” (Heading 1–3). Set SimHei and decreasing sizes such as 20 / 16 / 14 pt. Adjust paragraph spacing and enable “Keep with next.” These are example values, not a universal standard.</li><li><strong>Structure:</strong> in each heading’s paragraph settings, check outline levels 1 / 2 / 3. Set the following paragraph style to “报告正文” (Report body).</li><li><strong>List:</strong> select “标题层级” (Heading hierarchy). Set the first three levels to decimal numbering and use <code>%1</code>, <code>%1.%2</code>, and <code>%1.%2.%3</code>. Set each starting value to 1.</li><li><strong>Links and restarts:</strong> link level 1 to Heading 1, level 2 to Heading 2 and restart it after level 1, and level 3 to Heading 3 and restart it after level 2. The example normally already has these links; verify them.</li><li><strong>Check:</strong> use the numbering test to inspect 1 → 1.1 → 1.1.1, followed by 2 → 2.1 → 2.1.1 in the next chapter. If the result differs, check each level’s format and restart condition.</li><li><strong>Finish:</strong> export a DOCX with style examples and inspect fonts, alignment, and numbering. Then export a blank DOTX and save a separate JSON backup.</li></ol>
 <p>Create separate paragraph styles for ordinary bullets and steps, linking them to their own bulleted or numbered lists. This keeps heading-level links available for headings.</p>
 </Section>
 <Section id="faq" title="13 · Questions and limitations">
 <h3>Why did changing body text also change a heading?</h3>
 <p>The heading is based on the body style and has not overridden that property. Set the property explicitly to make it independent, or use the reset button beside the field to restore inheritance.</p>
 <h3>Where did the starting number setting go?</h3>
 <p>The current level uses bullets or no numbering, neither of which needs an increasing starting value. Switch back to a numeric format to see the setting.</p>
 <h3>Why can’t I link one style to several levels?</h3>
 <p>The app uses a unique link to determine which list and level to apply with a style. Create separate paragraph or linked styles for different levels. Normal must remain unnumbered and cannot link to a list.</p>
 <h3>Why does the exported file look empty?</h3>
 <p>A blank template is the default: formatting rules live in the style and list definitions. Enable “Include style samples” for visible sample content. To use the original body text, return to the original file; importing does not preserve its body.</p>
 <h3>Why does Word look different from the preview?</h3>
 <p>Check installed fonts, applied styles, direct formatting overrides, and table header/banding options first. The browser is not Word’s layout engine; advanced fonts, complex tables, and pagination need checking in the client you use.</p>
 <h3>Can I recover after clearing? What about refreshing?</h3>
 <p>Use undo immediately after clearing; history retains up to 80 edits. Refreshing loses that history, so you will need a previously saved JSON backup or a recoverable Word file. There is no cloud version history or recycle bin.</p>
 <h3>Are files uploaded? Is collaboration available?</h3>
 <p>Import parsing, editing, and exporting happen locally in your browser. There are no accounts, cloud synchronization, or collaboration features. Microsoft reference links open external websites but do not automatically upload your project files.</p>
 <h3>What is currently supported?</h3>
 <p>The app covers four style types, inheritance and Quick Styles, fonts and paragraphs, borders and tab stops, conditional table regions, three list types, style links, page settings, import, and export. Each project supports up to 200 styles and 30 lists, with nine levels per multilevel list.</p>
 <p>It does not cover all Word capabilities, including global keyboard shortcuts, formatting restrictions and style locking, dynamic theme fonts, every language’s numbering system, decorative borders, document-grid dimensions, or external picture-bullet import. It does not edit body content or generate table-of-contents content, and cannot guarantee identical results across Word/WPS versions. External imports are lossy; keep important originals.</p>
 </Section>
 </>;
}
