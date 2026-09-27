const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "..", "content.js"), "utf8");
const storage = new Map();

function page(href) {
  const url = new URL(href);
  let messageListener;
  let intervalCallback;
  const documentListeners = new Map();
  const timers = [];
  class Element {
    constructor(tagName) {
      this.tagName = tagName;
      this.children = [];
      this.dataset = {};
      this.style = { setProperty() {} };
      this.listeners = new Map();
      this.className = "";
      this.src = "";
      this.attrs = {};
      this.innerHTML = "";
    }
    append(...items) { for (const item of items) { item.parentElement = this; this.children.push(item); } }
    attachShadow() { this.shadowRoot = new Element("shadow"); return this.shadowRoot; }
    addEventListener(type, listener) { this.listeners.set(type, listener); }
    removeEventListener(type) { this.listeners.delete(type); }
    setAttribute(name, value) { this.attrs[name] = value; }
    getAttribute(name) { return this.attrs[name] || null; }
    matches(selector) {
      if (selector === "a[href*='/c/']") return this.tagName === "a" && this.href?.includes("/c/");
      if (selector === "nav, aside, [role='navigation']") return false;
      if (selector.includes("data-conversation-options-trigger")) return this.tagName === "button" && !!this.dataset.conversationOptionsTrigger;
      if (selector === "a[href]") return this.tagName === "a" && !!this.href;
      if (selector === "[role='menu']") return this.role === "menu";
      return false;
    }
    closest(selector) { for (let item = this; item; item = item.parentElement) if (item.matches(selector)) return item; return null; }
    getClientRects() { return [1]; }
    contains(element) { return element === this || this.descendants().includes(element); }
    remove() { if (this.parentElement) this.parentElement.children = this.parentElement.children.filter(item => item !== this); }
    descendants() { return this.children.flatMap(child => [child, ...child.descendants()]); }
    querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
    querySelectorAll(selector) {
      const items = this.descendants();
      if (selector === "iframe") return items.filter(item => item.tagName === "iframe");
      if (selector === "[data-count-button]") return items.filter(item => item.dataset.countButton);
      if (selector === ".resize-handle.y") return items.filter(item => item.className === "resize-handle y");
      if (selector === ".close") return items.filter(item => item.className === "close");
      if (selector === "a[href*='/c/']") return items.filter(item => item.matches(selector));
      if (selector === "[data-chatgpt-split-menu]") return items.filter(item => item.dataset.chatgptSplitMenu);
      return [];
    }
    getBoundingClientRect() { return this.tagName === "nav" ? { left: 0, right: 260, top: 0, width: 260, height: 800 } : { left: 0, top: 0, width: 800, height: 600 }; }
  }
  const document = {
    documentElement: new Element("html"), body: new Element("body"), head: new Element("head"),
    createElement: name => new Element(name),
    createDocumentFragment: () => new Element("fragment"),
    querySelector: () => null, querySelectorAll: selector => selector === "[role='menu']" ? document.body.descendants().filter(item => item.role === "menu") :
      selector.includes("aside, nav") ? document.body.descendants().filter(item => item.tagName === "nav") : [],
    addEventListener(type, listener) { documentListeners.set(type + ":" + (documentListeners.size + 1), listener); },
    removeEventListener() {}
  };
  const location = { href: url.href, origin: url.origin, pathname: url.pathname };
  const window = { addEventListener() {}, removeEventListener() {} };
  window.top = window;
  const context = {
    window, document, location, URL,
    innerWidth: 1200, innerHeight: 800,
    sessionStorage: {
      getItem: key => storage.get(key) || null,
      setItem: (key, value) => storage.set(key, value),
      removeItem: key => storage.delete(key)
    },
    chrome: { runtime: { onMessage: { addListener: listener => { messageListener = listener; } } } },
    ResizeObserver: class { observe() {} disconnect() {} },
    MutationObserver: class { observe() {} disconnect() {} },
    requestAnimationFrame: () => 1, cancelAnimationFrame() {},
    setTimeout: callback => { timers.push(callback); }, setInterval: callback => { intervalCallback = callback; return 1; }, clearInterval() {}
  };
  vm.runInNewContext(source, context);
  const host = () => document.documentElement.children.find(item => item.id === "chatgpt-split-extension");
  const frames = () => host()?.shadowRoot.querySelectorAll("iframe") || [];
  return { host, frames, message: value => messageListener(value), close: () => host().shadowRoot.querySelector(".close").listeners.get("click")(),
    document, pointer: event => { for (const [key, listener] of documentListeners) if (key.startsWith("pointerdown:")) listener(event); },
    flush: () => { while (timers.length) timers.shift()(); },
    click: event => { for (const [key, listener] of documentListeners) if (key.startsWith("click:")) listener(event); },
    route: next => { const nextUrl = new URL(next); location.href = nextUrl.href; location.pathname = nextUrl.pathname; intervalCallback(); } };
}

