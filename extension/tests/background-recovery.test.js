const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const source = fs.readFileSync(path.join(__dirname, "..", "background.js"), "utf8");

async function click(recovery, url = "https://chatgpt.com/c/test", fail = false, probe = { alive: true, version: "0.24.0" }) {
  const calls = [];
  let handler;
  const chrome = {
    runtime: { onInstalled: { addListener() {} }, onStartup: { addListener() {} } },
    contextMenus: { onClicked: { addListener() {} } },
    action: { onClicked: { addListener(value) { handler = value; } },
      async setBadgeText(value) { calls.push(["badge", value.text]); }, async setTitle(value) { calls.push(["title", value.title]); }, async setBadgeBackgroundColor() {} },
    scripting: { async executeScript(details) { calls.push([details.func ? "reset-controller-flag" : "inject"]); if (fail) throw new Error("injection failed"); if (details.func) { details.func(); assert.equal(runtimeContext.__chatgptSplitInstalled, null, "注入funcが同版の旧flagを実際に解除する"); } } },
    tabs: { async sendMessage(id, message) { calls.push([message.type]); if (message.type === "controller-alive") { if (probe === "unreachable") throw new Error("no receiver"); return probe === "undefined-response" ? undefined : probe; } return recovery; }, reload() { throw new Error("reload prohibited"); } }
  };
  const runtimeContext = vm.createContext({ chrome, URL, __chatgptSplitInstalled: "0.24.0" });
  vm.runInContext(source, runtimeContext);
  await handler({ id: 1, url });
  return calls;
}
test("更新復旧成功時はinject→recoverのみでtoggle/reloadしない", async () => {
  const calls = await click({ recovered: true, legacy: false, version: "0.24.0" });
  assert.deepEqual(calls.slice(0, 3), [["controller-alive"], ["inject"], ["recover-split-controller"]]);
  assert.equal(calls.some(([name]) => name === "toggle-four-view"), false);
});
test("同版通常クリックはrecover確認後toggle", async () => {
  assert.deepEqual((await click({ recovered: false, legacy: false, version: "0.24.0" })).slice(0, 4), [["controller-alive"], ["inject"], ["recover-split-controller"], ["toggle-four-view"]]);
});
test("旧controllerが無応答なら版flagをresetしてから再注入・復旧する", async () => {
  for (const probe of ["undefined-response", "unreachable"]) {
    const calls = await click({ recovered: true, legacy: false, version: "0.24.0" }, undefined, false, probe);
    assert.deepEqual(calls.slice(0, 4), [["controller-alive"], ["reset-controller-flag"], ["inject"], ["recover-split-controller"]]);
    assert.equal(calls.some(([name]) => name === "toggle-four-view"), false);
  }
});
test("不正なalive応答は注入もtoggleもせずfail closed", async () => {
  for (const probe of [null, {}, { alive: false, version: "0.24.0" }, { alive: true }]) {
    const calls = await click({}, undefined, false, probe);
    assert.equal(calls.some(([name]) => name === "inject" || name === "reset-controller-flag" || name === "toggle-four-view"), false);
    assert.ok(calls.some(([name, value]) => name === "badge" && value === "!"));
  }
});
test("旧版は要移行を表示してDOM変更用toggleしない", async () => {
  const calls = await click({ legacy: true, recovered: false, version: "0.24.0" });
  assert.ok(calls.some(([name, value]) => name === "badge" && value === "要移行"));
  assert.equal(calls.some(([name]) => name === "toggle-four-view"), false);
});
test("復旧応答が不正/無応答ならtoggleせず失敗表示", async () => {
  for (const recovery of [undefined, {}, { recovered: false, legacy: false }]) {
    const calls = await click(recovery);
    assert.equal(calls.some(([name]) => name === "toggle-four-view"), false);
    assert.ok(calls.some(([name, value]) => name === "badge" && value === "!"));
  }
});
test("対象外URLと注入失敗は画面操作を行わない", async () => {
  assert.equal((await click({}, "https://chatgpt.com.evil.example/")).some(([name]) => name === "inject"), false);
  assert.equal((await click({}, undefined, true)).some(([name]) => name === "toggle-four-view"), false);
});
