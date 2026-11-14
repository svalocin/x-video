/* Picture-in-Picture toggle — inject into page MAIN world */
(function () {
  "use strict";

  function findVideo() {
    var videos = Array.from(document.querySelectorAll("video"))
      .filter(function (v) {
        return v.readyState !== 0 && !v.disablePictureInPicture;
      })
      .sort(function (a, b) {
        var ra = a.getClientRects()[0] || { width: 0, height: 0 };
        var rb = b.getClientRects()[0] || { width: 0, height: 0 };
        return rb.width * rb.height - ra.width * ra.height;
      });
    return videos.length ? videos[0] : null;
  }

  async function requestPip(video) {
    await video.requestPictureInPicture();
    video.setAttribute("__pip__", "true");
    video.addEventListener(
      "leavepictureinpicture",
      function () {
        video.removeAttribute("__pip__");
      },
      { once: true },
    );
    new ResizeObserver(onResize).observe(video);
  }

  function onResize(entries, observer) {
    var video = entries[0].target;
    if (!document.querySelector("[__pip__]")) {
      observer.unobserve(video);
      return;
    }
    var next = findVideo();
    if (next && !next.hasAttribute("__pip__")) {
      observer.unobserve(video);
      requestPip(next);
    }
  }

  (async function () {
    var video = findVideo();
    if (!video) return;
    if (video.hasAttribute("__pip__")) {
      document.exitPictureInPicture();
      return;
    }
    await requestPip(video);
  })();
})();
