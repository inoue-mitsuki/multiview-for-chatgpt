const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "..", "content.js"), "utf8");
const storage = new Map();

function page(href, options = {}) {
  if (!options.keepInactive && JSON.parse(storage.get("chatgpt-split-view-state") || "null")?.active === false) storage.delete("chatgpt-split-view-state");
  const url = new URL(href);
  let messageListener;
  let intervalCallback;
  const documentListeners = new Map();
  const windowListeners = new Map();
  const timers = [];
  const animationFrames = [];
  const mutationCallbacks = [];
  const mutationObservers = [];
  let stateWrites = 0;
  class Element {
    constructor(tagName) {
      this.tagName = tagName;
      this.children = [];
      this.dataset = {};
      this.style = { setProperty(name, value) { this[name] = value; } };
      this.listeners = new Map();
      this.className = "";
      this.src = "";
      this.srcWrites = 0;
      this.appendWrites = 0;
      this.removeWrites = 0;
      if (tagName === "iframe") {
        let frameSrc = "";
        Object.defineProperty(this, "src", { get: () => frameSrc, set: value => { frameSrc = value; this.srcWrites++; } });
      }
      this.attrs = {};
      this.innerHTML = "";
    }
    append(...items) { this.appendWrites++; for (const item of items) { item.parentElement = this; this.children.push(item); } }
    attachShadow() { this.shadowRoot = new Element("shadow"); return this.shadowRoot; }
    addEventListener(type, listener) { this.listeners.set(type, listener); }
    setPointerCapture() {}
    removeEventListener(type) { this.listeners.delete(type); }
    setAttribute(name, value) { this.attrs[name] = value; }
    removeAttribute(name) {
      delete this.attrs[name];
      if (name === "data-chatgpt-split-pane") delete this.dataset.chatgptSplitPane;
      if (name === "title") this.title = "";
    }
    getAttribute(name) { return this.attrs[name] || null; }
    hasAttribute(name) { return Object.hasOwn(this.attrs, name); }
    matches(selector) {
      if (selector === "[data-sidebar-destination], a[href], button.sidebar-item") return !!this.getAttribute("data-sidebar-destination") || (this.tagName === "a" && !!this.href) || (this.tagName === "button" && this.className.includes("sidebar-item"));
      if (selector === "a[href*='/c/']") return this.tagName === "a" && this.href?.includes("/c/");
      if (selector === "nav, aside, [role='navigation']") return false;
      if (selector.includes("[role='menu']") && selector.includes("[role='dialog']")) return this.role === "menu" || this.role === "dialog";
      if (selector.includes("data-conversation-options-trigger")) return this.tagName === "button" && (!!this.dataset.conversationOptionsTrigger || this.attrs["aria-haspopup"] === "menu");
      if (selector === "a[href]") return this.tagName === "a" && !!this.href;
      if (selector === "[role='menu']") return this.role === "menu";
      return false;
    }
    closest(selector) { for (let item = this; item; item = item.parentElement) if (item.matches(selector)) return item; return null; }
    getClientRects() { return [1]; }
    contains(element) { return element === this || this.descendants().includes(element); }
    remove() { this.removeWrites++; if (this.parentElement) this.parentElement.children = this.parentElement.children.filter(item => item !== this); }
    descendants() { return this.children.flatMap(child => [child, ...child.descendants()]); }
    querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
    querySelectorAll(selector) {
      const items = this.descendants();
      if (selector === "iframe") return items.filter(item => item.tagName === "iframe");
      if (selector.startsWith("#")) return items.filter(item => item.id === selector.slice(1));
      if (selector === ".pane") return items.filter(item => item.className === "pane");
      if (selector === ".workspace") return items.filter(item => item.className === "workspace");
      if (selector === "style") return items.filter(item => item.tagName === "style");
      if (selector === "a[href]") return items.filter(item => item.tagName === "a" && !!item.href);
      if (selector === "[data-count-button]") return items.filter(item => item.dataset.countButton);
      if (selector === ".resize-handle.y" || selector === ".resize-handle.x") return items.filter(item => item.className === "resize-handle " + selector.at(-1));
      if (selector === ".empty-state" || selector === ".reload-pane" || selector === ".clear-pane" || selector === ".label") return items.filter(item => item.className === selector.slice(1));
      if (selector === ".launcher-toggle" || selector === ".launcher-menu" || selector === ".launcher-end" || selector === ".launcher-flyout" || selector === ".launcher-settings" || selector === ".launcher-submenu") return items.filter(item => item.className === selector.slice(1));
      if (selector === "[data-start-count]") return items.filter(item => item.dataset.startCount);
      if (selector === "[data-three-layout]") return items.filter(item => item.dataset.threeLayout);
      if (selector === "[data-two-layout]") return items.filter(item => item.dataset.twoLayout);
      if (selector === "[data-four-layout]") return items.filter(item => item.dataset.fourLayout);
      if (selector === ".grid") return items.filter(item => item.className === "grid");
      if (selector === ".four-resize") return items.filter(item => item.className.includes("four-resize"));
      if (selector === ".swap-pane") return items.filter(item => item.className === "swap-pane");
      if (selector === ".chatgpt-split-project-badges") return items.filter(item => item.className === "chatgpt-split-project-badges");
      if (selector === ".chatgpt-split-page-badges") return items.filter(item => item.className === "chatgpt-split-page-badges");
      if (selector === "[data-sidebar-destination]" || selector === "[data-sidebar-destination], button.sidebar-item") return items.filter(item => item.getAttribute("data-sidebar-destination") || (selector.includes("button.sidebar-item") && item.tagName === "button" && item.className.includes("sidebar-item")));
      if (selector === "[data-app-action-sidebar-project-row][data-app-action-sidebar-project-id]") return items.filter(item => item.getAttribute("data-app-action-sidebar-project-row") !== null && item.getAttribute("data-app-action-sidebar-project-id"));
      if (selector === "button[aria-expanded], button[data-testid*='project']") return items.filter(item => item.tagName === "button" && item.getAttribute("aria-expanded") !== null);
      if (selector === ".close") return items.filter(item => item.className === "close");
      if (selector === "a[href*='/c/']") return items.filter(item => item.matches(selector));
      if (selector === "[data-chatgpt-split-menu]") return items.filter(item => item.dataset.chatgptSplitMenu);
      if (selector === "[data-chatgpt-split-trigger]") return items.filter(item => item.dataset.chatgptSplitTrigger);
      if (selector === "[data-chatgpt-split-submenu]") return items.filter(item => item.dataset.chatgptSplitSubmenu);
      if (selector === "[data-chatgpt-split-pane-option]") return items.filter(item => item.dataset.chatgptSplitPaneOption);
      return [];
    }
    getBoundingClientRect() { return this.tagName === "nav" ? { left: 0, right: 260, top: 0, width: 260, height: 800 } : { left: 0, right: 800, top: 0, width: 800, height: 600 }; }
  }
  const document = {
    documentElement: new Element("html"), body: new Element("body"), head: new Element("head"),
    createElement: name => new Element(name),
    createDocumentFragment: () => new Element("fragment"),
    querySelector: () => null, querySelectorAll: selector => selector === "[role='menu']" ? document.body.descendants().filter(item => item.role === "menu") :
      selector.includes("aside, nav") ? document.body.descendants().filter(item => item.tagName === "nav") : [],
    addEventListener(type, listener) { documentListeners.set(type + ":" + (documentListeners.size + 1), listener); },
    removeEventListener(type, listener) { for (const [key, value] of documentListeners) if (key.startsWith(type + ":") && value === listener) documentListeners.delete(key); },
    dispatchEvent(event) { for (const [key, listener] of [...documentListeners]) if (key.startsWith(event.type + ":")) listener(event); }
  };
  const location = { href: url.href, origin: url.origin, pathname: url.pathname };
  const window = { addEventListener(type, listener) { if (type === "click") windowListeners.set(listener, type); }, removeEventListener(type, listener) { windowListeners.delete(listener); },
    getComputedStyle: element => ({ overflowX: element.mockOverflow || "visible", overflowY: element.mockOverflow || "visible" }) };
  window.top = window;
  const context = {
    window, document, location, URL,
    innerWidth: 1200, innerHeight: 800,
    sessionStorage: {
      getItem: key => storage.get(key) || null,
      setItem: (key, value) => { if (key === "chatgpt-split-view-state") stateWrites++; storage.set(key, value); },
      removeItem: key => storage.delete(key)
    },
    chrome: { storage: options.local ? { local: {
      get(key, callback) { if (options.delayedGet) timers.push(() => callback({ [key]: options.local.get(key) })); else callback({ [key]: options.local.get(key) }); },
      set(value, callback) { if (options.failWrite) throw new Error("quota"); for (const [key, item] of Object.entries(value)) options.local.set(key, JSON.parse(JSON.stringify(item))); callback?.(); }
    } } : undefined, runtime: { onMessage: { addListener: listener => { messageListener = listener; } } } },
    ResizeObserver: class { observe() {} disconnect() {} },
    MutationObserver: class { constructor(callback) { this.callback = callback; mutationCallbacks.push(callback); mutationObservers.push(this); } observe(target) { this.target = target; this.active = true; } disconnect() { this.active = false; } },
    requestAnimationFrame: callback => { animationFrames.push(callback); return animationFrames.length; }, cancelAnimationFrame() {},
    Event: class { constructor(type) { this.type = type; } },
    setTimeout: callback => { timers.push(callback); }, setInterval: callback => { intervalCallback = callback; return 1; }, clearInterval() {}, clearTimeout() {}
  };
  vm.runInNewContext(source, context);
  const host = () => document.documentElement.children.find(item => item.id === "chatgpt-split-extension");
  const launcher = () => document.documentElement.children.find(item => item.id === "chatgpt-split-launcher");
  const frames = () => host()?.shadowRoot.querySelectorAll("iframe") || [];
  const panes = () => frames().map(frame => frame.parentElement);
  return { host, launcher, frames, panes, reinject: (nextSource, resetFlag = false) => { if (resetFlag) context.__chatgptSplitInstalled = null; vm.runInNewContext(nextSource, context); }, message: (value, sender, respond) => messageListener(value, sender, respond), close: () => launcher().shadowRoot.querySelector(".launcher-end").listeners.get("click")(),
    document, mutationObservers, stateWrites: () => stateWrites, pointer: event => { for (const [key, listener] of documentListeners) if (key.startsWith("pointerdown:")) listener(event); },
    contextMenu: event => { for (const [key, listener] of documentListeners) if (key.startsWith("contextmenu:")) listener(event); },
    windowClick: event => { for (const listener of windowListeners.keys()) listener(event); },
    later: callback => timers.push(callback),
    flush: () => { while (timers.length || animationFrames.length) {
      while (timers.length) timers.shift()();
      while (animationFrames.length) animationFrames.shift()();
    } },
    mutate: () => { for (const callback of mutationCallbacks) callback(); },
    click: event => { for (const [key, listener] of documentListeners) if (key.startsWith("click:")) listener(event); },
    parentOnly: next => { const nextUrl = new URL(next); location.href = nextUrl.href; location.pathname = nextUrl.pathname; },
    tick: () => intervalCallback(),
    route: next => { const nextUrl = new URL(next); location.href = nextUrl.href; location.pathname = nextUrl.pathname; intervalCallback(); } };
}

