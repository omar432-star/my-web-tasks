(function () {
  const ENDPOINT = window.__ANALYTICS_ENDPOINT__ || "/api/collect";
  
  const getID = (key) => {
    try {
      let id = localStorage.getItem(key) || sessionStorage.getItem(key);
      if (!id) {
        id = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2);
        localStorage.setItem(key, id);
      }
      return id;
    } catch { return Math.random().toString(36).substring(2); }
  };

  const visitorId = getID("_v_id");
  const sessionId = getID("_s_id");
  let startTime = Date.now();

  const send = (data) => {
    const payload = JSON.stringify({ 
      ...data, 
      visitorId, 
      sessionId, 
      path: location.pathname + (location.search || "") 
    });
    
    if (navigator.sendBeacon) {
      navigator.sendBeacon(ENDPOINT, new Blob([payload], { type: "application/json" }));
    } else {
      fetch(ENDPOINT, { method: "POST", body: payload, keepalive: true, headers: { 'Content-Type': 'application/json' } }).catch(()=>{});
    }
  };

  send({ type: "pageview" });

  const sendDuration = () => {
    const secs = Math.round((Date.now() - startTime) / 1000);
    if (secs > 0) {
      send({ type: "time", seconds: Math.min(secs, 3600) });
    }
    startTime = Date.now();
  };

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") sendDuration();
    else startTime = Date.now();
  });
  window.addEventListener("pagehide", sendDuration);
})();
