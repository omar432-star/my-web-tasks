(function () {
  const ENDPOINT = "/api/collect";
  
  const id = () => Math.random().toString(36).substring(2, 15);
  const vId = localStorage.getItem("_v_id") || id();
  localStorage.setItem("_v_id", vId);
  const sId = sessionStorage.getItem("_s_id") || id();
  sessionStorage.setItem("_s_id", sId);

  const send = (data) => {
    fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, visitorId: vId, sessionId: sId, path: location.pathname }),
      keepalive: true
    }).catch(() => {});
  };

  send({ type: "pageview" });
})();
