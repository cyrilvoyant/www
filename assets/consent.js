/* Audience measurement with consent (www.cyrilvoyant.com). Google Analytics 4 is loaded ONLY after the visitor accepts;
   refusing loads nothing. The choice is kept in this browser and can be changed from the footer link "Cookies".
   GA4 stream: the same as the former Google Sites site (G-846NVY80ZR), so that the series of visits continues. */
(function () {
  var GA_ID = "G-846NVY80ZR";
  var KEY = "cv-consent";
  var fr = (document.documentElement.lang || "en").indexOf("fr") === 0;
  var T = fr ? {
    text: "Ce site mesure son audience avec Google Analytics, uniquement si vous l'acceptez. Aucune donnée n'est utilisée à des fins publicitaires.",
    accept: "Accepter", refuse: "Refuser"
  } : {
    text: "This site measures its audience with Google Analytics, only if you accept. No data is used for advertising.",
    accept: "Accept", refuse: "Decline"
  };

  function get() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function set(v) { try { localStorage.setItem(KEY, v); } catch (e) { /* private mode: ask again next time */ } }

  var loaded = false;
  function loadGA() {
    if (loaded) return;
    loaded = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag("js", new Date());
    window.gtag("config", GA_ID, { allow_google_signals: false, allow_ad_personalization_signals: false });
    var s = document.createElement("script");
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtag/js?id=" + GA_ID;
    document.head.appendChild(s);
  }

  function clearGA() {   // a later refusal removes the Analytics cookies already set
    document.cookie.split(";").forEach(function (c) {
      var name = c.split("=")[0].trim();
      if (name.indexOf("_ga") === 0) {
        ["", "; domain=.cyrilvoyant.com", "; domain=www.cyrilvoyant.com"].forEach(function (dom) {
          document.cookie = name + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/" + dom;
        });
      }
    });
  }

  function banner() {
    if (document.getElementById("consent")) return;
    var d = document.createElement("div");
    d.id = "consent";
    d.setAttribute("role", "dialog");
    d.setAttribute("aria-live", "polite");
    d.innerHTML = '<p>' + T.text + '</p><div class="consent-btns">' +
      '<button type="button" data-v="denied">' + T.refuse + '</button>' +
      '<button type="button" data-v="granted" class="primary">' + T.accept + '</button></div>';
    d.addEventListener("click", function (e) {
      var v = e.target.getAttribute && e.target.getAttribute("data-v");
      if (!v) return;
      set(v);
      d.remove();
      if (v === "granted") loadGA();
      else clearGA();
    });
    document.body.appendChild(d);
  }

  var c = get();
  if (c === "granted") loadGA();
  else if (c !== "denied") banner();

  document.addEventListener("click", function (e) {
    if (e.target.closest && e.target.closest("[data-consent-open]")) {
      e.preventDefault();
      banner();
    }
  });
})();
