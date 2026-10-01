const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const extension = path.join(__dirname, "..");
const manifest = JSON.parse(fs.readFileSync(path.join(extension, "manifest.json"), "utf8"));
const frameScript = manifest.content_scripts.find(entry => entry.js.includes("frame.js"));
assert.equal(frameScript.run_at, "document_start", "画面内サイドバーを描画前から監視する");
assert.equal(frameScript.all_frames, true);

let sideVisible = false;
let onMutation;
let observed;
const side = {
  closest: () => null,
  getBoundingClientRect: () => ({ left: 0, right: 260, top: 0, width: 260, height: 800 }),
  style: { setProperty(name, value, priority) { assert.equal(name, "display"); assert.equal(value, "none"); assert.equal(priority, "important"); sideVisible = false; } }
};
const document = { querySelectorAll: () => sideVisible ? [side] : [], querySelector: () => null };
const window = { top: {}, frameElement: null, addEventListener() {} };
vm.runInNewContext(fs.readFileSync(path.join(extension, "frame.js"), "utf8"), {
  window, document, location: { origin: "https://chatgpt.com" }, innerWidth: 1200, innerHeight: 800,
  MutationObserver: class { constructor(callback) { onMutation = callback; } observe(target) { observed = target; } }
});
assert.equal(observed, document, "DOMが未生成のdocument_startでも監視を開始する");
sideVisible = true;
onMutation();
assert.equal(sideVisible, true, "frameElementが未確定なら別フレームを変更しない");
window.frameElement = { hasAttribute: () => true };
onMutation();
assert.equal(sideVisible, false, "サイドバーの挿入直後に隠す");
