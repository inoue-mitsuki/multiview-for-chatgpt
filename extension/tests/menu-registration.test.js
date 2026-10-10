const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const source = fs.readFileSync(path.join(__dirname, "..", "background.js"), "utf8");

function fixture() {
  const removes = [], creates = [], errors = [];
  let installed, startup;
  const chrome = {
    runtime: { onInstalled: { addListener(fn) { installed = fn; } }, onStartup: { addListener(fn) { startup = fn; } } },
    contextMenus: { removeAll(fn) { removes.push(fn); }, create(item, fn) { creates.push({ item, fn }); }, onClicked: { addListener() {} } },
    action: { onClicked: { addListener() {} } }
  };
  vm.runInNewContext(source, { chrome, URL, console: { error(...args) { errors.push(args); } } });
  const complete = (fn, error) => {
    chrome.runtime.lastError = error ? { message: error } : undefined;
    fn();
    delete chrome.runtime.lastError;
  };
  return { installed, startup, removes, creates, errors, complete };
}

test("並行するinstall/startupメニュー登録を作成完了まで1系列にまとめる", () => {
  const f = fixture();
  f.installed({ reason: "chrome_update" }); f.startup();
  assert.equal(f.removes.length, 1);
  f.complete(f.removes[0]);
  assert.equal(f.creates.filter(entry => entry.item.id.startsWith("chatgpt-split-pane-")).length, 4);
  assert.equal(new Set(f.creates.map(entry => entry.item.id)).size, f.creates.length, "作成IDを重複させない");
  f.startup();
  assert.equal(f.removes.length, 1, "create完了前も再登録を開始しない");
  f.creates.forEach(entry => f.complete(entry.fn));
  f.startup();
  assert.equal(f.removes.length, 2, "完了後は再登録できる");
});

test("removeAll/create失敗を報告して次回登録を許可する", () => {
  const f = fixture();
  f.startup(); f.complete(f.removes[0], "remove failed");
  assert.equal(f.creates.length, 0);
  assert.equal(f.errors.length, 1);
  f.startup(); f.complete(f.removes[1]);
  f.creates.forEach((entry, index) => f.complete(entry.fn, index === 0 ? "create failed" : undefined));
  assert.equal(f.errors.length, 2);
  f.startup();
  assert.equal(f.removes.length, 3);
});
