(function () {
  var ENDPOINT =
    (typeof window.__ANALYTICS_ENDPOINT__ === "string" && window.__ANALYTICS_ENDPOINT__) ||
    "/api/collect";

  var VID = "_va_vid";
  var SID = "_va_sid";

  function uuid() {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0;
      var v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  function getVisitorId() {
    try {
      var id = localStorage.getItem(VID);
      if (!id) {
        id = uuid();
        localStorage.setItem(VID, id);
      }
      return id;
    } catch {
      return uuid();
    }
  }

  function getSessionId() {
    try {
      var id = sessionStorage.getItem(SID);
      if (!id) {
        id = uuid();
        sessionStorage.setItem(SID, id);
      }
      return id;
    } catch {
      return uuid();
    }
  }

  var visitorId = getVisitorId();
  var sessionId = getSessionId();
  var pageStart = Date.now();
  var path = typeof location.pathname === "string" ? location.pathname + (location.search || "") : "/";

  function post(payload) {
    var body = JSON.stringify(payload);
    if (navigator.sendBeacon) {
      var ok = navigator.sendBeacon(
        ENDPOINT,
        new Blob([body], { type: "application/json" })
      );
      if (ok) return;
    }
    fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body,
      keepalive: true,
    }).catch(function () {});
  }

  post({
    type: "pageview",
    path: path,
    referrer: document.referrer || "",
    title: document.title || "",
    visitorId: visitorId,
    sessionId: sessionId,
  });

  function sendTimeOnPage() {
    var sec = Math.round((Date.now() - pageStart) / 1000);
    if (sec < 1) return;
    post({
      type: "time",
      path: path,
      seconds: sec,
      visitorId: visitorId,
      sessionId: sessionId,
    });
    pageStart = Date.now();
  }

  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "hidden") sendTimeOnPage();
  });
  window.addEventListener("pagehide", sendTimeOnPage);
})();