for (const count of [2, 3, 4]) {
  const launchPage = page("https://chatgpt.com/");
  assert.equal(launchPage.host(), undefined, "通常画面では分割を自動開始しない");
  assert.ok(launchPage.launcher(), "通常画面に丸い起動ボタンを置く");
  const toggle = launchPage.launcher().shadowRoot.querySelector(".launcher-toggle");
  const launchMenu = launchPage.launcher().shadowRoot.querySelector(".launcher-menu");
  assert.equal(launchMenu.hidden, true, "メニューは初期状態で閉じる");
  assert.equal(launchMenu.children[0].className, "launcher-end", "分割終了をメニュー先頭に置く");
  assert.equal(launchMenu.children.length, 4, "主メニューは終了・2・3・4のみ");
  assert.deepEqual(launchMenu.querySelectorAll(".launcher-settings").map(button => button.textContent), ["2 ▸", "3 ▸", "4 ▸"]);
  assert.equal(launchMenu.children[0].hidden, true, "未分割時は終了操作を隠す");
  toggle.listeners.get("click")();
  assert.equal(launchMenu.hidden, false, "起動ボタンでメニューを開く");
  toggle.listeners.get("click")();
  assert.equal(launchMenu.hidden, true, "起動ボタンの再クリックでメニューを閉じる");
  toggle.listeners.get("click")();
  launchPage.pointer({ target: launchPage.document.body });
  assert.equal(launchMenu.hidden, true, "外側クリックでメニューを閉じる");
  toggle.listeners.get("click")();
  launchMenu.querySelectorAll("[data-start-count]").find(button => button.dataset.startCount === String(count)).listeners.get("click")();
  assert.equal(launchPage.host().shadowRoot.querySelector(".grid").dataset.count, String(count), "選んだ画面数で開始する");
  assert.equal(launchPage.launcher().hidden, false, "分割中も起動ボタンを表示する");
  assert.equal(launchMenu.children[0].hidden, false, "分割中は先頭に終了操作を表示する");
  const activeButton = launchMenu.querySelectorAll("[data-start-count]").find(button => button.dataset.startCount === String(count));
  assert.equal(activeButton.getAttribute("aria-pressed"), "true", "現在の画面数をメニューに表示する");
  const nextCount = count === 4 ? 2 : count + 1;
  launchMenu.querySelectorAll("[data-start-count]").find(button => button.dataset.startCount === String(nextCount)).listeners.get("click")();
  assert.equal(launchPage.host().shadowRoot.querySelector(".grid").dataset.count, String(nextCount), "同じメニューから画面数を変更する");
  assert.equal(launchPage.host().shadowRoot.querySelector(".toolbar"), null, "上部バーを表示しない");
  assert.deepEqual(launchPage.frames().map(frame => frame.src), ["https://chatgpt.com/", "", "", ""], "画面数選択だけでは追加のChatGPTを読み込まない");
  launchPage.close();
  assert.equal(launchPage.launcher().hidden, false, "分割終了後に起動ボタンを戻す");
  launchPage.message({ type: "toggle-four-view", url: "https://chatgpt.com/" });
  assert.ok(launchPage.host(), "従来の拡張アイコンからも開始できる");
  launchPage.close();
}

const layoutPage = page("https://chatgpt.com/c/layout");
const swapPage = page("https://chatgpt.com/c/swap-first");
swapPage.message({ type: "toggle-four-view", url: "https://chatgpt.com/c/swap-first" });
swapPage.message({ type: "assign-conversation", url: "https://chatgpt.com/c/swap-second", pane: 2, pageUrl: "https://chatgpt.com/c/swap-first" });
const swapFrames = swapPage.frames();
const swapSources = swapFrames.map(frame => frame.src);
const swapSelect = swapPage.host().shadowRoot.querySelectorAll(".swap-pane")[0];
swapSelect.value = "2";
swapSelect.listeners.get("change")();
assert.deepEqual(swapFrames.map(frame => frame.src), swapSources, "交換でiframeを再読み込みしない");
assert.equal(swapFrames[0].title, "画面 2");
assert.equal(swapFrames[1].title, "画面 1");
assert.deepEqual(JSON.parse(storage.get("chatgpt-split-view-state")).urls.slice(0, 2), ["https://chatgpt.com/c/swap-second", "https://chatgpt.com/c/swap-first"]);
swapPage.close();
const parentMenuPage = page("https://chatgpt.com/c/menu-defaults");
const parentTriggers = parentMenuPage.launcher().shadowRoot.querySelectorAll(".launcher-settings");
const clickEvent = { preventDefault() {}, stopPropagation() {} };
for (let index = 0; index < 3; index++) {
  parentTriggers[index].listeners.get("click")(clickEvent);
  const parentGrid = parentMenuPage.host().shadowRoot.querySelector(".grid");
  assert.equal(parentGrid.dataset.count, String(index + 2));
  assert.equal(parentGrid.dataset[index === 0 ? "twoLayout" : index === 1 ? "threeLayout" : "fourLayout"], ["horizontal", "stacked", "grid"][index]);
}
const twoChoices = parentMenuPage.launcher().shadowRoot.querySelectorAll("[data-two-layout]");
assert.deepEqual(twoChoices.map(button => button.textContent), ["横2列", "縦2行"]);
twoChoices[1].listeners.get("click")();
assert.equal(parentMenuPage.host().shadowRoot.querySelector(".grid").dataset.twoLayout, "vertical");
assert.equal(parentMenuPage.host().shadowRoot.querySelector(".resize-handle.x").hidden, true);
assert.equal(parentMenuPage.host().shadowRoot.querySelector(".resize-handle.y").hidden, false);
parentMenuPage.close();
storage.delete("chatgpt-split-three-layout");
storage.delete("chatgpt-split-four-layout");
const layoutMenu = layoutPage.launcher().shadowRoot.querySelector(".launcher-menu");
const layoutButtons = layoutMenu.querySelectorAll("[data-three-layout]");
const layoutFlyout = layoutMenu.querySelectorAll(".launcher-flyout")[1];
const layoutSettings = layoutMenu.querySelectorAll(".launcher-settings")[1];
const layoutPanel = layoutMenu.querySelectorAll(".launcher-submenu")[1];
assert.equal(layoutSettings.textContent, "3 ▸", "3画面の配置を親項目にする");
assert.equal(layoutPanel.hidden, true, "配置の選択肢は初期状態で隠す");
layoutFlyout.listeners.get("mouseenter")();
assert.equal(layoutPanel.hidden, false, "ポインターを乗せると配置メニューを開く");
assert.equal(layoutFlyout.dataset.side, "right", "右側に空間があれば右へ開く");
layoutFlyout.listeners.get("mouseleave")();
assert.equal(layoutPanel.hidden, true, "ポインターを外すと閉じる");
layoutFlyout.getBoundingClientRect = () => ({ left: 1050, right: 1150, top: 750 });
layoutFlyout.listeners.get("focusin")();
assert.equal(layoutPanel.hidden, false, "キーボードフォーカスでも開く");
assert.equal(layoutFlyout.dataset.side, "left", "右端では左へ開く");
assert.equal(layoutFlyout.dataset.above, "true", "下端では上方向へ揃える");
assert.deepEqual(layoutButtons.map(button => button.textContent), ["左大＋右上下", "横3列"], "設定内に2種類の配置を置く");
layoutButtons.find(button => button.dataset.threeLayout === "stacked").listeners.get("click")();
const layoutGrid = layoutPage.host().shadowRoot.querySelector(".grid");
assert.equal(layoutGrid.dataset.count, "3", "配置を選ぶと3画面で開始する");
assert.equal(layoutGrid.dataset.threeLayout, "stacked", "左大右上下を選択する");
assert.equal(layoutPage.host().shadowRoot.querySelector(".resize-handle.y").hidden, false, "右上下の境界を動かせる");
const layoutXHandle = layoutPage.host().shadowRoot.querySelector(".resize-handle.x");
layoutXHandle.listeners.get("pointerdown")({ preventDefault() {}, pointerId: 1 });
layoutXHandle.listeners.get("pointermove")({ clientX: 480, clientY: 200 });
layoutPage.flush();
assert.equal(layoutPage.host().shadowRoot.querySelector(".resize-handle.y").style.left, "60%", "左側の幅変更に合わせて右側の上下境界も移動する");
layoutXHandle.listeners.get("pointerup")();
const layoutYHandle = layoutPage.host().shadowRoot.querySelector(".resize-handle.y");
layoutYHandle.listeners.get("pointerdown")({ preventDefault() {}, pointerId: 2 });
layoutYHandle.listeners.get("pointermove")({ clientX: 600, clientY: 360 });
layoutPage.flush();
assert.equal(layoutGrid.style["--split-y"], "60%", "右側の上下境界を動かせる");
layoutYHandle.listeners.get("pointerup")();
assert.deepEqual(layoutPage.frames().map(frame => frame.src), ["https://chatgpt.com/c/layout", "", "", ""], "配置切替だけでは追加のChatGPTを読み込まない");
layoutPage.message({ type: "assign-conversation", url: "https://chatgpt.com/c/second", pane: 2, pageUrl: "https://chatgpt.com/c/layout" });
const beforeSwitch = layoutPage.frames().map(frame => frame.src);
layoutButtons.find(button => button.dataset.threeLayout === "columns").listeners.get("click")();
assert.equal(layoutGrid.dataset.threeLayout, "columns", "横3列へ戻せる");
assert.equal(layoutPage.host().shadowRoot.querySelector(".resize-handle.y").hidden, true, "横3列では上下ハンドルを隠す");
assert.deepEqual(layoutPage.frames().map(frame => frame.src), beforeSwitch, "配置変更は開いている会話を再読み込みしない");
layoutButtons.find(button => button.dataset.threeLayout === "stacked").listeners.get("click")();
assert.equal(layoutButtons.find(button => button.dataset.threeLayout === "stacked").getAttribute("aria-pressed"), "true", "選択中の配置を示す");
const layoutRestored = page("https://chatgpt.com/c/layout");
assert.equal(layoutRestored.host().shadowRoot.querySelector(".grid").dataset.threeLayout, "stacked", "同じタブの再読み込み後も配置を維持する");
layoutRestored.close();
storage.delete("chatgpt-split-three-layout");
const fourPage = page("https://chatgpt.com/c/four-layout");
fourPage.message({ type: "toggle-four-view", url: "https://chatgpt.com/c/four-layout" });
const fourButtons = fourPage.launcher().shadowRoot.querySelectorAll("[data-four-layout]");
assert.deepEqual(fourButtons.map(button => button.textContent), ["2×2", "左大＋右3段", "横4列"]);
const fourFrames = fourPage.host().shadowRoot.querySelectorAll("iframe");
const initialSources = fourFrames.map(frame => frame.src);
for (const layout of ["stacked", "columns", "grid"]) {
  fourButtons.find(button => button.dataset.fourLayout === layout).listeners.get("click")();
  assert.equal(fourPage.host().shadowRoot.querySelector(".grid").dataset.fourLayout, layout);
  assert.deepEqual(fourFrames.map(frame => frame.src), initialSources, "配置変更で会話を再読み込みしない");
  assert.equal(fourPage.host().shadowRoot.querySelector(".resize-handle.y").hidden, layout !== "grid");
}
for (const layout of ["columns", "stacked"]) {
  fourButtons.find(button => button.dataset.fourLayout === layout).listeners.get("click")();
  const handles = fourPage.host().shadowRoot.querySelectorAll(".four-resize").filter(handle => !handle.hidden);
  assert.equal(handles.length, 3, "各配置で3境界を操作できる");
  for (const handle of handles) {
    const before = handle.style[handle.dataset.axis === "x" ? "left" : "top"];
    handle.listeners.get("pointerdown")({ preventDefault() {}, pointerId: 3 });
    const target = parseFloat(before) / 100 + .03;
    handle.listeners.get("pointermove")({ clientX: target * 800, clientY: target * 600 });
    fourPage.flush();
    assert.notEqual(handle.style[handle.dataset.axis === "x" ? "left" : "top"], before);
    handle.listeners.get("pointerup")();
  }
  assert.deepEqual(fourFrames.map(frame => frame.src), initialSources, "サイズ変更で会話を再読み込みしない");
}
fourPage.close();
storage.delete("chatgpt-split-four-layout");

