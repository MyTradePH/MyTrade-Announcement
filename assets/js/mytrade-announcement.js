/*
 * MyTrade Announcement Popup
 * Vanilla JS, no dependencies. Works with legacy DOM APIs so it degrades
 * gracefully across browsers (feature-detects localStorage, uses
 * addEventListener universally supported since IE9+).
 */
(function (window, document) {
  "use strict";

  var STORAGE_KEY = "mta_announcement_dismissed";

  function hasStorage() {
    try {
      var testKey = "__mta_test__";
      window.localStorage.setItem(testKey, "1");
      window.localStorage.removeItem(testKey);
      return true;
    } catch (e) {
      return false;
    }
  }

  var storageAvailable = hasStorage();

  function getDismissedFlag() {
    if (!storageAvailable) return false;
    try {
      return window.localStorage.getItem(STORAGE_KEY) === "1";
    } catch (e) {
      return false;
    }
  }

  function setDismissedFlag() {
    if (!storageAvailable) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch (e) {
      /* ignore write failures (private browsing, quota, etc.) */
    }
  }

  function getFocusable(container) {
    var selector =
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';
    var nodes = container.querySelectorAll(selector);
    return Array.prototype.filter.call(nodes, function (el) {
      return el.offsetWidth > 0 || el.offsetHeight > 0 || el === document.activeElement;
    });
  }

  function buildVideoEmbed(url) {
    if (!url) return null;

    var isDirectFile = /\.(mp4|webm|ogg)(\?.*)?$/i.test(url);

    if (isDirectFile) {
      var video = document.createElement("video");
      video.setAttribute("controls", "");
      video.setAttribute("playsinline", "");
      video.src = url;
      return video;
    }

    var iframe = document.createElement("iframe");
    iframe.src = url;
    iframe.setAttribute("allow", "accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture");
    iframe.setAttribute("allowfullscreen", "");
    iframe.setAttribute("frameborder", "0");
    iframe.setAttribute("title", "MyTrade platform transition video");
    return iframe;
  }

  function MyTradeAnnouncement(options) {
    options = options || {};

    this.overlay = typeof options.overlay === "string"
      ? document.querySelector(options.overlay)
      : options.overlay || document.getElementById("mytrade-announcement-overlay");

    if (!this.overlay) return;

    this.modal = this.overlay.querySelector(".mta-modal");
    this.closeBtn = this.overlay.querySelector(".mta-close");
    this.acknowledgeBtn = this.overlay.querySelector("#mta-acknowledge");
    this.dontShowCheckbox = this.overlay.querySelector("#mta-dont-show");
    this.videoTrigger = this.overlay.querySelector(".mta-btn--video");
    this.videoFrame = this.overlay.querySelector(".mta-video-frame");
    this.videoUrl = options.videoUrl || (this.videoTrigger && this.videoTrigger.getAttribute("data-video-url"));
    this.forceShow = !!options.forceShow;
    this.lastFocused = null;

    this._onKeydown = this._onKeydown.bind(this);
    this._onOverlayClick = this._onOverlayClick.bind(this);

    this._bindEvents();

    if (this.forceShow || !getDismissedFlag()) {
      this.show();
    }
  }

  MyTradeAnnouncement.prototype._bindEvents = function () {
    var self = this;

    if (this.closeBtn) {
      this.closeBtn.addEventListener("click", function () {
        self.hide();
      });
    }

    if (this.acknowledgeBtn) {
      this.acknowledgeBtn.addEventListener("click", function () {
        self.hide();
      });
    }

    if (this.videoTrigger && this.videoFrame) {
      this.videoTrigger.addEventListener("click", function (event) {
        event.preventDefault();
        self._playVideo();
      });
    }

    this.overlay.addEventListener("mousedown", this._onOverlayClick);
  };

  MyTradeAnnouncement.prototype._onOverlayClick = function (event) {
    if (event.target === this.overlay) {
      this.modal.focus();
    }
  };

  MyTradeAnnouncement.prototype._playVideo = function () {
    if (!this.videoUrl || this.videoFrame.getAttribute("data-loaded") === "1") {
      this.videoFrame.hidden = false;
      return;
    }

    var embed = buildVideoEmbed(this.videoUrl);
    if (!embed) return;

    this.videoFrame.appendChild(embed);
    this.videoFrame.setAttribute("data-loaded", "1");
    this.videoFrame.hidden = false;
  };

  MyTradeAnnouncement.prototype._onKeydown = function (event) {
    var key = event.key || event.keyCode;

    if (key === "Escape" || key === "Esc" || key === 27) {
      this.hide();
      return;
    }

    if (key === "Tab" || key === 9) {
      this._trapFocus(event);
    }
  };

  MyTradeAnnouncement.prototype._trapFocus = function (event) {
    var focusable = getFocusable(this.modal);
    if (!focusable.length) return;

    var first = focusable[0];
    var last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  MyTradeAnnouncement.prototype.show = function () {
    this.lastFocused = document.activeElement;

    this.overlay.hidden = false;
    document.documentElement.className += " mta-scroll-lock";
    document.body.className += " mta-scroll-lock";

    var self = this;
    window.setTimeout(function () {
      self.overlay.className += " mta-is-open";
      var focusable = getFocusable(self.modal);
      (focusable[0] || self.modal).focus();
    }, 10);

    document.addEventListener("keydown", this._onKeydown);
  };

  MyTradeAnnouncement.prototype.hide = function () {
    if (this.dontShowCheckbox && this.dontShowCheckbox.checked) {
      setDismissedFlag();
    }

    this.overlay.className = this.overlay.className.replace(/\s*mta-is-open\b/g, "");
    document.documentElement.className = document.documentElement.className.replace(/\s*mta-scroll-lock\b/g, "");
    document.body.className = document.body.className.replace(/\s*mta-scroll-lock\b/g, "");
    document.removeEventListener("keydown", this._onKeydown);

    var self = this;
    window.setTimeout(function () {
      self.overlay.hidden = true;
      if (self.lastFocused && typeof self.lastFocused.focus === "function") {
        self.lastFocused.focus();
      }
    }, 250);
  };

  window.MyTradeAnnouncement = MyTradeAnnouncement;

  document.addEventListener("DOMContentLoaded", function () {
    var overlay = document.getElementById("mytrade-announcement-overlay");
    if (overlay && !overlay.getAttribute("data-manual-init")) {
      window.mytradeAnnouncementInstance = new MyTradeAnnouncement();
    }
  });
})(window, document);
