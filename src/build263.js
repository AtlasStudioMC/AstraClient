// Build games/v263.bin (Ladue Client 26.3) from the upstream Eaglercraft 26.3 single-file build.
//   node src/build263.js <eaglercraft-26.3-*.html> <wispcraft index.js>
// Steps: rebrand the wasm and page text, drop the ArchMC server entry, pre-add the Ladue server,
// inject Wispcraft pointed at wss://ladue.cc.cd/wisp/, then the Ladue mod overlay. Finally it
// cache-busts the game URL in index.html and src/engine.js.
const fs = require("fs"), zlib = require("zlib"), path = require("path"), crypto = require("crypto");
const root = path.resolve(__dirname, "..");
const [upstream, wispcraft] = process.argv.slice(2);
if (!upstream || !wispcraft) throw new Error("usage: node src/build263.js <upstream.html> <wispcraft.js>");

let h = fs.readFileSync(upstream, "utf8");
const re = /(<script type="application\/octet-stream" id="eag-inline-wasm-br" data-size=")\d+("[^>]*>)([\s\S]*?)(<\/script>)/;
const m = h.match(re); if (!m) throw new Error("no wasm tag");
const w = zlib.brotliDecompressSync(Buffer.from(m[3].replace(/\s+/g, ""), "base64"));

// same-length swaps inside the compiled game
const SWAPS = [
  // the game always pins this built-in server to the top of Multiplayer, so make it Ladue
  // (the relay ignores the port and sends ladue.cc.cd to the Ladue server)
  ["ArchMC\x0dwss://arch.mc", "Ladue \x0dladue.cc.cd:1"],
  ["Made by ArchMC", "Made by Ladue "],
  ["wss://.ws://.arch.mc", "wss://.ws://.0.0.0.0"],
  ["eaglercraft.brand = \"o_xer + ArchMC\"", "eaglercraft.brand = \"Ladue Client  \""],
  ["o_xer + ArchMC", "Ladue Client  "],
  ["Eaglercraft %s", "LadueClient %s"],
  ["26.3 (zeus/master)", "26.3              "],
];
for (const [a, b] of SWAPS) {
  if (a.length !== b.length) throw new Error("length mismatch: " + a);
  const A = Buffer.from(a, "latin1"), B = Buffer.from(b, "latin1"); let j = -1, c = 0;
  while ((j = w.indexOf(A, j + 1)) >= 0) { B.copy(w, j); c++; }
  console.log(String(c).padStart(3), "x", JSON.stringify(a));
}
{ const A = Buffer.from("arch.mc"), B = Buffer.from("0.0.0.0"); let j = -1, c = 0; while ((j = w.indexOf(A, j + 1)) >= 0) { B.copy(w, j); c++; } console.log(String(c).padStart(3), "x arch.mc"); }

const br = zlib.brotliCompressSync(w, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 9, [zlib.constants.BROTLI_PARAM_LGWIN]: 24, [zlib.constants.BROTLI_PARAM_SIZE_HINT]: w.length } });
h = h.replace(re, (x, p1, p2, p3, p4) => `${p1}${br.length}${p2.replace(/data-raw-size="\d+"/, `data-raw-size="${w.length}"`)}\n${br.toString("base64")}\n${p4}`);

// page text, worlds (same store as 26.2, so worlds and the Ladue pack carry over) and the Ladue server
const need = (s) => { if (!h.includes(s)) throw new Error("missing in page: " + s); };
need("worldsDB: \"worlds\",");
h = h.replace(/<title>[^<]*<\/title>/, "<title>Ladue Client 26.3</title>")
  .replace("Loading Eaglercraft 26.3 runtime", "Loading Ladue Client 26.3")
  .replace("Eaglercraft could not continue", "Ladue Client could not continue")
  .replace("Eaglercraft requires landscape", "Ladue Client requires landscape")
  .replace("worldsDB: \"worlds\",", "worldsDB: \"ladue_worlds_26_2\",\n\t\t\tservers: [{ addr: \"ladue.cc.cd\", name: \"Ladue\" }],");

// Wispcraft, always pointed at the Ladue relay
let wc = fs.readFileSync(wispcraft, "utf8");
if (!wc.includes("\"wss://anura.pro/\"")) throw new Error("wispcraft default url not found");
wc = wc.replace("\"wss://anura.pro/\"", "\"wss://ladue.cc.cd/wisp/\"").replace(/\/\/# sourceMappingURL=.*$/m, "");
const inject = `<script>try{localStorage.wispcraft_wispurl="wss://ladue.cc.cd/wisp/"}catch(e){}
try{var K="_eaglercraftX.relay.list.v3",P={detected:"singleplayer",private:false,address:"wss://relay.eaglercraft.net",capability:"auto",name:"Eaglercraft Public"},L=[];try{L=JSON.parse(atob(localStorage.getItem(K)||""))}catch(e){}L=L.filter(function(r){return r.detected!=="multiplayer"});if(!L.length)L.push(P);L.push({detected:"multiplayer",private:false,address:"wss://ladue.cc.cd",capability:"auto",name:"Ladue"});localStorage.setItem(K,btoa(JSON.stringify(L)))}catch(e){}</script>\n<script>${wc.replace(/<\/script/gi, "<\\/script")}</script>\n`;
const at = h.indexOf("<head>") + 6; h = h.slice(0, at) + "\n" + inject + h.slice(at);

// Ladue mod overlay + capes list
const capes = JSON.parse(fs.readFileSync(path.join(root, "src/pack/capes.json"), "utf8")).map((c) => ({ id: c.id, name: c.name, png: c.png }));
const ov = "window.ASTRA_CAPES=" + JSON.stringify(capes) + ";\n" + fs.readFileSync(path.join(root, "src/astra-overlay.js"), "utf8").replace(/\r\n/g, "\n");
const end = h.lastIndexOf("</body>");
h = h.slice(0, end) + "\n<script id=\"ladue-overlay\">" + ov.replace(/<\/script/gi, "<\\/script") + "</script>\n" + h.slice(end);

const gz = zlib.gzipSync(Buffer.from(h, "utf8"), { level: 9 });
fs.writeFileSync(path.join(root, "games/v263.bin"), gz);
const hash = crypto.createHash("sha1").update(gz).digest("hex").slice(0, 10);
for (const f of ["index.html", "src/engine.js"]) {
  const p = path.join(root, f), s = fs.readFileSync(p, "utf8");
  fs.writeFileSync(p, s.replace(/games\/'\+id\+'\.bin\?v=[0-9a-f]+/, "games/'+id+'.bin?v=" + hash));
}
console.log("v263.bin", (gz.length / 1e6).toFixed(1), "MB, v=" + hash);