const first = page("https://chatgpt.com/c/first");
assert.equal(first.host(), undefined, "保存状態なしでは自動開始しない");
first.message({ type: "toggle-four-view", url: "https://chatgpt.com/c/first" });
assert.deepEqual(first.frames().map(frame => frame.src), [
  "https://chatgpt.com/c/first", "https://chatgpt.com/", "", ""
]);
first.message({ type: "assign-conversation", url: "https://chatgpt.com/c/second", pane: 2, pageUrl: "https://chatgpt.com/c/first" });
assert.equal(first.frames()[1].src, "https://chatgpt.com/c/second", "会話を画面2へ割り当てる");
first.message({ type: "assign-conversation", url: "https://chatgpt.com/c/second", pane: 3, pageUrl: "https://chatgpt.com/c/first" });
assert.equal(first.frames()[1].src, "https://chatgpt.com/", "移動元は新しいチャットへ戻す");
assert.equal(first.frames()[2].src, "https://chatgpt.com/c/second", "移動先で会話を開く");
first.frames()[2].contentWindow = { location: { href: "https://chatgpt.com/c/inside-frame" } };
first.frames()[2].listeners.get("load")();
first.host().shadowRoot.querySelectorAll("[data-count-button]").find(button => button.dataset.countButton === "4").listeners.get("click")();
assert.equal(first.frames()[3].src, "https://chatgpt.com/", "画面4は表示時に初めて読み込む");
first.route("https://chatgpt.com/projects");

const profile = page("https://chatgpt.com/profile");
assert.ok(profile.host(), "プロフィールへの全画面遷移後に分割を復元する");
assert.deepEqual(profile.frames().map(frame => frame.src).slice(0, 3), [
  "https://chatgpt.com/profile", "https://chatgpt.com/", "https://chatgpt.com/c/inside-frame"
]);
profile.close();
assert.equal(storage.has("chatgpt-split-view-state"), false, "明示終了では復元状態を消す");
assert.equal(page("https://chatgpt.com/").host(), undefined, "終了後は自動開始しない");

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
const row = menuPage.document.createElement("a");
row.href = "https://chatgpt.com/c/selected";
const options = menuPage.document.createElement("button");
options.dataset.conversationOptionsTrigger = "selected";
row.append(options);
menuPage.document.body.append(row);
const buttonEvent = { target: options, defaultPrevented: false, button: 0,
  preventDefault() { this.defaultPrevented = true; }, stopPropagation() {} };
menuPage.pointer(buttonEvent);
const menu = menuPage.document.createElement("div");
menu.role = "menu";
menuPage.document.body.append(menu);
menuPage.click(buttonEvent);
menuPage.flush();
assert.equal(buttonEvent.defaultPrevented, true, "三点リーダーの親リンクは開かない");
assert.deepEqual(menu.querySelectorAll("[data-chatgpt-split-menu]").map(item => item.textContent),
  ["画面1で開く", "画面2で開く", "画面3で開く", "画面4で開く"], "会話メニューに画面割当を追加する");
assert.equal(menuPage.frames()[0].src, "https://chatgpt.com/", "三点リーダーで画面1を切り替えない");
menuPage.close();

const unrelatedPage = page("https://chatgpt.com/");
unrelatedPage.message({ type: "toggle-four-view", url: "https://chatgpt.com/" });
const unrelatedRow = unrelatedPage.document.createElement("a");
unrelatedRow.href = "https://chatgpt.com/c/selected";
const unrelatedOptions = unrelatedPage.document.createElement("button");
unrelatedOptions.dataset.conversationOptionsTrigger = "selected";
unrelatedRow.append(unrelatedOptions);
unrelatedPage.document.body.append(unrelatedRow);
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

console.log("content state transitions: pass");