const dragPage = page("https://chatgpt.com/");
const dragToggle = dragPage.launcher().shadowRoot.querySelector(".launcher-toggle");
const dragMenu = dragPage.launcher().shadowRoot.querySelector(".launcher-menu");
dragToggle.listeners.get("pointerdown")({ button: 0, clientX: 1090, clientY: 70, pointerId: 1 });
dragToggle.listeners.get("pointermove")({ clientX: 600, clientY: 280 });
dragToggle.listeners.get("pointerup")();
assert.equal(dragPage.launcher().style.left, "598px", "ドラッグでアイコンを移動する");
assert.equal(dragPage.launcher().style.top, "266px", "ドラッグで縦位置も移動する");
dragToggle.listeners.get("click")();
assert.equal(dragMenu.hidden, true, "ドラッグ直後のクリックではメニューを開かない");
dragToggle.listeners.get("click")();
assert.equal(dragMenu.hidden, false, "次の通常クリックでメニューを開く");
dragToggle.listeners.get("pointerdown")({ button: 0, clientX: 600, clientY: 280, pointerId: 2 });
dragToggle.listeners.get("pointermove")({ clientX: 550, clientY: 330 });
dragToggle.listeners.get("pointercancel")({ type: "pointercancel" });
dragToggle.listeners.get("click")();
assert.equal(dragMenu.hidden, true, "ドラッグ中断後のクリックを無視しない");
const dragRestored = page("https://chatgpt.com/");
assert.equal(dragRestored.launcher().style.left, "598px", "同じタブの再読み込み後も位置を維持する");
assert.equal(dragRestored.launcher().style.top, "266px", "縦位置も維持する");
storage.delete("chatgpt-split-launcher-position");

const badges = page("https://chatgpt.com/c/squat");
const badgeNav = badges.document.createElement("nav");
const squatLink = badges.document.createElement("a");
squatLink.href = "https://chatgpt.com/c/squat";
squatLink.textContent = "スクワット記録";
const otherLink = badges.document.createElement("a");
otherLink.href = "https://chatgpt.com/c/other";
otherLink.textContent = "別の会話";
otherLink.title = "別の会話";
badgeNav.append(squatLink, otherLink);
badges.document.body.append(badgeNav);
badges.message({ type: "toggle-four-view", url: "https://chatgpt.com/c/squat" });
badges.flush();
assert.equal(squatLink.dataset.chatgptSplitPane, "1", "現在の画面番号をサイドバーに付ける");
assert.equal(badges.panes()[0].querySelector(".label").textContent, "画面1｜スクワット記録", "画面1に会話名を表示する");
assert.equal(otherLink.dataset.chatgptSplitPane, undefined, "開いていない会話は無装飾");
assert.equal(squatLink.title, "画面1で表示中", "番号の説明を表示する");
badges.message({ type: "assign-conversation", url: squatLink.href, pane: 2, pageUrl: squatLink.href });
badges.flush();
assert.equal(squatLink.dataset.chatgptSplitPane, "2", "会話移動後に番号を更新する");
assert.equal(badges.panes()[0].querySelector(".label").textContent, "画面1", "移動元の空画面は番号だけに戻す");
assert.equal(badges.panes()[1].querySelector(".label").textContent, "画面2｜スクワット記録", "移動先へ会話名を表示する");
badges.message({ type: "assign-conversation", url: otherLink.href, pane: 3, pageUrl: squatLink.href });
badges.flush();
assert.equal(otherLink.dataset.chatgptSplitPane, "3", "別の会話にも番号を付ける");
assert.equal(badges.panes()[2].querySelector(".label").textContent, "画面3｜別の会話", "別の画面にも対応する会話名を表示する");
assert.equal(otherLink.title, "別の会話", "既存の会話名ツールチップを残す");
const replacementLink = badges.document.createElement("a");
replacementLink.href = squatLink.href;
replacementLink.textContent = "スクワット新記録";
badgeNav.children = [replacementLink, otherLink];
replacementLink.parentElement = badgeNav;
badges.mutate();
badges.flush();
assert.equal(replacementLink.dataset.chatgptSplitPane, "2", "サイドバー再描画後に番号を戻す");
assert.equal(badges.panes()[1].querySelector(".label").textContent, "画面2｜スクワット新記録", "サイドバー再描画後の名前を反映する");
replacementLink.title = "ChatGPT側が更新した会話名";
badges.mutate();
badges.flush();
assert.equal(replacementLink.title, "ChatGPT側が更新した会話名", "ChatGPT側のツールチップ更新を保持する");
badges.frames()[1].contentWindow = { location: { href: otherLink.href } };
badges.frames()[1].listeners.get("load")();
badges.route("https://chatgpt.com/c/squat");
badges.flush();
assert.equal(replacementLink.dataset.chatgptSplitPane, undefined, "画面内の会話遷移で旧番号を消す");
assert.equal(badges.panes()[1].querySelector(".label").textContent, "画面2｜別の会話", "画面内遷移でもラベルを更新する");
const projectNav = badges.document.createElement("nav");
const projectLink = badges.document.createElement("a");
projectLink.href = "https://chatgpt.com/g/project-shopping/c/other";
projectLink.textContent = "プロジェクト内会話";
projectNav.append(projectLink);
badges.document.body.append(projectNav);
badges.message({ type: "assign-conversation", url: "https://chatgpt.com/c/other", pane: 1, pageUrl: "https://chatgpt.com/" });
badges.flush();
assert.equal(projectLink.dataset.chatgptSplitPane, "1", "別サイドバー内のプロジェクトURLも同じ会話IDで一致する");
projectLink.removeAttribute("data-chatgpt-split-pane");
badges.mutate();
badges.flush();
assert.equal(projectLink.dataset.chatgptSplitPane, "1", "再描画で消えた番号を復元する");
projectLink.href = "https://chatgpt.com/g/project-shopping/c/not-open";
badges.mutate();
badges.flush();
assert.equal(projectLink.dataset.chatgptSplitPane, undefined, "別会話に変わったら番号を残さない");
badges.close();
const projectBadges = page("https://chatgpt.com/c/project-one");
const projectRoot = projectBadges.document.createElement("nav");
const projectGroup = projectBadges.document.createElement("div");
const projectHome = projectBadges.document.createElement("a");
projectHome.href = "https://chatgpt.com/g/shopping/project";
const childOne = projectBadges.document.createElement("a");
childOne.href = "https://chatgpt.com/c/project-one";
const childTwo = projectBadges.document.createElement("a");
childTwo.href = "https://chatgpt.com/c/project-two";
const projectHeader = projectBadges.document.createElement("div");
projectHeader.append(projectHome);
projectGroup.append(projectHeader, childOne, childTwo);
const recentLink = projectBadges.document.createElement("a");
recentLink.href = "https://chatgpt.com/c/unrelated-recent";
const outerGroup = projectBadges.document.createElement("div");
outerGroup.append(projectGroup, recentLink);
projectRoot.append(outerGroup);
projectBadges.document.body.append(projectRoot);
projectBadges.message({ type: "toggle-four-view", url: childOne.href });
projectBadges.message({ type: "assign-conversation", url: childTwo.href, pane: 2, pageUrl: childOne.href });
projectBadges.flush();
assert.equal(projectHome.querySelector(".chatgpt-split-project-badges").getAttribute("data-numbers"), "1・2", "プロジェクトに所属会話の画面番号をまとめる");
assert.deepEqual(projectHome.querySelector(".chatgpt-split-project-badges").children.map(item => item.textContent), ["1", "2"], "複数番号は独立した丸にする");
projectGroup.children = [projectHeader];
projectBadges.mutate();
projectBadges.flush();
assert.equal(projectHome.querySelector(".chatgpt-split-project-badges").getAttribute("data-numbers"), "1・2", "閉じたプロジェクトにも番号を保持する");
projectBadges.panes()[1].querySelector(".clear-pane").listeners.get("click")();
projectBadges.flush();
assert.equal(projectHome.querySelector(".chatgpt-split-project-badges").getAttribute("data-numbers"), "1", "空にした画面の番号は外す");
projectBadges.message({ type: "assign-conversation", url: recentLink.href, pane: 2, pageUrl: childOne.href });
projectBadges.flush();
assert.equal(projectHome.querySelector(".chatgpt-split-project-badges").getAttribute("data-numbers"), "1", "周辺の最近の会話を誤ってプロジェクト所属にしない");
projectBadges.close();
const collapsedPage = page("https://chatgpt.com/c/recent-initial");
const collapsedNav = collapsedPage.document.createElement("nav");
const collapsedOuter = collapsedPage.document.createElement("div");
const collapsedGroup = collapsedPage.document.createElement("div");
const collapsedHeader = collapsedPage.document.createElement("div");
const collapsedHome = collapsedPage.document.createElement("a");
collapsedHome.href = "https://chatgpt.com/g/shopping/project";
const collapsedRecent = collapsedPage.document.createElement("a");
collapsedRecent.href = "https://chatgpt.com/c/recent-initial";
collapsedHeader.append(collapsedHome);
collapsedGroup.append(collapsedHeader);
collapsedOuter.append(collapsedGroup, collapsedRecent);
collapsedNav.append(collapsedOuter);
collapsedPage.document.body.append(collapsedNav);
collapsedPage.message({ type: "toggle-four-view", url: collapsedRecent.href });
collapsedPage.flush();
assert.equal(collapsedHome.dataset.chatgptSplitPane, undefined, "初回折りたたみでも最近会話を誤所属にしない");
collapsedPage.close();
const buttonProjectPage = page("https://chatgpt.com/c/button-conversation");
const buttonNav = buttonProjectPage.document.createElement("nav");
const buttonGroup = buttonProjectPage.document.createElement("div");
const projectButton = buttonProjectPage.document.createElement("button");
projectButton.textContent = "買い物";
projectButton.setAttribute("aria-expanded", "true");
const buttonConversation = buttonProjectPage.document.createElement("a");
buttonConversation.href = "https://chatgpt.com/g/project-shopping/c/button-conversation";
buttonGroup.append(projectButton, buttonConversation);
buttonNav.append(buttonGroup);
buttonProjectPage.document.body.append(buttonNav);
buttonProjectPage.message({ type: "toggle-four-view", url: buttonConversation.href });
buttonProjectPage.flush();
assert.equal(projectButton.querySelector(".chatgpt-split-project-badges").getAttribute("data-numbers"), "1", "リンクでないproject展開ボタンにも番号を付ける");
buttonGroup.children = [projectButton];
projectButton.setAttribute("aria-expanded", "false");
buttonProjectPage.mutate();
buttonProjectPage.flush();
assert.equal(projectButton.querySelector(".chatgpt-split-project-badges").getAttribute("data-numbers"), "1", "展開ボタンを閉じても番号を維持する");
buttonProjectPage.close();
const actualRowPage = page("https://chatgpt.com/g/g-p-project-sample/c/sample-one");
const actualNav = actualRowPage.document.createElement("nav");
const actualRow = actualRowPage.document.createElement("div");
actualRow.setAttribute("role", "button");
actualRow.setAttribute("data-app-action-sidebar-project-row", "true");
actualRow.setAttribute("data-app-action-sidebar-project-id", "g-p-project-sample");
actualRow.setAttribute("aria-expanded", "false");
actualRow.textContent = "テストプロジェクト";
actualNav.append(actualRow);
actualRowPage.document.body.append(actualNav);
actualRowPage.message({ type: "toggle-four-view", url: "https://chatgpt.com/g/g-p-project-sample/c/sample-one" });
actualRowPage.message({ type: "assign-conversation", url: "https://chatgpt.com/g/g-p-project-sample/c/sample-two", pane: 2, pageUrl: "https://chatgpt.com/" });
actualRowPage.flush();
assert.deepEqual(actualRow.querySelector(".chatgpt-split-project-badges").children.map(item => item.textContent), ["1", "2"], "実HTMLのdiv型project行にIDで複数番号を表示する");
actualRowPage.close();
const menuBadges = page("https://chatgpt.com/");
const menuBadgeNav = menuBadges.document.createElement("nav");
const homeMenuLink = menuBadges.document.createElement("a");
homeMenuLink.href = "https://chatgpt.com/";
const libraryMenuLink = menuBadges.document.createElement("a");
libraryMenuLink.href = "https://chatgpt.com/library";
menuBadgeNav.append(homeMenuLink, libraryMenuLink);
menuBadges.document.body.append(menuBadgeNav);
menuBadges.message({ type: "toggle-four-view", url: homeMenuLink.href });
menuBadges.flush();
assert.equal(homeMenuLink.querySelector(".chatgpt-split-page-badges").getAttribute("data-numbers"), "1", "新チャットの番号に空paneを含めない");
menuBadges.message({ type: "assign-page", url: "https://chatgpt.com/library", pane: 2, pageUrl: homeMenuLink.href });
menuBadges.flush();
assert.equal(libraryMenuLink.querySelector(".chatgpt-split-page-badges").getAttribute("data-numbers"), "2");
menuBadges.message({ type: "assign-page", url: homeMenuLink.href, pane: 3, pageUrl: homeMenuLink.href });
menuBadges.flush();
assert.deepEqual(homeMenuLink.querySelector(".chatgpt-split-page-badges").children.map(item => item.textContent), ["1", "3"]);
menuBadges.message({ type: "assign-page", url: "https://evil.example/library", pane: 4, pageUrl: homeMenuLink.href });
assert.equal(menuBadges.frames()[3].src, "", "一般pageでも外部URLを拒否");
menuBadges.panes()[1].querySelector(".clear-pane").listeners.get("click")();
menuBadges.flush();
assert.equal(libraryMenuLink.querySelector(".chatgpt-split-page-badges"), null, "空にした一般ページの番号を削除");
menuBadges.close();
const builtinPage = page("https://chatgpt.com/c/original");
const builtinNav = builtinPage.document.createElement("nav");
const scheduleItem = builtinPage.document.createElement("button");
scheduleItem.setAttribute("data-sidebar-destination", "builtin:automations");
scheduleItem.textContent = "スケジュール";
builtinNav.append(scheduleItem);
builtinPage.document.body.append(builtinNav);
builtinPage.message({ type: "toggle-four-view", url: "https://chatgpt.com/c/original" });
builtinPage.flush();
let builtinPrevented = 0;
builtinPage.click({ target: scheduleItem, button: 0, preventDefault() { builtinPrevented++; }, stopPropagation() { builtinPrevented++; } });
assert.equal(builtinPrevented, 2, "確認済みURLのスケジュールだけを直接画面1へ割り当てる");
assert.equal(builtinPage.frames()[0].src, "https://chatgpt.com/scheduled", "通常クリックも提供された実URLを使用する");
builtinPage.route("https://chatgpt.com/scheduled");
builtinPage.frames()[0].listeners.get("load")();
builtinPage.flush();
assert.equal(scheduleItem.querySelector(".chatgpt-split-page-badges").getAttribute("data-numbers"), "1", "通常クリックの実URLからスケジュールの番号を付ける");
const builtinDots = builtinPage.document.body.descendants().find(item => item.className === "chatgpt-split-general-options");
scheduleItem.click = () => { throw new Error("既知URLならnative操作を再実行しない"); };
for (const number of [2, 3, 4]) {
  builtinDots.listeners.get("click")({ preventDefault() {}, stopPropagation() {} });
  builtinPage.document.body.descendants().find(item => item.className === "chatgpt-split-general-menu").children[number].listeners.get("click")();
  assert.equal(builtinPage.frames()[number - 1].src, "https://chatgpt.com/scheduled", "取得済みのスケジュールURLを指定画面に直接開く");
  builtinPage.frames()[number - 1].listeners.get("load")();
  builtinPage.flush();
  assert.equal(builtinPage.panes()[number - 2].dataset.empty, "true", "スケジュールの移動元を空にする");
  assert.equal(scheduleItem.querySelector(".chatgpt-split-page-badges").getAttribute("data-numbers"), String(number));
}
assert.equal(scheduleItem.querySelector(".chatgpt-split-page-badges").getAttribute("data-numbers"), "4");
builtinPage.close();

