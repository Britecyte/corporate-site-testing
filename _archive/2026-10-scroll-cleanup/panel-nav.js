/**
 * Viewport panel navigation — tabs replace content with a fade, no page scroll.
 */
const PANEL_IDS = ["home", "about", "team", "pipeline", "platform", "news", "contact"];
const FADE_MS = 280;

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function panelFromHash() {
  const raw = (window.location.hash || "#home").replace("#", "").toLowerCase();
  if (raw === "products" || raw === "hero") return raw === "hero" ? "home" : "pipeline";
  return PANEL_IDS.includes(raw) ? raw : "home";
}

export function initPanelNav() {
  const stage = document.querySelector("[data-panel-stage]");
  const panels = Array.from(document.querySelectorAll("[data-panel]"));
  const tabs = Array.from(document.querySelectorAll("[data-panel-tab]"));
  if (!stage || !panels.length || !tabs.length) return;

  document.documentElement.classList.add("is-panel-app");
  document.body.classList.add("is-panel-app");

  let active = null;
  let busy = false;

  const setTabState = (id) => {
    tabs.forEach((tab) => {
      const on = tab.dataset.panelTab === id;
      tab.classList.toggle("is-active", on);
      tab.setAttribute("aria-selected", String(on));
      tab.setAttribute("tabindex", on ? "0" : "-1");
    });
  };

  const showPanel = (id, { pushHash = true } = {}) => {
    const nextId = PANEL_IDS.includes(id) ? id : "home";
    if (nextId === active || busy) {
      setTabState(nextId);
      return;
    }

    const next = panels.find((p) => p.dataset.panel === nextId);
    const current = panels.find((p) => p.dataset.panel === active);
    if (!next) return;

    busy = true;
    setTabState(nextId);

    const finish = () => {
      panels.forEach((panel) => {
        const on = panel === next;
        panel.classList.toggle("is-active", on);
        panel.hidden = !on;
        panel.setAttribute("aria-hidden", String(!on));
        if (on) panel.scrollTop = 0;
      });
      active = nextId;
      busy = false;
      document.dispatchEvent(new CustomEvent("britecyte:panelchange", { detail: { panel: nextId } }));
    };

    if (pushHash) {
      const hash = nextId === "home" ? "#home" : `#${nextId}`;
      if (window.location.hash !== hash) {
        history.replaceState(null, "", hash);
      }
    }

    if (!current || prefersReducedMotion()) {
      finish();
      next.classList.add("is-active");
      next.hidden = false;
      return;
    }

    stage.classList.add("is-fading");
    current.classList.add("is-exit");
    window.setTimeout(() => {
      current.classList.remove("is-active", "is-exit");
      current.hidden = true;
      current.setAttribute("aria-hidden", "true");
      next.hidden = false;
      next.classList.add("is-active", "is-enter");
      next.setAttribute("aria-hidden", "false");
      next.scrollTop = 0;
      // force reflow for enter transition
      void next.offsetWidth;
      next.classList.remove("is-enter");
      stage.classList.remove("is-fading");
      active = nextId;
      busy = false;
      document.dispatchEvent(new CustomEvent("britecyte:panelchange", { detail: { panel: nextId } }));
    }, FADE_MS);
  };

  tabs.forEach((tab) => {
    tab.addEventListener("click", (event) => {
      event.preventDefault();
      showPanel(tab.dataset.panelTab);
      const mobile = document.querySelector("[data-mobile-nav]");
      const toggle = document.querySelector("[data-menu-toggle]");
      if (mobile?.classList.contains("is-open") && toggle) {
        toggle.setAttribute("aria-expanded", "false");
        mobile.classList.remove("is-open");
      }
    });

    tab.addEventListener("keydown", (event) => {
      const current = tabs.indexOf(tab);
      if (current < 0) return;
      let next = current;
      if (event.key === "ArrowRight" || event.key === "ArrowDown") next = (current + 1) % tabs.length;
      if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = (current - 1 + tabs.length) % tabs.length;
      if (next === current) return;
      event.preventDefault();
      tabs[next].focus();
      showPanel(tabs[next].dataset.panelTab);
    });
  });

  document.querySelectorAll("[data-panel-link]").forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      showPanel(link.dataset.panelLink);
    });
  });

  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", (event) => {
      const href = anchor.getAttribute("href") || "";
      const id = href.slice(1).toLowerCase();
      if (!id || anchor.hasAttribute("data-panel-tab") || anchor.hasAttribute("data-panel-link")) return;
      const mapped = id === "products" ? "pipeline" : id === "hero" ? "home" : id;
      if (!PANEL_IDS.includes(mapped)) return;
      event.preventDefault();
      showPanel(mapped);
    });
  });

  window.addEventListener("hashchange", () => {
    showPanel(panelFromHash(), { pushHash: false });
  });

  // Initial paint without a double-fade
  const initial = panelFromHash();
  panels.forEach((panel) => {
    const on = panel.dataset.panel === initial;
    panel.classList.toggle("is-active", on);
    panel.hidden = !on;
    panel.setAttribute("aria-hidden", String(!on));
  });
  setTabState(initial);
  active = initial;
  if (!window.location.hash) history.replaceState(null, "", "#home");
}

export function getActivePanel() {
  return document.querySelector("[data-panel].is-active")?.dataset.panel || "home";
}
