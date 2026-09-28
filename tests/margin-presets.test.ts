import test from 'node:test';
import assert from 'node:assert/strict';
import { createBlankProject, marginPresets, matchingMarginPreset, selectedMarginPreset, validateProject } from '../src/model';
import { buildParts, exportDocument } from '../src/export';
import { importWord } from '../src/import';

const twips = (cm: number) => Math.round(cm * 1440 / 2.54);

test('blank projects use Normal margins and each preset exports the intended page geometry', () => {
  const blank = createBlankProject();
  assert.equal(matchingMarginPreset(blank.page), 'normal');
  assert.equal(selectedMarginPreset(blank.page), 'normal');
  assert.deepEqual({ top: blank.page.top, bottom: blank.page.bottom, left: blank.page.left, right: blank.page.right }, marginPresets.normal);

  for (const [key, margins] of Object.entries(marginPresets)) {
    const page = { ...blank.page, ...margins, mirrorMargins: key === 'mirrored', gutter: 0, header: 1.27 };
    assert.equal(matchingMarginPreset(page), key);
    const project = validateProject({ ...blank, page });
    const parts = buildParts(project);
    const document = String(parts['word/document.xml']);
    const settings = String(parts['word/settings.xml']);
    for (const side of ['top', 'bottom', 'left', 'right'] as const) {
      assert.match(document, new RegExp(`w:${side}="${twips(margins[side])}"`), `${key} ${side}`);
    }
    assert.match(document, /w:gutter="0"/);
    assert.equal(settings.includes('<w:mirrorMargins/>'), key === 'mirrored');
  }
  assert.equal(matchingMarginPreset({ ...blank.page, left: 3 }), undefined);
  assert.equal(selectedMarginPreset({ ...blank.page, customMargins: true }), 'custom');
  assert.equal(selectedMarginPreset({ ...blank.page, gutter: 0.5 }), 'custom');
  assert.equal(selectedMarginPreset({ ...blank.page, left: 3 }), 'custom');
});

test('Custom selection survives the embedded project round trip even with Normal values', () => {
  const project = createBlankProject();
  project.page.customMargins = true;
  const imported = importWord(exportDocument(project), 'custom.docx');
  assert.equal(selectedMarginPreset(imported.project.page), 'custom');
  assert.deepEqual({top:imported.project.page.top,bottom:imported.project.page.bottom,left:imported.project.page.left,right:imported.project.page.right},marginPresets.normal);
});

test('mirrored margins survive the DOCX embedded project round trip', () => {
  const project = createBlankProject();
  project.page = { ...project.page, ...marginPresets.mirrored, mirrorMargins: true };
  const imported = importWord(exportDocument(project), 'mirrored.docx');
  assert.equal(imported.project.page.mirrorMargins, true);
  assert.equal(matchingMarginPreset(imported.project.page), 'mirrored');
});
