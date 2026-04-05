/**
 * Google Analytics 4 — replace with your Measurement ID:
 * Google Analytics → Admin → Data streams → choose stream → Measurement ID (G-xxxxxxxxxx)
 */
(function () {
  var GA_MEASUREMENT_ID = "G-XXXXXXXXXX";

  if (!GA_MEASUREMENT_ID || GA_MEASUREMENT_ID.indexOf("XXXX") !== -1) {
    return;
  }

  var script = document.createElement("script");
  script.async = true;
  script.src =
    "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(GA_MEASUREMENT_ID);
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  function gtag() {
    window.dataLayer.push(arguments);
  }
  window.gtag = gtag;
  gtag("js", new Date());
  gtag("config", GA_MEASUREMENT_ID);
})();