const clippedPage = page("https://chatgpt.com/c/sidebar-scroll");
const clippedNav = clippedPage.document.createElement("nav");
const scrollArea = clippedPage.document.createElement("div");
scrollArea.mockOverflow = "auto";
scrollArea.getBoundingClientRect = () => ({ left: 0, right: 260, top: 80, bottom: 400, width: 260, height: 320 });
const clippedItem = clippedPage.document.createElement("button");
clippedItem.setAttribute("data-sidebar-destination", "builtin:automations");
clippedItem.textContent = "スケジュール";
let itemTop = 30;
clippedItem.getBoundingClientRect = () => ({ left: 0, right: 260, top: itemTop, bottom: itemTop + 32, width: 260, height: 32 });
scrollArea.append(clippedItem);
clippedNav.append(scrollArea);
clippedPage.document.body.append(clippedNav);
clippedPage.message({ type: "toggle-four-view", url: "https://chatgpt.com/c/sidebar-scroll" });
clippedPage.flush();
const clippedDots = clippedPage.document.body.descendants().find(item => item.className === "chatgpt-split-general-options");
assert.equal(clippedDots.hidden, true, "項目がサイドバーのスクロール領域外なら三点も隠す");
itemTop = 100;
clippedPage.mutate();
clippedPage.flush();
assert.equal(clippedDots.hidden, false, "項目がスクロール領域へ戻れば三点も表示する");
clippedPage.close();

const nativeAssign = page("https://chatgpt.com/c/keep-pane-one");
const nativeNav = nativeAssign.document.createElement("nav");
const nativeItem = nativeAssign.document.createElement("button");
nativeItem.textContent = "テスト項目";
nativeItem.setAttribute("data-sidebar-destination", "builtin:test-destination");
nativeNav.append(nativeItem);
nativeAssign.document.body.append(nativeNav);
nativeAssign.message({ type: "toggle-four-view", url: "https://chatgpt.com/c/keep-pane-one" });
nativeAssign.flush();
nativeItem.click = () => nativeAssign.later(() => nativeAssign.parentOnly("https://chatgpt.com/verified-schedule-page"));
nativeAssign.document.body.descendants().find(item => item.className === "chatgpt-split-general-options").listeners.get("click")({ preventDefault() {}, stopPropagation() {} });
nativeAssign.document.body.descendants().find(item => item.className === "chatgpt-split-general-menu").children[3].listeners.get("click")();
nativeAssign.flush();
assert.equal(nativeAssign.frames()[2].src, "https://chatgpt.com/verified-schedule-page", "初回native操作から取得したURLを画面3へ開く");
assert.equal(nativeAssign.frames()[0].src, "https://chatgpt.com/c/keep-pane-one", "画面3割当で画面1を更新しない");
nativeAssign.tick();
assert.equal(nativeAssign.frames()[0].src, "https://chatgpt.com/c/keep-pane-one", "pollが先行しても次の同期で画面1を更新しない");
assert.equal(nativeAssign.frames()[1].src, "", "移動先以外の空画面へリクエストしない");
nativeAssign.close();

{
const parentHides = page("https://chatgpt.com/c/parent-fallback");
parentHides.message({ type: "toggle-four-view", url: "https://chatgpt.com/c/parent-fallback" });
const frame = parentHides.frames()[1];
frame.contentDocument = null;
frame.listeners.get("load")();
function childDocument(inMain = false) {
  let root;
  let writes = 0;
  function side() {
    const style = { value: "", priority: "", getPropertyValue() { return this.value; }, getPropertyPriority() { return this.priority; }, setProperty(name, value, priority) { this.value = value; this.priority = priority; writes++; } };
    return { style, closest: selector => selector === "main, [role='main']" && inMain ? {} : null };
  }
  const panel = side();
  const doc = { querySelector: selector => selector === "#app-shell-sidebar" ? root : null };
  return { doc, panel, writes: () => writes,
    insert() { root = side(); root.closest = selector => selector === "aside[data-app-shell-left-panel-appearance]" ? panel : selector === "main, [role='main']" && inMain ? {} : null; return root; } };
}
const firstChild = childDocument();
frame.contentDocument = firstChild.doc;
frame.listeners.get("load")();
const childObserver = parentHides.mutationObservers.find(item => item.target === firstChild.doc);
assert.ok(childObserver?.active, "sidebarの遅延挿入を親側から監視する");
const childRoot = firstChild.insert();
childObserver.callback();
assert.equal(firstChild.writes(), 2, "子documentのsidebar本体とasideだけを隠す");
childObserver.callback();
assert.equal(firstChild.writes(), 2, "自己mutationで書き込みループしない");
childRoot.style.value = "block";
childObserver.callback();
assert.equal(childRoot.style.value, "none", "再描画で戻ったsidebarを再適用する");
const secondChild = childDocument();
secondChild.insert();
frame.contentDocument = secondChild.doc;
frame.listeners.get("load")();
assert.equal(childObserver.active, false, "iframe再読込時に旧document監視を解除する");
assert.equal(secondChild.writes(), 2);
const secondObserver = parentHides.mutationObservers.find(item => item.target === secondChild.doc);
frame.contentDocument = parentHides.document;
frame.listeners.get("load")();
assert.equal(secondObserver.active, false);
assert.equal(parentHides.mutationObservers.some(item => item.target === parentHides.document && item.active), false, "トップdocumentは子sidebar監視対象にしない");
const mainChild = childDocument(true);
mainChild.insert();
frame.contentDocument = mainChild.doc;
frame.listeners.get("load")();
assert.equal(mainChild.writes(), 0, "main内のrootやasideを親側から隠さない");
Object.defineProperty(frame, "contentDocument", { configurable: true, get() { throw new Error("SecurityError"); } });
frame.dataset.pendingUrl = "https://chatgpt.com/c/pending";
assert.doesNotThrow(() => frame.listeners.get("load")(), "子documentアクセス失敗でもload処理を続行する");
assert.equal(frame.dataset.pendingUrl, undefined, "アクセス失敗でもpending状態を解除する");
Object.defineProperty(frame, "contentDocument", { configurable: true, writable: true, value: secondChild.doc });
frame.contentDocument = secondChild.doc;
frame.listeners.get("load")();
const finalObserver = parentHides.mutationObservers.filter(item => item.target === secondChild.doc).at(-1);
parentHides.close();
assert.equal(finalObserver.active, false, "分割終了時にも子document監視を解除する");
}

