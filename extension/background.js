const origin = "https://chatgpt.com";
const menuPrefix = "chatgpt-split-pane-";

function conversationUrl(value) {
  try {
    const url = new URL(value);
    return url.origin === origin && !url.username && !url.password && !url.search && !url.hash &&
      /^\/(?:c\/[a-zA-Z0-9-]+|g\/[a-zA-Z0-9-]+\/c\/[a-zA-Z0-9-]+)\/?$/.test(url.pathname) ? url.href : null;
  } catch { return null; }
}

function registerMenus() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({ id: "chatgpt-split-diagnostics", title: "分割ビューの診断を表示", contexts: ["action"] });
    for (let index = 0; index < 4; index++) {
      chrome.contextMenus.create({
        id: menuPrefix + (index + 1),
        title: `画面${index + 1}で開く`,
        contexts: ["link"],
        documentUrlPatterns: ["https://chatgpt.com/*"],
        targetUrlPatterns: ["https://chatgpt.com/*"]
      });
    }
  });
}

chrome.runtime.onInstalled.addListener(registerMenus);
chrome.runtime.onStartup.addListener(registerMenus);

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "chatgpt-split-diagnostics" && tab?.id) {
    try {
      const result = await chrome.tabs.sendMessage(tab.id, { type: "show-split-diagnostics" });
      if (!result?.shown) throw new Error("診断対応コードが読み込まれていません");
    } catch {
      await chrome.action.setBadgeText({ tabId: tab.id, text: "再読込" });
      await chrome.action.setTitle({ tabId: tab.id, title: "ChatGPTタブを再読み込みしてから診断を開いてください" });
    }
    return;
  }
  if (!String(info.menuItemId).startsWith(menuPrefix) || !tab?.id) return;
  const pane = Number(String(info.menuItemId).slice(menuPrefix.length));
  let url;
  try {
    const parsed = new URL(info.linkUrl);
    if (parsed.origin !== origin || parsed.username || parsed.password) return;
    url = parsed.href;
  } catch { return; }
  if (!Number.isInteger(pane) || pane < 1 || pane > 4 || !url ||
      !info.pageUrl?.startsWith(origin + "/") || !tab.url?.startsWith(origin + "/")) return;
  try {
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["content.js"] });
    await chrome.tabs.sendMessage(tab.id, { type: conversationUrl(url) ? "assign-conversation" : "assign-page", url, pane, pageUrl: tab.url });
  } catch {
    await chrome.action.setBadgeBackgroundColor({ tabId: tab.id, color: "#b91c1c" });
    await chrome.action.setBadgeText({ tabId: tab.id, text: "!" });
  }
});

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) return;
  const tabId = tab.id;
  const url = tab.url;
  if (!/^https:\/\/chatgpt\.com(?:\/|$)/i.test(url || "")) {
    await chrome.action.setBadgeBackgroundColor({ tabId, color: "#b91c1c" });
    await chrome.action.setBadgeText({ tabId, text: "!" });
    await chrome.action.setTitle({ tabId, title: "chatgpt.comでのみ分割できます" });
    return;
  }
  try {
    let alive;
    try { alive = await chrome.tabs.sendMessage(tabId, { type: "controller-alive" }); } catch {}
    if (alive !== undefined && (alive?.alive !== true || typeof alive?.version !== "string")) throw new Error("controller応答が不正です");
    if (alive === undefined) {
      await chrome.scripting.executeScript({ target: { tabId }, func: () => { globalThis.__chatgptSplitInstalled = null; } });
    }
    await chrome.scripting.executeScript({ target: { tabId }, files: ["content.js"] });
    const recovery = await chrome.tabs.sendMessage(tabId, { type: "recover-split-controller" });
    if (typeof recovery?.legacy !== "boolean" || typeof recovery?.recovered !== "boolean" || typeof recovery?.version !== "string") throw new Error("復旧状態を確認できませんでした");
    if (recovery?.legacy) {
      await chrome.action.setBadgeText({ tabId, text: "要移行" });
      await chrome.action.setTitle({ tabId, title: "旧版の分割画面を保護しました。未送信入力を送信・退避してからChatGPTタブを手動で再読み込みしてください" });
      return;
    }
    if (!recovery?.recovered) await chrome.tabs.sendMessage(tabId, { type: "toggle-four-view", url });
    await chrome.action.setBadgeText({ tabId, text: "" });
    await chrome.action.setTitle({ tabId, title: "ChatGPTを分割表示" });
  } catch {
    await chrome.action.setBadgeText({ tabId, text: "!" });
    await chrome.action.setBadgeBackgroundColor({ tabId, color: "#b91c1c" });
    await chrome.action.setTitle({ tabId, title: "4分割を開始できませんでした" });
  }
});
