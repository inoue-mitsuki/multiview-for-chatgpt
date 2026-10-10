(() => {
  if (window.top === window || location.origin !== "https://chatgpt.com" ||
      (window.frameElement && !window.frameElement.hasAttribute("data-chatgpt-split-frame"))) return;
  const isSplitFrame = () => window.frameElement?.hasAttribute("data-chatgpt-split-frame");
  const hidden = new WeakSet();
  function suitable(side) {
    if (!side || side.closest("main, [role='main']")) return false;
    const rect = side.getBoundingClientRect();
    return rect.left >= -4 && rect.left <= 32 && rect.top <= 80 &&
      rect.width >= 150 && rect.width < innerWidth * .5 &&
      rect.height >= innerHeight * .5;
  }
  function hideSidebar() {
    if (!isSplitFrame()) return;
    if (document.documentElement) {
      let style = document.querySelector("#chatgpt-split-thread-width");
      const css = '[data-app-shell-sidebar-open] { --app-shell-navigation-rail-width: 0px !important; }';
      if (!style) {
        style = document.createElement("style");
        style.id = "chatgpt-split-thread-width";
        style.textContent = css;
        document.documentElement.append(style);
      } else if (style.textContent !== css) style.textContent = css;
    }
    // 実際のapp shellではsidebar本体と幅を持つasideを明示的に隠す。
    const shellSidebar = document.querySelector("#app-shell-sidebar");
    const explicit = new Set(shellSidebar && !shellSidebar.closest("main, [role='main']") ?
      [shellSidebar, shellSidebar.closest("aside[data-app-shell-left-panel-appearance]")].filter(Boolean) : []);
    const candidates = [...new Set([...explicit, ...document.querySelectorAll('aside, nav, [data-testid*="sidebar"], [class*="sidebar"]')])]
      .filter(side => !side.closest("main, [role='main']") && (explicit.has(side) || hidden.has(side) || suitable(side)));
    candidates.forEach(side => {
      if (side.style.getPropertyValue("display") === "none" && side.style.getPropertyPriority("display") === "important") return;
      side.style.setProperty("display", "none", "important");
      hidden.add(side);
    });
  }
  hideSidebar();
  const observer = new MutationObserver(hideSidebar);
  observer.observe(document, { childList: true, subtree: true, attributes: true, attributeFilter: ["style", "class"] });
  window.addEventListener("resize", hideSidebar);
  window.addEventListener("message", event => {
    if (!isSplitFrame() || event.source !== window.parent || event.origin !== "https://chatgpt.com" || event.data?.type !== "focus-composer") return;
    const input = document.querySelector("textarea, [contenteditable='true'], #prompt-textarea");
    input?.focus();
  });
})();