{
const recovery = page("https://chatgpt.com/c/recovery");
recovery.message({ type: "toggle-four-view", url: "https://chatgpt.com/c/recovery" });
const oldHost = recovery.host();
const oldFrames = recovery.frames();
oldFrames[0].inputSentinel = "unsent text";
const originalSrc = oldFrames.map(frame => frame.src);
const originalSrcWrites = oldFrames.map(frame => frame.srcWrites);
const frameParents = oldFrames.map(frame => frame.parentElement);
const originalFrameRemove = oldFrames.map(frame => frame.removeWrites);
recovery.reinject(source.replace('const controllerVersion = "0.25.0"', 'const controllerVersion = "0.25.1"'));
assert.equal(recovery.host(), oldHost, "更新handoffでhostを置換しない");
assert.equal(recovery.frames()[0], oldFrames[0], "更新handoffでiframeを移動・置換しない");
assert.deepEqual(recovery.frames().map(frame => frame.src), originalSrc, "更新復旧でiframe URLを変更しない");
assert.deepEqual(oldFrames.map(frame => frame.srcWrites), originalSrcWrites, "同一URLも含めsrc再代入を一切行わない");
assert.deepEqual(oldFrames.map(frame => frame.parentElement), frameParents, "iframeの親paneを変えない");
assert.deepEqual(oldFrames.map(frame => frame.removeWrites), originalFrameRemove, "iframeをDOMから取り外さない");
assert.equal(oldFrames[0].inputSentinel, "unsent text");
let response;
recovery.message({ type: "controller-alive" }, null, value => { response = value; });
assert.equal(response.alive, true, "alive probeは復旧状態を消費しない");
recovery.message({ type: "recover-split-controller" }, null, value => { response = value; });
assert.equal(response?.recovered, true, "復旧クリックはtoggleを実行しない");
recovery.reinject(source.replace('const controllerVersion = "0.25.0"', 'const controllerVersion = "0.25.1"'), true);
recovery.message({ type: "recover-split-controller" }, null, value => { response = value; });
assert.equal(response.recovered, true, "同版flagを解除した再注入でも停止ack後に復旧する");
assert.equal(recovery.frames()[0], oldFrames[0]);
assert.deepEqual(oldFrames.map(frame => frame.srcWrites), originalSrcWrites, "同版復旧もiframe reloadなし");
recovery.close();
assert.ok(oldFrames.every(frame => frame.listeners.size === 0), "終了後はiframe listener参照を解除する");
recovery.message({ type: "toggle-four-view", url: "https://chatgpt.com/c/recovery" });
const restartedFrames = recovery.frames();
recovery.close();
assert.ok(restartedFrames.every(frame => frame.listeners.size === 0), "start/stop反復でも旧frame listenerを保持しない");
}

{
const sameVersion = page("https://chatgpt.com/c/same-version");
sameVersion.message({ type: "toggle-four-view", url: "https://chatgpt.com/c/same-version" });
const frame = sameVersion.frames()[0];
const writes = frame.srcWrites;
frame.inputSentinel = "unsent same version";
sameVersion.reinject(source, true);
let reply;
sameVersion.message({ type: "recover-split-controller" }, null, value => { reply = value; });
assert.equal(reply.recovered, true, "sourceの版変更なしでもflag reset後handoffを復旧する");
assert.equal(sameVersion.frames()[0], frame);
assert.equal(frame.srcWrites, writes);
assert.equal(frame.inputSentinel, "unsent same version");
sameVersion.close();
}

{
const legacyRecovery = page("https://chatgpt.com/c/legacy");
legacyRecovery.message({ type: "toggle-four-view", url: "https://chatgpt.com/c/legacy" });
const host = legacyRecovery.host();
const frames = legacyRecovery.frames();
const writes = frames.map(frame => frame.srcWrites);
host.removeAttribute("data-controller-protocol");
legacyRecovery.launcher().removeAttribute("data-controller-protocol");
legacyRecovery.reinject(source.replace('const controllerVersion = "0.25.0"', 'const controllerVersion = "0.25.1"'));
let response;
legacyRecovery.message({ type: "recover-split-controller" }, null, value => { response = value; });
assert.equal(response.legacy, true, "hookのない旧DOMでは安全な手動移行を要求する");
assert.equal(legacyRecovery.host(), host);
assert.deepEqual(frames.map(frame => frame.srcWrites), writes, "legacyの入力を保持するiframeを操作しない");
storage.delete("chatgpt-split-view-state");
}

{
const batchedDrag = page("https://chatgpt.com/c/batched-drag");
batchedDrag.message({ type: "toggle-four-view", url: "https://chatgpt.com/c/batched-drag" });
batchedDrag.flush();
const grid = batchedDrag.host().shadowRoot.querySelector(".grid");
let rectReads = 0;
grid.getBoundingClientRect = () => { rectReads++; return { left: 0, top: 0, width: 800, height: 600 }; };
const handle = batchedDrag.host().shadowRoot.querySelector(".resize-handle.x");
const writes = batchedDrag.stateWrites();
handle.listeners.get("pointerdown")({ preventDefault() {}, pointerId: 4 });
for (let index = 0; index < 20; index++) handle.listeners.get("pointermove")({ pointerId: 4, clientX: 320 + index, clientY: 0 });
assert.equal(rectReads, 0, "raf前はpointermove毎のlayout計測をしない");
assert.equal(batchedDrag.stateWrites(), writes, "ドラッグ中の状態保存を抑止する");
batchedDrag.flush();
assert.equal(rectReads, 1, "20イベントを1回のlayout更新へ集約する");
assert.equal(grid.style["--split-x"], "42.375%");
handle.listeners.get("pointermove")({ pointerId: 99, clientX: 100, clientY: 0 });
handle.listeners.get("pointerup")({ pointerId: 4, clientX: 560, clientY: 0 });
assert.equal(grid.style["--split-x"], "70%", "pointerupの最新座標を同期で反映する");
assert.equal(batchedDrag.stateWrites(), writes + 1, "終了時に1回だけ保存する");
batchedDrag.flush();
assert.equal(rectReads, 2, "終了後の待機rafは更新しない");
handle.listeners.get("pointerdown")({ preventDefault() {}, pointerId: 5 });
handle.listeners.get("pointermove")({ pointerId: 5, clientX: 400, clientY: 0 });
handle.listeners.get("pointercancel")({ pointerId: 5 });
assert.equal(grid.style["--split-x"], "50%", "cancel時も直前の最新座標を反映する");
handle.listeners.get("pointerdown")({ preventDefault() {}, pointerId: 8 });
handle.listeners.get("pointermove")({ pointerId: 8, clientX: 440, clientY: 0 });
handle.listeners.get("pointerup")({ pointerId: 99, clientX: 100, clientY: 0 });
assert.ok(handle.listeners.has("pointermove"), "他pointerのupではドラッグを終了しない");
handle.listeners.get("lostpointercapture")({ pointerId: 8 });
assert.equal(grid.style["--split-x"], "55.00000000000001%", "capture喪失時も最後の座標を保存する");
assert.equal(handle.listeners.has("pointermove"), false);
handle.listeners.get("pointerdown")({ preventDefault() {}, pointerId: 6 });
handle.listeners.get("pointermove")({ pointerId: 6, clientX: 600, clientY: 0 });
const stoppedReads = rectReads;
batchedDrag.close();
batchedDrag.flush();
assert.equal(rectReads, stoppedReads + 1, "stopは最新座標を1回反映し、その後の待機rafは更新しない");
assert.equal(handle.listeners.has("pointermove"), false);
}

{
const handoffDrag = page("https://chatgpt.com/c/handoff-drag");
handoffDrag.message({ type: "toggle-four-view", url: "https://chatgpt.com/c/handoff-drag" });
handoffDrag.flush();
const grid = handoffDrag.host().shadowRoot.querySelector(".grid");
const handle = handoffDrag.host().shadowRoot.querySelector(".resize-handle.x");
handle.listeners.get("pointerdown")({ preventDefault() {}, pointerId: 1 });
handle.listeners.get("pointermove")({ pointerId: 1, clientX: 560, clientY: 0 });
handoffDrag.reinject(source.replace('const controllerVersion = "0.25.0"', 'const controllerVersion = "0.25.1"'));
assert.equal(grid.style["--split-x"], "70%", "detach時は保留中の最新geometryをhandoffへ反映する");
assert.equal(handle.listeners.has("pointermove"), false);
const writes = handoffDrag.stateWrites();
handoffDrag.flush();
assert.equal(handoffDrag.stateWrites(), writes, "旧世代の待機rafから保存しない");
handoffDrag.close();
}

const actualLibrary = page("https://chatgpt.com/c/existing-thread");
const actualLibraryNav = actualLibrary.document.createElement("nav");
const actualLibraryItem = actualLibrary.document.createElement("button");
actualLibraryItem.className = "sidebar-item";
actualLibraryItem.textContent = "ライブラリ";
actualLibraryItem.setAttribute("data-sidebar-destination", "builtin:library");
actualLibraryNav.append(actualLibraryItem);
actualLibrary.document.body.append(actualLibraryNav);
actualLibrary.message({ type: "toggle-four-view", url: "https://chatgpt.com/c/existing-thread" });
actualLibrary.flush();
assert.equal(actualLibraryItem.querySelector(".chatgpt-split-page-badges"), null, "会話表示中はライブラリへ偽番号を付けない");
actualLibraryItem.click = () => { throw new Error("提供URLを使いiframe/nativeボタン代行しない"); };
const actualLibraryDots = actualLibrary.document.body.descendants().find(item => item.className === "chatgpt-split-general-options");
for (const number of [1, 2, 3, 4]) {
  actualLibraryDots.listeners.get("click")({ preventDefault() {}, stopPropagation() {} });
  actualLibrary.document.body.descendants().find(item => item.className === "chatgpt-split-general-menu").children[number].listeners.get("click")();
  assert.equal(actualLibrary.frames()[number - 1].src, "https://chatgpt.com/library");
  actualLibrary.frames()[number - 1].listeners.get("load")();
  actualLibrary.flush();
}
assert.equal(actualLibraryItem.querySelector(".chatgpt-split-page-badges").getAttribute("data-numbers"), "4");
actualLibrary.message({ type: "assign-conversation", url: "https://chatgpt.com/c/other-thread", pane: 2 });
actualLibrary.flush();
assert.equal(actualLibraryItem.querySelector(".chatgpt-split-page-badges").getAttribute("data-numbers"), "4", "他の画面の会話変更はライブラリの番号に影響しない");
actualLibrary.message({ type: "assign-conversation", url: "https://chatgpt.com/c/other-thread", pane: 4 });
actualLibrary.flush();
assert.equal(actualLibraryItem.querySelector(".chatgpt-split-page-badges"), null, "ライブラリを離れた画面の番号を外す");
actualLibrary.message({ type: "show-split-diagnostics" });
const diagnosticDialog = actualLibrary.document.body.descendants().find(item => item.id === "chatgpt-split-diagnostics");
assert.ok(diagnosticDialog);
const diagnosticData = JSON.parse(diagnosticDialog.children[1].textContent);
assert.equal(diagnosticData.version, "0.25.0");
assert.equal(diagnosticDialog.children[1].textContent.includes("https://"), false);
diagnosticDialog.children[0].listeners.get("click")();
actualLibrary.close();

