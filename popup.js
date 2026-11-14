/* global chrome */
(function () {
  "use strict";

  var state = {
    rotate: 0,
    top: 0,
    left: 0,
    scale: 100,
    scaleX: 100,
    scaleY: 100,
  };

  var tabId = null;
  var saveTimer = null;
  var fields = [
    { key: "rotate", range: "rotate-range", number: "rotate-number" },
    { key: "top", range: "top-range", number: "top-number" },
    { key: "left", range: "left-range", number: "left-number" },
    { key: "scale", range: "scale-range", number: "scale-number" },
    { key: "scaleX", range: "scaleX-range", number: "scaleX-number" },
    { key: "scaleY", range: "scaleY-range", number: "scaleY-number" },
  ];

  function $(id) {
    return document.getElementById(id);
  }

  function t(key) {
    return chrome.i18n.getMessage(key) || key;
  }

  function applyI18n() {
    document.documentElement.lang = t("mirrorOn") === "已开启" ? "zh-CN" : "en";

    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var msg = t(el.getAttribute("data-i18n"));
      if (msg) el.textContent = msg;
    });
    document.querySelectorAll("[data-i18n-title]").forEach(function (el) {
      var msg = t(el.getAttribute("data-i18n-title"));
      if (msg) el.setAttribute("title", msg);
    });
    document.querySelectorAll("[data-i18n-aria-label]").forEach(function (el) {
      var msg = t(el.getAttribute("data-i18n-aria-label"));
      if (msg) el.setAttribute("aria-label", msg);
    });
  }

  function pageKeyFromUrl(url) {
    var u = new URL(url);
    return u.origin + u.pathname + u.search;
  }

  function clamp(value, min, max) {
    var n = Number(value);
    if (Number.isNaN(n)) n = min;
    return Math.min(max, Math.max(min, n));
  }

  function isMirrored() {
    return Number(state.scaleX) < 0;
  }

  function syncInputs() {
    fields.forEach(function (f) {
      var range = $(f.range);
      var number = $(f.number);
      var value = state[f.key];
      if (range) range.value = value;
      if (number) number.value = value;
    });

    var angle = Math.round(state.rotate) % 360;
    if (angle < 0) angle += 360;

    var statusEl = $("status-angle");
    if (statusEl) statusEl.textContent = angle + "°";

    var mirrorBtn = $("btn-mirror");
    if (mirrorBtn) mirrorBtn.classList.toggle("active", isMirrored());

    var mirrorState = $("mirror-state");
    if (mirrorState) {
      mirrorState.textContent = isMirrored() ? t("mirrorOn") : t("mirrorOff");
    }

    document.querySelectorAll("[data-rotate-to]").forEach(function (btn) {
      var target = Number(btn.getAttribute("data-rotate-to"));
      btn.classList.toggle("active", target === angle);
    });
  }

  function showNoVideo(show) {
    var noVideo = $("no-video");
    if (noVideo) {
      noVideo.classList.toggle("hidden", !show);
    }
  }

  function sendToTab(message) {
    return new Promise(function (resolve) {
      if (!tabId) {
        resolve(null);
        return;
      }
      chrome.tabs.sendMessage(tabId, message, function (response) {
        if (chrome.runtime.lastError) {
          resolve(null);
          return;
        }
        resolve(response || null);
      });
    });
  }

  function persist(settings) {
    return new Promise(function (resolve) {
      chrome.tabs.get(tabId, function (tab) {
        if (chrome.runtime.lastError || !tab || !tab.url) {
          resolve();
          return;
        }
        var key = pageKeyFromUrl(tab.url);
        var isDefault =
          settings.rotate === 0 &&
          settings.top === 0 &&
          settings.left === 0 &&
          settings.scale === 100 &&
          settings.scaleX === 100 &&
          settings.scaleY === 100;
        if (isDefault) {
          chrome.storage.local.remove(key, resolve);
        } else {
          chrome.storage.local.set({ [key]: settings }, resolve);
        }
      });
    });
  }

  function scheduleSave(settings) {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      persist(settings);
    }, 120);
  }

  async function apply(settings, options) {
    options = options || {};
    var payload = {
      type: options.previewOnly ? "rv-preview" : "rv-apply",
      settings: settings,
      autoFit: !!options.autoFit,
    };
    var response = await sendToTab(payload);
    if (response && response.settings) {
      state = Object.assign({}, response.settings);
      syncInputs();
      if (!options.previewOnly) scheduleSave(state);
      showNoVideo(response.hasVideo === false);
      return state;
    }

    state = Object.assign({}, settings);
    if (options.autoFit && !options.previewOnly) {
      state.top = 0;
      state.left = 0;
    }
    syncInputs();
    if (!options.previewOnly) scheduleSave(state);
    return state;
  }

  function readFieldBounds(key) {
    if (key === "rotate") return { min: 0, max: 360 };
    if (key === "top" || key === "left") return { min: -600, max: 600 };
    if (key === "scale") return { min: 1, max: 400 };
    return { min: -400, max: 400 };
  }

  function bindField(field) {
    var range = $(field.range);
    var number = $(field.number);
    if (!range || !number) return;
    var bounds = readFieldBounds(field.key);

    function onChange(raw, previewOnly) {
      var next = Object.assign({}, state);
      next[field.key] = clamp(raw, bounds.min, bounds.max);
      if (field.key === "scaleX" || field.key === "scaleY") {
        if (next[field.key] === 0)
          next[field.key] = next[field.key] < 0 ? -1 : 1;
      }
      apply(next, { previewOnly: previewOnly, autoFit: false });
    }

    range.addEventListener("input", function () {
      onChange(range.value, true);
    });
    range.addEventListener("change", function () {
      onChange(range.value, false);
    });
    number.addEventListener("change", function () {
      onChange(number.value, false);
    });
  }

  function rotateBy(delta) {
    var rotate = (state.rotate + delta) % 360;
    if (rotate < 0) rotate += 360;
    return apply(Object.assign({}, state, { rotate: rotate }), {
      autoFit: true,
    });
  }

  function rotateTo(target) {
    var angle = Number(target) % 360;
    if (angle < 0) angle += 360;
    return apply(Object.assign({}, state, { rotate: angle }), {
      autoFit: true,
    });
  }

  function toggleMirror() {
    var abs = Math.abs(Number(state.scaleX)) || 100;
    var next = Object.assign({}, state, {
      scaleX: state.scaleX < 0 ? abs : -abs,
    });
    return apply(next, { autoFit: false });
  }

  function resetAll() {
    return apply(
      {
        rotate: 0,
        top: 0,
        left: 0,
        scale: 100,
        scaleX: 100,
        scaleY: 100,
      },
      { autoFit: false },
    );
  }

  async function togglePip() {
    if (!tabId) return;
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tabId, allFrames: true },
        world: "MAIN",
        files: ["pip.js"],
      });
      window.close();
    } catch (_e) {
      showNoVideo(true);
    }
  }

  async function init() {
    applyI18n();
    fields.forEach(bindField);

    var btnPip = $("btn-pip");
    if (btnPip) {
      btnPip.addEventListener("click", function () {
        togglePip();
      });
    }

    var btnRight = $("btn-rotate-right");
    if (btnRight) {
      btnRight.addEventListener("click", function () {
        rotateBy(90);
      });
    }

    var btnLeft = $("btn-rotate-left");
    if (btnLeft) {
      btnLeft.addEventListener("click", function () {
        rotateBy(-90);
      });
    }

    var btnMirror = $("btn-mirror");
    if (btnMirror) {
      btnMirror.addEventListener("click", function () {
        toggleMirror();
      });
    }

    var btnReset = $("btn-reset");
    if (btnReset) {
      btnReset.addEventListener("click", function () {
        resetAll();
      });
    }

    document.querySelectorAll("[data-rotate-delta]").forEach(function (btn) {
      if (btn.id === "btn-rotate-right" || btn.id === "btn-rotate-left") return;
      btn.addEventListener("click", function () {
        rotateBy(Number(btn.getAttribute("data-rotate-delta")) || 0);
      });
    });

    document.querySelectorAll("[data-rotate-to]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        rotateTo(Number(btn.getAttribute("data-rotate-to")) || 0);
      });
    });

    var tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    var tab = tabs && tabs[0];
    if (
      !tab ||
      !tab.id ||
      !tab.url ||
      !(tab.url.startsWith("http://") || tab.url.startsWith("https://"))
    ) {
      showNoVideo(true);
      syncInputs();
      return;
    }

    tabId = tab.id;

    var response = await sendToTab({ type: "rv-get-state" });
    if (!response) {
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tabId },
          files: ["rotate.js", "content.js"],
        });
        response = await sendToTab({ type: "rv-get-state" });
      } catch (_e) {
        showNoVideo(true);
        syncInputs();
        return;
      }
    }

    if (response && response.settings) {
      state = Object.assign({}, response.settings);
      showNoVideo(response.hasVideo === false);
    } else {
      showNoVideo(true);
    }
    syncInputs();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
