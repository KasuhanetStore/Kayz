/* KasuhaNET shared navigation loader
   One controlled header source for every public page. */
(() => {
  "use strict";
  const mount = document.querySelector("[data-kn-header]");
  if (!mount) return;

  const language = (document.documentElement.lang || "").toLowerCase().startsWith("ms") ? "MS" : "EN";
  const variant = mount.dataset.knHeader === "home" ? "home" : "policy";
  const file = `/template-text/Header-Navigation/header-navigation-${variant}-${language}.html`;

  const normalize = (value) => {
    try {
      const url = new URL(value, window.location.origin);
      let pathname = url.pathname.replace(/\\/+$/, "") || "/";
      if (pathname.endsWith("/index.html")) pathname = pathname.slice(0, -10) || "/";
      return pathname;
    } catch (_) {
      return value;
    }
  };

  fetch(file, { credentials: "same-origin" })
    .then((response) => {
      if (!response.ok) throw new Error("Header template load failed: " + response.status);
      return response.text();
    })
    .then((source) => {
      const parsed = new DOMParser().parseFromString(source, "text/html");
      const templateHeader = parsed.querySelector("header.kn-template-header");
      if (!templateHeader) throw new Error("Header template is missing its header element");

      const templateStyle = parsed.querySelector("style");
      if (templateStyle && !document.getElementById("kn-shared-header-style")) {
        const style = document.createElement("style");
        style.id = "kn-shared-header-style";
        style.textContent = templateStyle.textContent;
        document.head.appendChild(style);
      }

      const header = document.importNode(templateHeader, true);
      const currentPath = normalize(window.location.pathname);

      header.querySelectorAll("nav a").forEach((link) => {
        link.removeAttribute("aria-current");
        const href = link.getAttribute("href");
        if (href && href !== "#" && normalize(href) === currentPath) {
          link.setAttribute("aria-current", "page");
        }
      });

      header.querySelectorAll(".nav-lang a[lang]").forEach((link) => {
        const lang = (link.getAttribute("lang") || "").toLowerCase();
        const target = lang === "en" ? mount.dataset.enHref : mount.dataset.msHref;
        if (target) link.setAttribute("href", target);
      });

      const toggle = header.querySelector(".menu-toggle");
      const nav = header.querySelector(".nav-links");
      if (toggle && nav) {
        toggle.removeAttribute("onclick");
        toggle.addEventListener("click", () => {
          const expanded = nav.classList.toggle("active");
          toggle.setAttribute("aria-expanded", expanded ? "true" : "false");
        });
      }

      header.querySelectorAll(".dropdown > a").forEach((trigger) => {
        trigger.removeAttribute("onclick");
        trigger.addEventListener("click", (event) => {
          event.preventDefault();
          const menu = trigger.nextElementSibling;
          if (!menu) return;
          const expanded = menu.classList.toggle("show");
          trigger.setAttribute("aria-expanded", expanded ? "true" : "false");
        });
      });

      mount.replaceWith(header);
    })
    .catch((error) => {
      console.error("[KasuhaNET shared header]", error);
      mount.setAttribute("data-kn-header-error", "true");
    });
})();