const pluginsPage = page("https://chatgpt.com/plugins");
const pluginsNav = pluginsPage.document.createElement("nav");
const pluginsItem = pluginsPage.document.createElement("button");
pluginsItem.textContent = "プラグイン";
pluginsItem.setAttribute("data-sidebar-destination", "builtin:apps");
pluginsNav.append(pluginsItem);
const selectedScheduleItem = pluginsPage.document.createElement("button");
selectedScheduleItem.textContent = "スケジュール";
selectedScheduleItem.setAttribute("data-sidebar-destination", "builtin:automations");
pluginsNav.append(selectedScheduleItem);
pluginsPage.document.body.append(pluginsNav);
pluginsPage.message({ type: "toggle-four-view", url: "https://chatgpt.com/c/initial" });
pluginsPage.flush();
const pluginsDots = pluginsPage.document.body.descendants().find(item => item.className === "chatgpt-split-general-options");
for (const number of [1, 2, 3, 4]) {
  pluginsDots.listeners.get("click")({ preventDefault() {}, stopPropagation() {} });
  pluginsPage.document.body.descendants().find(item => item.className === "chatgpt-split-general-menu").children[number].listeners.get("click")();
  assert.equal(pluginsPage.frames()[number - 1].src, "https://chatgpt.com/plugins", "プラグインを提供URLで各画面へ直接開く");
  pluginsPage.frames()[number - 1].listeners.get("load")();
  pluginsPage.flush();
}
assert.equal(pluginsItem.querySelector(".chatgpt-split-page-badges").getAttribute("data-numbers"), "4");
assert.equal(pluginsItem.getAttribute("data-chatgpt-split-selected"), "false", "画面4だけに開いたプラグインは画面1の選択にしない");
pluginsPage.message({ type: "assign-page", url: "https://chatgpt.com/plugins", pane: 1 });
pluginsPage.flush();
assert.equal(pluginsItem.getAttribute("data-chatgpt-split-selected"), "true");
pluginsPage.message({ type: "assign-page", url: "https://chatgpt.com/scheduled", pane: 1 });
pluginsPage.flush();
assert.equal(pluginsItem.getAttribute("data-chatgpt-split-selected"), "false", "元ページがpluginsでも画面1から離れた選択色を消す");
assert.equal(selectedScheduleItem.getAttribute("data-chatgpt-split-selected"), "true", "画面1のスケジュールを選択表示にする");
pluginsPage.close();
assert.equal(pluginsItem.getAttribute("data-chatgpt-split-selected"), null, "分割終了時に選択色の上書きを解除する");
assert.equal(selectedScheduleItem.getAttribute("data-chatgpt-split-selected"), null);

{
const parentSelection = page("https://chatgpt.com/c/background-thread");
const nav = parentSelection.document.createElement("nav");
const backgroundLink = parentSelection.document.createElement("a");
backgroundLink.href = "https://chatgpt.com/c/background-thread";
backgroundLink.setAttribute("data-interactive-row-link", "true");
backgroundLink.setAttribute("aria-current", "page");
const backgroundRow = parentSelection.document.createElement("div");
backgroundRow.className = "sidebar-item bg-primary-ghost-hover";
backgroundRow.setAttribute("role", "group");
backgroundRow.setAttribute("aria-current", "page");
const rowContent = parentSelection.document.createElement("div");
const rowInner = parentSelection.document.createElement("div");
rowInner.append(backgroundLink);
rowContent.append(rowInner);
backgroundRow.append(rowContent);
const assignedLink = parentSelection.document.createElement("a");
assignedLink.href = "https://chatgpt.com/g/project/c/visible-thread";
nav.append(backgroundRow, assignedLink);
parentSelection.document.body.append(nav);
parentSelection.message({ type: "toggle-four-view", url: backgroundLink.href });
parentSelection.flush();
assert.equal(backgroundLink.getAttribute("data-chatgpt-split-selected"), "true");
parentSelection.message({ type: "assign-conversation", url: "https://chatgpt.com/c/visible-thread", pane: 1 });
parentSelection.flush();
assert.equal(backgroundLink.getAttribute("data-chatgpt-split-selected"), "false", "親タブURLだけに残る会話の標準選択色を解除する");
const indicatorCss = parentSelection.document.head.children.find(item => item.tagName === "style" && item.textContent?.includes("data-chatgpt-split-selected")).textContent;
const rowSelector = ".sidebar-item[role='group']:has(a[data-chatgpt-split-selected='false'])";
assert.ok(indicatorCss.includes(".sidebar-item[role='group']:has(a[data-chatgpt-split-selected]) { background-color: transparent !important; background-image: none !important; }"), "未割当・表示中の両方で親sidebar行の背景を解除し青との重なりを防ぐ");
assert.ok(indicatorCss.includes(rowSelector + ":hover, " + rowSelector + ":focus-within { background-color: rgba(255,255,255,.08) !important; }"), "親行のhoverとキーボード操作時の反応を維持する");
assert.equal(backgroundRow.getAttribute("aria-current"), "page", "ChatGPT標準の現在項目属性を変更しない");
assert.equal(backgroundLink.getAttribute("aria-current"), "page");
assert.equal(backgroundRow.className, "sidebar-item bg-primary-ghost-hover", "ChatGPT標準クラスを変更しない");
assert.equal(assignedLink.getAttribute("data-chatgpt-split-selected"), "true", "プロジェクトURLでも表示中の同じ会話を選択する");
parentSelection.message({ type: "assign-conversation", url: assignedLink.href, pane: 2 });
parentSelection.flush();
assert.equal(assignedLink.getAttribute("data-chatgpt-split-selected"), "true", "画面2へ移動しても表示中の会話色を維持する");
assignedLink.href = "https://chatgpt.com/library";
parentSelection.tick();
parentSelection.flush();
assert.equal(assignedLink.getAttribute("data-chatgpt-split-selected"), null, "会話でなくなったリンクの選択上書きを解除する");
parentSelection.close();
assert.equal(backgroundLink.getAttribute("data-chatgpt-split-selected"), null, "終了時はChatGPT標準の選択表示へ戻す");
assert.equal(backgroundRow.getAttribute("aria-current"), "page");
}

{
const projectMove = page("https://chatgpt.com/c/shared-thread");
const projectMoveNav = projectMove.document.createElement("nav");
const projectMoveLink = projectMove.document.createElement("a");
projectMoveLink.href = "https://chatgpt.com/c/shared-thread";
projectMoveNav.append(projectMoveLink);
projectMove.document.body.append(projectMoveNav);
projectMove.message({ type: "toggle-four-view", url: "https://chatgpt.com/c/shared-thread" });
const projectThreadUrl = "https://chatgpt.com/g/shopping/c/shared-thread";
projectMove.message({ type: "assign-conversation", url: projectThreadUrl, pane: 2 });
assert.equal(projectMove.panes()[0].dataset.empty, "true", "通常URLから同じプロジェクト内会話へ移すと元を空にする");
let projectFocus = 0;
projectMove.frames()[1].contentWindow = { location: { href: projectThreadUrl }, postMessage() { projectFocus++; } };
projectMove.frames()[1].listeners.get("load")();
projectMove.click({ target: projectMoveLink, button: 0, preventDefault() {}, stopPropagation() {} });
assert.equal(projectFocus, 1, "通常URLの会話クリックでも既存プロジェクト内画面をフォーカスする");
assert.equal(projectMove.panes()[0].dataset.empty, "true", "通常クリックで会話を画面1へ戻さない");
projectMove.message({ type: "assign-conversation", url: projectMoveLink.href, pane: 2 });
assert.equal(projectMove.frames()[1].src, projectThreadUrl, "同じ割当先の別表記URLでは再ロードしない");
assert.equal(projectMove.frames()[1].dataset.pendingUrl, undefined);
projectMove.message({ type: "assign-page", url: projectMoveLink.href, pane: 3 });
assert.equal(projectMove.panes()[1].dataset.empty, "true", "一般割当経路で会話URLを受けても同じIDの元画面を空にする");
projectMove.close();
}

for (const testCase of [
  { type: "assign-conversation", target: "https://chatgpt.com/c/shared", aliases: ["/c/shared", "/g/shopping/c/shared", "/g/shopping/c/shared?view=x", "/g/shopping/c/shared"] },
  { type: "assign-page", target: "https://chatgpt.com/scheduled", aliases: ["/scheduled", "/scheduled/", "/scheduled?filter=all", "/scheduled?filter=active"] },
  { type: "assign-page", target: "https://chatgpt.com/plugins", aliases: ["/plugins", "/plugins/", "/plugins?view=all", "/plugins?view=mine"] },
  { type: "assign-page", target: "https://chatgpt.com/library", aliases: ["/library", "/library/", "/library?view=all", "/library?view=mine"] }
]) {
  const duplicates = page("https://chatgpt.com/");
  duplicates.message({ type: "toggle-four-view", url: "https://chatgpt.com/" });
  // 旧版で既に残っている重複を再現する。
  duplicates.frames().forEach((frame, index) => {
    frame.src = "https://chatgpt.com" + testCase.aliases[index];
    delete frame.dataset.pendingUrl;
    delete duplicates.panes()[index].dataset.empty;
  });
  const targetBefore = duplicates.frames()[3].src;
  duplicates.launcher().shadowRoot.querySelectorAll("[data-start-count]").find(button => button.dataset.startCount === "2").listeners.get("click")();
  assert.equal(duplicates.panes()[2].hidden, true);
  duplicates.message({ type: testCase.type, url: testCase.target, pane: 4 });
  for (const index of [0, 1, 2]) {
    assert.equal(duplicates.panes()[index].dataset.empty, "true", "表示中と隠れた重複をすべて空にする: " + testCase.target);
    assert.equal(duplicates.frames()[index].src, "about:blank");
  }
  assert.equal(duplicates.frames()[3].src, targetBefore, "割当先の同じ内容はURL表記が違っても再ロードしない");
  assert.equal(duplicates.frames()[3].dataset.pendingUrl, undefined);
  duplicates.close();
}

assert.equal(otherLink.dataset.chatgptSplitPane, undefined, "分割終了時に番号を消す");
assert.equal(otherLink.title, "別の会話", "分割終了時に元のツールチップを戻す");

const first = page("https://chatgpt.com/c/first");
assert.equal(first.host(), undefined, "保存状態なしでは自動開始しない");
first.message({ type: "toggle-four-view", url: "https://chatgpt.com/c/first" });
assert.deepEqual(first.frames().map(frame => frame.src), [
  "https://chatgpt.com/c/first", "", "", ""
]);
first.message({ type: "assign-conversation", url: "https://chatgpt.com/c/second", pane: 2, pageUrl: "https://chatgpt.com/c/first" });
assert.equal(first.frames()[1].src, "https://chatgpt.com/c/second", "会話を画面2へ割り当てる");
first.message({ type: "assign-conversation", url: "https://chatgpt.com/c/second", pane: 3, pageUrl: "https://chatgpt.com/c/first" });
assert.equal(first.frames()[1].src, "about:blank", "移動元は通信しない案内画面へ戻す");
assert.equal(first.panes()[1].querySelector(".empty-state").hidden, false);
assert.equal(first.frames()[2].src, "https://chatgpt.com/c/second", "移動先で会話を開く");
first.frames()[2].contentWindow = { location: { href: "https://chatgpt.com/c/inside-frame" } };
first.frames()[2].listeners.get("load")();
first.launcher().shadowRoot.querySelectorAll("[data-start-count]").find(button => button.dataset.startCount === "4").listeners.get("click")();
assert.equal(first.frames()[3].src, "", "画面4を表示してもChatGPTを読み込まない");
assert.equal(first.panes()[3].querySelector(".empty-state").hidden, false);
const newChat4 = first.panes()[3].querySelector(".empty-state").children[1];
newChat4.listeners.get("click")();
assert.equal(first.frames()[3].src, "https://chatgpt.com/", "画面4のボタンで画面4だけ新規チャットを開く");
assert.equal(first.frames()[1].src, "about:blank", "他の空画面を読み込まない");
first.route("https://chatgpt.com/projects");

const profile = page("https://chatgpt.com/profile");
assert.ok(profile.host(), "プロフィールへの全画面遷移後に分割を復元する");
assert.deepEqual(profile.frames().map(frame => frame.src).slice(0, 3), [
  "https://chatgpt.com/projects", "", "https://chatgpt.com/c/inside-frame"
]);
profile.close();
assert.equal(JSON.parse(storage.get("chatgpt-split-view-state")).active, false, "明示終了では自動復元だけ停止する");
assert.equal(page("https://chatgpt.com/").host(), undefined, "終了後は自動開始しない");

