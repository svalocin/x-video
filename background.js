/* global chrome */
"use strict";

function togglePip(tabId) {
  chrome.scripting.executeScript({
    target: { tabId: tabId, allFrames: true },
    world: "MAIN",
    files: ["pip.js"],
  });
}

chrome.commands.onCommand.addListener(function (command) {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    var tab = tabs && tabs[0];
    if (!tab || !tab.id) return;
    if (
      !tab.url ||
      !(tab.url.startsWith("http://") || tab.url.startsWith("https://"))
    ) {
      return;
    }

    if (command === "toggle-pip") {
      togglePip(tab.id);
      return;
    }

    var degree = null;
    if (command === "rotate-clockwise") degree = 90;
    else if (command === "rotate-counterclockwise") degree = -90;
    else if (command === "rotate-reset") degree = 0;
    else return;

    chrome.tabs.sendMessage(
      tab.id,
      { type: "rv-rotate-by", degree: degree },
      function () {
        void chrome.runtime.lastError;
      },
    );
  });
});
