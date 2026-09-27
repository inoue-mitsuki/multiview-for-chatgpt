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
  if (!String(info.menuItemId).startsWith(menuPrefix) || !tab?.id) return;
  const pane = Number(String(info.menuItemId).slice(menuPrefix.length));
  const url = conversationUrl(info.linkUrl);
  if (!Number.isInteger(pane) || pane < 1 || pane > 4 || !url ||
      !info.pageUrl?.startsWith(origin + "/") || !tab.url?.startsWith(origin + "/")) return;
  try {
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["content.js"] });
    await chrome.tabs.sendMessage(tab.id, { type: "assign-conversation", url, pane, pageUrl: tab.url });
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
    await chrome.scripting.executeScript({ target: { tabId }, files: ["content.js"] });
    await chrome.tabs.sendMessage(tabId, { type: "toggle-four-view", url });
    await chrome.action.setBadgeText({ tabId, text: "" });
    await chrome.action.setTitle({ tabId, title: "ChatGPTを分割表示" });
  } catch {
    await chrome.action.setBadgeText({ tabId, text: "!" });
    await chrome.action.setBadgeBackgroundColor({ tabId, color: "#b91c1c" });
    await chrome.action.setTitle({ tabId, title: "4分割を開始できませんでした" });
  }
});