const movedFromOne = page("https://chatgpt.com/c/one");
movedFromOne.message({ type: "toggle-four-view", url: "https://chatgpt.com/c/one" });
movedFromOne.message({ type: "assign-conversation", url: "https://chatgpt.com/c/one", pane: 2, pageUrl: "https://chatgpt.com/c/one" });
assert.equal(movedFromOne.frames()[0].src, "about:blank", "画面1も移動後は案内画面へ戻す");
const movedRestored = page("https://chatgpt.com/c/one");
assert.equal(movedRestored.frames()[0].src, "", "画面1の未割当状態を復元する");
assert.equal(movedRestored.frames()[1].src, "https://chatgpt.com/c/one", "移動先の会話を復元する");
movedRestored.panes()[0].querySelector(".empty-state").children[1].listeners.get("click")();
assert.equal(movedRestored.frames()[0].src, "https://chatgpt.com/", "画面1も案内から新しいチャットを開ける");
movedRestored.close();

const placeholderPage = page("https://chatgpt.com/");
placeholderPage.message({ type: "toggle-four-view", url: "https://chatgpt.com/" });
assert.equal(placeholderPage.panes()[1].querySelector(".empty-state").children[0].textContent, "左の会話を選ぶか、新しいチャットを始めてください");
placeholderPage.launcher().shadowRoot.querySelectorAll("[data-start-count]").find(button => button.dataset.startCount === "4").listeners.get("click")();
assert.deepEqual(placeholderPage.frames().map(frame => frame.src), ["https://chatgpt.com/", "", "", ""], "4画面化だけでは追加リクエストしない");
placeholderPage.panes()[1].querySelector(".empty-state").children[1].listeners.get("click")();
assert.deepEqual(placeholderPage.frames().map(frame => frame.src), ["https://chatgpt.com/", "https://chatgpt.com/", "", ""], "画面2の新規チャットだけ読み込む");
placeholderPage.panes()[2].querySelector(".empty-state").children[1].listeners.get("click")();
assert.deepEqual(placeholderPage.frames().map(frame => frame.src), ["https://chatgpt.com/", "https://chatgpt.com/", "https://chatgpt.com/", ""], "画面3の新規チャットだけ読み込む");
placeholderPage.close();

const clearPage = page("https://chatgpt.com/c/primary");
const clearNav = clearPage.document.createElement("nav");
const primaryLink = clearPage.document.createElement("a");
primaryLink.href = "https://chatgpt.com/c/primary";
const secondaryLink = clearPage.document.createElement("a");
secondaryLink.href = "https://chatgpt.com/c/secondary";
clearNav.append(primaryLink, secondaryLink);
clearPage.document.body.append(clearNav);
clearPage.message({ type: "toggle-four-view", url: primaryLink.href });
clearPage.message({ type: "assign-conversation", url: secondaryLink.href, pane: 2, pageUrl: primaryLink.href });
clearPage.flush();
assert.equal(secondaryLink.dataset.chatgptSplitPane, "2", "空にする前はサイドバーに画面2を表示");
const clearTwo = clearPage.panes()[1].querySelector(".clear-pane");
assert.equal(clearTwo.getAttribute("aria-label"), "画面2を空にする");
clearTwo.listeners.get("click")();
clearPage.flush();
assert.equal(clearPage.frames()[1].src, "about:blank", "画面2だけ空にする");
assert.equal(clearPage.frames()[0].src, primaryLink.href, "画面1は維持する");
assert.equal(clearPage.host().shadowRoot.querySelector(".grid").dataset.count, "2", "画面数は維持する");
assert.equal(secondaryLink.dataset.chatgptSplitPane, undefined, "空にした会話の番号を消す");
assert.equal(primaryLink.dataset.chatgptSplitPane, "1", "他の会話の番号を維持する");
assert.equal(clearPage.panes()[1].querySelector(".empty-state").hidden, false, "案内画面へ戻す");
assert.equal(clearTwo.hidden, true, "空画面では空にするボタンを隠す");
assert.equal(clearPage.panes()[1].querySelector(".reload-pane").hidden, true, "空画面では更新ボタンを隠す");
clearPage.panes()[1].querySelector(".empty-state").children[1].listeners.get("click")();
assert.equal(clearPage.frames()[1].src, "https://chatgpt.com/", "案内から新しいチャットを開ける");
assert.equal(clearTwo.hidden, false, "再び開いたら空にするボタンを表示");
clearPage.panes()[0].querySelector(".clear-pane").listeners.get("click")();
assert.equal(clearPage.frames()[0].src, "about:blank", "画面1も個別に空にできる");
const clearRestored = page("https://chatgpt.com/c/primary");
assert.equal(clearRestored.frames()[0].src, "", "画面1の空状態を再読み込み後も復元");
assert.equal(clearRestored.frames()[1].src, "https://chatgpt.com/", "他画面の新しいチャットを維持");
clearRestored.close();

storage.set("chatgpt-split-view-state", JSON.stringify({
  active: true, parentUrl: "https://chatgpt.com/", count: 4,
  urls: ["https://chatgpt.com/", "https://chatgpt.com/", "https://chatgpt.com/c/legacy", "https://chatgpt.com/"]
}));
const legacy = page("https://chatgpt.com/");
assert.deepEqual(legacy.frames().map(frame => frame.src), ["https://chatgpt.com/", "", "https://chatgpt.com/c/legacy", ""], "旧状態の未使用ホーム画面だけ案内へ移行する");
legacy.close();

const spa = page("https://chatgpt.com/");
spa.message({ type: "toggle-four-view", url: "https://chatgpt.com/" });
spa.message({ type: "assign-conversation", url: "https://chatgpt.com/c/third", pane: 2, pageUrl: "https://chatgpt.com/" });
spa.click({ defaultPrevented: false, button: 0, ctrlKey: false, metaKey: false, shiftKey: false, altKey: false,
  target: { closest: selector => selector === "[role='menuitem']" ? { textContent: "プロフィール" } : null },
  preventDefault() {}, stopPropagation() {} });
assert.equal(spa.frames()[0].src, "https://chatgpt.com/profile", "プロフィール項目のクリックは画面1へ送る");
spa.route("https://chatgpt.com/profile");
assert.deepEqual(spa.frames().map(frame => frame.src).slice(0, 2), [
  "https://chatgpt.com/profile", "https://chatgpt.com/c/third"
], "同一文書内のプロフィール遷移は画面1だけ変更する");
spa.close();

const menuPage = page("https://chatgpt.com/");
menuPage.message({ type: "toggle-four-view", url: "https://chatgpt.com/" });
menuPage.message({ type: "assign-conversation", url: "https://chatgpt.com/c/selected", pane: 2, pageUrl: "https://chatgpt.com/" });
const row = menuPage.document.createElement("a");
row.href = "https://chatgpt.com/c/selected";
const options = menuPage.document.createElement("button");
options.dataset.conversationOptionsTrigger = "selected";
row.append(options);
const menuNav = menuPage.document.createElement("nav");
menuNav.append(row);
menuPage.document.body.append(menuNav);
const buttonEvent = { target: options, defaultPrevented: false, button: 0,
  preventDefault() { this.defaultPrevented = true; }, stopPropagation() {} };
menuPage.pointer(buttonEvent);
const menu = menuPage.document.createElement("div");
menu.role = "menu";
menu.textContent = "名前を変更 ピン留め プロジェクトに移動 共有 アーカイブ 削除";
menuPage.document.body.append(menu);
menuPage.click(buttonEvent);
menuPage.flush();
assert.equal(buttonEvent.defaultPrevented, true, "三点リーダーの親リンクは開かない");
assert.equal(menu.querySelectorAll("[data-chatgpt-split-menu]").length, 1, "会話メニューには分割表示を1項目だけ追加する");
const splitTrigger = menu.querySelector("[data-chatgpt-split-trigger]");
const splitSubmenu = menu.querySelector("[data-chatgpt-split-submenu]");
assert.equal(splitTrigger.textContent, "分割表示 ▸");
assert.equal(splitSubmenu.hidden, true, "画面選択は初期状態で隠す");
assert.equal(splitTrigger.getAttribute("aria-controls"), splitSubmenu.id, "展開ボタンと選択グループを関連付ける");
const submenuClick = { preventDefault() {}, stopPropagation() {} };
splitTrigger.listeners.get("click")(submenuClick);
assert.equal(splitSubmenu.hidden, false, "分割表示を押すと画面選択を展開する");
assert.equal(splitTrigger.getAttribute("aria-expanded"), "true");
assert.deepEqual(splitSubmenu.querySelectorAll("[data-chatgpt-split-pane-option]").map(item => item.textContent),
  ["画面1で開く", "画面2で開く", "画面3で開く", "画面4で開く"], "展開時に画面1～4を選べる");
const splitGroup = menu.querySelector("[data-chatgpt-split-menu]");
splitGroup.listeners.get("mouseleave")();
assert.equal(splitSubmenu.hidden, true, "ポインターが外れたら閉じる");
splitGroup.listeners.get("mouseenter")();
assert.equal(splitSubmenu.hidden, false, "ポインターを乗せるだけで開く");
assert.equal(splitGroup.dataset.side, "right", "会話メニューは通常右側へ開く");
splitGroup.listeners.get("focusout")({ relatedTarget: menuPage.document.body });
assert.equal(splitSubmenu.hidden, true, "フォーカスが外れたら閉じる");
splitGroup.getBoundingClientRect = () => ({ left: 1050, right: 1150, top: 720 });
splitGroup.listeners.get("focusin")();
assert.equal(splitSubmenu.hidden, false, "フォーカスだけでも開く");
assert.equal(splitGroup.dataset.side, "left", "画面右端では左へ切り替える");
assert.equal(splitGroup.dataset.above, "true", "画面下端では上へ揃える");
menuPage.mutate();
assert.equal(menu.querySelectorAll("[data-chatgpt-split-menu]").length, 1, "DOM更新でも分割表示を重複追加しない");
const projectMove = menuPage.document.createElement("button");
projectMove.setAttribute("aria-haspopup", "menu");
menu.append(projectMove);
menuPage.pointer({ target: projectMove });
menuPage.click({ target: projectMove });
const projectSubmenu = menuPage.document.createElement("div");
projectSubmenu.role = "menu";
menuPage.document.body.append(projectSubmenu);
menuPage.mutate();
menuPage.flush();
assert.equal(projectSubmenu.querySelectorAll("[data-chatgpt-split-menu]").length, 0, "プロジェクトに移動のサブメニューへ追加しない");
assert.equal(menuPage.frames()[0].src, "https://chatgpt.com/", "三点リーダーで画面1を切り替えない");
splitSubmenu.querySelectorAll("[data-chatgpt-split-pane-option]")[0].listeners.get("click")({
  preventDefault() {}, stopPropagation() {}
});
assert.equal(menuPage.frames()[0].src, row.href, "明示的な画面1で開く操作では会話を移動する");
assert.equal(menuPage.frames()[1].src, "about:blank", "明示移動後に画面2を空にする");
menuPage.close();

const alternateMenuPage = page("https://chatgpt.com/");
alternateMenuPage.message({ type: "toggle-four-view", url: "https://chatgpt.com/" });
const alternateRow = alternateMenuPage.document.createElement("a");
alternateRow.href = "https://chatgpt.com/c/alternate";
const alternateButton = alternateMenuPage.document.createElement("button");
alternateButton.setAttribute("aria-haspopup", "menu");
alternateButton.setAttribute("aria-controls", "old-menu-id");
alternateRow.append(alternateButton);
const alternateNav = alternateMenuPage.document.createElement("nav");
alternateNav.append(alternateRow);
alternateMenuPage.document.body.append(alternateNav);
alternateMenuPage.pointer({ target: alternateButton });
const alternateMenu = alternateMenuPage.document.createElement("div");
alternateMenu.role = "menu";
alternateMenu.textContent = "Rename Share Archive Delete";
alternateMenu.id = "new-menu-id";
alternateMenuPage.document.body.append(alternateMenu);
alternateMenuPage.mutate();
assert.equal(alternateMenu.querySelectorAll("[data-chatgpt-split-menu]").length, 1, "新しい三点リーダー構造にも分割表示を追加する");
alternateMenu.querySelector("[data-chatgpt-split-trigger]").listeners.get("click")({ preventDefault() {}, stopPropagation() {} });
alternateMenu.querySelectorAll("[data-chatgpt-split-pane-option]")[1].listeners.get("click")({ preventDefault() {}, stopPropagation() {} });
assert.equal(alternateMenuPage.frames()[1].src, alternateRow.href, "三点リーダーから画面2へ移す");
alternateMenuPage.close();

