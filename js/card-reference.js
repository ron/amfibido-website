(function () {
  var root = document.getElementById("card-reference");
  if (!root) return;

  var chips = root.querySelectorAll("[data-filter-group]");
  var cards = Array.prototype.slice.call(root.querySelectorAll("[data-card]"));
  var emptyEl = document.getElementById("card-reference-empty");
  var countEl = document.getElementById("card-reference-count");
  var countTemplate = countEl ? countEl.getAttribute("data-template") || "{count} cards" : "";

  var lightbox = document.getElementById("card-reference-lightbox");
  var imgEl = document.getElementById("card-reference-lightbox-img");
  var captionEl = document.getElementById("card-reference-lightbox-caption");
  var commentsPanel = document.getElementById("card-reference-lightbox-comments");
  var commentsList = document.getElementById("card-reference-lightbox-comments-list");
  var btnClose = document.getElementById("card-reference-lightbox-close");
  var btnPrev = document.getElementById("card-reference-lightbox-prev");
  var btnNext = document.getElementById("card-reference-lightbox-next");

  var selected = { level: {}, type: {} };
  var visibleButtons = [];
  var lightboxIndex = 0;
  var touchStartX = null;

  function selectedKeys(group) {
    return Object.keys(selected[group]).filter(function (key) {
      return selected[group][key];
    });
  }

  function cardMatches(card) {
    var levels = selectedKeys("level");
    var types = selectedKeys("type");
    var cardType = card.getAttribute("data-type");
    var cardLevel = card.getAttribute("data-level");

    var typeOk = types.length === 0 || types.indexOf(cardType) !== -1;
    var levelOk =
      levels.length === 0 ||
      (cardLevel && levels.indexOf(cardLevel) !== -1) ||
      (cardType === "sensei" && types.indexOf("sensei") !== -1);

    return typeOk && levelOk;
  }

  function updateCount(visibleCount) {
    if (!countEl) return;
    countEl.textContent = countTemplate.replace("{count}", String(visibleCount));
  }

  function applyFilters() {
    visibleButtons = [];
    cards.forEach(function (card) {
      var match = cardMatches(card);
      card.classList.toggle("hidden", !match);
      if (match) visibleButtons.push(card);
    });

    if (emptyEl) emptyEl.classList.toggle("hidden", visibleButtons.length > 0);
    updateCount(visibleButtons.length);
  }

  function parseComments(cardEl) {
    var raw = cardEl.getAttribute("data-comments");
    if (!raw) return null;
    try {
      var parsed = JSON.parse(raw);
      return Array.isArray(parsed) && parsed.length ? parsed : null;
    } catch (e) {
      return null;
    }
  }

  function renderLightboxComments(comments) {
    if (!commentsPanel || !commentsList || !imgEl) return;

    if (!comments || !comments.length) {
      commentsPanel.classList.add("hidden");
      commentsList.innerHTML = "";
      imgEl.classList.remove("has-comments");
      return;
    }

    commentsList.innerHTML = comments
      .map(function (note) {
        return "<li>" + note.replace(/</g, "&lt;").replace(/>/g, "&gt;") + "</li>";
      })
      .join("");
    commentsPanel.classList.remove("hidden");
    imgEl.classList.add("has-comments");
  }

  chips.forEach(function (chip) {
    chip.addEventListener("click", function () {
      var group = chip.getAttribute("data-filter-group");
      var value = chip.getAttribute("data-filter-value");
      if (!group || !value || !selected[group]) return;

      selected[group][value] = !selected[group][value];
      chip.setAttribute("aria-pressed", selected[group][value] ? "true" : "false");
      chip.classList.toggle("is-active", Boolean(selected[group][value]));
      applyFilters();
    });
  });

  function openLightbox(index) {
    if (!lightbox || !imgEl || !visibleButtons.length) return;
    lightboxIndex = (index + visibleButtons.length) % visibleButtons.length;
    var cardEl = visibleButtons[lightboxIndex];
    imgEl.src = cardEl.getAttribute("data-full") || "";
    imgEl.alt = cardEl.getAttribute("data-alt") || "";
    if (captionEl) captionEl.textContent = cardEl.getAttribute("data-alt") || "";
    renderLightboxComments(parseComments(cardEl));
    lightbox.classList.remove("hidden");
    document.body.style.overflow = "hidden";
    if (btnClose) btnClose.focus();
  }

  function closeLightbox() {
    if (!lightbox || !imgEl) return;
    lightbox.classList.add("hidden");
    imgEl.removeAttribute("src");
    imgEl.classList.remove("has-comments");
    if (commentsPanel) commentsPanel.classList.add("hidden");
    if (commentsList) commentsList.innerHTML = "";
    document.body.style.overflow = "";
  }

  function showLightbox(delta) {
    if (!visibleButtons.length) return;
    openLightbox(lightboxIndex + delta);
  }

  cards.forEach(function (card) {
    var button = card.querySelector("button") || card;
    button.addEventListener("click", function () {
      var index = visibleButtons.indexOf(card);
      if (index === -1) return;
      openLightbox(index);
    });
  });

  root.querySelectorAll(".card-ref-comment-badge").forEach(function (badge) {
    badge.addEventListener("click", function (e) {
      e.stopPropagation();
    });
    badge.addEventListener("mousedown", function (e) {
      e.stopPropagation();
    });
  });

  if (btnClose) btnClose.addEventListener("click", closeLightbox);
  if (lightbox) {
    lightbox.addEventListener("click", function (e) {
      if (e.target === lightbox) closeLightbox();
    });
  }
  if (btnPrev) {
    btnPrev.addEventListener("click", function (e) {
      e.stopPropagation();
      showLightbox(-1);
    });
  }
  if (btnNext) {
    btnNext.addEventListener("click", function (e) {
      e.stopPropagation();
      showLightbox(1);
    });
  }

  document.addEventListener("keydown", function (e) {
    if (!lightbox || lightbox.classList.contains("hidden")) return;
    if (e.key === "Escape") closeLightbox();
    if (e.key === "ArrowLeft") showLightbox(-1);
    if (e.key === "ArrowRight") showLightbox(1);
  });

  if (lightbox) {
    lightbox.addEventListener(
      "touchstart",
      function (e) {
        if (!e.changedTouches || !e.changedTouches.length) return;
        touchStartX = e.changedTouches[0].clientX;
      },
      { passive: true }
    );
    lightbox.addEventListener(
      "touchend",
      function (e) {
        if (touchStartX == null || !e.changedTouches || !e.changedTouches.length) return;
        var deltaX = e.changedTouches[0].clientX - touchStartX;
        touchStartX = null;
        if (Math.abs(deltaX) < 50) return;
        showLightbox(deltaX < 0 ? 1 : -1);
      },
      { passive: true }
    );
  }

  applyFilters();
})();
