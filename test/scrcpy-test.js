'use strict';
const assert = require('assert/strict');
const { buildArgs, ScrcpyWindows } = require('../src/core/scrcpy');

let passed = 0;
let failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log(`  ✓ ${name}`); }
  catch (e) { failed++; console.error(`  ✗ ${name}\n    ${e.message}`); }
}

console.log('\n[scrcpy · 每个应用一个窗口]');

test('竖屏应用：虚拟屏是竖的，并在这块屏上启动应用', () => {
  const a = buildArgs({ serial: 'emulator-5554', pkg: 'com.shopee.vn', title: 'Shopee', width: 720, height: 1280, dpi: 320 });
  assert.deepEqual(a.slice(0, 2), ['-s', 'emulator-5554']);
  assert.ok(a.includes('--new-display=720x1280/320'));
  assert.ok(a.includes('--start-app=com.shopee.vn'));
  assert.ok(a.includes('--window-title=Shopee'));
});

test('横屏应用：宽高互换，不管面板原本是哪个方向', () => {
  const a = buildArgs({ pkg: 'x.y', landscape: true, width: 720, height: 1280, dpi: 320 });
  assert.ok(a.includes('--new-display=1280x720/320'));
  const b = buildArgs({ pkg: 'x.y', landscape: false, width: 1280, height: 720, dpi: 320 });
  assert.ok(b.includes('--new-display=720x1280/320'));
});

test('不转发声音：声音由模拟器自己播，多开时不会叠成多份', () => {
  assert.ok(buildArgs({ pkg: 'x.y' }).includes('--no-audio'));
});

test('没有 serial 时不传 -s', () => {
  assert.ok(!buildArgs({ pkg: 'x.y' }).includes('-s'));
});

test('关闭不存在的窗口不报错', () => {
  const w = new ScrcpyWindows();
  assert.equal(w.close('nope'), false);
  assert.equal(w.count, 0);
  w.closeAll();
});

console.log(`\n结果：${passed} 通过，${failed} 失败`);
if (failed) process.exit(1);