const projectGuardPage = page("https://chatgpt.com/");
projectGuardPage.message({ type: "toggle-four-view", url: "https://chatgpt.com/" });
const guardNav = projectGuardPage.document.createElement("nav");
const guardRow = projectGuardPage.document.createElement("a");
guardRow.href = "https://chatgpt.com/c/guard";
const guardOptions = projectGuardPage.document.createElement("button");
guardOptions.dataset.conversationOptionsTrigger = "guard";
guardRow.append(guardOptions);
guardNav.append(guardRow);
projectGuardPage.document.body.append(guardNav);
projectGuardPage.pointer({ target: guardOptions });
const projectFirstMenu = projectGuardPage.document.createElement("div");
projectFirstMenu.role = "menu";
projectFirstMenu.textContent = "買い物 アーカイブ";
projectGuardPage.document.body.append(projectFirstMenu);
projectGuardPage.mutate();
assert.equal(projectFirstMenu.querySelectorAll("[data-chatgpt-split-menu]").length, 0, "プロジェクト一覧が先に現れても注入しない");
const rootConversationMenu = projectGuardPage.document.createElement("div");
rootConversationMenu.role = "menu";
rootConversationMenu.textContent = "名前を変更 ピン留め 共有 削除 新しいプロジェクト";
projectGuardPage.document.body.append(rootConversationMenu);
projectGuardPage.mutate();
assert.equal(rootConversationMenu.querySelectorAll("[data-chatgpt-split-menu]").length, 1, "続いて現れた会話の親メニューには注入する");
const nestedDialog = projectGuardPage.document.createElement("div");
nestedDialog.role = "dialog";
const nestedProjectButton = projectGuardPage.document.createElement("button");
nestedProjectButton.setAttribute("aria-haspopup", "menu");
nestedDialog.append(nestedProjectButton);
guardRow.append(nestedDialog);
projectGuardPage.pointer({ target: nestedProjectButton });
const nestedProjectList = projectGuardPage.document.createElement("div");
nestedProjectList.role = "menu";
nestedProjectList.textContent = "買い物";
projectGuardPage.document.body.append(nestedProjectList);
projectGuardPage.mutate();
assert.equal(nestedProjectList.querySelectorAll("[data-chatgpt-split-menu]").length, 0, "サイドバー内でも既存ダイアログからは追加しない");
projectGuardPage.close();

const unrelatedPage = page("https://chatgpt.com/");
unrelatedPage.message({ type: "toggle-four-view", url: "https://chatgpt.com/" });
const unrelatedRow = unrelatedPage.document.createElement("a");
unrelatedRow.href = "https://chatgpt.com/c/selected";
const unrelatedOptions = unrelatedPage.document.createElement("button");
unrelatedOptions.dataset.conversationOptionsTrigger = "selected";
unrelatedRow.append(unrelatedOptions);
const unrelatedNav = unrelatedPage.document.createElement("nav");
unrelatedNav.append(unrelatedRow);
unrelatedPage.document.body.append(unrelatedNav);
unrelatedPage.pointer({ target: unrelatedOptions });
const profileButton = unrelatedPage.document.createElement("button");
unrelatedPage.document.body.append(profileButton);
unrelatedPage.pointer({ target: profileButton });
const profileMenu = unrelatedPage.document.createElement("div");
profileMenu.role = "menu";
unrelatedPage.document.body.append(profileMenu);
unrelatedPage.flush();
assert.equal(profileMenu.querySelectorAll("[data-chatgpt-split-menu]").length, 0, "プロフィール等の別メニューに画面割当を追加しない");
unrelatedPage.close();

const clickPage = page("https://chatgpt.com/");
clickPage.message({ type: "toggle-four-view", url: "https://chatgpt.com/" });
const nav = clickPage.document.createElement("nav");
const conversationLink = clickPage.document.createElement("a");
conversationLink.href = "https://chatgpt.com/c/normal-click";
nav.append(conversationLink);
clickPage.document.body.append(nav);
const normalClick = { target: conversationLink, defaultPrevented: false, button: 0,
  preventDefault() { this.defaultPrevented = true; }, stopPropagation() {} };
clickPage.click(normalClick);
assert.equal(clickPage.frames()[0].src, conversationLink.href, "会話の通常クリックは画面1で開く");
assert.equal(normalClick.defaultPrevented, true, "親ページの会話遷移を抑止する");
clickPage.close();

const alreadyOpen = page("https://chatgpt.com/");
alreadyOpen.message({ type: "toggle-four-view", url: "https://chatgpt.com/" });
const openedNav = alreadyOpen.document.createElement("nav");
const openedLink = alreadyOpen.document.createElement("a");
openedLink.href = "https://chatgpt.com/c/squat";
openedNav.append(openedLink);
alreadyOpen.document.body.append(openedNav);
alreadyOpen.message({ type: "assign-conversation", url: openedLink.href, pane: 2, pageUrl: "https://chatgpt.com/" });
let focused = null;
alreadyOpen.frames()[1].contentWindow = { postMessage: message => { focused = message; } };
const openedClick = { target: openedLink, defaultPrevented: false, button: 0,
  preventDefault() { this.defaultPrevented = true; }, stopPropagation() {} };
alreadyOpen.click(openedClick);
assert.equal(openedClick.defaultPrevented, true, "表示中の会話の通常クリックは親ページへ伝えない");
assert.equal(alreadyOpen.frames()[0].src, "https://chatgpt.com/", "表示中の会話を画面1へ移動しない");
assert.equal(alreadyOpen.frames()[1].src, openedLink.href, "表示中の画面2を維持する");
assert.equal(focused.type, "focus-composer", "表示中の画面2へ入力フォーカスを送る");
alreadyOpen.close();

const hiddenOpen = page("https://chatgpt.com/");
hiddenOpen.message({ type: "toggle-four-view", url: "https://chatgpt.com/" });
const hiddenNav = hiddenOpen.document.createElement("nav");
const hiddenLink = hiddenOpen.document.createElement("a");
hiddenLink.href = "https://chatgpt.com/c/hidden";
hiddenNav.append(hiddenLink);
hiddenOpen.document.body.append(hiddenNav);
hiddenOpen.message({ type: "assign-conversation", url: hiddenLink.href, pane: 4, pageUrl: "https://chatgpt.com/" });
hiddenOpen.launcher().shadowRoot.querySelectorAll("[data-start-count]").find(button => button.dataset.startCount === "2").listeners.get("click")();
let hiddenFocused = false;
hiddenOpen.frames()[3].contentWindow = { postMessage: () => { hiddenFocused = true; } };
const hiddenClick = { target: hiddenLink, defaultPrevented: false, button: 0,
  preventDefault() { this.defaultPrevented = true; }, stopPropagation() {} };
hiddenOpen.click(hiddenClick);
assert.equal(hiddenClick.defaultPrevented, true, "隠れた画面の会話も親ページへの遷移を抑止する");
assert.equal(hiddenOpen.host().shadowRoot.querySelector(".grid").dataset.count, "2", "誤クリックで画面数を変えない");
assert.equal(hiddenOpen.frames()[0].src, "https://chatgpt.com/", "隠れた画面の会話を画面1へ移動しない");
assert.equal(hiddenOpen.frames()[3].src, hiddenLink.href, "画面4の会話を保持する");
assert.equal(hiddenFocused, false, "隠れた画面へフォーカスを送らない");
hiddenOpen.close();

console.log("content state transitions: pass");

// Browser-session-independent extension storage, geometry and live iframe routes.
{
  storage.clear();
  const local = new Map();
  const p = page("https://chatgpt.com/c/persist-one", { local });
  p.message({ type: "toggle-four-view", url: "https://chatgpt.com/c/persist-one" });
  p.launcher().shadowRoot.querySelectorAll("[data-four-layout]").find(b => b.dataset.fourLayout === "stacked").listeners.get("click")();
  p.message({ type: "assign-conversation", url: "https://chatgpt.com/c/persist-two", pane: 2 });
  const grid = p.host().shadowRoot.querySelector(".grid");
  const drag = (handle, x, y) => { handle.listeners.get("pointerdown")({ preventDefault() {}, pointerId: 1 }); handle.listeners.get("pointermove")({ clientX: x, clientY: y }); handle.listeners.get("pointerup")(); };
  drag(grid.querySelectorAll(".four-resize")[0], 520, 0);
  drag(grid.querySelectorAll(".four-resize")[3], 0, 270);
  drag(p.host().shadowRoot.querySelector(".resize-handle.x"), 440, 0);
  drag(p.host().shadowRoot.querySelector(".resize-handle.y"), 0, 360);
  p.frames()[1].contentWindow = { location: { href: "https://chatgpt.com/c/newly-created" } };
  delete p.frames()[1].dataset.pendingUrl;
  p.tick();
  const saved = local.get("chatgpt-split-view-state");
  assert.equal(saved.geometry.fourLeft, .65);
  assert.equal(saved.geometry.fourRows[0], .45);
  assert.equal(saved.geometry.splitX, .55);
  assert.equal(saved.geometry.splitY, .6);
  storage.clear();
  const restored = page("https://chatgpt.com/c/different-parent", { local });
  assert.deepEqual(restored.frames().map(f => f.src), ["https://chatgpt.com/c/persist-one", "https://chatgpt.com/c/newly-created", "", ""]);
  assert.equal(restored.host().shadowRoot.querySelector(".grid").dataset.fourLayout, "stacked");
  assert.equal(restored.host().shadowRoot.querySelector(".grid").style["--split-x"], "55.00000000000001%");
  restored.close();
  assert.equal(local.get("chatgpt-split-view-state").active, false);
  storage.clear();
  const stopped = page("https://chatgpt.com/", { local, keepInactive: true });
  assert.equal(stopped.host(), undefined);
  stopped.message({ type: "toggle-four-view", url: "https://chatgpt.com/" });
  assert.equal(stopped.frames()[1].src, "https://chatgpt.com/c/newly-created");
  stopped.close();
  for (const mutate of [s => s.urls[0] = "https://evil.example/", s => s.geometry.splitX = 5, s => s.geometry.fourRows = [.8, .2], s => s.count = 6]) {
    const broken = JSON.parse(JSON.stringify(saved)); mutate(broken); local.set("chatgpt-split-view-state", broken); storage.clear();
    assert.equal(page("https://chatgpt.com/", { local }).host(), undefined);
  }
  local.set("chatgpt-split-view-state", saved); storage.clear();
  const racing = page("https://chatgpt.com/", { local, delayedGet: true });
  racing.message({ type: "toggle-four-view", url: "https://chatgpt.com/c/user-chosen" }); racing.flush();
  assert.equal(racing.frames()[0].src, "https://chatgpt.com/c/user-chosen");
  racing.close(); storage.clear(); local.clear();
  const failed = page("https://chatgpt.com/", { local, failWrite: true });
  assert.doesNotThrow(() => failed.message({ type: "toggle-four-view", url: "https://chatgpt.com/" }));
  assert.doesNotThrow(() => failed.close());
  storage.clear();
}
