/* global window, document */
(function (global) {
  "use strict";

  var STYLE_ID = "rv-rotate-style";
  var CLASS_NAME = "rv-rotate-target";
  var DEFAULTS = {
    rotate: 0,
    top: 0,
    left: 0,
    scale: 100,
    scaleX: 100,
    scaleY: 100,
  };

  function pageKey(url) {
    var u = new URL(url || location.href);
    return u.origin + u.pathname + u.search;
  }

  function normalizeSettings(input) {
    var s = input || {};
    return {
      rotate: Number(s.rotate) || 0,
      top: Number(s.top) || 0,
      left: Number(s.left) || 0,
      scale: s.scale == null ? 100 : Number(s.scale),
      scaleX: s.scaleX == null ? 100 : Number(s.scaleX),
      scaleY: s.scaleY == null ? 100 : Number(s.scaleY),
    };
  }

  function isDefault(settings) {
    var s = normalizeSettings(settings);
    return (
      s.rotate === 0 &&
      s.top === 0 &&
      s.left === 0 &&
      s.scale === 100 &&
      s.scaleX === 100 &&
      s.scaleY === 100
    );
  }

  function isYouTube() {
    return /(^|\.)youtube\.com$|(^|\.)youtu\.be$/i.test(location.hostname);
  }

  function isDailymotion() {
    return /(^|\.)dailymotion\.com$/i.test(location.hostname);
  }

  function pickLargestVideo() {
    var videos = document.getElementsByTagName("video");
    var best = null;
    var bestArea = 0;
    for (var i = 0; i < videos.length; i++) {
      var v = videos[i];
      var rect = v.getBoundingClientRect();
      var area = Math.max(0, rect.width) * Math.max(0, rect.height);
      if (area > bestArea) {
        bestArea = area;
        best = v;
      }
    }
    return best;
  }

  function findTarget() {
    if (isYouTube()) {
      var player = document.getElementById("player");
      if (player) return player;
      var movie = document.getElementById("movie_player");
      if (movie) return movie;
    }
    if (isDailymotion()) {
      var wrap = document.getElementById("player-wrapper");
      if (wrap) return wrap;
    }
    return pickLargestVideo();
  }

  function findContainer(target) {
    if (!target) return null;
    if (isYouTube()) {
      var movie = document.getElementById("movie_player");
      if (movie) return movie;
      var player = document.getElementById("player");
      if (player && player !== target) return player;
    }
    var parent = target.parentElement;
    if (parent) return parent;
    return target;
  }

  function clearTargets() {
    var nodes = document.querySelectorAll("." + CLASS_NAME);
    for (var i = 0; i < nodes.length; i++) {
      nodes[i].classList.remove(CLASS_NAME);
    }
    var style = document.getElementById(STYLE_ID);
    if (style && style.parentNode) {
      style.parentNode.removeChild(style);
    }
  }

  function ensureSiteTweaks(target) {
    if (isYouTube()) {
      var movie = document.getElementById("movie_player");
      if (movie) {
        movie.style.zIndex = "1001";
        movie.style.position = "relative";
      }
      var api = document.getElementById("player-api");
      if (api) api.style.setProperty("overflow", "visible", "important");
      if (target) {
        target.style.zIndex = "1001";
      }
    } else if (/(^|\.)vimeo\.com$/i.test(location.hostname)) {
      var wrappers = document.getElementsByClassName("vp-video-wrapper");
      for (var i = 0; i < wrappers.length; i++) {
        wrappers[i].style.overflow = "visible";
      }
    }
  }

  function measureSize(el) {
    var prev = el.style.transform;
    el.style.transform = "none";
    var w = el.clientWidth;
    var h = el.clientHeight;
    if (!w || !h) {
      var rect = el.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
    }
    el.style.transform = prev;
    return { width: w, height: h };
  }

  function computeFitScale(target, rotateDeg) {
    if (!target) return 100;
    var size = measureSize(target);
    var w = size.width;
    var h = size.height;
    if (!w || !h) return 100;

    var container = findContainer(target);
    var crect = container.getBoundingClientRect();
    var cw = crect.width;
    var ch = crect.height;
    if (!cw || !ch) return 100;

    var rad = (Number(rotateDeg) * Math.PI) / 180;
    var cos = Math.abs(Math.cos(rad));
    var sin = Math.abs(Math.sin(rad));
    var rotW = cos * w + sin * h;
    var rotH = sin * w + cos * h;
    if (!rotW || !rotH) return 100;

    var fit = Math.min(cw / rotW, ch / rotH);
    return Math.max(1, Math.min(600, Math.round(fit * 100)));
  }

  function withAutoFit(settings) {
    var s = normalizeSettings(settings);
    var target = findTarget();
    if (!target) return s;
    s.scale = computeFitScale(target, s.rotate);
    s.top = 0;
    s.left = 0;
    return s;
  }

  function applyTransform(settings) {
    var s = normalizeSettings(settings);

    if (isDefault(s)) {
      clearTargets();
      return s;
    }

    var target = findTarget();
    if (!target) return s;

    ensureSiteTweaks(target);

    var styleEl = document.getElementById(STYLE_ID);
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = STYLE_ID;
      document.documentElement.appendChild(styleEl);
    }

    var transformValue =
      "rotate(" +
      s.rotate +
      "deg) scale(" +
      s.scale / 100 +
      ") translate(" +
      s.left +
      "px, " +
      s.top +
      "px) scaleX(" +
      s.scaleX / 100 +
      ") scaleY(" +
      s.scaleY / 100 +
      ")";

    var css =
      "." +
      CLASS_NAME +
      "{transform:" +
      transformValue +
      ";transform-origin:center center;}";

    while (styleEl.sheet && styleEl.sheet.cssRules.length > 0) {
      styleEl.sheet.deleteRule(0);
    }
    if (styleEl.sheet) {
      styleEl.sheet.insertRule(css, 0);
    } else {
      styleEl.textContent = css;
    }

    if (!target.classList.contains(CLASS_NAME)) {
      target.classList.add(CLASS_NAME);
    }

    return s;
  }

  global.RVRotate = {
    DEFAULTS: DEFAULTS,
    pageKey: pageKey,
    normalizeSettings: normalizeSettings,
    isDefault: isDefault,
    findTarget: findTarget,
    computeFitScale: computeFitScale,
    withAutoFit: withAutoFit,
    applyTransform: applyTransform,
    clearTargets: clearTargets,
    hasVideo: function () {
      if (isDailymotion()) {
        return !!document.querySelector(
          ".dailymotion-player, #player-wrapper, video",
        );
      }
      return !!findTarget();
    },
  };
})(typeof window !== "undefined" ? window : self);
