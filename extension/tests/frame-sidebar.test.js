const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const extension = path.join(__dirname, "..");
function trackFrameStyles(doc) {
  const styles = [];
  const query = doc.querySelector?.bind(doc);
  doc.querySelector = selector => selector === "#chatgpt-split-thread-width" ? styles[0] || null : query?.(selector) || null;
  doc.createElement = () => ({});
  doc.documentElement = { append(style) { styles.push(style); } };
  return styles;
}
const manifest = JSON.parse(fs.readFileSync(path.join(extension, "manifest.json"), "utf8"));
for (const size of [16, 32, 48, 128]) {
  assert.equal(manifest.icons[String(size)], `icons/icon${size}.png`, "直接読み込む開発版にも専用アイコンを指定する");
  assert.ok(fs.existsSync(path.join(extension, manifest.icons[String(size)])), "manifestのアイコン参照先が存在する");
}
for (const size of [16, 32]) {
  assert.equal(manifest.action.default_icon[String(size)], manifest.icons[String(size)], "ツールバーにも専用アイコンを指定する");
}
const frameScript = manifest.content_scripts.find(entry => entry.js.includes("frame.js"));
assert.equal(frameScript.run_at, "document_start", "画面内サイドバーを描画前から監視する");
assert.equal(frameScript.all_frames, true);

let sideVisible = false;
let onMutation;
let observed;
let observedOptions;
let resize;
let display = "";
let displayPriority = "";
let hideWrites = 0;
const side = {
  closest: () => null,
  getBoundingClientRect: () => ({ left: 0, right: 260, top: 0, width: 260, height: 800 }),
  style: {
    getPropertyValue: () => display,
    getPropertyPriority: () => displayPriority,
    setProperty(name, value, priority) { assert.equal(name, "display"); assert.equal(value, "none"); assert.equal(priority, "important"); display = value; displayPriority = priority; hideWrites++; sideVisible = false; }
  }
};
const mainNav = { closest: () => ({}), getBoundingClientRect() { throw new Error("main内のnavの寸法は検査しない"); } };
const document = { querySelectorAll: () => [side, mainNav], querySelector: () => null };
const threadStyles = trackFrameStyles(document);
const window = { top: {}, frameElement: null, addEventListener(type, callback) { if (type === "resize") resize = callback; } };
vm.runInNewContext(fs.readFileSync(path.join(extension, "frame.js"), "utf8"), {
  window, document, location: { origin: "https://chatgpt.com" }, innerWidth: 1200, innerHeight: 800,
  MutationObserver: class { constructor(callback) { onMutation = callback; } observe(target, options) { observed = target; observedOptions = options; } }
});
assert.equal(observed, document, "DOMが未生成のdocument_startでも監視を開始する");
sideVisible = true;
onMutation();
assert.equal(sideVisible, true, "frameElementが未確定なら別フレームを変更しない");
assert.equal(threadStyles.length, 0, "通常iframeには本文幅CSSを追加しない");
window.frameElement = { hasAttribute: () => true };
onMutation();
assert.equal(sideVisible, false, "サイドバーの挿入直後に隠す");
assert.equal(threadStyles.length, 1, "split iframeに本文幅CSSを追加する");
assert.equal(threadStyles[0].textContent, '[data-app-shell-sidebar-open] { --app-shell-navigation-rail-width: 0px !important; }');
assert.equal(threadStyles[0].textContent.includes("max-width"), false, "通常本文の最大幅を変更しない");
assert.equal(/padding\s*:|width\s*:\s*100vw/.test(threadStyles[0].textContent), false, "既存paddingとviewport幅を変更しない");
assert.equal(observedOptions.attributes, true, "再描画によるstyle/class変更も監視する");
assert.deepEqual(Array.from(observedOptions.attributeFilter), ["style", "class"]);
onMutation();
assert.equal(hideWrites, 1, "自身のstyle更新通知では再書き込みしない");
assert.equal(threadStyles.length, 1, "自身のmutationでCSSを重複注入しない");
threadStyles[0].textContent = '[class~="max-w-(--thread-body-max-width)"] { max-width: 100% !important; }';
onMutation();
assert.equal(threadStyles[0].textContent, '[data-app-shell-sidebar-open] { --app-shell-navigation-rail-width: 0px !important; }', "旧本文幅CSSも同じstyle要素で置換する");
display = "block";
displayPriority = "";
sideVisible = true;
side.getBoundingClientRect = () => ({ left: 0, top: 0, width: 260, height: 800 });
onMutation();
assert.equal(sideVisible, false, "React再描画で認識済みsidebarのstyleが戻っても再び隠す");
assert.equal(hideWrites, 2);
displayPriority = "";
onMutation();
assert.equal(displayPriority, "important", "display:noneの優先度だけ失われても復旧する");
assert.equal(typeof resize, "function", "画面サイズの変更後にも再検査する");
display = "flex";
sideVisible = true;
resize();
assert.equal(sideVisible, false);
onMutation();
assert.equal(hideWrites, 4, "復旧後のmutationでループしない");

let topMutated = false;
const topWindow = { addEventListener() { topMutated = true; } };
topWindow.top = topWindow;
vm.runInNewContext(fs.readFileSync(path.join(extension, "frame.js"), "utf8"), {
  window: topWindow, location: { origin: "https://chatgpt.com" },
  document: { querySelectorAll() { topMutated = true; return []; } },
  MutationObserver: class { constructor() { topMutated = true; } }
});
assert.equal(topMutated, false, "トップフレームの標準sidebarは一切変更しない");

function shellSidebarFixture(split = true, inMain = false) {
  const writes = [];
  function element(name) {
    const values = new Map();
    return {
      name,
      closest(selector) { return selector === "main, [role='main']" && inMain ? {} : null; },
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 340, height: 800 }),
      style: {
        getPropertyValue: key => values.get(key)?.value || "",
        getPropertyPriority: key => values.get(key)?.priority || "",
        setProperty(key, value, priority) { values.set(key, { value, priority }); writes.push(name); }
      }
    };
  }
  const root = element("app-shell-sidebar");
  const panel = element("app-shell-left-panel");
  const workspace = element("workspace");
  root.closest = selector => selector === "aside[data-app-shell-left-panel-appearance]" ? panel :
    selector === "main, [role='main']" && inMain ? workspace : null;
  const fixtureDocument = {
    querySelector: selector => selector === "#app-shell-sidebar" ? root : null,
    querySelectorAll: () => [panel],
  };
  trackFrameStyles(fixtureDocument);
  vm.runInNewContext(fs.readFileSync(path.join(extension, "frame.js"), "utf8"), {
    window: { top: {}, frameElement: { hasAttribute: () => split }, addEventListener() {} },
    document: fixtureDocument, location: { origin: "https://chatgpt.com" }, innerWidth: 600, innerHeight: 800,
    MutationObserver: class { constructor() {} observe() {} }
  });
  return { writes, root, panel, workspace };
}
const narrowShell = shellSidebarFixture();
assert.deepEqual(narrowShell.writes.sort(), ["app-shell-left-panel", "app-shell-sidebar"], "実HTMLの340px幅sidebarとそのasideを600px画面でも隠す");
assert.equal(narrowShell.workspace.style.getPropertyValue("display"), "", "外側workspaceは非表示にしない");
assert.deepEqual(shellSidebarFixture(false).writes, [], "通常iframeのshell sidebarは変更しない");
assert.deepEqual(shellSidebarFixture(true, true).writes, [], "明示rootがmain内でも非表示にしない");
