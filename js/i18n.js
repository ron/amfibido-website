(function () {
  var STORAGE_KEY = "amfibido_lang";
  var translations = { en: null, nl: null };
  var loadPromise = null;

  function getStoredLang() {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      return null;
    }
  }

  function setStoredLang(lang) {
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch (e) {}
  }

  function pageLangHint() {
    var html = document.documentElement;
    if (html && html.getAttribute("data-rules-lang")) {
      return html.getAttribute("data-rules-lang");
    }
    var path = window.location.pathname || "";
    if (path.indexOf("/rules/nl") === 0) return "nl";
    if (path.indexOf("/rules/en") === 0) return "en";
    if (/\/rules\/?$/.test(path)) return null;
    return null;
  }

  function resolveLang() {
    return getStoredLang() || pageLangHint() || "en";
  }

  function loadTranslations() {
    if (loadPromise) return loadPromise;
    loadPromise = Promise.all([
      fetch("/i18n/en.json").then(function (r) { return r.json(); }),
      fetch("/i18n/nl.json").then(function (r) { return r.json(); }),
    ]).then(function (pair) {
      translations.en = pair[0];
      translations.nl = pair[1];
      return translations;
    }).catch(function () {
      return translations;
    });
    return loadPromise;
  }

  function t(lang, path) {
    var parts = path.split(".");
    var node = translations[lang];
    for (var i = 0; i < parts.length; i++) {
      if (!node) return null;
      node = node[parts[i]];
    }
    return typeof node === "string" ? node : null;
  }

  function applyChat(lang) {
    var chat = translations[lang] && translations[lang].chat;
    if (!chat) return;

    var toggle = document.getElementById("chat-toggle");
    if (toggle) toggle.setAttribute("aria-label", chat.openLabel);

    var closeBtn = document.getElementById("chat-close-mobile");
    if (closeBtn) closeBtn.setAttribute("aria-label", chat.closeLabel);

    var title = document.querySelector("[data-i18n='chat.title']");
    if (title) title.textContent = chat.title;

    var subtitle = document.querySelector("[data-i18n='chat.subtitle']");
    if (subtitle) subtitle.textContent = chat.subtitle;

    var welcome = document.querySelector("[data-i18n='chat.welcome']");
    if (welcome) welcome.textContent = chat.welcome;

    var input = document.getElementById("chat-input");
    if (input) input.setAttribute("placeholder", chat.placeholder);

    window.__amfibidoChatI18n = chat;
  }

  function updateFlagButtons(lang) {
    document.querySelectorAll("[data-set-lang]").forEach(function (btn) {
      var btnLang = btn.getAttribute("data-set-lang");
      var active = btnLang === lang;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-pressed", active ? "true" : "false");
    });
  }

  function rulesUrlForLang(lang) {
    return lang === "nl" ? "/rules/nl/" : "/rules/en/";
  }

  function referenceUrlForLang(lang) {
    return lang === "nl" ? "/rules/nl/reference/" : "/rules/en/reference/";
  }

  function maybeRedirectRules() {
    var path = window.location.pathname || "";
    var isRulesRoot = path === "/rules" || path === "/rules/";
    var isRulesEn = path === "/rules/en" || path === "/rules/en/";
    var isRulesNl = path === "/rules/nl" || path === "/rules/nl/";
    if (!isRulesRoot && !isRulesEn && !isRulesNl) return Promise.resolve(false);

    // Root /rules/ has its own redirect script; skip here.
    if (isRulesRoot) return Promise.resolve(false);

    var stored = getStoredLang();

    if (stored === "nl" && isRulesEn) {
      window.location.replace("/rules/nl/");
      return Promise.resolve(true);
    }
    if (stored === "en" && isRulesNl) {
      window.location.replace("/rules/en/");
      return Promise.resolve(true);
    }
    if (stored) return Promise.resolve(false);

    if (isRulesNl) setStoredLang("nl");
    if (isRulesEn) setStoredLang("en");
    return Promise.resolve(false);
  }

  function applyCardReference(lang) {
    var ui = translations[lang] && translations[lang].cardReference;
    if (!ui) return;

    var title = document.querySelector("#card-reference h1");
    if (title) title.textContent = ui.title;

    var countEl = document.getElementById("card-reference-count");
    if (countEl) {
      countEl.setAttribute("data-template", ui.resultCount);
      var visible = document.querySelectorAll("#card-reference [data-card]:not(.hidden)").length;
      countEl.textContent = ui.resultCount.replace("{count}", String(visible));
    }

    var emptyEl = document.getElementById("card-reference-empty");
    if (emptyEl) emptyEl.textContent = ui.empty;

    var pdfLink = document.querySelector("[data-i18n='cardReference.pdfLabel']");
    if (pdfLink) {
      pdfLink.setAttribute("title", ui.pdfLabel);
      pdfLink.setAttribute("aria-label", ui.pdfLabel);
      if (ui.pdfUrl) pdfLink.setAttribute("href", ui.pdfUrl);
    }

    document.querySelectorAll("[data-i18n-text='cardReference.pdfLabel']").forEach(function (el) {
      el.textContent = ui.pdfLabel;
    });

    document.querySelectorAll("[data-i18n-href]").forEach(function (el) {
      var key = el.getAttribute("data-i18n-href");
      var value = t(lang, key);
      if (value) el.setAttribute("href", value);
    });

    var closeBtn = document.getElementById("card-reference-lightbox-close");
    if (closeBtn) closeBtn.setAttribute("aria-label", ui.close);
    var prevBtn = document.getElementById("card-reference-lightbox-prev");
    if (prevBtn) prevBtn.setAttribute("aria-label", ui.previous);
    var nextBtn = document.getElementById("card-reference-lightbox-next");
    if (nextBtn) nextBtn.setAttribute("aria-label", ui.next);

    document.querySelectorAll("[data-i18n-aria='cardReference.commentsAria']").forEach(function (el) {
      if (ui.commentsAria) el.setAttribute("aria-label", ui.commentsAria);
    });

    var commentsTitle = document.getElementById("card-reference-lightbox-comments-title");
    if (commentsTitle && ui.commentsTitle) commentsTitle.textContent = ui.commentsTitle;
  }

  function bindFlags() {
    document.querySelectorAll("[data-set-lang]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var lang = btn.getAttribute("data-set-lang");
        if (!lang) return;
        setStoredLang(lang);
        var path = window.location.pathname || "";
        var onReference = path.indexOf("/reference") !== -1;

        if (onReference) {
          var refTarget = referenceUrlForLang(lang);
          if (path === refTarget || path === refTarget.slice(0, -1)) {
            updateFlagButtons(lang);
            applyChat(lang);
            applyCardReference(lang);
            return;
          }
          window.location.href = refTarget;
          return;
        }

        var target = rulesUrlForLang(lang);
        if (path === target || path === target.slice(0, -1)) {
          updateFlagButtons(lang);
          applyChat(lang);
          return;
        }
        window.location.href = target;
      });
    });
  }

  window.AmfibidoI18n = {
    getLang: resolveLang,
    setLang: setStoredLang,
    t: t,
    load: loadTranslations,
  };

  maybeRedirectRules().then(function (redirected) {
    if (redirected) return;
    bindFlags();
    loadTranslations().then(function () {
      var lang = resolveLang();
      updateFlagButtons(lang);
      applyChat(lang);
      if ((window.location.pathname || "").indexOf("/reference") !== -1) {
        applyCardReference(lang);
      }
    });
  });
})();
