/* Ram-Craft Client in-game overlay: mod menu (Right Shift), HUD mods with drag-to-move, cosmetics */
(function () {
  "use strict";
  var MODS_KEY = "astra.mods", COS_KEY = "astra.cosmetics";
  var DEFAULTS = {
    fps: true, cps: true, keystrokes: true, clock: false, session: false, memory: false, battery: false,
    crosshair: false, crosshairStyle: "plus", zoom: true, zoomKey: "KeyC", zoomLevel: 3,
    filter: false, brightness: 110, saturation: 115, fullscreenKey: true,
    afk: false, afkMinutes: 5, titleFlash: false,
    ping: true, players: false, date: false, stopwatch: false, stopwatchKey: "KeyJ", customText: false, customTextValue: "Ram-Craft Rams",
    breakReminder: false, breakMinutes: 30, hideHudKey: true, filterPreset: "custom",
    hudColor: "#ffffff", hudBg: 60, hudScale: 100, menuButton: true
  };
  var cfg = load(MODS_KEY, DEFAULTS), hudHidden = false;
  var cos = load(COS_KEY, { cape: "astra", username: "" });
  function load(k, d) { try { return Object.assign({}, d, JSON.parse(localStorage.getItem(k) || "{}")); } catch (e) { return Object.assign({}, d); } }
  function save() { try { localStorage.setItem(MODS_KEY, JSON.stringify(cfg)); } catch (e) {} }
  // true while the player is in the world (mouse captured); hotkeys only fire then, so typing in chat
  // or a sign never zooms or starts the stopwatch
  function inWorld() { return !!document.pointerLockElement; }
  var TOUCH = !!(window.matchMedia && matchMedia("(pointer: coarse)").matches);

  var ROOT = document.documentElement;
  var css = document.createElement("style");
  css.textContent = [
    ":root{--ac:#ffffff}",
    ".ah{position:fixed;z-index:99990;pointer-events:none;font:700 12px/1 'Inter',system-ui,sans-serif;color:#fff;transform-origin:top left;user-select:none;text-shadow:0 1px 0 rgba(0,0,0,.45)}",
    ".ah .pill{background:rgba(8,18,42,var(--hb));border-left:2px solid var(--ac);border-radius:0 6px 6px 0;padding:5px 9px;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,.18)}",
    ".ah.editing{pointer-events:auto;cursor:move;outline:1px dashed var(--ac);outline-offset:3px;border-radius:6px}",
    ".ks{display:grid;grid-template-columns:repeat(3,30px);gap:3px}",
    ".ks div{height:30px;display:grid;place-items:center;background:rgba(8,18,42,var(--hb));border-radius:5px;font-size:11px;transition:background .06s,color .06s}",
    ".ks div.on{background:var(--ac);color:#0a1a3c;text-shadow:none}",
    ".ks .w3{grid-column:span 3;height:14px}.ks .mb{font-size:9px}",
    "#ax-cross{position:fixed;left:50%;top:50%;z-index:99990;pointer-events:none;transform:translate(-50%,-50%);filter:drop-shadow(0 0 1px rgba(0,0,0,.8))}",
    "#ax-menu{position:fixed;inset:0;z-index:99999;display:none;background:rgba(2,6,16,.7);font:14px 'Inter',system-ui,sans-serif;color:#dfeaff}",
    "#ax-menu.open{display:grid;place-items:center;animation:axin .14s ease-out}",
    "@keyframes axin{from{opacity:0}to{opacity:1}}",
    "#ax-menu.edit{background:transparent;pointer-events:none}",
    "#ax-menu.edit .ax-win{display:none}",
    ".ax-win{width:min(900px,95vw);height:min(580px,90vh);display:grid;grid-template-columns:200px 1fr;background:linear-gradient(160deg,#0b1736,#060d22);border:1px solid rgba(111,143,214,.35);border-radius:14px;overflow:hidden;box-shadow:0 30px 80px rgba(0,0,0,.6)}",
    ".ax-side{background:rgba(3,8,24,.6);border-right:1px solid rgba(111,143,214,.2);padding:16px 10px;display:flex;flex-direction:column;gap:3px}",
    ".ax-logo{font:700 20px 'Silkscreen',monospace;color:#fff;padding:2px 10px 16px;letter-spacing:1px}",
    ".ax-logo small{font:600 10px 'Inter',system-ui;color:#8fa6d6;letter-spacing:.5px;display:block;margin-top:3px}",
    ".ax-side button{all:unset;cursor:pointer;padding:9px 12px;color:#b9c6e2;font-weight:600;border-radius:8px;display:flex;justify-content:space-between;align-items:center;transition:background .1s,color .1s}",
    ".ax-side button:hover{color:#fff;background:rgba(111,143,214,.14)}",
    ".ax-side button.on{color:#fff;background:#1f3d7c;box-shadow:inset 3px 0 0 var(--ac)}",
    ".ax-side button i{font-style:normal;font-size:11px;background:rgba(255,255,255,.12);border-radius:10px;padding:1px 7px;color:#dfe8ff}",
    ".ax-side .grow{flex:1}",
    ".ax-side .edit-btn{background:#1f3d7c;color:#fff;border:1px solid rgba(255,255,255,.6);justify-content:center;font-weight:800}",
    ".ax-side .edit-btn:hover{background:#2a4f9c}",
    ".ax-main{display:flex;flex-direction:column;min-height:0}",
    ".ax-top{display:flex;gap:10px;align-items:center;padding:14px 18px;border-bottom:1px solid rgba(111,143,214,.2)}",
    ".ax-top h3{font:700 16px 'Silkscreen',monospace;margin:0;flex:1;color:#fff}",
    ".ax-top input{all:unset;background:rgba(3,8,24,.7);border:1px solid rgba(111,143,214,.35);border-radius:8px;padding:7px 12px;width:200px;color:#fff}",
    ".ax-top input:focus{border-color:#8fa6d6}",
    ".ax-x{all:unset;cursor:pointer;width:30px;height:30px;display:grid;place-items:center;border-radius:8px;color:#b9c6e2;font-size:18px}",
    ".ax-x:hover{background:rgba(255,255,255,.1);color:#fff}",
    ".ax-body{flex:1;overflow:auto;padding:16px 18px;display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:10px;align-content:start;scrollbar-width:thin;scrollbar-color:#2a4686 transparent}",
    ".ax-mod{background:rgba(14,28,64,.7);border:1px solid rgba(111,143,214,.22);border-radius:10px;padding:12px 14px;display:flex;flex-direction:column;gap:8px;transition:border-color .12s,background .12s}",
    ".ax-mod:hover{border-color:rgba(143,166,214,.5)}",
    ".ax-mod.on{border-color:#6f8fd6;background:rgba(31,61,124,.45)}",
    ".ax-row{display:flex;align-items:center;gap:10px}",
    ".ax-row b{flex:1;color:#fff}",
    ".ax-cat{font:700 10px 'Inter',system-ui;letter-spacing:.8px;text-transform:uppercase;color:#8fa6d6}",
    ".ax-mod small{color:#a9b7d6;line-height:1.4}",
    ".ax-tog{all:unset;cursor:pointer;width:38px;height:22px;border-radius:11px;background:#1a2b47;position:relative;flex:none;transition:background .12s}",
    ".ax-tog::after{content:'';position:absolute;top:3px;left:3px;width:16px;height:16px;border-radius:50%;background:#6d84a6;transition:left .12s,background .12s}",
    ".ax-tog.on{background:#3a6fe0}.ax-tog.on::after{left:19px;background:#fff}",
    ".ax-opt{display:flex;align-items:center;gap:8px;font-size:12px;color:#c3cfe8}",
    ".ax-opt>span:first-child{min-width:62px}",
    ".ax-opt select,.ax-opt input{flex:1;accent-color:#6f8fd6;min-width:0}",
    ".ax-opt select,.ax-opt input[type=text]{background:#050c22;color:#fff;border:1px solid #2a4686;border-radius:6px;padding:4px 6px}",
    ".ax-btn{all:unset;cursor:pointer;background:#1a2b47;color:#fff;border-radius:8px;padding:7px 12px;font-weight:700;font-size:12px;text-align:center}",
    ".ax-btn:hover{background:#2a4686}",
    ".ax-sw{all:unset;cursor:pointer;width:24px;height:24px;border-radius:50%;border:2px solid rgba(255,255,255,.15)}",
    ".ax-sw.on{border-color:#fff;box-shadow:0 0 0 2px #1f3d7c}",
    ".ax-cape{all:unset;cursor:pointer;background:rgba(14,28,64,.7);border:1px solid rgba(111,143,214,.22);border-radius:10px;padding:12px;display:flex;flex-direction:column;align-items:center;gap:6px}",
    ".ax-cape:hover{border-color:rgba(143,166,214,.5)}",
    ".ax-cape.on{border-color:var(--ac);background:rgba(31,61,124,.45)}",
    ".ax-cape canvas{image-rendering:pixelated;width:44px;height:68px}",
    ".ax-note{grid-column:1/-1;background:rgba(31,61,124,.35);border-left:3px solid var(--ac);border-radius:0 8px 8px 0;padding:10px 12px;color:#bcd0ee;font-size:13px}",
    ".ax-empty{grid-column:1/-1;text-align:center;color:#8fa6d6;padding:30px}",
    ".ax-foot{padding:9px 18px;border-top:1px solid rgba(111,143,214,.2);font-size:11px;color:#8fa6d6;display:flex;gap:16px;flex-wrap:wrap}",
    ".ax-foot b{color:#dfe8ff}",
    ".ax-editbar{position:fixed;left:50%;top:14px;transform:translateX(-50%);z-index:100000;background:#071026;border:1px solid var(--ac);border-radius:10px;padding:8px 14px;font:600 13px 'Inter',system-ui;color:#fff;display:none;gap:12px;align-items:center;pointer-events:auto;box-shadow:0 10px 30px rgba(0,0,0,.5)}",
    ".ax-editbar button{all:unset;cursor:pointer;background:var(--ac);color:#031026;padding:5px 12px;border-radius:6px;font-weight:800}",
    "#ax-fab{all:unset;position:fixed;right:10px;bottom:10px;z-index:99991;display:none;cursor:pointer;background:rgba(31,61,124,.9);color:#fff;border:1px solid rgba(255,255,255,.5);border-radius:8px;padding:6px 11px;font:700 12px 'Inter',system-ui;box-shadow:0 4px 14px rgba(0,0,0,.4)}",
    "#ax-fab:hover{background:#2a4f9c}",
    "#ax-toast{position:fixed;left:50%;bottom:70px;transform:translateX(-50%);z-index:99995;display:none;background:rgba(31,61,124,.95);color:#fff;border:1px solid rgba(255,255,255,.6);border-radius:10px;padding:10px 16px;font:700 14px 'Inter',system-ui,sans-serif;pointer-events:none;box-shadow:0 10px 30px rgba(0,0,0,.5)}"
  ].join("");
  ROOT.appendChild(css);

  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }

  /* ---------------- toast ---------------- */
  var toastEl = el("div"); toastEl.id = "ax-toast"; ROOT.appendChild(toastEl);
  var toastTimer = 0;
  function toast(text, ms) {
    toastEl.textContent = text; toastEl.style.display = "block";
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { toastEl.style.display = "none"; }, ms || 3000);
  }

  /* ---------------- HUD elements ---------------- */
  // Elements the player has not dragged stack down the top-left corner in this order, with no gaps.
  var ORDER = ["fps", "cps", "ping", "players", "clock", "date", "session", "stopwatch", "memory", "battery", "customText", "keystrokes"];
  var hud = {};
  function hudEl(id, inner) {
    var d = el("div", "ah"); d.dataset.id = id; d.appendChild(inner); ROOT.appendChild(d); hud[id] = d; return d;
  }
  var pills = {};
  ORDER.forEach(function (id) { if (id !== "keystrokes") { pills[id] = el("div", "pill"); hudEl(id, pills[id]); } });

  var ks = el("div", "ks"), keyMap = {};
  function key(label, code, cls) { var d = el("div", cls || "", label); if (code) keyMap[code] = d; ks.appendChild(d); return d; }
  key("", null).style.visibility = "hidden"; key("W", "KeyW"); key("", null).style.visibility = "hidden";
  key("A", "KeyA"); key("S", "KeyS"); key("D", "KeyD");
  var lmb = key("LMB", null, "mb"), rmbSpacer = key("", null), rmb = key("RMB", null, "mb"); rmbSpacer.style.visibility = "hidden";
  key("", "Space", "w3");
  hudEl("keystrokes", ks);

  var cross = el("div"); cross.id = "ax-cross"; ROOT.appendChild(cross);
  var crossKey = "";

  function customPos(id) {
    var p = (cfg["pos_" + id] || "").split(",");
    return p.length === 2 ? [+p[0], +p[1]] : null;
  }
  function renderHud() {
    ROOT.style.setProperty("--ac", cfg.hudColor);
    ROOT.style.setProperty("--hb", (cfg.hudBg / 100).toFixed(2));
    var scale = cfg.hudScale / 100, y = 8;
    // only while playing (or with the mod menu open), so counters never cover the game's own menu buttons
    var live = inWorld() || menu.classList.contains("open") || TOUCH;
    ORDER.forEach(function (id) {
      var d = hud[id], show = cfg[id] && !hudHidden && live;
      d.style.display = show ? "block" : "none";
      d.style.transform = "scale(" + scale + ")";
      if (!show) return;
      var p = customPos(id), w = d.offsetWidth * scale, h = d.offsetHeight * scale;
      if (!p) { p = [8, y]; y += h + 5; }
      d.style.left = Math.max(0, Math.min(p[0], innerWidth - w)) + "px";
      d.style.top = Math.max(0, Math.min(p[1], innerHeight - h)) + "px";
    });
    var c = cfg.hudColor, s = cfg.crosshairStyle, k = s + c;
    cross.style.display = cfg.crosshair && !hudHidden ? "block" : "none";
    if (k !== crossKey) {
      crossKey = k;
      cross.innerHTML = s === "dot" ? '<div style="width:4px;height:4px;background:' + c + '"></div>'
        : s === "circle" ? '<div style="width:10px;height:10px;border:2px solid ' + c + ';border-radius:50%"></div>'
        : '<svg width="14" height="14" viewBox="0 0 14 14" shape-rendering="crispEdges"><rect x="6" y="0" width="2" height="14" fill="' + c + '"/><rect x="0" y="6" width="14" height="2" fill="' + c + '"/></svg>';
    }
    applyFilter();
  }

  /* ---------------- live values ---------------- */
  var swRunning = false, swStart = 0, swAcc = 0;
  var frames = 0, last = performance.now(), clicksL = [], clicksR = [], started = Date.now();
  (function loop(now) {
    frames++;
    if (now - last >= 500) { pills.fps.textContent = Math.round(frames * 1000 / (now - last)) + " FPS"; frames = 0; last = now; }
    var t = Date.now();
    while (clicksL.length && t - clicksL[0] > 1000) clicksL.shift();
    while (clicksR.length && t - clicksR[0] > 1000) clicksR.shift();
    pills.cps.textContent = clicksL.length + " | " + clicksR.length + " CPS";
    lmb.textContent = clicksL.length ? clicksL.length + " CPS" : "LMB";
    rmb.textContent = clicksR.length ? clicksR.length + " CPS" : "RMB";
    pills.clock.textContent = new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    var s = Math.floor((t - started) / 1000);
    pills.session.textContent = "Session " + Math.floor(s / 3600) + ":" + ("0" + Math.floor(s / 60) % 60).slice(-2) + ":" + ("0" + s % 60).slice(-2);
    pills.memory.textContent = performance.memory ? "RAM " + Math.round(performance.memory.usedJSHeapSize / 1048576) + " MB" : "RAM n/a";
    pills.date.textContent = new Date().toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
    var sw = swRunning ? swAcc + (t - swStart) : swAcc, ss = Math.floor(sw / 100);
    pills.stopwatch.textContent = (swRunning ? "▶ " : "⏸ ") + Math.floor(ss / 600) + ":" + ("0" + Math.floor(ss / 10) % 60).slice(-2) + "." + ss % 10;
    pills.customText.textContent = cfg.customTextValue || "Ram-Craft";
    requestAnimationFrame(loop);
  })(performance.now());
  /* ping: round trip to the Ram-Craft relay; players: who is on the Ram-Craft server */
  pills.ping.textContent = "Ping ..."; pills.players.textContent = "Ram-Craft ...";
  var pings = [];
  function measurePing() {
    if (!cfg.ping || document.hidden) return;
    var t0 = performance.now();
    fetch("https://ram-craft.net/?ping=" + Date.now(), { cache: "no-store", mode: "no-cors" })
      .then(function () {
        // average the last few samples so the number doesn't jump around
        pings.push(performance.now() - t0); if (pings.length > 4) pings.shift();
        var ms = Math.round(pings.reduce(function (a, b) { return a + b; }, 0) / pings.length);
        pills.ping.textContent = "Ping " + ms + " ms";
        pills.ping.style.color = ms < 120 ? "#9ff0b8" : ms < 250 ? "#ffe08a" : "#ff9a9a";
      })
      .catch(function () { pills.ping.textContent = "Ping offline"; pills.ping.style.color = "#ff9a9a"; });
  }
  function checkPlayers() {
    if (!cfg.players || document.hidden) return;
    fetch("https://map.ram-craft.net/status").then(function (r) { return r.json(); }).then(function (d) {
      pills.players.textContent = d.online && d.players ? "Ram-Craft " + d.players.online + "/" + d.players.max + " online" : "Ram-Craft offline";
    }).catch(function () {});
  }
  var wasPing = cfg.ping, wasPlayers = cfg.players;
  measurePing(); checkPlayers(); setInterval(measurePing, 5000); setInterval(checkPlayers, 60000);
  // refresh right away when one is switched on, instead of showing "..." until the next round
  setInterval(function () {
    if (cfg.ping && !wasPing) measurePing();
    if (cfg.players && !wasPlayers) checkPlayers();
    wasPing = cfg.ping; wasPlayers = cfg.players;
  }, 500);
  if (navigator.getBattery) navigator.getBattery().then(function (b) {
    function upd() { pills.battery.textContent = "Battery " + Math.round(b.level * 100) + "%" + (b.charging ? " +" : ""); }
    upd(); b.addEventListener("levelchange", upd); b.addEventListener("chargingchange", upd);
  }); else pills.battery.textContent = "Battery n/a";

  /* ---------------- input: keystrokes, CPS, zoom, fullscreen ---------------- */
  var zooming = false, zoomNow = cfg.zoomLevel;
  function gameCanvas() { var all = document.querySelectorAll("canvas"); for (var i = 0; i < all.length; i++) if (!menu.contains(all[i])) return all[i]; return null; }
  function setZoom(on) {
    var c = gameCanvas(); if (!c) return;
    zooming = on;
    if (on) zoomNow = cfg.zoomLevel;
    c.style.transition = "transform .12s ease-out";
    c.style.transformOrigin = "50% 50%";
    c.style.transform = on ? "scale(" + zoomNow + ")" : "";
    if (c.parentElement) c.parentElement.style.overflow = "hidden";
  }
  // scroll while zooming to zoom further in or out, without changing the hotbar slot
  addEventListener("wheel", function (e) {
    if (!zooming) return;
    e.preventDefault(); e.stopImmediatePropagation();
    zoomNow = Math.max(1.5, Math.min(10, zoomNow * (e.deltaY < 0 ? 1.15 : 1 / 1.15)));
    var c = gameCanvas(); if (c) c.style.transform = "scale(" + zoomNow + ")";
  }, { capture: true, passive: false });
  function applyFilter() {
    var c = gameCanvas(); if (!c) return;
    var P = { warm: " sepia(22%) hue-rotate(-8deg)", cool: " hue-rotate(12deg) saturate(110%)", vivid: " contrast(112%) saturate(140%)", night: " brightness(130%) contrast(90%)", gray: " grayscale(100%)" };
    var f = cfg.filter ? "brightness(" + cfg.brightness + "%) saturate(" + cfg.saturation + "%)" + (P[cfg.filterPreset] || "") : "";
    if (c.style.filter !== f) c.style.filter = f;
  }
  addEventListener("keydown", function (e) {
    if (keyMap[e.code]) keyMap[e.code].classList.add("on");
    if (menu.classList.contains("open")) return;
    if (cfg.hideHudKey && e.code === "F4" && !e.repeat) { hudHidden = !hudHidden; renderHud(); toast(hudHidden ? "HUD hidden (F4 to show)" : "HUD shown", 1500); }
    if (cfg.fullscreenKey && e.code === "F11") { e.preventDefault(); if (document.fullscreenElement) document.exitFullscreen(); else ROOT.requestFullscreen().catch(function () {}); }
    if (!inWorld()) return;
    if (cfg.zoom && e.code === cfg.zoomKey && !zooming) setZoom(true);
    if (cfg.stopwatch && e.code === cfg.stopwatchKey && !e.repeat) { if (swRunning) { swAcc += Date.now() - swStart; swRunning = false; } else if (e.shiftKey) { swAcc = 0; } else { swStart = Date.now(); swRunning = true; } }
  }, true);
  addEventListener("keyup", function (e) {
    if (keyMap[e.code]) keyMap[e.code].classList.remove("on");
    if (e.code === cfg.zoomKey && zooming) setZoom(false);
  }, true);
  addEventListener("blur", function () {
    Object.keys(keyMap).forEach(function (k) { keyMap[k].classList.remove("on"); });
    lmb.classList.remove("on"); rmb.classList.remove("on");
    if (zooming) setZoom(false);
  });
  document.addEventListener("pointerlockchange", function () { if (!inWorld() && zooming) setZoom(false); renderHud(); fabSync(); });
  addEventListener("mousedown", function (e) {
    if (e.button === 0) { lmb.classList.add("on"); clicksL.push(Date.now()); }
    if (e.button === 2) { rmb.classList.add("on"); clicksR.push(Date.now()); }
  }, true);
  addEventListener("mouseup", function (e) { if (e.button === 0) lmb.classList.remove("on"); if (e.button === 2) rmb.classList.remove("on"); }, true);
  addEventListener("resize", renderHud);

  /* ---------------- AFK alert + focus reminder ---------------- */
  var lastActivity = Date.now(), flashTimer = null, originalTitle = document.title, flashOn = false;
  ["keydown", "mousedown", "mousemove", "wheel"].forEach(function (t) {
    addEventListener(t, function () { lastActivity = Date.now(); }, true);
  });
  function startFlash(text) {
    if (flashTimer) return;
    originalTitle = document.title;
    flashTimer = setInterval(function () {
      flashOn = !flashOn;
      document.title = flashOn ? text : originalTitle;
    }, 1000);
  }
  function stopFlash() {
    if (!flashTimer) return;
    clearInterval(flashTimer); flashTimer = null;
    document.title = originalTitle;
  }
  var nextBreak = Date.now() + cfg.breakMinutes * 60000;
  setInterval(function () {
    if (!cfg.breakReminder) { nextBreak = Date.now() + cfg.breakMinutes * 60000; return; }
    if (Date.now() >= nextBreak) { toast("Time for a break! Stretch and rest your eyes.", 10000); startFlash("Take a break!"); setTimeout(stopFlash, 10000); nextBreak = Date.now() + cfg.breakMinutes * 60000; }
  }, 5000);
  setInterval(function () {
    if (cfg.afk && Date.now() - lastActivity > cfg.afkMinutes * 60000) startFlash("AFK - come back!");
    else if (!(cfg.titleFlash && document.hidden)) stopFlash();
  }, 2000);
  if (typeof document.hidden !== "undefined") {
    document.addEventListener("visibilitychange", function () {
      if (cfg.titleFlash && document.hidden) startFlash("Come back to Ram-Craft!");
      else if (!cfg.afk || Date.now() - lastActivity <= cfg.afkMinutes * 60000) stopFlash();
    });
  }

  /* ---------------- mod menu ---------------- */
  var MODS = [
    { id: "fps", name: "FPS Counter", cat: "HUD", desc: "Frames per second." },
    { id: "cps", name: "CPS Counter", cat: "HUD", desc: "Left and right clicks per second." },
    { id: "keystrokes", name: "Keystrokes", cat: "HUD", desc: "Shows WASD, mouse buttons and space." },
    { id: "clock", name: "Clock", cat: "HUD", desc: "Your local time." },
    { id: "session", name: "Session Timer", cat: "HUD", desc: "How long you've been playing." },
    { id: "memory", name: "Memory Usage", cat: "HUD", desc: "Browser memory used (Chrome/Edge)." },
    { id: "battery", name: "Battery", cat: "HUD", desc: "Battery level on laptops." },
    { id: "crosshair", name: "Custom Crosshair", cat: "Visual", desc: "Extra crosshair on top of the game.",
      opts: [["crosshairStyle", "Style", "select", [["plus", "Plus"], ["dot", "Dot"], ["circle", "Circle"]]]] },
    { id: "zoom", name: "Zoom", cat: "Visual", desc: "Hold a key to zoom in. Scroll while zooming to zoom further.",
      opts: [["zoomKey", "Key", "select", [["KeyC", "C"], ["KeyZ", "Z"], ["KeyV", "V"], ["AltLeft", "Left Alt"]]], ["zoomLevel", "Zoom", "range", [2, 6, 1]]] },
    { id: "filter", name: "Color Filter", cat: "Visual", desc: "Brighten colors or pick a look: warm, cool, vivid, night or grayscale.",
      opts: [["filterPreset", "Look", "select", [["custom", "Custom"], ["warm", "Warm"], ["cool", "Cool"], ["vivid", "Vivid"], ["night", "Night"], ["gray", "Grayscale"]]], ["brightness", "Brightness", "range", [60, 160, 5]], ["saturation", "Saturation", "range", [0, 200, 5]]] },
    { id: "fullscreenKey", name: "F11 Fullscreen", cat: "Utility", desc: "Press F11 to toggle fullscreen." },
    { id: "afk", name: "AFK Alert", cat: "Utility", desc: "Flashes the tab title if you go idle.",
      opts: [["afkMinutes", "Minutes", "range", [1, 30, 1]]] },
    { id: "titleFlash", name: "Focus Reminder", cat: "Utility", desc: "Flashes the tab title when you tab away." },
    { id: "ping", name: "Ping", cat: "HUD", desc: "Round trip to the Ram-Craft server relay, updated every 5 seconds." },
    { id: "players", name: "Ram-Craft Players", cat: "HUD", desc: "How many people are on the Ram-Craft server right now." },
    { id: "date", name: "Date", cat: "HUD", desc: "Today's date." },
    { id: "stopwatch", name: "Stopwatch", cat: "HUD", desc: "Press the key to start or pause. Shift + key resets.",
      opts: [["stopwatchKey", "Key", "select", [["KeyJ", "J"], ["KeyK", "K"], ["KeyH", "H"], ["F6", "F6"], ["F7", "F7"]]]] },
    { id: "customText", name: "Custom Text", cat: "HUD", desc: "Your own label on screen: name, team or message.",
      opts: [["customTextValue", "Text", "text"]] },
    { id: "breakReminder", name: "Break Reminder", cat: "Utility", desc: "Reminds you to take a break every few minutes.",
      opts: [["breakMinutes", "Minutes", "range", [10, 90, 5]]] },
    { id: "hideHudKey", name: "Hide HUD (F4)", cat: "Utility", desc: "Press F4 to hide or show every overlay at once." }
  ];
  var CATS = ["All", "HUD", "Visual", "Utility", "Cosmetics", "Settings"];
  function keyName(code) { return code.replace(/^Key/, "").replace("AltLeft", "Left Alt").replace("CapsLock", "Caps Lock"); }

  var menu = el("div"); menu.id = "ax-menu";
  var win = el("div", "ax-win");
  var side = el("div", "ax-side", '<div class="ax-logo">RAM-CRAFT<small>CLIENT 26.2</small></div>');
  var main = el("div", "ax-main");
  var top = el("div", "ax-top");
  var title = el("h3", "", "All mods");
  var search = el("input"); search.placeholder = "Search mods";
  var closeBtn = el("button", "ax-x", "✕"); closeBtn.title = "Close (Right Shift)";
  var body = el("div", "ax-body");
  var foot = el("div", "ax-foot", "<span><b>Right Shift</b> open / close</span><span><b>F4</b> hide HUD</span><span>HUD shows while you play</span>");
  top.appendChild(title); top.appendChild(search); top.appendChild(closeBtn); main.appendChild(top); main.appendChild(body); main.appendChild(foot);
  win.appendChild(side); win.appendChild(main); menu.appendChild(win);
  var editbar = el("div", "ax-editbar", "<span>Drag your HUD elements to move them</span>");
  var doneBtn = el("button", "", "Done"), resetBtn = el("button", "", "Reset");
  resetBtn.style.background = "#1a2b47"; resetBtn.style.color = "#fff";
  editbar.appendChild(resetBtn); editbar.appendChild(doneBtn);
  // small "Mods" button in the corner while the mouse is free (menus, chat), for keyboards without Right Shift
  var fab = el("button", "", "☰ Mods"); fab.id = "ax-fab"; fab.title = "Ram-Craft mods (Right Shift)";
  ROOT.appendChild(menu); ROOT.appendChild(editbar); ROOT.appendChild(fab);
  function loading() { var l = document.getElementById("loading_screen"); return !!(l && l.offsetParent); }
  function fabSync() { fab.style.display = cfg.menuButton && !loading() && !inWorld() && !menu.classList.contains("open") && gameCanvas() ? "block" : "none"; }
  fab.onclick = function () { setOpen(true); };
  closeBtn.onclick = function () { setOpen(false); };

  var cat = "All";
  CATS.forEach(function (c) {
    var b = el("button", ""); b.dataset.c = c;
    b.onclick = function () { cat = c; search.value = ""; draw(); };
    side.appendChild(b);
  });
  side.appendChild(el("div", "grow"));
  var editBtn = el("button", "edit-btn", "Edit HUD layout");
  editBtn.onclick = function () { setEdit(true); };
  side.appendChild(editBtn);
  search.oninput = function () { if (search.value && (cat === "Cosmetics" || cat === "Settings")) cat = "All"; draw(); };

  function toggle(k) {
    var t = el("button", "ax-tog" + (cfg[k] ? " on" : ""));
    t.onclick = function (e) { e.stopPropagation(); cfg[k] = !cfg[k]; save(); renderHud(); draw(); fabSync(); };
    return t;
  }
  function option(o) {
    var row = el("label", "ax-opt"), k = o[0];
    row.appendChild(el("span", "", o[1]));
    if (o[2] === "select") {
      var s = el("select");
      o[3].forEach(function (v) { var op = el("option", "", v[1]); op.value = v[0]; if (cfg[k] === v[0]) op.selected = true; s.appendChild(op); });
      s.onchange = function () { cfg[k] = s.value; save(); renderHud(); };
      row.appendChild(s);
    } else if (o[2] === "text") {
      var tx = el("input"); tx.type = "text"; tx.value = cfg[k] || ""; tx.maxLength = 40;
      tx.oninput = function () { cfg[k] = tx.value; save(); renderHud(); };
      row.appendChild(tx);
    } else {
      var r = el("input"); r.type = "range"; r.min = o[3][0]; r.max = o[3][1]; r.step = o[3][2]; r.value = cfg[k];
      var v = el("span", "", cfg[k]); v.style.minWidth = "26px"; v.style.textAlign = "right";
      r.oninput = function () { cfg[k] = +r.value; v.textContent = r.value; save(); renderHud(); };
      row.appendChild(r); row.appendChild(v);
    }
    return row;
  }

  function draw() {
    [].forEach.call(side.querySelectorAll("button[data-c]"), function (b) {
      var c = b.dataset.c;
      b.classList.toggle("on", c === cat);
      var list = MODS.filter(function (m) { return c === "All" || m.cat === c; });
      b.innerHTML = c + (list.length ? "<i>" + list.filter(function (m) { return cfg[m.id]; }).length + "/" + list.length + "</i>" : "");
    });
    body.innerHTML = "";
    var q = search.value.trim().toLowerCase();
    title.textContent = q ? "Search" : cat === "All" ? "All mods" : cat;
    if (cat === "Cosmetics") return drawCosmetics();
    if (cat === "Settings") return drawSettings();
    var list = MODS.filter(function (m) { return (cat === "All" || m.cat === cat) && (!q || (m.name + " " + m.desc).toLowerCase().indexOf(q) >= 0); });
    if (!list.length) body.appendChild(el("div", "ax-empty", "No mods match “" + q.replace(/</g, "&lt;") + "”"));
    list.forEach(function (m) {
      var card = el("div", "ax-mod" + (cfg[m.id] ? " on" : ""));
      card.appendChild(el("div", "ax-cat", m.cat));
      var row = el("div", "ax-row", "<b>" + m.name + "</b>");
      row.appendChild(toggle(m.id)); card.appendChild(row);
      card.appendChild(el("small", "", m.desc));
      if (m.opts && cfg[m.id]) m.opts.forEach(function (o) { card.appendChild(option(o)); });
      body.appendChild(card);
    });
  }

  function drawSettings() {
    var c1 = el("div", "ax-mod", "<b>Accent color</b>");
    var sw = el("div", "ax-row"); sw.style.flexWrap = "wrap";
    ["#ffffff", "#6f8fd6", "#4fb3ff", "#7c5cff", "#2ee6d6", "#3ddc97", "#ffcf4a", "#ff8a3d", "#ff5c8a"].forEach(function (col) {
      var b = el("button", "ax-sw" + (cfg.hudColor === col ? " on" : "")); b.style.background = col;
      b.onclick = function () { cfg.hudColor = col; save(); renderHud(); draw(); };
      sw.appendChild(b);
    });
    c1.appendChild(sw); body.appendChild(c1);
    var c2 = el("div", "ax-mod", "<b>HUD look</b>");
    c2.appendChild(option(["hudBg", "Background", "range", [0, 100, 5]]));
    c2.appendChild(option(["hudScale", "Size", "range", [60, 160, 10]]));
    body.appendChild(c2);
    var c3 = el("div", "ax-mod");
    var r3 = el("div", "ax-row", "<b>Mods button</b>"); r3.appendChild(toggle("menuButton")); c3.appendChild(r3);
    c3.appendChild(el("small", "", "Shows a Mods button in the corner when your mouse is free, for keyboards without Right Shift."));
    body.appendChild(c3);
    var c4 = el("div", "ax-mod", "<b>Reset</b><small>Put HUD elements back in the corner, or turn every mod back to how it started.</small>");
    var r4 = el("div", "ax-row");
    var b1 = el("button", "ax-btn", "Reset HUD positions"), b2 = el("button", "ax-btn", "Reset all mods");
    b1.onclick = function () { resetPositions(); toast("HUD positions reset", 1500); };
    b2.onclick = function () { if (!confirm("Turn every mod back to its default?")) return; Object.keys(cfg).forEach(function (k) { delete cfg[k]; }); Object.assign(cfg, DEFAULTS); save(); renderHud(); draw(); toast("Mods reset", 1500); };
    r4.appendChild(b1); r4.appendChild(b2); c4.appendChild(r4); body.appendChild(c4);
    body.appendChild(el("div", "ax-note", "Tip: use <b>Edit HUD layout</b> to drag each HUD element anywhere on screen. Elements you have not moved line up in the top-left corner."));
  }

  function drawCosmetics() {
    var capes = window.ASTRA_CAPES || [];
    body.appendChild(el("div", "ax-note", "Pick a cape here or in the Ram-Craft launcher. It's put on your player the next time you launch the game from Ram-Craft."));
    [{ id: "", name: "None" }].concat(capes).forEach(function (c) {
      var b = el("button", "ax-cape" + ((cos.cape || "") === c.id ? " on" : ""));
      var cv = el("canvas"); cv.width = 10; cv.height = 16;
      if (c.png) { var img = new Image(); img.onload = function () { var g = cv.getContext("2d"); g.imageSmoothingEnabled = false; g.drawImage(img, 1, 0, 10, 16, 0, 0, 10, 16); }; img.src = "data:image/png;base64," + c.png; }
      b.appendChild(cv); b.appendChild(el("span", "", c.name));
      b.onclick = function () { cos.cape = c.id; try { localStorage.setItem(COS_KEY, JSON.stringify(cos)); } catch (e) {} draw(); };
      body.appendChild(b);
    });
  }

  /* ---------------- HUD edit mode (drag) ---------------- */
  var dragging = null;
  function resetPositions() { ORDER.forEach(function (id) { delete cfg["pos_" + id]; }); save(); renderHud(); }
  function setEdit(on) {
    menu.classList.toggle("edit", on);
    editbar.style.display = on ? "flex" : "none";
    Object.keys(hud).forEach(function (id) { hud[id].classList.toggle("editing", on); });
  }
  doneBtn.onclick = function () { setEdit(false); };
  resetBtn.onclick = resetPositions;
  Object.keys(hud).forEach(function (id) {
    hud[id].addEventListener("mousedown", function (e) {
      if (!menu.classList.contains("edit")) return;
      e.stopPropagation(); e.preventDefault();
      var r = hud[id].getBoundingClientRect();
      dragging = { id: id, dx: e.clientX - r.left, dy: e.clientY - r.top };
    });
  });
  addEventListener("mousemove", function (e) {
    if (!dragging) return;
    var x = Math.max(0, Math.min(innerWidth - 20, e.clientX - dragging.dx)), y = Math.max(0, Math.min(innerHeight - 20, e.clientY - dragging.dy));
    cfg["pos_" + dragging.id] = Math.round(x) + "," + Math.round(y);
    renderHud();
  }, true);
  addEventListener("mouseup", function () { if (dragging) { dragging = null; save(); } }, true);

  /* ---------------- open / close ---------------- */
  function setOpen(open) {
    menu.classList.toggle("open", open);
    if (!open) setEdit(false);
    if (open) { if (document.exitPointerLock) document.exitPointerLock(); if (zooming) setZoom(false); draw(); }
    renderHud(); fabSync();
  }
  addEventListener("keydown", function (e) {
    if (e.code === "ShiftRight" || (e.key === "Shift" && e.location === 2)) {
      if (e.repeat) return;
      e.preventDefault(); e.stopImmediatePropagation(); setOpen(!menu.classList.contains("open"));
    } else if (menu.classList.contains("open")) {
      if (e.code === "Escape") { e.preventDefault(); if (menu.classList.contains("edit")) setEdit(false); else setOpen(false); }
      // keep keys away from the game while the menu is open, but let text fields type
      e.stopImmediatePropagation();
    }
  }, true);
  ["keyup", "keypress"].forEach(function (t) {
    addEventListener(t, function (e) { if (menu.classList.contains("open")) e.stopImmediatePropagation(); }, true);
  });
  ["mousedown", "mouseup", "click", "wheel", "contextmenu"].forEach(function (t) {
    [menu, editbar, fab].forEach(function (n) { n.addEventListener(t, function (e) { e.stopPropagation(); }, false); });
  });

  renderHud();
  // first few launches: tell people where the mods are
  try {
    var seen = +(localStorage.getItem("ladue.tipSeen") || 0);
    if (seen < 3) { localStorage.setItem("ladue.tipSeen", seen + 1); setTimeout(function () { toast("Press Right Shift for Ram-Craft mods", 5000); }, 8000); }
  } catch (e) {}
  // the game rebuilds the page on boot; keep our elements attached, filters applied and the stack tidy
  setInterval(function () {
    [css, cross, menu, editbar, fab, toastEl].concat(Object.keys(hud).map(function (k) { return hud[k]; })).forEach(function (n) { if (!n.isConnected) ROOT.appendChild(n); });
    renderHud(); fabSync();
  }, 1000);
})();
