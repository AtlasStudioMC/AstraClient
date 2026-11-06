/* Ladue Client in-game overlay: mod menu (Right Shift), HUD mods with drag-to-move, cosmetics */
(function () {
  "use strict";
  var MODS_KEY = "astra.mods", COS_KEY = "astra.cosmetics";
  var DEFAULTS = {
    fps: true, cps: true, keystrokes: true, clock: false, session: false, memory: false, battery: false,
    crosshair: false, crosshairStyle: "plus", zoom: true, zoomKey: "KeyC", zoomLevel: 3,
    filter: false, brightness: 110, saturation: 115, fullscreenKey: true,
    afk: false, afkMinutes: 5, titleFlash: false,
    ping: true, players: false, date: false, stopwatch: false, stopwatchKey: "KeyJ", customText: false, customTextValue: "Ladue Rams",
    breakReminder: false, breakMinutes: 30, hideHudKey: true, filterPreset: "custom",
    voice: false, voiceMode: "ptt", voiceKey: "KeyV", voiceVolume: 100,
    hudColor: "#ffffff", hudBg: 60, hudScale: 100
  };
  var cfg = load(MODS_KEY, DEFAULTS), hudHidden = false;
  var cos = load(COS_KEY, { cape: "astra", username: "" });
  function load(k, d) { try { return Object.assign({}, d, JSON.parse(localStorage.getItem(k) || "{}")); } catch (e) { return Object.assign({}, d); } }
  function save() { try { localStorage.setItem(MODS_KEY, JSON.stringify(cfg)); } catch (e) {} }

  var ROOT = document.documentElement;
  var css = document.createElement("style");
  css.textContent = [
    ":root{--ac:#ffffff}",
    ".ah{position:fixed;z-index:99990;pointer-events:none;font:700 12px/1 'Inter',system-ui,sans-serif;color:#fff;transform-origin:top left;user-select:none}",
    ".ah .pill{background:rgba(5,11,24,var(--hb));border-left:2px solid var(--ac);padding:5px 8px;white-space:nowrap}",
    ".ah.editing{pointer-events:auto;cursor:move;outline:1px dashed var(--ac);outline-offset:2px}",
    ".ks{display:grid;grid-template-columns:repeat(3,28px);gap:2px}",
    ".ks div{height:28px;display:grid;place-items:center;background:rgba(5,11,24,var(--hb));font-size:11px}",
    ".ks div.on{background:var(--ac);color:#031026}",
    ".ks .w3{grid-column:span 3;height:14px}.ks .w15{grid-column:span 1}",
    "#ax-cross{position:fixed;left:50%;top:50%;z-index:99990;pointer-events:none;transform:translate(-50%,-50%)}",
    "#ax-menu{position:fixed;inset:0;z-index:99999;display:none;background:rgba(2,6,16,.72);font:14px 'Inter',system-ui,sans-serif;color:#dfeaff}",
    "#ax-menu.open{display:grid;place-items:center}",
    "#ax-menu.edit{background:transparent;pointer-events:none}",
    "#ax-menu.edit .ax-win{display:none}",
    ".ax-win{width:min(860px,95vw);height:min(560px,90vh);display:grid;grid-template-columns:190px 1fr;background:#070e1d;border:2px solid #1c3357;box-shadow:0 0 0 2px #02060f,0 24px 60px rgba(0,0,0,.6)}",
    ".ax-side{background:#050a16;border-right:2px solid #13243f;padding:14px 10px;display:flex;flex-direction:column;gap:2px}",
    ".ax-logo{font:700 20px 'Silkscreen',monospace;color:var(--ac);padding:4px 8px 16px;letter-spacing:1px}",
    ".ax-side button{all:unset;cursor:pointer;padding:9px 10px;color:#8ea6c8;font-weight:600}",
    ".ax-side button:hover{color:#fff;background:#0d1a30}",
    ".ax-side button.on{color:#fff;background:#10213d;box-shadow:inset 2px 0 0 var(--ac)}",
    ".ax-side .grow{flex:1}",
    ".ax-side .edit-btn{background:var(--ac);color:#031026;text-align:center;font-weight:800}",
    ".ax-main{display:flex;flex-direction:column;min-height:0}",
    ".ax-top{display:flex;gap:10px;align-items:center;padding:12px 16px;border-bottom:2px solid #13243f}",
    ".ax-top h3{font:700 16px 'Silkscreen',monospace;margin:0;flex:1;color:#fff}",
    ".ax-top input{all:unset;background:#0b1528;border:2px solid #1c3357;padding:6px 10px;width:180px;color:#fff}",
    ".ax-body{overflow:auto;padding:14px 16px;display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:8px;align-content:start}",
    ".ax-mod{background:#0b1528;border:2px solid #16294a;padding:10px 12px;display:flex;flex-direction:column;gap:8px}",
    ".ax-mod.on{border-color:#24497d}",
    ".ax-row{display:flex;align-items:center;gap:10px}",
    ".ax-row b{flex:1;color:#fff}",
    ".ax-mod small{color:#7f98bb;line-height:1.35}",
    ".ax-tog{all:unset;cursor:pointer;width:38px;height:20px;background:#1a2b47;position:relative;flex:none}",
    ".ax-tog::after{content:'';position:absolute;top:3px;left:3px;width:14px;height:14px;background:#6d84a6}",
    ".ax-tog.on{background:var(--ac)}.ax-tog.on::after{left:21px;background:#031026}",
    ".ax-opt{display:flex;align-items:center;gap:8px;font-size:12px;color:#9fb4d3}",
    ".ax-opt select,.ax-opt input[type=range]{flex:1}",
    ".ax-opt select{background:#050a16;color:#fff;border:1px solid #1c3357;padding:3px}",
    ".ax-sw{all:unset;cursor:pointer;width:22px;height:22px;border:2px solid transparent}",
    ".ax-sw.on{border-color:#fff}",
    ".ax-cape{all:unset;cursor:pointer;background:#0b1528;border:2px solid #16294a;padding:10px;display:flex;flex-direction:column;align-items:center;gap:6px}",
    ".ax-cape.on{border-color:var(--ac)}",
    ".ax-cape canvas{image-rendering:pixelated;width:44px;height:68px}",
    ".ax-note{grid-column:1/-1;background:#0d1d36;border-left:3px solid var(--ac);padding:10px 12px;color:#bcd0ee;font-size:13px}",
    ".ax-editbar{position:fixed;left:50%;top:14px;transform:translateX(-50%);z-index:100000;background:#070e1d;border:2px solid var(--ac);padding:8px 14px;font:600 13px 'Inter',system-ui;color:#fff;display:none;gap:12px;align-items:center;pointer-events:auto}",
    ".ax-editbar button{all:unset;cursor:pointer;background:var(--ac);color:#031026;padding:4px 10px;font-weight:800}"
  ].join("");
  ROOT.appendChild(css);

  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }

  /* ---------------- HUD elements ---------------- */
  var DEFAULT_POS = { fps: [8, 8], cps: [8, 34], clock: [8, 60], session: [8, 86], memory: [8, 112], battery: [8, 138], keystrokes: [8, 170],
    ping: [8, 270], players: [8, 296], date: [8, 322], stopwatch: [8, 348], customText: [8, 374], voice: [8, 400] };
  var hud = {};
  function hudEl(id, inner) {
    var d = el("div", "ah"); d.dataset.id = id; d.appendChild(inner); ROOT.appendChild(d); hud[id] = d; return d;
  }
  var pills = {};
  ["fps", "cps", "clock", "session", "memory", "battery", "ping", "players", "date", "stopwatch", "customText", "voice"].forEach(function (id) { pills[id] = el("div", "pill"); hudEl(id, pills[id]); });

  var ks = el("div", "ks"), keyMap = {};
  function key(label, code, cls) { var d = el("div", cls || "", label); if (code) keyMap[code] = d; ks.appendChild(d); return d; }
  key("", null).style.visibility = "hidden"; key("W", "KeyW"); key("", null).style.visibility = "hidden";
  key("A", "KeyA"); key("S", "KeyS"); key("D", "KeyD");
  var lmb = key("LMB", null), rmbSpacer = key("", null), rmb = key("RMB", null); rmbSpacer.style.visibility = "hidden";
  key("", "Space", "w3");
  hudEl("keystrokes", ks);

  var cross = el("div"); cross.id = "ax-cross"; ROOT.appendChild(cross);

  function pos(id) {
    var p = (cfg["pos_" + id] || "").split(",");
    return p.length === 2 ? [+p[0], +p[1]] : DEFAULT_POS[id];
  }
  function renderHud() {
    ROOT.style.setProperty("--ac", cfg.hudColor);
    ROOT.style.setProperty("--hb", (cfg.hudBg / 100).toFixed(2));
    Object.keys(hud).forEach(function (id) {
      var d = hud[id], p = pos(id);
      d.style.display = cfg[id] && !hudHidden ? "block" : "none";
      d.style.left = Math.min(p[0], innerWidth - 20) + "px";
      d.style.top = Math.min(p[1], innerHeight - 20) + "px";
      d.style.transform = "scale(" + cfg.hudScale / 100 + ")";
    });
    var c = cfg.hudColor, s = cfg.crosshairStyle;
    cross.style.display = cfg.crosshair && !hudHidden ? "block" : "none";
    cross.innerHTML = s === "dot" ? '<div style="width:4px;height:4px;background:' + c + '"></div>'
      : s === "circle" ? '<div style="width:10px;height:10px;border:2px solid ' + c + ';border-radius:50%"></div>'
      : '<svg width="14" height="14" viewBox="0 0 14 14" shape-rendering="crispEdges"><rect x="6" y="0" width="2" height="14" fill="' + c + '"/><rect x="0" y="6" width="14" height="2" fill="' + c + '"/></svg>';
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
    pills.clock.textContent = new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    var s = Math.floor((t - started) / 1000);
    pills.session.textContent = "Session " + Math.floor(s / 3600) + ":" + ("0" + Math.floor(s / 60) % 60).slice(-2) + ":" + ("0" + s % 60).slice(-2);
    if (performance.memory) pills.memory.textContent = "RAM " + Math.round(performance.memory.usedJSHeapSize / 1048576) + " MB";
    else pills.memory.textContent = "RAM n/a";
    pills.date.textContent = new Date().toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
    var sw = swRunning ? swAcc + (t - swStart) : swAcc, ss = Math.floor(sw / 100);
    pills.stopwatch.textContent = (swRunning ? "\u25B6 " : "\u23F8 ") + Math.floor(ss / 600) + ":" + ("0" + Math.floor(ss / 10) % 60).slice(-2) + "." + ss % 10;
    pills.customText.textContent = cfg.customTextValue || "Ladue";
    requestAnimationFrame(loop);
  })(performance.now());
  /* ping: round trip to the Ladue relay; players: who is on the Ladue server */
  pills.ping.textContent = "Ping ..."; pills.players.textContent = "Ladue ...";
  function measurePing() {
    if (!cfg.ping) return;
    var t0 = performance.now();
    fetch("https://ladue.cc.cd/?ping=" + Date.now(), { cache: "no-store", mode: "no-cors" })
      .then(function () { pills.ping.textContent = "Ping " + Math.round(performance.now() - t0) + " ms"; })
      .catch(function () { pills.ping.textContent = "Ping offline"; });
  }
  function checkPlayers() {
    if (!cfg.players) return;
    fetch("https://api.mcsrvstat.us/3/ladue.cc.cd").then(function (r) { return r.json(); }).then(function (d) {
      pills.players.textContent = d.online && d.players ? "Ladue " + d.players.online + "/" + d.players.max + " online" : "Ladue offline";
    }).catch(function () {});
  }
  measurePing(); checkPlayers(); setInterval(measurePing, 5000); setInterval(checkPlayers, 60000);
  if (navigator.getBattery) navigator.getBattery().then(function (b) {
    function upd() { pills.battery.textContent = "Battery " + Math.round(b.level * 100) + "%" + (b.charging ? " +" : ""); }
    upd(); b.addEventListener("levelchange", upd); b.addEventListener("chargingchange", upd);
  }); else pills.battery.textContent = "Battery n/a";

  /* ---------------- input: keystrokes, CPS, zoom, fullscreen ---------------- */
  var zooming = false;
  function gameCanvas() { return document.querySelector("canvas"); }
  function setZoom(on) {
    var c = gameCanvas(); if (!c) return;
    zooming = on;
    c.style.transition = "transform .12s ease-out";
    c.style.transformOrigin = "50% 50%";
    c.style.transform = on ? "scale(" + cfg.zoomLevel + ")" : "";
    if (c.parentElement) c.parentElement.style.overflow = "hidden";
  }
  function applyFilter() {
    var c = gameCanvas(); if (!c) return;
    var P = { warm: " sepia(22%) hue-rotate(-8deg)", cool: " hue-rotate(12deg) saturate(110%)", vivid: " contrast(112%) saturate(140%)", night: " brightness(130%) contrast(90%)", gray: " grayscale(100%)" };
    c.style.filter = cfg.filter ? "brightness(" + cfg.brightness + "%) saturate(" + cfg.saturation + "%)" + (P[cfg.filterPreset] || "") : "";
  }
  addEventListener("keydown", function (e) {
    if (keyMap[e.code]) keyMap[e.code].classList.add("on");
    if (menu.classList.contains("open")) return;
    if (cfg.zoom && e.code === cfg.zoomKey && !zooming) setZoom(true);
    if (cfg.stopwatch && e.code === cfg.stopwatchKey && !e.repeat) { if (swRunning) { swAcc += Date.now() - swStart; swRunning = false; } else if (e.shiftKey) { swAcc = 0; } else { swStart = Date.now(); swRunning = true; } }
    if (cfg.hideHudKey && e.code === "F4" && !e.repeat) { hudHidden = !hudHidden; renderHud(); }
    if (cfg.fullscreenKey && e.code === "F11") { e.preventDefault(); if (document.fullscreenElement) document.exitFullscreen(); else ROOT.requestFullscreen().catch(function () {}); }
  }, true);
  addEventListener("keyup", function (e) {
    if (keyMap[e.code]) keyMap[e.code].classList.remove("on");
    if (e.code === cfg.zoomKey && zooming) setZoom(false);
  }, true);
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
  var breakToast = el("div"); breakToast.id = "ax-break"; breakToast.style.cssText = "position:fixed;left:50%;top:18px;transform:translateX(-50%);z-index:99995;display:none;background:#1f3d7c;color:#fff;border:2px solid #fff;padding:10px 16px;font:700 14px Inter,system-ui,sans-serif;pointer-events:none";
  breakToast.textContent = "Time for a break! Stretch and rest your eyes."; ROOT.appendChild(breakToast);
  var nextBreak = Date.now() + cfg.breakMinutes * 60000;
  setInterval(function () {
    if (!cfg.breakReminder) { nextBreak = Date.now() + cfg.breakMinutes * 60000; return; }
    if (Date.now() >= nextBreak) { breakToast.style.display = "block"; startFlash("Take a break!"); setTimeout(function () { breakToast.style.display = "none"; stopFlash(); }, 10000); nextBreak = Date.now() + cfg.breakMinutes * 60000; }
  }, 5000);
  setInterval(function () {
    if (cfg.afk && Date.now() - lastActivity > cfg.afkMinutes * 60000) startFlash("AFK - come back!");
    else if (!(cfg.titleFlash && document.hidden)) stopFlash();
  }, 2000);
  if (typeof document.hidden !== "undefined") {
    document.addEventListener("visibilitychange", function () {
      if (cfg.titleFlash && document.hidden) startFlash("Come back to Ladue!");
      else if (!cfg.afk || Date.now() - lastActivity <= cfg.afkMinutes * 60000) stopFlash();
    });
  }


  /* ---------------- voice chat ----------------
     One Ladue voice channel for everyone on the site. wss://ladue.cc.cd/voice only introduces
     players and passes WebRTC setup messages; audio goes straight between browsers. */
  var V = { ws: null, mic: null, peers: {}, names: {}, talking: {}, me: 0, held: false, status: "Voice off" };
  var ICE = [{ urls: "stun:stun.cloudflare.com:3478" }, { urls: "stun:stun.l.google.com:19302" }];
  function voiceName() {
    try { var u = localStorage.getItem("_eaglercraftX.username"); if (u) return atob(u); } catch (e) {}
    return cos.username || "Player";
  }
  function voiceHud() {
    if (!cfg.voice) return;
    var n = Object.keys(V.peers).length, who = Object.keys(V.talking).filter(function (id) { return V.talking[id]; }).map(function (id) { return V.names[id] || "?"; });
    var me = micLive() ? "\uD83C\uDF99 " : "";
    pills.voice.textContent = V.ws ? me + "Voice " + (n + 1) + " in channel" + (who.length ? " | " + who.join(", ") : "") : V.status;
  }
  function micLive() { return !!(V.mic && V.mic.getAudioTracks()[0] && V.mic.getAudioTracks()[0].enabled); }
  function setMic(on) {
    if (!V.mic) return;
    var was = micLive();
    V.mic.getAudioTracks().forEach(function (t) { t.enabled = on; });
    if (was !== on && V.ws && V.ws.readyState === 1) V.ws.send(JSON.stringify({ t: "talk", on: on }));
    voiceHud();
  }
  function peerConn(id, initiator) {
    var pc = new RTCPeerConnection({ iceServers: ICE });
    var audio = new Audio(); audio.autoplay = true; audio.volume = cfg.voiceVolume / 100;
    V.peers[id] = { pc: pc, audio: audio };
    V.mic.getTracks().forEach(function (t) { pc.addTrack(t, V.mic); });
    pc.ontrack = function (e) { audio.srcObject = e.streams[0]; audio.play().catch(function () {}); };
    pc.onicecandidate = function (e) { if (e.candidate) signal(id, { ice: e.candidate }); };
    pc.onconnectionstatechange = function () { if (pc.connectionState === "failed") dropPeer(id); };
    if (initiator) pc.createOffer().then(function (o) { return pc.setLocalDescription(o); }).then(function () { signal(id, { sdp: pc.localDescription }); });
    return V.peers[id];
  }
  function dropPeer(id) {
    var p = V.peers[id]; if (!p) return;
    try { p.pc.close(); } catch (e) {} p.audio.srcObject = null;
    delete V.peers[id]; delete V.talking[id]; voiceHud();
  }
  function signal(to, data) { if (V.ws && V.ws.readyState === 1) V.ws.send(JSON.stringify({ t: "signal", to: to, data: data })); }
  function onSignal(from, d) {
    var p = V.peers[from] || peerConn(from, false), pc = p.pc;
    if (d.sdp) {
      pc.setRemoteDescription(d.sdp).then(function () {
        if (d.sdp.type === "offer") return pc.createAnswer().then(function (a) { return pc.setLocalDescription(a); }).then(function () { signal(from, { sdp: pc.localDescription }); });
      }).catch(function (e) { console.warn("Ladue voice:", e); });
    } else if (d.ice) pc.addIceCandidate(d.ice).catch(function () {});
  }
  function voiceStart() {
    if (V.ws || V.starting) return;
    V.starting = true; V.status = "Voice: allow the microphone"; voiceHud();
    navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } }).then(function (stream) {
      V.starting = false;
      if (!cfg.voice) { stream.getTracks().forEach(function (t) { t.stop(); }); return; }
      V.mic = stream; setMic(cfg.voiceMode === "open");
      var ws = V.ws = new WebSocket("wss://ladue.cc.cd/voice?name=" + encodeURIComponent(voiceName()));
      ws.onmessage = function (e) {
        var m; try { m = JSON.parse(e.data); } catch (x) { return; }
        if (m.t === "welcome") { V.me = m.id; m.peers.forEach(function (p) { V.names[p.id] = p.name; peerConn(p.id, true); }); }
        else if (m.t === "join") V.names[m.id] = m.name;
        else if (m.t === "leave") dropPeer(m.id);
        else if (m.t === "signal") onSignal(m.from, m.data);
        else if (m.t === "talk") V.talking[m.id] = m.on;
        else if (m.t === "full") V.status = "Voice channel is full";
        voiceHud();
      };
      ws.onclose = function () { if (V.ws === ws) { Object.keys(V.peers).forEach(dropPeer); V.ws = null; V.status = cfg.voice ? "Voice disconnected, retrying" : "Voice off"; voiceHud(); if (cfg.voice) setTimeout(voiceStart, 4000); } };
      voiceHud();
    }).catch(function () { V.starting = false; V.status = "Voice: microphone blocked"; voiceHud(); });
  }
  function voiceStop() {
    var ws = V.ws; V.ws = null; if (ws) try { ws.close(); } catch (e) {}
    Object.keys(V.peers).forEach(dropPeer);
    if (V.mic) V.mic.getTracks().forEach(function (t) { t.stop(); }); V.mic = null; V.status = "Voice off";
  }
  function voiceSync() {
    if (cfg.voice) voiceStart(); else voiceStop();
    Object.keys(V.peers).forEach(function (id) { V.peers[id].audio.volume = cfg.voiceVolume / 100; });
    if (V.mic && !V.held) setMic(cfg.voiceMode === "open");
    voiceHud();
  }
  addEventListener("keydown", function (e) {
    if (!cfg.voice || cfg.voiceMode !== "ptt" || e.code !== cfg.voiceKey || e.repeat) return;
    if (menu.classList.contains("open")) return;
    V.held = true; setMic(true);
  }, true);
  addEventListener("keyup", function (e) { if (e.code === cfg.voiceKey && V.held) { V.held = false; if (cfg.voiceMode === "ptt") setMic(false); } }, true);
  addEventListener("blur", function () { if (V.held) { V.held = false; if (cfg.voiceMode === "ptt") setMic(false); } });
  setInterval(voiceSync, 2000);
  pills.voice.textContent = "Voice off";

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
    { id: "zoom", name: "Zoom", cat: "Visual", desc: "Hold a key to zoom in.",
      opts: [["zoomKey", "Key", "select", [["KeyC", "C"], ["KeyZ", "Z"], ["KeyV", "V"], ["AltLeft", "Left Alt"]]], ["zoomLevel", "Zoom", "range", [2, 6, 1]]] },
    { id: "filter", name: "Color Filter", cat: "Visual", desc: "Brighten colors or pick a look: warm, cool, vivid, night or grayscale.",
      opts: [["filterPreset", "Look", "select", [["custom", "Custom"], ["warm", "Warm"], ["cool", "Cool"], ["vivid", "Vivid"], ["night", "Night"], ["gray", "Grayscale"]]], ["brightness", "Brightness", "range", [60, 160, 5]], ["saturation", "Saturation", "range", [0, 200, 5]]] },
    { id: "fullscreenKey", name: "F11 Fullscreen", cat: "Utility", desc: "Press F11 to toggle fullscreen." },
    { id: "afk", name: "AFK Alert", cat: "Utility", desc: "Flashes the tab title if you go idle.",
      opts: [["afkMinutes", "Minutes", "range", [1, 30, 1]]] },
    { id: "titleFlash", name: "Focus Reminder", cat: "Utility", desc: "Flashes the tab title when you tab away." },
    { id: "ping", name: "Ping", cat: "HUD", desc: "Round trip to the Ladue server relay, updated every 5 seconds." },
    { id: "players", name: "Ladue Players", cat: "HUD", desc: "How many people are on the Ladue server right now." },
    { id: "date", name: "Date", cat: "HUD", desc: "Today's date." },
    { id: "stopwatch", name: "Stopwatch", cat: "HUD", desc: "Press the key to start or pause. Shift + key resets.",
      opts: [["stopwatchKey", "Key", "select", [["KeyJ", "J"], ["KeyK", "K"], ["KeyH", "H"], ["F6", "F6"], ["F7", "F7"]]]] },
    { id: "customText", name: "Custom Text", cat: "HUD", desc: "Your own label on screen: name, team or message.",
      opts: [["customTextValue", "Text", "text"]] },
    { id: "breakReminder", name: "Break Reminder", cat: "Utility", desc: "Reminds you to take a break every few minutes.",
      opts: [["breakMinutes", "Minutes", "range", [10, 90, 5]]] },
    { id: "hideHudKey", name: "Hide HUD (F4)", cat: "Utility", desc: "Press F4 to hide or show every overlay at once." },
    { id: "voice", name: "Voice Chat", cat: "Utility", desc: "Talk with everyone on Ladue Client. Hold V to talk, or use open mic. Your browser asks for the microphone.",
      opts: [["voiceMode", "Mode", "select", [["ptt", "Push to talk"], ["open", "Open mic"]]], ["voiceKey", "Talk key", "select", [["KeyV", "V"], ["KeyB", "B"], ["KeyG", "G"], ["CapsLock", "Caps Lock"], ["AltLeft", "Left Alt"]]], ["voiceVolume", "Volume", "range", [0, 100, 5]]] }
  ];
  var CATS = ["All", "HUD", "Visual", "Utility", "Cosmetics", "Settings"];

  var menu = el("div"); menu.id = "ax-menu";
  var win = el("div", "ax-win");
  var side = el("div", "ax-side", '<div class="ax-logo">LADUE</div>');
  var main = el("div", "ax-main");
  var top = el("div", "ax-top");
  var title = el("h3", "", "All mods");
  var search = el("input"); search.placeholder = "Search mods";
  var body = el("div", "ax-body");
  top.appendChild(title); top.appendChild(search); main.appendChild(top); main.appendChild(body);
  win.appendChild(side); win.appendChild(main); menu.appendChild(win);
  var editbar = el("div", "ax-editbar", "<span>Drag your HUD elements to move them</span>");
  var doneBtn = el("button", "", "Done"), resetBtn = el("button", "", "Reset");
  resetBtn.style.background = "#1a2b47"; resetBtn.style.color = "#fff";
  editbar.appendChild(resetBtn); editbar.appendChild(doneBtn);
  ROOT.appendChild(menu); ROOT.appendChild(editbar);

  var cat = "All";
  CATS.forEach(function (c) {
    var b = el("button", "", c); b.dataset.c = c;
    b.onclick = function () { cat = c; draw(); };
    side.appendChild(b);
  });
  side.appendChild(el("div", "grow"));
  var editBtn = el("button", "edit-btn", "Edit HUD layout");
  editBtn.onclick = function () { setEdit(true); };
  side.appendChild(editBtn);
  search.oninput = function () { draw(); };

  function toggle(k, after) {
    var t = el("button", "ax-tog" + (cfg[k] ? " on" : ""));
    t.onclick = function () { cfg[k] = !cfg[k]; save(); renderHud(); draw(); if (after) after(); };
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
      tx.style.cssText = "flex:1;background:#050a16;color:#fff;border:1px solid #1c3357;padding:3px 6px";
      tx.oninput = function () { cfg[k] = tx.value; save(); };
      tx.addEventListener("keydown", function (e) { e.stopPropagation(); }, true);
      row.appendChild(tx);
    } else {
      var r = el("input"); r.type = "range"; r.min = o[3][0]; r.max = o[3][1]; r.step = o[3][2]; r.value = cfg[k];
      var v = el("span", "", cfg[k]);
      r.oninput = function () { cfg[k] = +r.value; v.textContent = r.value; save(); renderHud(); };
      row.appendChild(r); row.appendChild(v);
    }
    return row;
  }

  function draw() {
    [].forEach.call(side.querySelectorAll("button[data-c]"), function (b) { b.classList.toggle("on", b.dataset.c === cat); });
    body.innerHTML = "";
    search.style.display = cat === "Cosmetics" || cat === "Settings" ? "none" : "";
    title.textContent = cat === "All" ? "All mods" : cat;
    if (cat === "Cosmetics") return drawCosmetics();
    if (cat === "Settings") return drawSettings();
    var q = search.value.trim().toLowerCase();
    MODS.filter(function (m) { return (cat === "All" || m.cat === cat) && (!q || m.name.toLowerCase().indexOf(q) >= 0); }).forEach(function (m) {
      var card = el("div", "ax-mod" + (cfg[m.id] ? " on" : ""));
      var row = el("div", "ax-row", "<b>" + m.name + "</b>");
      row.appendChild(toggle(m.id)); card.appendChild(row);
      card.appendChild(el("small", "", m.desc));
      if (m.opts && cfg[m.id]) m.opts.forEach(function (o) { card.appendChild(option(o)); });
      body.appendChild(card);
    });
  }

  function drawSettings() {
    var c1 = el("div", "ax-mod", "<b>Accent color</b>");
    var sw = el("div", "ax-row");
    ["#ffffff", "#6f8fd6", "#4fb3ff", "#7c5cff", "#2ee6d6", "#3ddc97", "#ffcf4a", "#ff5c8a", "#ffffff"].forEach(function (col) {
      var b = el("button", "ax-sw" + (cfg.hudColor === col ? " on" : "")); b.style.background = col;
      b.onclick = function () { cfg.hudColor = col; save(); renderHud(); draw(); };
      sw.appendChild(b);
    });
    c1.appendChild(sw); body.appendChild(c1);
    var c2 = el("div", "ax-mod", "<b>HUD look</b>");
    c2.appendChild(option(["hudBg", "Background", "range", [0, 100, 5]]));
    c2.appendChild(option(["hudScale", "Size", "range", [60, 160, 10]]));
    body.appendChild(c2);
    body.appendChild(el("div", "ax-note", "Tip: use <b>Edit HUD layout</b> to drag each HUD element anywhere on screen."));
  }

  function drawCosmetics() {
    var capes = window.ASTRA_CAPES || [];
    body.appendChild(el("div", "ax-note", "Pick a cape here or in the Ladue launcher. It's put on your player the next time you launch the game from Ladue."));
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
  function setEdit(on) {
    menu.classList.toggle("edit", on);
    editbar.style.display = on ? "flex" : "none";
    Object.keys(hud).forEach(function (id) { hud[id].classList.toggle("editing", on); });
  }
  doneBtn.onclick = function () { setEdit(false); };
  resetBtn.onclick = function () { Object.keys(DEFAULT_POS).forEach(function (id) { delete cfg["pos_" + id]; }); save(); renderHud(); };
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
    if (open) { if (document.exitPointerLock) document.exitPointerLock(); draw(); }
  }
  addEventListener("keydown", function (e) {
    if (e.code === "ShiftRight" || (e.key === "Shift" && e.location === 2)) {
      e.preventDefault(); e.stopImmediatePropagation(); setOpen(!menu.classList.contains("open"));
    } else if (menu.classList.contains("open")) {
      if (e.code === "Escape") setOpen(false);
      if (e.target !== search) e.stopImmediatePropagation();
    }
  }, true);
  ["mousedown", "mouseup", "click", "wheel", "keyup", "keypress"].forEach(function (t) {
    menu.addEventListener(t, function (e) { e.stopPropagation(); }, false);
    editbar.addEventListener(t, function (e) { e.stopPropagation(); }, false);
  });

  renderHud();
  // the game rebuilds the page on boot; keep our elements attached and filters applied
  setInterval(function () {
    [css, cross, menu, editbar, breakToast].concat(Object.keys(hud).map(function (k) { return hud[k]; })).forEach(function (n) { if (!n.isConnected) ROOT.appendChild(n); });
    applyFilter();
  }, 1000);
})();
