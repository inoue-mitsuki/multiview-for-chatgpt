(() => {
  if (window.top !== window || globalThis.__chatgptSplitInstalled) return;
  globalThis.__chatgptSplitInstalled = true;
  const origin = "https://chatgpt.com";
  let host, grid, observer, sidebarObserver, menuObserver, observedSide, pendingFrame = 0, pendingBadgeFrame = 0;
  let sidebarClickHandler, menuClickHandler, menuPointerHandler;
  let sidebarContextHandler, generalMenu, generalMenuAnchor;
  const generalButtons = new Map();
  const standardSelectionMarks = new Set();
  // ユーザーの実タブで確認した標準ページのURL。
  const builtinRoutes = new Map([
    ["builtin:library", origin + "/library"], ["label:ライブラリ", origin + "/library"],
    ["builtin:automations", origin + "/scheduled"], ["label:スケジュール", origin + "/scheduled"],
    ["builtin:plugins", origin + "/plugins"], ["label:プラグイン", origin + "/plugins"]
  ]);
  function standardRoute(entry) {
    return builtinRoutes.get(builtinDestination(entry)) || builtinRoutes.get("label:" + sidebarLabel(entry));
  }
  function standardRouteMatches(value, target) {
    if (!value || !target) return false;
    const current = new URL(value), expected = new URL(target);
    return current.origin === expected.origin && current.pathname.replace(/\/$/, "") === expected.pathname.replace(/\/$/, "") && (!expected.search || current.search === expected.search) && (!expected.hash || current.hash === expected.hash);
  }
  let pendingNative, consumedNativeUrl, invokingNative = false;
  function cancelNativeEntry() {
    if (pendingNative && panes[pendingNative.number - 1]) delete panes[pendingNative.number - 1].dataset.actionPending;
    pendingNative = null;
  }
  function completeNativeRoute() {
    if (!pendingNative || !host || location.href === pendingNative.before) return false;
    const url = chatgptUrl(location.href);
    if (!url || conversationIdentity(new URL(url).origin + new URL(url).pathname)) return false;
    const operation = pendingNative;
    pendingNative = null;
    consumedNativeUrl = url;
    builtinRoutes.set(operation.destination, url);
    assignPage(url, operation.number, location.href);
    delete panes[operation.number - 1].dataset.actionPending;
    delete panes[operation.number - 1].dataset.actionError;
    scheduleBadgeUpdate();
    return true;
  }
  function watchNativeEntry(entry, number, invoke) {
    cancelNativeEntry();
    const operation = { destination: builtinDestination(entry), number, before: location.href };
    pendingNative = operation;
    if (invoke) {
      panes[number - 1].dataset.actionPending = (sidebarLabel(entry) || "項目") + "の移動先を確認しています…";
      scheduleBadgeUpdate();
      invokingNative = true;
      try { entry.click(); } finally { invokingNative = false; }
    }
    const poll = (attempt = 0) => {
      if (!host || pendingNative !== operation) return;
      if (completeNativeRoute()) return;
      if (attempt < 25) setTimeout(() => poll(attempt + 1), 200);
      else {
        pendingNative = null;
        if (invoke) {
          delete panes[number - 1].dataset.actionPending;
          panes[number - 1].dataset.actionError = "移動先URLを取得できませんでした";
          scheduleBadgeUpdate();
        }
      }
    };
    setTimeout(() => poll(), 200);
  }
  const sidebarLabels = new WeakMap();
  const builtinLabels = new Set(["ライブラリ", "プラグイン", "スケジュール", "新しいチャット"]);
  function sidebarLabel(entry) {
    if (!entry) return "";
    const text = entry.querySelector?.(".text-fade-truncate")?.textContent?.trim() || entry.textContent?.trim() || "";
    if (builtinLabels.has(text)) sidebarLabels.set(entry, text);
    return sidebarLabels.get(entry) || "";
  }
  function builtinDestination(entry) {
    const value = entry?.getAttribute("data-sidebar-destination");
    if (/^builtin:[a-zA-Z0-9_-]+$/.test(value || "")) return value;
    const label = sidebarLabel(entry);
    return label ? "label:" + label : null;
  }
  function assignSidebarEntry(entry, number) {
    const destination = builtinDestination(entry);
    if (!destination) { assignPage(entry.href, number, location.href); return; }
    if (!Number.isInteger(number) || number < 1 || number > 4) return;
    cancelNativeEntry();
    if (!host) start(location.href, number);
    if (number > Number(grid.dataset.count)) setCount(number);
    const pane = panes[number - 1];
    delete pane.dataset.actionError;
    const route = standardRoute(entry);
    if (route) { assignPage(route, number, location.href); scheduleBadgeUpdate(); }
    else if (sidebarLabel(entry) === "新しいチャット") {
      builtinRoutes.set(destination, origin + "/");
      assignPage(origin + "/", number, location.href);
    } else watchNativeEntry(entry, number, true);
  }
  function closeGeneralMenu() { generalMenu?.remove(); generalMenu = null; }
  function showGeneralMenu(entry, anchor) {
    closeGeneralMenu();
    generalMenuAnchor = anchor;
    const menu = document.createElement("div");
    menu.className = "chatgpt-split-general-menu";
    menu.setAttribute("role", "menu");
    const rect = anchor.getBoundingClientRect();
    menu.style.left = Math.max(8, Math.min(innerWidth - 190, rect.left)) + "px";
    menu.style.top = Math.max(8, Math.min(innerHeight - 210, rect.bottom)) + "px";
    const label = document.createElement("div");
    label.textContent = "分割表示";
    menu.append(label);
    for (let number = 1; number <= 4; number++) {
      const item = document.createElement("button");
      item.type = "button";
      item.setAttribute("role", "menuitem");
      item.textContent = "画面" + number + "で開く";
      item.addEventListener("click", () => { assignSidebarEntry(entry, number); closeGeneralMenu(); anchor.focus?.(); });
      menu.append(item);
    }
    menu.addEventListener("keydown", event => { if (event.key === "Escape") { closeGeneralMenu(); anchor.focus?.(); } });
    generalMenu = menu;
    document.body.append(menu);
    menu.children[1]?.focus?.();
  }
  function updateGeneralButtons(entries) {
    const visibleInScrollContainers = entry => {
      const rect = entry.getBoundingClientRect();
      if (!rect.width || !rect.height || rect.bottom <= 0 || rect.top >= innerHeight) return false;
      for (let parent = entry.parentElement; parent && parent !== document.body; parent = parent.parentElement) {
        const style = window.getComputedStyle?.(parent);
        if (!style || !/(auto|scroll|hidden|clip)/.test(`${style.overflowX} ${style.overflowY}`)) continue;
        const bounds = parent.getBoundingClientRect();
        if (rect.bottom <= bounds.top || rect.top >= bounds.bottom || rect.right <= bounds.left || rect.left >= bounds.right) return false;
      }
      return true;
    };
    for (const [entry, button] of generalButtons) {
      const url = chatgptUrl(entry.href);
      if (!entries.has(entry) || (!builtinDestination(entry) && (!url || conversationIdentity(url) || projectIdentity(url)))) { button.remove(); generalButtons.delete(entry); }
    }
    for (const entry of entries) {
      const url = chatgptUrl(entry.href);
      if (!builtinDestination(entry) && (!url || conversationIdentity(url) || projectIdentity(url))) continue;
      let button = generalButtons.get(entry);
      if (!button) {
        button = document.createElement("button");
        button.type = "button";
        button.className = "chatgpt-split-general-options";
        button.textContent = "…";
        button.setAttribute("aria-label", "分割表示の画面を選択");
        button.setAttribute("aria-haspopup", "menu");
        button.addEventListener("click", event => { event.preventDefault(); event.stopPropagation(); showGeneralMenu(entry, button); });
        generalButtons.set(entry, button);
        document.body.append(button);
      }
      const rect = entry.getBoundingClientRect();
      button.hidden = !visibleInScrollContainers(entry);
      button.style.left = Math.max(0, rect.right - 28) + "px";
      button.style.top = (rect.top + Math.max(0, (rect.height - 24) / 2)) + "px";
    }
  }
  let routeTimer;
  let launcherHost, launcherMenu, launcherToggle, launcherOutsideHandler;
  let splitX = 0.5, splitY = 0.5, resizedX = false;
  const stateKey = "chatgpt-split-view-state";
  const launcherPositionKey = "chatgpt-split-launcher-position";
  const threeLayoutKey = "chatgpt-split-three-layout";
  let threeLayout = "columns";
  let twoLayout = "horizontal";
  function setTwoLayout(layout) {
    if (!["vertical", "horizontal"].includes(layout)) return;
    if (!host) start(location.href, 2);
    twoLayout = layout;
    setCount(2);
  }
  const fourLayoutKey = "chatgpt-split-four-layout";
  let fourLayout = "grid";
  const fourColumns = [0.25, 0.5, 0.75];
  const fourRows = [1 / 3, 2 / 3];
  let fourLeft = 0.6;
  function updateFourResize() {
    if (!grid) return;
    const active = grid.dataset.count === "4" && fourLayout !== "grid";
    const cols = [0, ...fourColumns, 1];
    const rows = [0, ...fourRows, 1];
    grid.style.setProperty("--four-columns", cols.slice(1).map((v, i) => (v - cols[i]) + "fr").join(" "));
    grid.style.setProperty("--four-rows", rows.slice(1).map((v, i) => (v - rows[i]) + "fr").join(" "));
    grid.style.setProperty("--four-left", fourLeft + "fr");
    grid.style.setProperty("--four-right", (1 - fourLeft) + "fr");
    grid.querySelectorAll(".four-resize").forEach(handle => {
      const index = Number(handle.dataset.boundary);
      const axis = handle.dataset.axis;
      handle.hidden = !active || (axis === "y" && fourLayout !== "stacked") || (axis === "x" && fourLayout === "stacked" && index > 0);
      if (axis === "x") handle.style.left = ((fourLayout === "columns" ? fourColumns[index] : fourLeft) * 100) + "%";
      else { handle.style.top = (fourRows[index] * 100) + "%"; handle.style.left = (fourLeft * 100) + "%"; }
    });
  }
  try { const saved = sessionStorage.getItem(fourLayoutKey); if (["grid", "columns", "stacked"].includes(saved)) fourLayout = saved; } catch {}
  try { if (sessionStorage.getItem(threeLayoutKey) === "stacked") threeLayout = "stacked"; } catch {}
  let persistentState = null, stateLoaded = false, stateTouched = false;
  function validateState(value) {
    if (!value || typeof value !== "object" || ![2, 3, 4].includes(value.count) || typeof value.active !== "boolean" || !Array.isArray(value.urls) || value.urls.length !== 4 || value.urls.some(url => url !== null && (typeof url !== "string" || !chatgptUrl(url)))) return null;
    if (value.schemaVersion !== undefined && ![2, 3].includes(value.schemaVersion)) return null;
    if (value.schemaVersion === 3) {
      const r = value.geometry;
      const bounded = (n, low, high) => typeof n === "number" && Number.isFinite(n) && n >= low && n <= high;
      const ordered = (a, length) => Array.isArray(a) && a.length === length && a.every((n, i) => bounded(n, .01, .99) && (!i || n > a[i - 1]));
      if (!["horizontal", "vertical"].includes(value.twoLayout) || !["columns", "stacked"].includes(value.threeLayout) || !["grid", "columns", "stacked"].includes(value.fourLayout) || !r || !bounded(r.splitX, .2, .8) || !bounded(r.splitY, .2, .8) || typeof r.resizedX !== "boolean" || !bounded(r.fourLeft, .15, .85) || !ordered(r.fourColumns, 3) || !ordered(r.fourRows, 2)) return null;
    }
    return value;
  }
  function readState() {
    if (stateLoaded) return persistentState;
    try { return validateState(JSON.parse(sessionStorage.getItem(stateKey) || "null")); } catch { return null; }
  }
  function writeState(value) {
    persistentState = value; stateTouched = true;
    try { chrome.storage?.local.set({ [stateKey]: value }, () => { void chrome.runtime.lastError; }); } catch {}
    try { sessionStorage.setItem(stateKey, JSON.stringify(value)); } catch {}
  }
  function paneUrl(pane) {
    if (pane?.dataset.empty === "true") return null;
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
  function emptyPane(pane) {
    if (pendingNative && panes[pendingNative.number - 1] === pane) cancelNativeEntry();
    delete pane.dataset.actionPending;
    delete pane.dataset.actionError;
    const frame = pane.querySelector("iframe");
    pane.dataset.empty = "true";
    delete pane.dataset.deferredUrl;
    delete frame.dataset.pendingUrl;
    if (frame.src && frame.src !== "about:blank") frame.src = "about:blank";
    frame.hidden = true;
    pane.querySelector(".empty-state").hidden = false;
    pane.querySelector(".reload-pane").hidden = true;
    pane.querySelector(".clear-pane").hidden = true;
  }
  function openPane(pane, url) {
    if (pendingNative && panes[pendingNative.number - 1] === pane) cancelNativeEntry();
    delete pane.dataset.actionPending;
    delete pane.dataset.actionError;
    const target = chatgptUrl(url);
    if (!target) return;
    const frame = pane.querySelector("iframe");
    delete pane.dataset.empty;
    delete pane.dataset.deferredUrl;
    pane.querySelector(".empty-state").hidden = true;
    pane.querySelector(".reload-pane").hidden = false;
    pane.querySelector(".clear-pane").hidden = false;
    frame.hidden = false;
    setFrameUrl(frame, target);
  }
  function saveState() {
    if (!grid) return;
    const urls = panes.map(pane => paneUrl(pane));
    writeState({ schemaVersion: 3, active: true, parentUrl: location.href, count: Number(grid.dataset.count), urls, twoLayout, threeLayout, fourLayout, geometry: { splitX, splitY, resizedX, fourLeft, fourColumns: [...fourColumns], fourRows: [...fourRows] } });
    scheduleBadgeUpdate();
  }
  let menuStyle, indicatorStyle;
  const markedLinks = new Set();
  const injectedTitles = new WeakMap();
  const conversationNames = new Map();
  const conversationProjects = new Map();
  const knownProjectGroups = new WeakSet();
  const projectMarks = new Set();
  const projectEntryKeys = new WeakMap();
  const pageMarks = new Set();
  function renderPageNumbers(entry, numbers) {
    const value = numbers.join("・");
    let badges = entry.querySelector(".chatgpt-split-page-badges");
    if (!value) { badges?.remove(); pageMarks.delete(entry); return; }
    if (badges?.getAttribute("data-numbers") === value) return;
    badges?.remove();
    badges = document.createElement("span");
    badges.className = "chatgpt-split-page-badges";
    badges.setAttribute("data-numbers", value);
    badges.setAttribute("aria-label", "画面" + value + "で表示中");
    numbers.forEach(number => {
      const badge = document.createElement("span");
      badge.className = "chatgpt-split-project-number";
      badge.textContent = number;
      badges.append(badge);
    });
    entry.append(badges);
    pageMarks.add(entry);
  }
  function assignmentIdentity(value) {
    const target = chatgptUrl(value);
    if (!target) return null;
    const url = new URL(target);
    const conversation = conversationIdentity(url.origin + url.pathname);
    if (conversation) return "conversation:" + conversation;
    const path = url.pathname.replace(/\/$/, "") || "/";
    // 新規チャットは同じURLでも各画面で独立して使う。
    if (path === "/") return null;
    return "page:" + path + (["/library", "/scheduled", "/plugins"].includes(path) ? "" : url.search + url.hash);
  }
  function sameAssignment(first, second) {
    const identity = assignmentIdentity(second);
    return identity ? assignmentIdentity(first) === identity : chatgptUrl(first) === chatgptUrl(second);
  }
  function clearOtherAssignments(target, targetIndex) {
    const identity = assignmentIdentity(target);
    if (!identity) return;
    panes.forEach((pane, index) => {
      if (index !== targetIndex && assignmentIdentity(paneUrl(pane)) === identity) emptyPane(pane);
    });
  }
  function assignPage(value, paneNumber, parentPageUrl) {
    const target = chatgptUrl(value);
    if (!target || !Number.isInteger(paneNumber) || paneNumber < 1 || paneNumber > 4) return;
    if (!host) start(parentPageUrl || location.href);
    if (!host) return;
    clearOtherAssignments(target, paneNumber - 1);
    if (paneNumber > Number(grid.dataset.count)) setCount(paneNumber);
    if (!sameAssignment(paneUrl(panes[paneNumber - 1]), target)) openPane(panes[paneNumber - 1], target);
    saveState();
  }
  function projectEntryIdentity(entry) {
    const projectId = entry.getAttribute("data-app-action-sidebar-project-id");
    if (projectId && /^[a-zA-Z0-9-]+$/.test(projectId)) return projectId;
    const url = projectIdentity(entry.href);
    if (url) return url;
    if (projectEntryKeys.has(entry)) return projectEntryKeys.get(entry);
    const name = entry.textContent?.trim();
    const key = name ? "name:" + name : null;
    if (key) projectEntryKeys.set(entry, key);
    return key;
  }
  function projectIdentity(value) {
    const target = chatgptUrl(value);
    if (!target) return null;
    return new URL(target).pathname.match(/^\/g\/([a-zA-Z0-9-]+)(?:\/project)?\/?$/)?.[1] || null;
  }
  function conversationIdentity(value) {
    const url = conversationUrl(value);
    return url ? new URL(url).pathname.replace(/\/$/, "").split("/").pop() : null;
  }
  function refreshSidebarIndicators() {
    if (!host) return;
    const open = new Map();
    panes.forEach((pane, index) => {
      const url = conversationIdentity(paneUrl(pane));
      if (url && !open.has(url)) open.set(url, String(index + 1));
    });
    const roots = sidebarRoots();
    const links = new Set(roots.flatMap(root => [...root.querySelectorAll("a[href]")]));
    const generalEntries = new Set([...links, ...roots.flatMap(root => [...root.querySelectorAll("[data-sidebar-destination], button.sidebar-item")])]);
    updateGeneralButtons(generalEntries);
    for (const entry of standardSelectionMarks) {
      if (!generalEntries.has(entry) || !standardRoute(entry)) {
        entry.removeAttribute("data-chatgpt-split-selected");
        standardSelectionMarks.delete(entry);
      }
    }
    for (const entry of generalEntries) {
      const route = standardRoute(entry);
      if (!route) continue;
      const selected = String(standardRouteMatches(paneUrl(panes[0]), route));
      if (entry.getAttribute("data-chatgpt-split-selected") !== selected) entry.setAttribute("data-chatgpt-split-selected", selected);
      standardSelectionMarks.add(entry);
    }
    for (const entry of [...pageMarks, ...generalEntries]) {
      const destination = generalEntries.has(entry) && builtinDestination(entry);
      const target = generalEntries.has(entry) && chatgptUrl(entry.href);
      const numbers = [];
      if (destination) {
        const route = standardRoute(entry);
        panes.forEach((pane, index) => { if (route && standardRouteMatches(paneUrl(pane), route) && !pane.querySelector("iframe").dataset.pendingUrl) numbers.push(String(index + 1)); });
      } else if (target && !conversationIdentity(target) && !projectIdentity(target)) {
        const route = new URL(target).pathname.replace(/\/$/, "") || "/";
        panes.forEach((pane, index) => {
          const value = paneUrl(pane);
          if (!value) return;
          const current = new URL(value).pathname.replace(/\/$/, "") || "/";
          if ((current === route || (route !== "/" && current.startsWith(route + "/")))) numbers.push(String(index + 1));
        });
      }
      renderPageNumbers(entry, numbers);
    }
    const projectEntries = new Set([...links].filter(link => projectIdentity(link.href)));
    roots.forEach(root => root.querySelectorAll("[data-app-action-sidebar-project-row][data-app-action-sidebar-project-id]").forEach(row => projectEntries.add(row)));
    roots.forEach(root => root.querySelectorAll("button[aria-expanded], button[data-testid*='project']").forEach(button => {
      if (!button.closest?.("[role='menu']") && button.textContent?.trim() && !button.matches?.(conversationOptionsSelector)) projectEntries.add(button);
    }));
    for (const link of links) {
      const id = conversationIdentity(link.href);
      if (!id) continue;
      const explicit = new URL(link.href).pathname.match(/^\/g\/([a-zA-Z0-9-]+)\/c\//)?.[1];
      if (explicit) {
        conversationProjects.set(id, explicit);
        if ([...projectEntries].some(entry => entry.getAttribute("data-app-action-sidebar-project-id") === explicit)) continue;
      }
      let group = link.parentElement;
      for (let depth = 0; group && depth < 5 && !roots.includes(group); depth++, group = group.parentElement) {
        const entries = [...projectEntries].filter(item => group.contains(item));
        const linkedProjects = entries.filter(item => projectIdentity(item.href));
        const projects = linkedProjects.length ? linkedProjects : entries;
        if (projects.length === 1) {
          const projectLink = projects[0];
          let header = projectLink;
          while (header.parentElement && header.parentElement !== group) header = header.parentElement;
          const nestedHeader = header === projectLink.parentElement && header.parentElement === group && !knownProjectGroups.has(header) &&
            ![...header.querySelectorAll("a[href]")].some(item => conversationIdentity(item.href));
          if (projectLink.parentElement === group || nestedHeader) {
            knownProjectGroups.add(group);
            const key = projectEntryIdentity(projectLink);
            entries.forEach(entry => { if (!projectIdentity(entry.href)) projectEntryKeys.set(entry, key); });
            conversationProjects.set(id, key);
            break;
          }
        }
        if (projects.length > 1) break;
      }
    }
    const projectNumbers = new Map();
    panes.forEach((pane, index) => {
      const value = paneUrl(pane);
      const id = conversationIdentity(value);
      const project = id ? conversationProjects.get(id) || (value && new URL(value).pathname.match(/^\/g\/([a-zA-Z0-9-]+)\/c\//)?.[1]) : null;
      if (project) {
        if (!projectNumbers.has(project)) projectNumbers.set(project, []);
        projectNumbers.get(project).push(String(index + 1));
      }
    });
    for (const entry of [...projectMarks, ...projectEntries]) {
      const project = projectEntryIdentity(entry);
      const numbers = projectEntries.has(entry) ? projectNumbers.get(project) || [] : [];
      const value = numbers.join("・");
      let badges = entry.querySelector(".chatgpt-split-project-badges");
      if (!value) {
        badges?.remove();
        entry.removeAttribute("data-chatgpt-split-project");
        projectMarks.delete(entry);
        continue;
      }
      if (!badges) {
        badges = document.createElement("span");
        badges.className = "chatgpt-split-project-badges";
        badges.setAttribute("aria-label", "画面" + value + "で表示中");
        badges.setAttribute("data-numbers", value);
        numbers.forEach(number => {
          const badge = document.createElement("span");
          badge.className = "chatgpt-split-project-number";
          badge.textContent = number;
          badges.append(badge);
        });
        (entry.querySelector("span[id]") || entry).append(badges);
      } else if (badges.getAttribute("data-numbers") !== value) {
        badges.remove();
        projectMarks.delete(entry);
        scheduleBadgeUpdate();
      }
      entry.setAttribute("data-chatgpt-split-project", "true");
      projectMarks.add(entry);
    }
    const linkNumber = link => builtinDestination(link) ? null : open.get(conversationIdentity(link.href));
    for (const link of links) {
      if (builtinDestination(link)) continue;
      const url = conversationIdentity(link.href);
      const name = link.textContent?.trim().replace(/\s+/g, " ");
      if (url && name) conversationNames.set(url, name);
    }
    for (const link of markedLinks) {
      const number = links.has(link) ? linkNumber(link) : null;
      if (number) continue;
      link.removeAttribute("data-chatgpt-split-pane");
      if (injectedTitles.has(link) && link.title === injectedTitles.get(link)) link.removeAttribute("title");
      injectedTitles.delete(link);
      markedLinks.delete(link);
    }
    for (const link of links) {
      const number = linkNumber(link);
      if (!number) continue;
      if (link.dataset.chatgptSplitPane !== number) link.dataset.chatgptSplitPane = number;
      if (injectedTitles.has(link) && link.title !== injectedTitles.get(link)) injectedTitles.delete(link);
      if (!link.title || injectedTitles.has(link)) {
        const title = "画面" + number + "で表示中";
        link.title = title;
        injectedTitles.set(link, title);
      }
      markedLinks.add(link);
    }
    panes.forEach((pane, index) => {
      const url = conversationIdentity(paneUrl(pane));
      const name = url && conversationNames.get(url);
      const label = pane.querySelector(".label");
      label.textContent = "画面" + (index + 1) + (pane.dataset.actionPending ? "｜" + pane.dataset.actionPending : pane.dataset.actionError ? "｜" + pane.dataset.actionError : name ? "｜" + name : "");
      label.title = name || "";
    });
  }
  function scheduleBadgeUpdate() {
    if (!host || pendingBadgeFrame) return;
    pendingBadgeFrame = requestAnimationFrame(() => {
      pendingBadgeFrame = 0;
      refreshSidebarIndicators();
    });
  }
  let pendingConversationMenu = null;
  let submenuSerial = 0;
  const panes = [];
  function swapPanes(source, target) {
    const count = Number(grid?.dataset.count);
    if (!Number.isInteger(source) || !Number.isInteger(target) || source < 0 || target < 0 || source >= count || target >= count || source === target) return;
    [panes[source], panes[target]] = [panes[target], panes[source]];
    setCount(count);
  }
  const conversationOptionsSelector = "button[data-conversation-options-trigger], button[data-testid^='history-item-'][data-testid$='-options'], button[aria-label*='会話オプション'], button[aria-haspopup='menu'], button[aria-label*='オプション'], button[aria-label*='options']";

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
    if (!host) return;
    assignPage(url, 1, location.href);
  }
  function sidebarRoots() {
    const main = document.querySelector("main");
    const candidates = [...document.querySelectorAll('aside, nav, [data-testid*="sidebar"], [class*="sidebar"]')]
      .filter(element => {
        if (main && element.contains(main)) return false;
        const rect = element.getBoundingClientRect();
        return rect.left >= -4 && rect.left <= 32 && rect.width >= 150 &&
          rect.width < innerWidth * .5 && rect.height >= innerHeight * .5;
      });
    return candidates;
  }
  function sidebar() {
    const candidates = sidebarRoots();
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
    grid.dataset.threeLayout = threeLayout;
    grid.dataset.twoLayout = twoLayout;
    grid.dataset.fourLayout = fourLayout;
    panes.forEach((pane, index) => {
      pane.style.order = String(index);
      pane.style.gridColumn = "auto";
      pane.style.gridRow = "auto";
      if (count === 3 && threeLayout === "stacked" || count === 4 && fourLayout === "stacked") {
        pane.style.gridColumn = index === 0 ? "1" : "2";
        pane.style.gridRow = index === 0 ? "1 / " + count : String(index);
      }
      pane.querySelector("iframe").title = "画面 " + (index + 1);
      pane.querySelector(".clear-pane").setAttribute("aria-label", "画面" + (index + 1) + "を空にする");
      const swap = pane.querySelector(".swap-pane");
      if (swap) {
        swap.setAttribute("aria-label", "画面" + (index + 1) + "の入れ替え先");
        [...swap.children].forEach(option => { if (option.value) option.hidden = Number(option.value) > count || Number(option.value) === index + 1; });
      }
      pane.hidden = index >= count;
      if (!pane.hidden && pane.dataset.deferredUrl) {
        openPane(pane, pane.dataset.deferredUrl);
      }
    });
    updateLauncherMode();
    const yHandle = host.shadowRoot.querySelector(".resize-handle.y");
    if (yHandle) {
      yHandle.hidden = !(count === 2 && twoLayout === "vertical") && !(count === 4 && fourLayout === "grid") && !(count === 3 && threeLayout === "stacked");
      yHandle.style.left = count === 3 && threeLayout === "stacked" ?
        (resizedX ? splitX * 100 : 50) + "%" : "0";
    }
    const xHandle = host.shadowRoot.querySelector(".resize-handle.x");
    if (xHandle) xHandle.style.left = resizedX ? (splitX * 100) + "%" :
      count === 4 && fourLayout === "stacked" ? "60%" : count === 4 && fourLayout === "columns" ? "25%" : count === 3 && threeLayout === "columns" ? "33.333%" : "50%";
    if (xHandle) xHandle.hidden = (count === 2 && twoLayout === "vertical") || (count === 4 && fourLayout !== "grid");
    updateFourResize();
    saveState();
  }
  function setThreeLayout(layout) {
    if (layout !== "columns" && layout !== "stacked") return;
    if (!host) start(location.href, 3);
    threeLayout = layout;
    try { sessionStorage.setItem(threeLayoutKey, layout); } catch {}
    setCount(3);
    updateLauncherMode();
  }
  function setFourLayout(layout) {
    if (!["grid", "columns", "stacked"].includes(layout)) return;
    if (!host) start(location.href, 4);
    fourLayout = layout;
    try { sessionStorage.setItem(fourLayoutKey, layout); } catch {}
    setCount(4);
    updateLauncherMode();
  }
  function assignConversation(url, paneNumber, parentPageUrl) {
    const target = conversationUrl(url);
    if (!target || !Number.isInteger(paneNumber) || paneNumber < 1 || paneNumber > 4) return;
    if (!host) start(parentPageUrl);
    if (!host) return;
    clearOtherAssignments(target, paneNumber - 1);
    const currentCount = Number(grid.dataset.count);
    if (paneNumber > currentCount && !sameAssignment(paneUrl(panes[paneNumber - 1]), target)) {
      const targetPane = panes[paneNumber - 1];
      targetPane.dataset.deferredUrl = target;
      delete targetPane.dataset.empty;
    }
    if (paneNumber > currentCount) setCount(paneNumber);
    if (!sameAssignment(paneUrl(panes[paneNumber - 1]), target) || panes[paneNumber - 1].dataset.empty === "true") openPane(panes[paneNumber - 1], target);
    saveState();
  }
  function focusPaneComposer(index) {
    const frame = panes[index]?.querySelector("iframe");
    frame?.contentWindow?.postMessage({ type: "focus-composer" }, origin);
  }
  function updateLauncherMode() {
    if (!launcherHost) return;
    launcherHost.shadowRoot.querySelectorAll("[data-start-count]").forEach(button =>
      button.setAttribute("aria-pressed", String(Boolean(host) && Number(button.dataset.startCount) === Number(grid.dataset.count))));
    launcherHost.shadowRoot.querySelectorAll("[data-three-layout]").forEach(button =>
      button.setAttribute("aria-pressed", String(button.dataset.threeLayout === threeLayout)));
    launcherHost.shadowRoot.querySelectorAll("[data-two-layout]").forEach(button =>
      button.setAttribute("aria-pressed", String(button.dataset.twoLayout === twoLayout)));
    launcherHost.shadowRoot.querySelectorAll("[data-four-layout]").forEach(button =>
      button.setAttribute("aria-pressed", String(button.dataset.fourLayout === fourLayout)));
    launcherHost.shadowRoot.querySelectorAll(".launcher-settings").forEach((button, index) =>
      button.setAttribute("aria-pressed", String(Boolean(host) && Number(grid.dataset.count) === index + 2)));
    launcherHost.shadowRoot.querySelector(".launcher-end").hidden = !host;
    launcherToggle.title = host ? "分割ビューの操作" : "分割ビューを開く";
    launcherToggle.setAttribute("aria-label", launcherToggle.title);
  }
  function placeLauncher(x, y) {
    const left = Math.max(8, Math.min(innerWidth - 50, x));
    const top = Math.max(8, Math.min(innerHeight - 50, y));
    launcherHost.style.left = left + "px";
    launcherHost.style.top = top + "px";
    launcherHost.style.right = "auto";
    launcherHost.dataset.above = String(top > innerHeight - 290);
    launcherHost.dataset.alignLeft = String(left < 110);
  }
  function bindFlyout(group, trigger, panel, onSelect) {
    const setOpen = open => {
      if (open) {
        const rect = group.getBoundingClientRect();
        group.dataset.side = rect.right + 190 > innerWidth ? "left" : "right";
        group.dataset.above = String(rect.top + panel.children.length * 38 + 16 > innerHeight);
      }
      panel.hidden = !open;
      trigger.setAttribute("aria-expanded", String(open));
    };
    group.addEventListener("mouseenter", () => setOpen(true));
    group.addEventListener("mouseleave", () => setOpen(false));
    group.addEventListener("focusin", () => setOpen(true));
    group.addEventListener("focusout", event => {
      if (!group.contains(event.relatedTarget)) setOpen(false);
    });
    trigger.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      if (onSelect) { onSelect(); setOpen(false); launcherMenu.hidden = true; launcherToggle.setAttribute("aria-expanded", "false"); }
      else setOpen(true);
    });
    return setOpen;
  }
  function showLauncher() {
    if (!launcherHost) {
      launcherHost = document.createElement("div");
      launcherHost.id = "chatgpt-split-launcher";
      const shadow = launcherHost.attachShadow({ mode: "open" });
      const style = document.createElement("style");
      style.textContent = ":host { position: fixed; top: 56px; right: 70px; z-index: 9999; font: 13px sans-serif; } " +
        ":host([hidden]), [hidden] { display: none !important; } " +
        "button { cursor: pointer; border: 1px solid #555; color: white; background: #252525; } " +
        "button:focus-visible { outline: 2px solid #80baff; outline-offset: 2px; } " +
        ".launcher-toggle { width: 42px; height: 42px; border-radius: 50%; display: grid; place-items: center; box-shadow: 0 3px 12px #0008; touch-action: none; } " +
        ".launcher-icon { display: grid; grid-template-columns: repeat(2, 6px); gap: 3px; } " +
        ".launcher-icon span { width: 6px; height: 6px; border: 1.5px solid currentColor; border-radius: 1px; } " +
        ".launcher-menu { position: absolute; top: 48px; right: 0; display: flex; flex-direction: column; gap: 5px; padding: 6px; border: 1px solid #555; border-radius: 24px; background: #252525; box-shadow: 0 5px 16px #0009; } " +
        ":host([data-above='true']) .launcher-menu { top: auto; bottom: 48px; } " +
        ":host([data-align-left='true']) .launcher-menu { left: 0; right: auto; } " +
        ".launcher-menu button { min-width: 30px; height: 30px; border-radius: 16px; border-color: transparent; background: transparent; font-weight: 700; white-space: nowrap; } " +
        ".launcher-menu button:hover, .launcher-menu button[aria-pressed='true'] { background: #2d69c7; } " +
        ".launcher-flyout { position: relative; } " +
        ".launcher-settings { padding: 0 10px; white-space: nowrap; } " +
        ".launcher-submenu { position: absolute; left: 100%; top: 0; display: flex; flex-direction: column; gap: 4px; padding: 6px; border: 1px solid #555; border-radius: 16px; background: #252525; box-shadow: 0 5px 16px #0009; } " +
        ".launcher-flyout[data-side='left'] .launcher-submenu { left: auto; right: 100%; } " +
        ".launcher-flyout[data-above='true'] .launcher-submenu { top: auto; bottom: 0; } " +
        ".launcher-submenu[hidden] { display: none !important; } " +
        ".launcher-layout { padding: 0 10px; text-align: left; } " +
        ".launcher-end { padding: 0 10px; }";
      launcherToggle = document.createElement("button");
      launcherToggle.type = "button";
      launcherToggle.className = "launcher-toggle";
      launcherToggle.setAttribute("aria-expanded", "false");
      const icon = document.createElement("span");
      icon.className = "launcher-icon";
      for (let index = 0; index < 4; index++) icon.append(document.createElement("span"));
      launcherToggle.append(icon);
      launcherMenu = document.createElement("div");
      launcherMenu.className = "launcher-menu";
      launcherMenu.hidden = true;
      const endButton = document.createElement("button");
      endButton.type = "button";
      endButton.className = "launcher-end";
      endButton.textContent = "分割を終了";
      endButton.addEventListener("click", () => stop());
      launcherMenu.append(endButton);
      const twoGroup = document.createElement("div");
      twoGroup.className = "launcher-flyout";
      const twoTrigger = document.createElement("button");
      twoTrigger.type = "button";
      twoTrigger.className = "launcher-settings";
      twoTrigger.textContent = "2 ▸";
      twoTrigger.setAttribute("aria-label", "2画面の配置を選択");
      twoTrigger.setAttribute("aria-expanded", "false");
      const twoPanel = document.createElement("div");
      twoPanel.className = "launcher-submenu";
      twoPanel.id = "chatgpt-split-two-settings";
      twoPanel.hidden = true;
      twoTrigger.setAttribute("aria-controls", twoPanel.id);
      for (const [layout, label] of [["horizontal", "横2列"], ["vertical", "縦2行"]]) {
        const button = document.createElement("button");
        button.type = "button";
        if (layout === "horizontal") button.dataset.startCount = "2";
        button.textContent = label;
        button.dataset.twoLayout = layout;
        button.addEventListener("click", () => {
          setTwoLayout(layout);
          twoPanel.hidden = true;
          twoTrigger.setAttribute("aria-expanded", "false");
          launcherMenu.hidden = true;
          launcherToggle.setAttribute("aria-expanded", "false");
        });
        twoPanel.append(button);
      }
      twoGroup.append(twoTrigger, twoPanel);
      bindFlyout(twoGroup, twoTrigger, twoPanel, () => setTwoLayout("horizontal"));
      launcherMenu.append(twoGroup);
      const layoutGroup = document.createElement("div");
      layoutGroup.className = "launcher-flyout";
      const layoutTrigger = document.createElement("button");
      layoutTrigger.type = "button";
      layoutTrigger.className = "launcher-settings";
      layoutTrigger.textContent = "3 ▸";
      layoutTrigger.setAttribute("aria-label", "3画面の配置を選択");
      layoutTrigger.setAttribute("aria-expanded", "false");
      const layoutPanel = document.createElement("div");
      layoutPanel.className = "launcher-submenu";
      layoutPanel.hidden = true;
      layoutPanel.id = "chatgpt-split-three-settings";
      layoutTrigger.setAttribute("aria-controls", layoutPanel.id);
      for (const [layout, label] of [["stacked", "左大＋右上下"], ["columns", "横3列"]]) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "launcher-layout";
        button.dataset.threeLayout = layout;
        if (layout === "columns") button.dataset.startCount = "3";
        button.textContent = label;
        button.addEventListener("click", () => {
          setThreeLayout(layout);
          layoutPanel.hidden = true;
          layoutTrigger.setAttribute("aria-expanded", "false");
          launcherMenu.hidden = true;
          launcherToggle.setAttribute("aria-expanded", "false");
        });
        layoutPanel.append(button);
      }
      layoutGroup.append(layoutTrigger, layoutPanel);
      bindFlyout(layoutGroup, layoutTrigger, layoutPanel, () => setThreeLayout("stacked"));
      launcherMenu.append(layoutGroup);
      const fourGroup = document.createElement("div");
      fourGroup.className = "launcher-flyout";
      const fourTrigger = document.createElement("button");
      fourTrigger.type = "button";
      fourTrigger.className = "launcher-settings";
      fourTrigger.textContent = "4 ▸";
      fourTrigger.setAttribute("aria-label", "4画面の配置を選択");
      fourTrigger.setAttribute("aria-expanded", "false");
      const fourPanel = document.createElement("div");
      fourPanel.className = "launcher-submenu";
      fourPanel.hidden = true;
      fourPanel.id = "chatgpt-split-four-settings";
      fourTrigger.setAttribute("aria-controls", fourPanel.id);
      for (const [layout, label] of [["grid", "2×2"], ["stacked", "左大＋右3段"], ["columns", "横4列"]]) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "launcher-layout";
        button.dataset.fourLayout = layout;
        if (layout === "grid") button.dataset.startCount = "4";
        button.textContent = label;
        button.addEventListener("click", () => {
          setFourLayout(layout);
          fourPanel.hidden = true;
          fourTrigger.setAttribute("aria-expanded", "false");
          launcherMenu.hidden = true;
          launcherToggle.setAttribute("aria-expanded", "false");
        });
        fourPanel.append(button);
      }
      fourGroup.append(fourTrigger, fourPanel);
      bindFlyout(fourGroup, fourTrigger, fourPanel, () => setFourLayout("grid"));
      launcherMenu.append(fourGroup);
      let drag = null;
      let suppressClick = false;
      launcherToggle.addEventListener("pointerdown", event => {
        if (event.button !== 0) return;
        suppressClick = false;
        drag = {
          x: event.clientX, y: event.clientY,
          left: Number.parseFloat(launcherHost.style.left) || innerWidth - 112,
          top: Number.parseFloat(launcherHost.style.top) || 56,
          moved: false
        };
        launcherToggle.setPointerCapture?.(event.pointerId);
      });
      launcherToggle.addEventListener("pointermove", event => {
        if (!drag) return;
        const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
        if (!drag.moved && Math.hypot(dx, dy) < 5) return;
        drag.moved = true;
        placeLauncher(drag.left + dx, drag.top + dy);
      });
      const finishDrag = event => {
        if (!drag) return;
        if (drag.moved && event?.type !== "pointercancel") {
          suppressClick = true;
          setTimeout(() => { suppressClick = false; }, 0);
          sessionStorage.setItem(launcherPositionKey, JSON.stringify({
            x: Number.parseFloat(launcherHost.style.left),
            y: Number.parseFloat(launcherHost.style.top)
          }));
        }
        drag = null;
      };
      launcherToggle.addEventListener("pointerup", finishDrag);
      launcherToggle.addEventListener("pointercancel", finishDrag);
      launcherToggle.addEventListener("click", () => {
        if (suppressClick) { suppressClick = false; return; }
        launcherMenu.hidden = !launcherMenu.hidden;
        launcherToggle.setAttribute("aria-expanded", String(!launcherMenu.hidden));
      });
      shadow.append(style, launcherToggle, launcherMenu);
      document.documentElement.append(launcherHost);
      try {
        const position = JSON.parse(sessionStorage.getItem(launcherPositionKey) || "null");
        if (Number.isFinite(position?.x) && Number.isFinite(position?.y)) placeLauncher(position.x, position.y);
      } catch {}
      launcherOutsideHandler = event => {
        if (launcherHost?.contains(event.target)) return;
        launcherMenu.hidden = true;
        launcherToggle.setAttribute("aria-expanded", "false");
      };
      document.addEventListener("pointerdown", launcherOutsideHandler, true);
      window.addEventListener("resize", () => {
        if (launcherHost.style.left) placeLauncher(Number.parseFloat(launcherHost.style.left), Number.parseFloat(launcherHost.style.top));
      });
    }
    launcherHost.hidden = false;
    launcherMenu.hidden = true;
    launcherToggle.setAttribute("aria-expanded", "false");
    updateLauncherMode();
  }
  function stop() {
    if (!host) return;
    pendingNative = null;
    consumedNativeUrl = null;
    saveState();
    writeState({ ...persistentState, active: false });
    window.removeEventListener("resize", scheduleUpdateLeft);
    if (pendingFrame) cancelAnimationFrame(pendingFrame);
    if (pendingBadgeFrame) cancelAnimationFrame(pendingBadgeFrame);
    pendingBadgeFrame = 0;
    for (const link of markedLinks) {
      link.removeAttribute("data-chatgpt-split-pane");
      if (injectedTitles.has(link) && link.title === injectedTitles.get(link)) link.removeAttribute("title");
      injectedTitles.delete(link);
    }
    markedLinks.clear();
    for (const entry of standardSelectionMarks) entry.removeAttribute("data-chatgpt-split-selected");
    standardSelectionMarks.clear();
    for (const entry of projectMarks) { entry.querySelector(".chatgpt-split-project-badges")?.remove(); entry.removeAttribute("data-chatgpt-split-project"); }
    projectMarks.clear();
    for (const entry of pageMarks) entry.querySelector(".chatgpt-split-page-badges")?.remove();
    pageMarks.clear();
    indicatorStyle?.remove();
    pendingFrame = 0;
    observer?.disconnect();
    sidebarObserver?.disconnect();
    menuObserver?.disconnect();
    if (sidebarClickHandler) document.removeEventListener("click", sidebarClickHandler, true);
    if (menuClickHandler) document.removeEventListener("click", menuClickHandler, true);
    if (menuPointerHandler) document.removeEventListener("pointerdown", menuPointerHandler, true);
    if (sidebarContextHandler) document.removeEventListener("contextmenu", sidebarContextHandler, true);
    window.removeEventListener("scroll", scheduleBadgeUpdate, true);
    window.removeEventListener("resize", scheduleBadgeUpdate);
    closeGeneralMenu();
    generalButtons.forEach(button => button.remove());
    generalButtons.clear();
    if (routeTimer) clearInterval(routeTimer);
    pendingConversationMenu = null;
    menuStyle?.remove();
    host.remove();
    host = grid = observer = sidebarObserver = menuObserver = observedSide = menuStyle = indicatorStyle = sidebarClickHandler = menuClickHandler = menuPointerHandler = routeTimer = null;
    panes.length = 0;
    showLauncher();
  }
  function start(url, requestedCount) {
    if (host || new URL(url).origin !== origin) return;
    const saved = readState();
    const restore = !!saved;
    const parentRouteChanged = restore && saved.schemaVersion !== 3 && saved.parentUrl && saved.parentUrl !== location.href;
    if (saved?.schemaVersion === 3) {
      twoLayout = saved.twoLayout; threeLayout = saved.threeLayout; fourLayout = saved.fourLayout;
      ({ splitX, splitY, resizedX, fourLeft } = saved.geometry);
      fourColumns.splice(0, 3, ...saved.geometry.fourColumns);
      fourRows.splice(0, 2, ...saved.geometry.fourRows);
    }
    const initialCount = [2, 3, 4].includes(requestedCount) ? requestedCount :
      restore && [2, 3, 4].includes(Number(saved.count)) ? Number(saved.count) : 2;
    host = document.createElement("div");
    host.id = "chatgpt-split-extension";
    const shadow = host.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = `
      :host { position: fixed; top: 0; right: 0; bottom: 0; z-index: 2; background: #111; color: white; }
      * { box-sizing: border-box; }
      .workspace { height: 100%; display: flex; flex-direction: column; font: 13px sans-serif; }
      button { border: 1px solid #777; border-radius: 5px; padding: 5px 9px; background: #333; color: white; cursor: pointer; }
      button:focus-visible { outline: 2px solid #80baff; }
      .grid { position: relative; display: grid; flex: 1; min-height: 0; gap: 2px; overflow: hidden; background: #64748b; }
      .grid[data-count="2"], .grid[data-count="3"] { grid-template-columns: minmax(120px, var(--split-x, 50%)) minmax(120px, 1fr); }
      .grid[data-count="2"][data-two-layout="vertical"] { grid-template-columns: minmax(0, 1fr); grid-template-rows: minmax(120px, var(--split-y, 50%)) minmax(120px, 1fr); }
      .grid[data-count="3"] { grid-template-columns: minmax(120px, var(--split-x, 33.333%)) minmax(120px, 1fr) minmax(120px, 1fr); }
      .grid[data-count="3"][data-three-layout="stacked"] { grid-template-columns: minmax(120px, var(--split-x, 50%)) minmax(120px, 1fr); grid-template-rows: minmax(120px, var(--split-y, 50%)) minmax(120px, 1fr); }
      .grid[data-count="4"] { grid-template-columns: minmax(120px, var(--split-x, 50%)) minmax(120px, 1fr); grid-template-rows: minmax(120px, var(--split-y, 50%)) minmax(120px, 1fr); }
      .grid[data-count="4"][data-four-layout="columns"] { grid-template-columns: var(--four-columns, 1fr 1fr 1fr 1fr); grid-template-rows: minmax(0, 1fr); }
      .grid[data-count="4"][data-four-layout="stacked"] { grid-template-columns: var(--four-left, .6fr) var(--four-right, .4fr); grid-template-rows: var(--four-rows, 1fr 1fr 1fr); }
      .pane { position: relative; min-width: 0; min-height: 0; background: #111; }
      .pane[hidden] { display: none; }
      [hidden] { display: none !important; }
      iframe { display: block; border: 0; width: 100%; height: 100%; }
      .empty-state { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; padding: 24px; text-align: center; color: #ddd; }
      .empty-state p { margin: 0; line-height: 1.5; }
      .label { position: absolute; top: 6px; left: 6px; max-width: max(0px, calc(50% - 80px)); overflow: hidden; white-space: nowrap; text-overflow: ellipsis; padding: 3px 6px; border-radius: 4px; background: #111c; pointer-events: none; }
      .pane-controls { position: absolute; top: 6px; left: 50%; transform: translateX(-50%); z-index: 4; display: flex; align-items: center; gap: 4px; max-width: calc(100% - 12px); }
      .swap-pane { width: 64px; min-width: 0; padding: 3px; border: 1px solid #777; border-radius: 4px; background: #222; color: white; cursor: pointer; }
      .reload-pane, .clear-pane { flex: 0 0 auto; padding: 3px 7px; border: 1px solid #777; border-radius: 4px; background: #222d; color: white; cursor: pointer; }
      .resize-handle { position: absolute; z-index: 3; background: transparent; opacity: 0; }
      .resize-handle:hover, .resize-handle:active { background: #64748b; opacity: .8; }
      .resize-handle.x { top: 0; bottom: 0; width: 8px; margin-left: -4px; cursor: col-resize; }
      .resize-handle.y { left: 0; right: 0; height: 8px; margin-top: -4px; cursor: row-resize; }
    `;
    const workspace = document.createElement("div");
    workspace.className = "workspace";
    grid = document.createElement("div");
    grid.className = "grid";
    for (let index = 0; index < 4; index++) {
      const pane = document.createElement("div");
      pane.className = "pane";
      const frame = document.createElement("iframe");
      frame.title = "画面 " + (index + 1);
      frame.setAttribute("data-chatgpt-split-frame", "");
      frame.addEventListener("load", () => { delete frame.dataset.pendingUrl; saveState(); });
      const placeholder = document.createElement("div");
      placeholder.className = "empty-state";
      const prompt = document.createElement("p");
      prompt.textContent = "左の会話を選ぶか、新しいチャットを始めてください";
      const newChat = document.createElement("button");
      newChat.type = "button";
      newChat.textContent = "新しいチャット";
      newChat.addEventListener("click", () => { openPane(pane, origin + "/"); saveState(); });
      placeholder.append(prompt, newChat);
      const label = document.createElement("div");
      label.className = "label";
      label.textContent = "画面" + (index + 1);
      const reload = document.createElement("button");
      reload.type = "button";
      reload.className = "reload-pane";
      reload.title = "この画面だけ更新";
      reload.textContent = "↻";
      reload.addEventListener("click", () => {
        try { frame.contentWindow.location.reload(); }
        catch { frame.src = frame.src; }
      });
      const clear = document.createElement("button");
      clear.type = "button";
      clear.className = "clear-pane";
      clear.title = "この画面だけ空にする";
      clear.setAttribute("aria-label", "画面" + (index + 1) + "を空にする");
      clear.textContent = "×";
      clear.addEventListener("click", () => { emptyPane(pane); saveState(); });
      const swap = document.createElement("select");
      swap.className = "swap-pane";
      swap.title = "別の画面と入れ替える";
      for (let number = 0; number <= 4; number++) {
        const option = document.createElement("option");
        option.value = number ? String(number) : "";
        option.textContent = number ? "画面" + number : "⇄";
        swap.append(option);
      }
      swap.value = "";
      swap.addEventListener("change", () => {
        const target = Number(swap.value) - 1;
        swap.value = "";
        swapPanes(panes.indexOf(pane), target);
      });
      const controls = document.createElement("div");
      controls.className = "pane-controls";
      controls.setAttribute("role", "group");
      controls.setAttribute("aria-label", "画面操作");
      controls.append(swap, reload, clear);
      pane.append(frame, placeholder, label, controls);
      const savedUrl = restore && chatgptUrl(saved.urls[index]);
      const legacyEmpty = index > 0 && restore && saved.schemaVersion === undefined && savedUrl === origin + "/";
      const savedEmpty = restore && saved.schemaVersion >= 2 && saved.urls[index] === null;
      const frameUrl = index === 0 && parentRouteChanged ? url :
        (savedEmpty || legacyEmpty ? null : savedUrl) || (index === 0 && !savedEmpty ? url : null);
      const duplicate = frameUrl && assignmentIdentity(frameUrl) && panes.some(other => sameAssignment(paneUrl(other), frameUrl));
      if (!frameUrl || duplicate) emptyPane(pane);
      else if (index < initialCount) openPane(pane, frameUrl);
      else { pane.dataset.deferredUrl = frameUrl; placeholder.hidden = true; clear.hidden = false; reload.hidden = false; }
      grid.append(pane);
      panes.push(pane);
    }
    workspace.append(grid);
    shadow.append(style, workspace);
    document.documentElement.append(host);
    addResizeHandle("x");
    addResizeHandle("y");
    if (resizedX) grid.style.setProperty("--split-x", (splitX * 100) + "%");
    grid.style.setProperty("--split-y", (splitY * 100) + "%");
    shadow.querySelector(".resize-handle.y").style.top = (splitY * 100) + "%";
    for (let index = 0; index < 3; index++) addFourResize("x", index);
    for (let index = 0; index < 2; index++) addFourResize("y", index);
    setCount(initialCount);
    showLauncher();
    updateLeft();
    window.addEventListener("resize", scheduleUpdateLeft);
    observer = new ResizeObserver(scheduleUpdateLeft);
    const side = sidebar();
    if (side) {
      observer.observe(side);
      observedSide = side;
    }
    sidebarObserver = new MutationObserver(() => { scheduleUpdateLeft(); scheduleBadgeUpdate(); });
    sidebarObserver.observe(document.body, { childList: true, subtree: true, attributes: true,
      attributeFilter: ["href", "data-chatgpt-split-pane"] });
    indicatorStyle = document.createElement("style");
    indicatorStyle.textContent = "a[data-chatgpt-split-pane] { background-color: rgba(90, 160, 255, .20) !important; border-radius: 8px; } " +
      "[data-chatgpt-split-selected='false'] { background-color: transparent !important; background-image: none !important; } " +
      "[data-chatgpt-split-selected='false']:hover, [data-chatgpt-split-selected='false']:focus-visible { background-color: rgba(255,255,255,.08) !important; } " +
      "[data-chatgpt-split-selected='true'] { background-color: rgba(90,160,255,.20) !important; background-image: none !important; border-radius: 8px; } " +
      "a[data-chatgpt-split-pane]::before { content: attr(data-chatgpt-split-pane); display: inline-grid; place-items: center; flex: 0 0 17px; width: 17px; min-width: 17px; max-width: 17px; align-self: flex-start; justify-self: start; height: 17px; margin-right: 5px; vertical-align: middle; border-radius: 50%; background: #9bc9ff; color: #10243e; font: 700 10px/1 sans-serif; } " +
      ".chatgpt-split-project-badges, .chatgpt-split-page-badges { display: inline-flex; align-items: center; gap: 3px; width: max-content; flex: 0 0 auto; margin-left: 5px; pointer-events: none; } " +
      ".chatgpt-split-project-number { display: inline-grid; place-items: center; box-sizing: border-box; width: 17px; min-width: 17px; height: 17px; flex: 0 0 17px; border-radius: 50%; background: #9bc9ff; color: #10243e; font: 700 10px/1 sans-serif; } " +
      ".chatgpt-split-page-badges { margin-right: 32px; } " +
      ".chatgpt-split-general-options { position: fixed; z-index: 2147483646; width: 24px; height: 24px; border: 0; border-radius: 5px; color: white; background: #252525; cursor: pointer; } " +
      ".chatgpt-split-general-options[hidden] { display: none; } " +
      ".chatgpt-split-general-menu { position: fixed; z-index: 2147483647; width: 180px; padding: 8px; border-radius: 12px; background: #292929; color: white; font: 13px sans-serif; box-shadow: 0 4px 18px #0008; } " +
      ".chatgpt-split-general-menu button { display: block; width: 100%; text-align: left; padding: 9px; border: 0; border-radius: 6px; background: transparent; color: white; cursor: pointer; } " +
      ".chatgpt-split-general-menu button:hover, .chatgpt-split-general-menu button:focus-visible { background: #40536b; }";
    document.head.append(indicatorStyle);
    scheduleBadgeUpdate();
    menuStyle = document.createElement("style");
    menuStyle.textContent = '[role="menu"], [role="dialog"], [data-radix-menu-content], [data-radix-popper-content-wrapper], [data-radix-portal], [data-state="open"] { z-index: 2147483647 !important; } ' +
      'body > [role="menu"], body > [role="dialog"], body > [data-radix-popper-content-wrapper] { position: fixed !important; z-index: 2147483647 !important; } ' +
      '[role="menu"]:has([data-chatgpt-split-menu]) { overflow: visible !important; } ' +
      '[data-chatgpt-split-menu] { position: relative; border-top: 1px solid #5555; padding-top: 4px; } ' +
      '[data-chatgpt-split-menu] button { display: block; width: 100%; text-align: left; padding: 8px 12px; border: 0; background: transparent; color: inherit; cursor: pointer; font: inherit; } ' +
      '[data-chatgpt-split-menu] button:hover { background: color-mix(in srgb, currentColor 12%, transparent); } ' +
      '[data-chatgpt-split-submenu] { position: absolute; top: 0; left: 100%; min-width: 166px; padding: 6px; border: 1px solid #555; border-radius: 16px; background: #252525; box-shadow: 0 5px 16px #0009; } ' +
      '[data-chatgpt-split-menu][data-side="left"] [data-chatgpt-split-submenu] { left: auto; right: 100%; } ' +
      '[data-chatgpt-split-menu][data-above="true"] [data-chatgpt-split-submenu] { top: auto; bottom: 0; } ' +
      '[data-chatgpt-split-submenu][hidden] { display: none !important; }';
    document.head.append(menuStyle);
    menuObserver = new MutationObserver(() => installMenuItems());
    menuObserver.observe(document.body, { childList: true, subtree: true });
    installMenuItems();
    sidebarClickHandler = event => {
      if (!host || event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.target.closest("#chatgpt-split-extension, [data-chatgpt-split-menu]")) return;
      const builtin = event.target.closest("[data-sidebar-destination], a[href], button.sidebar-item");
      // 確認済みの標準ページはURLで直接割当。未知の項目は本来の操作からURLを取得する。
      if (builtinDestination(builtin) && builtin.tagName?.toLowerCase() === "button") {
        if (!invokingNative && standardRoute(builtin)) {
          event.preventDefault();
          event.stopPropagation();
          assignSidebarEntry(builtin, 1);
        } else if (!invokingNative) watchNativeEntry(builtin, 1, false);
        return;
      }
      cancelNativeEntry();
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
      const sourceIndex = panes.findIndex(pane => sameAssignment(paneUrl(pane), url));
      if (sourceIndex >= 0) {
        if (sourceIndex > 0 && !panes[sourceIndex].hidden) focusPaneComposer(sourceIndex);
        return;
      }
      assignConversation(url, 1, location.href);
    };
    document.addEventListener("click", sidebarClickHandler, true);
    const menuOverlaySelector = "[role='menu'], [role='dialog'], [data-radix-menu-content], [data-radix-popper-content-wrapper], [data-radix-portal]";
    const rememberConversationMenu = (button, openedAtPointer) => {
      if (button.closest?.(menuOverlaySelector) || !sidebarRoots().some(root => root.contains(button))) return;
      const url = conversationFromRow(button);
      if (!url) return;
      pendingConversationMenu = {
        url,
        existingMenus: openedAtPointer ? new Map([...document.querySelectorAll("[role='menu']")].filter(menu => menu.getClientRects().length).map(menu => [menu, menu.innerHTML])) : new Map()
      };
    };
    menuPointerHandler = event => {
      if (generalMenu && !generalMenu.contains(event.target) && event.target !== generalMenuAnchor) closeGeneralMenu();
      if (event.target.closest?.(menuOverlaySelector)) return;
      const button = event.target.closest?.(conversationOptionsSelector);
      if (button) rememberConversationMenu(button, true);
      else if (event.button === 2 && conversationFromRow(event.target)) rememberConversationMenu(event.target, true);
      else if (!event.target.closest?.(menuOverlaySelector)) pendingConversationMenu = null;
    };
    document.addEventListener("pointerdown", menuPointerHandler, true);
    sidebarContextHandler = event => {
      const builtin = event.target.closest?.("[data-sidebar-destination], a[href], button.sidebar-item");
      if (builtinDestination(builtin) && sidebarRoots().some(root => root.contains(builtin))) { event.preventDefault(); showGeneralMenu(builtin, generalButtons.get(builtin) || builtin); return; }
      const link = event.target.closest?.("a[href]");
      const conversation = conversationFromRow(event.target);
      if (conversation && sidebarRoots().some(root => root.contains(event.target))) {
        if (pendingConversationMenu?.url !== conversation) rememberConversationMenu(event.target, true);
        setTimeout(() => installMenuItems(), 0);
        return;
      }
      if (!link || !sidebarRoots().some(root => root.contains(link))) return;
      if (conversationIdentity(link.href)) {
        rememberConversationMenu(link, true);
        setTimeout(() => installMenuItems(), 0);
      } else if (chatgptUrl(link.href) && !projectIdentity(link.href)) {
        event.preventDefault();
        showGeneralMenu(link, generalButtons.get(link) || link);
      }
    };
    document.addEventListener("contextmenu", sidebarContextHandler, true);
    window.addEventListener("scroll", scheduleBadgeUpdate, true);
    window.addEventListener("resize", scheduleBadgeUpdate);
    menuClickHandler = event => {
      if (event.target.closest?.(menuOverlaySelector)) return;
      const button = event.target.closest?.(conversationOptionsSelector);
      if (!button) return;
      if (pendingConversationMenu?.url !== conversationFromRow(button)) rememberConversationMenu(button, false);
      setTimeout(() => installMenuItems(), 0);
    };
    document.addEventListener("click", menuClickHandler, true);
    let lastParentUrl = location.href;
    let lastPaneUrls = "";
    const syncRoute = () => {
      if (!host) return;
      if (location.href !== lastParentUrl) {
        lastParentUrl = location.href;
        const handled = completeNativeRoute();
        if (!handled && consumedNativeUrl !== lastParentUrl && !conversationUrl(lastParentUrl)) showInPaneOne(lastParentUrl);
        consumedNativeUrl = null;
      }
      const currentPaneUrls = panes.map(pane => paneUrl(pane) || "").join("|");
      if (currentPaneUrls !== lastPaneUrls) {
        lastPaneUrls = currentPaneUrls;
        saveState();
      }
    };
    syncRoute();
    routeTimer = setInterval(syncRoute, 400);
  }
  function addFourResize(axis, index) {
    const handle = document.createElement("div");
    handle.className = "resize-handle " + axis + " four-resize";
    handle.dataset.axis = axis;
    handle.dataset.boundary = String(index);
    handle.hidden = true;
    handle.addEventListener("pointerdown", event => {
      event.preventDefault();
      handle.setPointerCapture(event.pointerId);
      const move = next => {
        const rect = grid.getBoundingClientRect();
        const value = axis === "x" ? (next.clientX - rect.left) / rect.width : (next.clientY - rect.top) / rect.height;
        if (axis === "x" && fourLayout === "stacked") fourLeft = Math.max(.15, Math.min(.85, value));
        else {
          const boundaries = axis === "x" ? fourColumns : fourRows;
          const gap = Math.min(.15, 90 / (axis === "x" ? rect.width : rect.height));
          boundaries[index] = Math.max((boundaries[index - 1] || 0) + gap, Math.min((boundaries[index + 1] || 1) - gap, value));
        }
        updateFourResize();
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
        if (axis === "x") {
          splitX = ratio;
          resizedX = true;
          grid.style.setProperty("--split-x", (ratio * 100) + "%");
          handle.style.left = (ratio * 100) + "%";
          if (grid.dataset.count === "3" && threeLayout === "stacked")
            host.shadowRoot.querySelector(".resize-handle.y").style.left = (ratio * 100) + "%";
        }
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
      if (pendingConversationMenu.existingMenus.get(menu) === menu.innerHTML) return;
      const menuText = menu.textContent || "";
      const conversationActions = [
        /名前を変更|Rename/i, /ピン留め|Pin/i, /アーカイブ|Archive/i,
        /削除|Delete|Remove from project/i, /共有|Share/i, /プロジェクトに移動|Move to project/i
      ];
      if (conversationActions.filter(pattern => pattern.test(menuText)).length < 2) return;
      if (menu.querySelector("[data-chatgpt-split-menu]")) return;
      const target = pendingConversationMenu.url;
      pendingConversationMenu = null;
      const group = document.createElement("div");
      group.dataset.chatgptSplitMenu = "true";
      group.addEventListener("pointerdown", event => event.stopPropagation());
      const trigger = document.createElement("button");
      trigger.type = "button";
      trigger.dataset.chatgptSplitTrigger = "true";
      trigger.setAttribute("aria-expanded", "false");
      trigger.textContent = "分割表示 ▸";
      const submenu = document.createElement("div");
      submenu.id = "chatgpt-split-pane-options-" + (++submenuSerial);
      submenu.setAttribute("role", "group");
      submenu.setAttribute("aria-label", "分割表示の画面選択");
      trigger.setAttribute("aria-controls", submenu.id);
      submenu.dataset.chatgptSplitSubmenu = "true";
      submenu.hidden = true;
      bindFlyout(group, trigger, submenu);
      group.append(trigger, submenu);
      for (let index = 1; index <= 4; index++) {
        const item = document.createElement("button");
        item.type = "button";
        item.dataset.chatgptSplitPaneOption = String(index);
        item.textContent = "画面" + index + "で開く";
        item.addEventListener("click", event => {
          event.preventDefault();
          event.stopPropagation();
          assignConversation(target, index, location.href);
          menu.remove();
        });
        submenu.append(item);
      }
      menu.append(group);
    });
  }
  function showDiagnostics() {
    document.getElementById?.("chatgpt-split-diagnostics")?.remove();
    const dialog = document.createElement("div");
    dialog.id = "chatgpt-split-diagnostics";
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-label", "分割ビュー診断");
    dialog.style.cssText = "position:fixed;inset:10% 15%;z-index:2147483647;background:#222;color:#fff;padding:20px;border:1px solid #888;border-radius:12px;overflow:auto;font:13px monospace";
    const data = { version: "0.22.0", splitActive: !!host, sidebarRoots: sidebarRoots().length, registeredStandardItems: generalButtons.size, panes: panes.map((pane, index) => {
      const frame = pane.querySelector("iframe");
      try {
        const doc = frame.contentDocument;
        return { pane: index + 1, empty: pane.dataset.empty === "true", hidden: !!pane.hidden, loading: !!frame.dataset.pendingUrl, documentAccessible: !!doc, readyState: doc?.readyState || "unknown", libraryButton: !!doc?.querySelector('[data-sidebar-destination="builtin:library"]'), scheduleButton: !!doc?.querySelector('[data-sidebar-destination="builtin:automations"]'), pending: !!pendingNative && pendingNative.number === index + 1, error: pane.dataset.actionError || null };
      } catch { return { pane: index + 1, documentAccessible: false }; }
    }) };
    const close = document.createElement("button");
    close.textContent = "閉じる";
    close.type = "button";
    close.addEventListener("click", () => dialog.remove());
    const text = document.createElement("pre");
    text.textContent = JSON.stringify(data, null, 2);
    dialog.append(close, text);
    document.body.append(dialog);
    close.focus?.();
  }
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "show-split-diagnostics") {
      showDiagnostics();
      sendResponse?.({ shown: true });
      return;
    }
    if (message.type === "toggle-four-view") {
      if (host) stop();
      else if (message.url) start(message.url);
    } else if (message.type === "assign-conversation") {
      assignConversation(message.url, message.pane, message.pageUrl);
    } else if (message.type === "assign-page") {
      assignPage(message.url, message.pane, message.pageUrl);
    }
  });
  showLauncher();
  const initializeState = result => {
    const failed = !!chrome.runtime.lastError;
    if (stateTouched || host) { stateLoaded = true; return; }
    let legacy = null;
    try { legacy = validateState(JSON.parse(sessionStorage.getItem(stateKey) || "null")); } catch {}
    persistentState = failed ? legacy : validateState(result?.[stateKey]) || (result?.[stateKey] === undefined ? legacy : null);
    stateLoaded = true;
    if (persistentState?.active === true) start(location.href);
  };
  try {
    if (chrome.storage?.local) chrome.storage.local.get(stateKey, initializeState);
    else initializeState({});
  } catch { initializeState({}); }
})();
