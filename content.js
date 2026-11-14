/* global chrome, RVRotate */
(function () {
  "use strict";

  if (window.__RV_CONTENT_LOADED__) return;
  window.__RV_CONTENT_LOADED__ = true;

  var currentKey = null;
  var applying = false;

  function getDefaults() {
    return Object.assign({}, RVRotate.DEFAULTS);
  }

  function loadAndApply() {
    var key = RVRotate.pageKey();
    currentKey = key;
    chrome.storage.local.get([key], function (result) {
      if (chrome.runtime.lastError) return;
      var settings = result[key]
        ? RVRotate.normalizeSettings(result[key])
        : getDefaults();
      applying = true;
      RVRotate.applyTransform(settings);
      applying = false;
    });
  }

  function saveSettings(settings) {
    var key = RVRotate.pageKey();
    currentKey = key;
    var normalized = RVRotate.normalizeSettings(settings);
    if (RVRotate.isDefault(normalized)) {
      chrome.storage.local.remove(key);
    } else {
      chrome.storage.local.set({ [key]: normalized });
    }
    return normalized;
  }

  function applyAndSave(settings, autoFit) {
    var next = RVRotate.normalizeSettings(settings);
    if (autoFit) {
      next = RVRotate.withAutoFit(next);
    }
    applying = true;
    RVRotate.applyTransform(next);
    applying = false;
    saveSettings(next);
    return next;
  }

  function onUrlMaybeChanged() {
    var key = RVRotate.pageKey();
    if (key === currentKey) return;
    RVRotate.clearTargets();
    loadAndApply();
  }

  function patchHistory() {
    var wrap = function (type) {
      var original = history[type];
      if (typeof original !== "function") return;
      history[type] = function () {
        var ret = original.apply(this, arguments);
        window.dispatchEvent(new Event("rv-locationchange"));
        return ret;
      };
    };
    wrap("pushState");
    wrap("replaceState");
    window.addEventListener("popstate", onUrlMaybeChanged);
    window.addEventListener("rv-locationchange", onUrlMaybeChanged);
  }

  chrome.runtime.onMessage.addListener(function (msg, _sender, sendResponse) {
    if (!msg || !msg.type) return;

    if (msg.type === "rv-get-state") {
      var key = RVRotate.pageKey();
      chrome.storage.local.get([key], function (result) {
        var settings = result[key]
          ? RVRotate.normalizeSettings(result[key])
          : getDefaults();
        sendResponse({
          ok: true,
          pageKey: key,
          hasVideo: RVRotate.hasVideo(),
          settings: settings,
        });
      });
      return true;
    }

    if (msg.type === "rv-apply") {
      var applied = applyAndSave(msg.settings, !!msg.autoFit);
      sendResponse({
        ok: true,
        settings: applied,
        hasVideo: RVRotate.hasVideo(),
      });
      return true;
    }

    if (msg.type === "rv-preview") {
      var preview = RVRotate.normalizeSettings(msg.settings);
      if (msg.autoFit) preview = RVRotate.withAutoFit(preview);
      RVRotate.applyTransform(preview);
      sendResponse({
        ok: true,
        settings: preview,
        hasVideo: RVRotate.hasVideo(),
      });
      return true;
    }

    if (msg.type === "rv-rotate-by") {
      var key2 = RVRotate.pageKey();
      chrome.storage.local.get([key2], function (result) {
        var cur = result[key2]
          ? RVRotate.normalizeSettings(result[key2])
          : getDefaults();
        var degree = Number(msg.degree) || 0;
        var next;
        if (degree === 0) {
          next = getDefaults();
        } else {
          var rot = (cur.rotate + degree) % 360;
          if (rot < 0) rot += 360;
          if (rot === 0) rot = 0;
          next = Object.assign({}, cur, { rotate: rot });
          next = RVRotate.withAutoFit(next);
        }
        applying = true;
        RVRotate.applyTransform(next);
        applying = false;
        saveSettings(next);
        sendResponse({ ok: true, settings: next });
      });
      return true;
    }

    if (msg.type === "rv-check-video") {
      sendResponse({ ok: true, hasVideo: RVRotate.hasVideo() });
      return true;
    }
  });

  chrome.storage.onChanged.addListener(function (changes, area) {
    if (area !== "local" || applying) return;
    var key = RVRotate.pageKey();
    if (!changes[key]) return;
    var change = changes[key];
    if (change.newValue) {
      RVRotate.applyTransform(change.newValue);
    } else {
      RVRotate.clearTargets();
    }
  });

  // Re-apply when SPA remounts player
  var observer = new MutationObserver(function () {
    if (!currentKey) return;
    chrome.storage.local.get([currentKey], function (result) {
      if (!result[currentKey]) return;
      var settings = RVRotate.normalizeSettings(result[currentKey]);
      if (RVRotate.isDefault(settings)) return;
      var target = RVRotate.findTarget();
      if (target && !target.classList.contains("rv-rotate-target")) {
        RVRotate.applyTransform(settings);
      }
    });
  });

  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
  } else {
    document.addEventListener("DOMContentLoaded", function () {
      observer.observe(document.body, { childList: true, subtree: true });
    });
  }

  patchHistory();
  loadAndApply();
})();
