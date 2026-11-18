/* KasuhaNET shared navigation loader
   Keep page content untouched. Pages only declare a header mount point. */
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
    } catch (_) { return value; }
  };

  fetch(file, { credentials: "same-origin" })
    .then((response) => {
      if (!response.ok) throw new Error("Header template could not be loaded: " + response.status);
      return response.text();
    })
    .then((source) => {
      const parsed = new DOMParser().parseFromString(source, "text/html");
      const templateHeader = parsed.querySelector("header.kn-template-header");
      if (!templateHeader) throw new Error("Header template is missing its header element");

      const style = parsed.querySelector("style");
      if (style && !document.getElementById("kn-shared-header-style")) {
        const sharedStyle = document.createElement("style");
        sharedStyle.id = "kn-shared-header-style";
        sharedStyle.textContent = style.textContent;
        document.head.appendChild(sharedStyle);
      }

      const header = document.importNode(templateHeader, true);
      const currentPath = normalize(window.location.pathname);

      const languageLinks = header.querySelectorAll(".nav-lang a[lang]");
      languageLinks.forEach((link) => {
        const lang = (link.getAttribute("lang") || "").toLowerCase();
        const target = lang === "en" ? mount.dataset.enHref : mount.dataset.msHref;
        if (target) link.setAttribute("href", target);
      });

      header.querySelectorAll("nav a").forEach((link) => {
        link.removeAttribute("aria-current");
        const href = link.getAttribute("href");
        if (!href || href === "#") return;
        if (normalize(href) === currentPath) link.setAttribute("aria-current", "page");
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
          if (menu) menu.classList.toggle("show");
        });
      });

      mount.replaceWith(header);
    })
    .catch((error) => {
      console.error("[KasuhaNET Header]", error);
      mount.setAttribute("data-kn-header-error", "true");
    });
})();