(() => {
  if (window.top !== window || globalThis.__chatgptSplitInstalled) return;
  globalThis.__chatgptSplitInstalled = true;
  const origin = "https://chatgpt.com";
  let host, grid, observer, sidebarObserver, menuObserver, observedSide, pendingFrame = 0;
  let sidebarClickHandler, menuClickHandler, menuPointerHandler;
  let routeTimer;
  let splitX = 0.5, splitY = 0.5, resizedX = false;
  const stateKey = "chatgpt-split-view-state";
  function readState() { try { return JSON.parse(sessionStorage.getItem(stateKey) || "null"); } catch { return null; } }
  function paneUrl(pane) {
    if (pane?.dataset.deferredUrl) return chatgptUrl(pane.dataset.deferredUrl);
    const frame = pane?.querySelector("iframe");
    if (!frame) return null;
    if (frame.dataset.pendingUrl) return chatgptUrl(frame.dataset.pendingUrl);
    try { return chatgptUrl(frame.contentWindow.location.href) || chatgptUrl(frame.src); }
    catch { return chatgptUrl(frame.src); }
  }
  function setFrameUrl(frame, url) {
    frame.dataset.pendingUrl = url;
    frame.src = url;
  }
  function saveState() {
    if (!grid) return;
    const urls = panes.map(pane => paneUrl(pane) || origin + "/");
    sessionStorage.setItem(stateKey, JSON.stringify({ active: true, parentUrl: location.href, count: Number(grid.dataset.count), urls }));
  }
  let menuStyle;
  let pendingConversationMenu = null;
  const panes = [];
  const conversationOptionsSelector = "button[data-conversation-options-trigger], button[data-testid^='history-item-'][data-testid$='-options'], button[aria-label*='会話オプション']";

  function conversationUrl(value) {
    try {
      const url = new URL(value, location.href);
      return url.origin === origin && !url.username && !url.password && !url.search && !url.hash &&
        /^\/(?:c\/[a-zA-Z0-9-]+|g\/[a-zA-Z0-9-]+\/c\/[a-zA-Z0-9-]+)\/?$/.test(url.pathname) ? url.href : null;
    } catch { return null; }
  }
  function chatgptUrl(value) {
    if (typeof value !== "string" || !value) return null;
    try {
      const url = new URL(value, location.href);
      return url.origin === origin && !url.username && !url.password ? url.href : null;
    } catch { return null; }
  }
  function showInPaneOne(url) {
    const target = chatgptUrl(url);
    const frame = panes[0]?.querySelector("iframe");
    if (!target || !frame) return;
    if (paneUrl(panes[0]) !== target) setFrameUrl(frame, target);
    saveState();
  }
  function sidebar() {
    const main = document.querySelector("main");
    const candidates = [...document.querySelectorAll('aside, nav, [data-testid*="sidebar"], [class*="sidebar"]')]
      .filter(element => {
        if (main && element.contains(main)) return false;
        const rect = element.getBoundingClientRect();
        return rect.left >= -4 && rect.left <= 32 && rect.width >= 150 &&
          rect.width < innerWidth * .5 && rect.height >= innerHeight * .5;
      });
    candidates.sort((a, b) => {
      const score = element => Number(element.matches("nav, aside")) * 10000 +
        Math.min(element.getBoundingClientRect().height, innerHeight);
      return score(b) - score(a);
    });
    return candidates[0] || null;
  }
  function updateLeft() {
    if (!host) return;
    const side = sidebar();
    if (observer && side !== observedSide) {
      if (observedSide) observer.unobserve(observedSide);
      if (side) observer.observe(side);
      observedSide = side;
    }
    const rect = side?.getBoundingClientRect();
    const detectedWidth = rect && rect.width > 100 && rect.width < innerWidth * .5 && rect.left < 32 && rect.right > 100 ? rect.right : 260;
    const width = Math.max(260, detectedWidth);
    host.style.left = Math.round(width) + "px";
  }
  function scheduleUpdateLeft() {
    if (pendingFrame) return;
    pendingFrame = requestAnimationFrame(() => {
      pendingFrame = 0;
      updateLeft();
    });
  }
  function setCount(count) {
    grid.dataset.count = String(count);
    panes.forEach((pane, index) => {
      pane.hidden = index >= count;
      if (!pane.hidden && pane.dataset.deferredUrl) {
        setFrameUrl(pane.querySelector("iframe"), pane.dataset.deferredUrl);
        delete pane.dataset.deferredUrl;
      }
    });
    host.shadowRoot.querySelectorAll("[data-count-button]").forEach(button =>
      button.setAttribute("aria-pressed", String(Number(button.dataset.countButton) === count)));
    const yHandle = host.shadowRoot.querySelector(".resize-handle.y");
    if (yHandle) yHandle.hidden = count !== 4;
    const xHandle = host.shadowRoot.querySelector(".resize-handle.x");
    if (xHandle) xHandle.style.left = resizedX ? (splitX * 100) + "%" : count === 3 ? "33.333%" : "50%";
    saveState();
  }
  function assignConversation(url, paneNumber, parentPageUrl) {
    const target = conversationUrl(url);
    if (!target || !Number.isInteger(paneNumber) || paneNumber < 1 || paneNumber > 4) return;
    if (!host) start(parentPageUrl);
    if (!host) return;
    const sourceIndex = panes.findIndex(pane => conversationUrl(paneUrl(pane)) === target);
    if (sourceIndex >= 0 && sourceIndex !== paneNumber - 1) {
      const sourcePane = panes[sourceIndex];
      if (sourcePane.hidden || sourcePane.dataset.deferredUrl) sourcePane.dataset.deferredUrl = origin + "/";
      else setFrameUrl(sourcePane.querySelector("iframe"), origin + "/");
    }
    const currentCount = Number(grid.dataset.count);
    if (paneNumber > currentCount) panes[paneNumber - 1].dataset.deferredUrl = target;
    if (paneNumber > currentCount) setCount(paneNumber);
    const frame = panes[paneNumber - 1].querySelector("iframe");
    if (paneUrl(panes[paneNumber - 1]) !== target) setFrameUrl(frame, target);
    saveState();
  }
  function focusPaneComposer(index) {
    const frame = panes[index]?.querySelector("iframe");
    frame?.contentWindow?.postMessage({ type: "focus-composer" }, origin);
  }
  function stop() {
    if (!host) return;
    sessionStorage.removeItem(stateKey);
    window.removeEventListener("resize", scheduleUpdateLeft);
    if (pendingFrame) cancelAnimationFrame(pendingFrame);
    pendingFrame = 0;
    observer?.disconnect();
    sidebarObserver?.disconnect();
    menuObserver?.disconnect();
    if (sidebarClickHandler) document.removeEventListener("click", sidebarClickHandler, true);
    if (menuClickHandler) document.removeEventListener("click", menuClickHandler, true);
    if (menuPointerHandler) document.removeEventListener("pointerdown", menuPointerHandler, true);
    if (routeTimer) clearInterval(routeTimer);
    pendingConversationMenu = null;
    menuStyle?.remove();
    host.remove();
    host = grid = observer = sidebarObserver = menuObserver = observedSide = menuStyle = sidebarClickHandler = menuClickHandler = menuPointerHandler = routeTimer = null;
    panes.length = 0;
  }
  function start(url) {
    if (new URL(url).origin !== origin) return;
    const saved = readState();
    const restore = saved?.active === true && Array.isArray(saved.urls);
    const parentRouteChanged = restore && saved.parentUrl && saved.parentUrl !== location.href;
    const initialCount = restore && [2, 3, 4].includes(Number(saved.count)) ? Number(saved.count) : 2;
    host = document.createElement("div");
    host.id = "chatgpt-split-extension";
    const shadow = host.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = `
      :host { position: fixed; top: 0; right: 0; bottom: 0; z-index: 2; background: #111; color: white; }
      * { box-sizing: border-box; }
      .workspace { height: 100%; display: flex; flex-direction: column; font: 13px sans-serif; }
      .toolbar { height: 42px; flex: none; display: flex; align-items: center; gap: 6px; padding: 4px 8px; background: #242424; }
      .toolbar span { margin-right: 6px; }
      button { border: 1px solid #777; border-radius: 5px; padding: 5px 9px; background: #333; color: white; cursor: pointer; }
      button[aria-pressed="true"] { background: #2d69c7; }
      button:focus-visible { outline: 2px solid #80baff; }
      .close { margin-left: auto; }
      .grid { position: relative; display: grid; flex: 1; min-height: 0; gap: 2px; overflow: hidden; background: #64748b; }
      .grid[data-count="2"], .grid[data-count="3"] { grid-template-columns: minmax(120px, var(--split-x, 50%)) minmax(120px, 1fr); }
      .grid[data-count="3"] { grid-template-columns: minmax(120px, var(--split-x, 33.333%)) minmax(120px, 1fr) minmax(120px, 1fr); }
      .grid[data-count="4"] { grid-template-columns: minmax(120px, var(--split-x, 50%)) minmax(120px, 1fr); grid-template-rows: minmax(120px, var(--split-y, 50%)) minmax(120px, 1fr); }
      .pane { position: relative; min-width: 0; min-height: 0; background: #111; }
      .pane[hidden] { display: none; }
      iframe { display: block; border: 0; width: 100%; height: 100%; }
      .label { position: absolute; top: 6px; left: 6px; padding: 3px 6px; border-radius: 4px; background: #111c; pointer-events: none; }
      .reload-pane { position: absolute; top: 6px; right: 6px; z-index: 4; padding: 3px 7px; border: 1px solid #777; border-radius: 4px; background: #222d; color: white; cursor: pointer; }
      .resize-handle { position: absolute; z-index: 3; background: transparent; opacity: 0; }
      .resize-handle:hover, .resize-handle:active { background: #64748b; opacity: .8; }
      .resize-handle.x { top: 0; bottom: 0; width: 8px; margin-left: -4px; cursor: col-resize; }
      .resize-handle.y { left: 0; right: 0; height: 8px; margin-top: -4px; cursor: row-resize; }
    `;
    const workspace = document.createElement("div");
    workspace.className = "workspace";
    const toolbar = document.createElement("div");
    toolbar.className = "toolbar";
    const title = document.createElement("span");
    title.textContent = "画面数";
    toolbar.append(title);
    for (const count of [2, 3, 4]) {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.countButton = String(count);
      button.textContent = String(count);
      button.addEventListener("click", () => setCount(count));
      toolbar.append(button);
    }
    const close = document.createElement("button");
    close.type = "button";
    close.className = "close";
    close.textContent = "分割を終了";
    close.addEventListener("click", stop);
    toolbar.append(close);
    grid = document.createElement("div");
    grid.className = "grid";
    for (let index = 0; index < 4; index++) {
      const pane = document.createElement("div");
      pane.className = "pane";
      const frame = document.createElement("iframe");
      frame.title = "画面 " + (index + 1);
      frame.setAttribute("data-chatgpt-split-frame", "");
      const frameUrl = index === 0 && parentRouteChanged ? url :
        (restore && chatgptUrl(saved.urls[index])) || (index === 0 ? url : origin + "/");
      if (index < initialCount) setFrameUrl(frame, frameUrl);
      else pane.dataset.deferredUrl = frameUrl;
      frame.addEventListener("load", () => { delete frame.dataset.pendingUrl; saveState(); });
      const label = document.createElement("div");
      label.className = "label";
      label.textContent = "画面 " + (index + 1);
      const reload = document.createElement("button");
      reload.type = "button";
      reload.className = "reload-pane";
      reload.title = "この画面だけ更新";
      reload.textContent = "↻";
      reload.addEventListener("click", () => {
        try { frame.contentWindow.location.reload(); }
        catch { frame.src = frame.src; }
      });
      pane.append(frame, label, reload);
      grid.append(pane);
      panes.push(pane);
    }
    workspace.append(toolbar, grid);
    shadow.append(style, workspace);
    document.documentElement.append(host);
    addResizeHandle("x");
    addResizeHandle("y");
    setCount(initialCount);
    updateLeft();
    window.addEventListener("resize", scheduleUpdateLeft);
    observer = new ResizeObserver(scheduleUpdateLeft);
    const side = sidebar();
    if (side) {
      observer.observe(side);
      observedSide = side;
    }
    sidebarObserver = new MutationObserver(scheduleUpdateLeft);
    sidebarObserver.observe(document.body, { childList: true, subtree: true });
    menuStyle = document.createElement("style");
    menuStyle.textContent = `[role="menu"], [role="dialog"], [data-radix-menu-content], [data-radix-popper-content-wrapper], [data-radix-portal], [data-state="open"] { z-index: 2147483647 !important; } body > [role="menu"], body > [role="dialog"], body > [data-radix-popper-content-wrapper] { position: fixed !important; z-index: 2147483647 !important; } [data-chatgpt-split-menu] { display: block; width: 100%; text-align: left; padding: 8px 12px; border: 0; background: transparent; color: inherit; cursor: pointer; font: inherit; } [data-chatgpt-split-menu]:hover { background: color-mix(in srgb, currentColor 12%, transparent); }`;
    document.head.append(menuStyle);
    menuObserver = new MutationObserver(() => installMenuItems());
    menuObserver.observe(document.body, { childList: true, subtree: true });
    installMenuItems();
    sidebarClickHandler = event => {
      if (!host || event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.target.closest("#chatgpt-split-extension, [data-chatgpt-split-menu]")) return;
      const link = event.target.closest("a[href]");
      const target = chatgptUrl(link?.href);
      const profileItem = event.target.closest("[role='menuitem']");
      if ((target && new URL(target).pathname.startsWith("/profile")) ||
          (profileItem && profileItem.textContent.trim() === "プロフィール")) {
        event.preventDefault();
        event.stopPropagation();
        showInPaneOne(target || origin + "/profile");
        return;
      }
      if (event.target.closest("[role='menu']")) return;
      if (event.target.closest(conversationOptionsSelector)) {
        event.preventDefault();
        return;
      }
      const url = conversationUrl(link?.href);
      const side = sidebar();
      if (!side || !side.contains(link)) return;
      if (!url) {
        if (!target) return;
        event.preventDefault();
        event.stopPropagation();
        showInPaneOne(target);
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      const sourceIndex = panes.findIndex(pane => conversationUrl(paneUrl(pane)) === url);
      const sourceFrame = panes[sourceIndex]?.querySelector("iframe");
      if (sourceIndex > 0) sourceFrame.addEventListener("load", () => focusPaneComposer(sourceIndex), { once: true });
      assignConversation(url, 1, location.href);
      if (sourceIndex > 0) setTimeout(() => focusPaneComposer(sourceIndex), 300);
    };
    document.addEventListener("click", sidebarClickHandler, true);
    const rememberConversationMenu = (button, openedAtPointer) => {
      const url = conversationFromRow(button);
      if (!url) return;
      pendingConversationMenu = {
        url,
        controlledId: button.getAttribute("aria-controls"),
        existingMenus: openedAtPointer ? new Map([...document.querySelectorAll("[role='menu']")].filter(menu => menu.getClientRects().length).map(menu => [menu, menu.innerHTML])) : new Map()
      };
    };
    menuPointerHandler = event => {
      const button = event.target.closest?.(conversationOptionsSelector);
      if (button) rememberConversationMenu(button, true);
      else if (!event.target.closest?.("[role='menu']")) pendingConversationMenu = null;
    };
    document.addEventListener("pointerdown", menuPointerHandler, true);
    menuClickHandler = event => {
      const button = event.target.closest?.(conversationOptionsSelector);
      if (!button) return;
      if (pendingConversationMenu?.url !== conversationFromRow(button)) rememberConversationMenu(button, false);
      setTimeout(() => installMenuItems(), 0);
    };
    document.addEventListener("click", menuClickHandler, true);
    let lastParentUrl = location.href;
    const syncRoute = () => {
      if (!host) return;
      if (location.href === lastParentUrl) return;
      lastParentUrl = location.href;
      if (!conversationUrl(lastParentUrl)) showInPaneOne(lastParentUrl);
    };
    syncRoute();
    routeTimer = setInterval(syncRoute, 400);
  }
  function addResizeHandle(axis) {
    const handle = document.createElement("div");
    handle.className = "resize-handle " + axis;
    handle.hidden = axis === "y";
    handle.style[axis === "x" ? "left" : "top"] = "50%";
    handle.addEventListener("pointerdown", event => {
      event.preventDefault();
      handle.setPointerCapture(event.pointerId);
      const move = next => {
        const rect = grid.getBoundingClientRect();
        const value = axis === "x" ? (next.clientX - rect.left) / rect.width : (next.clientY - rect.top) / rect.height;
        const ratio = Math.max(.2, Math.min(.8, value));
        if (axis === "x") { splitX = ratio; resizedX = true; grid.style.setProperty("--split-x", (ratio * 100) + "%"); handle.style.left = (ratio * 100) + "%"; }
        else { splitY = ratio; grid.style.setProperty("--split-y", (ratio * 100) + "%"); handle.style.top = (ratio * 100) + "%"; }
        saveState();
      };
      const up = () => {
        handle.removeEventListener("pointermove", move);
        handle.removeEventListener("pointerup", up);
        handle.removeEventListener("pointercancel", up);
      };
      handle.addEventListener("pointermove", move);
      handle.addEventListener("pointerup", up);
      handle.addEventListener("pointercancel", up);
    });
    grid.append(handle);
  }
  function conversationFromRow(element) {
    let current = element;
    for (let depth = 0; current && depth < 6; depth++, current = current.parentElement) {
      if (current.matches?.("nav, aside, [role='navigation']")) break;
      const links = [...current.querySelectorAll("a[href*='/c/']")];
      if (current.matches?.("a[href*='/c/']")) links.unshift(current);
      if (links.length > 1) break;
      if (links.length === 1) return conversationUrl(links[0].href);
    }
    return null;
  }
  function installMenuItems() {
    if (!host || !pendingConversationMenu) return;
    document.querySelectorAll("[role='menu']").forEach(menu => {
      if (!menu.getClientRects().length) return;
      if (!pendingConversationMenu) return;
      if (pendingConversationMenu.controlledId && menu.id !== pendingConversationMenu.controlledId) return;
      if (pendingConversationMenu.existingMenus.get(menu) === menu.innerHTML) return;
      if (menu.querySelector("[data-chatgpt-split-menu]")) return;
      const target = pendingConversationMenu.url;
      pendingConversationMenu = null;
      const fragment = document.createDocumentFragment();
      for (let index = 1; index <= 4; index++) {
        const item = document.createElement("button");
        item.type = "button";
        item.dataset.chatgptSplitMenu = "true";
        item.textContent = "画面" + index + "で開く";
        item.addEventListener("click", event => {
          event.preventDefault();
          event.stopPropagation();
          assignConversation(target, index, location.href);
          menu.remove();
        });
        fragment.append(item);
      }
      menu.append(fragment);
    });
  }
  chrome.runtime.onMessage.addListener(message => {
    if (message.type === "toggle-four-view") {
      if (host) stop();
      else if (message.url) start(message.url);
    } else if (message.type === "assign-conversation") {
      assignConversation(message.url, message.pane, message.pageUrl);
    }
  });
  if (readState()?.active === true) start(location.href);
})();
