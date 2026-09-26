import test from 'node:test';
import assert from 'node:assert/strict';
import { formatUI, translateUI } from '../src/i18n';
import { translateDiagnostic } from '../src/diagnostics';
import { createProject } from '../src/model';

test('UI interpolation preserves user values even when they match interface labels', () => {
  for (const name of ['名称', '无', '页面设置', '开启', '继承', '第%1章', '{0}', '样式“无”']) {
    assert.equal(formatUI('删除“{0}”？', 'en', name), `Delete “${name}”?`);
    assert.equal(formatUI('删除“{0}”？', 'zh', name), `删除“${name}”？`);
    assert.equal(formatUI('基础样式“{0}”', 'en', name), `base style “${name}”`);
  }
});

test('localization does not mutate project data or translate unknown text', () => {
  const project = createProject();
  project.name = '名称';
  const before = JSON.stringify(project);
  translateUI('页面设置', 'en');
  formatUI('第 {0} 级', 'en', 9);
  assert.equal(JSON.stringify(project), before);
  assert.equal(translateUI('Custom name 用户名称', 'en'), 'Custom name 用户名称');
});

test('known diagnostics translate without translating names inside messages', () => {
  assert.equal(translateDiagnostic('方案名称不能为空', 'en'), 'Project name cannot be empty');
  assert.equal(translateDiagnostic('第 9 级只能引用当前级和上级编号', 'en'), 'Level 9 can reference only itself and higher levels');
  assert.equal(translateDiagnostic('样式“开启”的后续段落样式不存在，已使用正文。', 'en'), 'Style “开启” has a missing following-paragraph style. Normal was used instead.');
  assert.equal(translateDiagnostic('样式“无”条件区域：复杂文字字号未单独导入。', 'en'), 'Style “无” · conditional region: complex-script font sizes were not imported separately.');
  assert.equal(translateDiagnostic('列表“继承”第 2 级覆盖：重启层级无效，采用默认规则。', 'en'), 'List “继承”, level 2 override: the restart level is invalid; the default rule was used.');
  assert.equal(translateDiagnostic('文件内嵌方案无法恢复，已改为提取 Word 样式：方案名称不能为空', 'en'), 'The embedded project could not be restored. Word styles were extracted instead: Project name cannot be empty');
  assert.equal(translateDiagnostic('unknown diagnostic 用户名称', 'en'), 'unknown diagnostic 用户名称');
  assert.equal(translateDiagnostic('方案名称不能为空', 'zh'), '方案名称不能为空');
});
