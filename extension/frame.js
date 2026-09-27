(() => {
  if (window.top === window || location.origin !== "https://chatgpt.com" ||
      !window.frameElement?.hasAttribute("data-chatgpt-split-frame")) return;
  const hidden = new WeakSet();
  function suitable(side) {
    if (!side || side.closest("main, [role='main']")) return false;
    const rect = side.getBoundingClientRect();
    return rect.left >= -4 && rect.left <= 32 && rect.top <= 80 &&
      rect.width >= 150 && rect.width < innerWidth * .5 &&
      rect.height >= innerHeight * .5;
  }
  function hideSidebar() {
    const candidates = [...document.querySelectorAll('aside, nav, [data-testid*="sidebar"], [class*="sidebar"]')]
      .filter(suitable);
    candidates.forEach(side => {
      if (hidden.has(side)) return;
      side.style.setProperty("display", "none", "important");
      hidden.add(side);
    });
  }
  hideSidebar();
  const observer = new MutationObserver(hideSidebar);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener("message", event => {
    if (event.source !== window.parent || event.origin !== "https://chatgpt.com" || event.data?.type !== "focus-composer") return;
    const input = document.querySelector("textarea, [contenteditable='true'], #prompt-textarea");
    input?.focus();
  });
})();
