// Stamps a new site version into index.html and version.json. Run before every push:
//   node src/stamp.js
// Open pages compare their stamp with version.json and reload themselves when it changes.
const fs = require("fs"), path = require("path");
const root = path.resolve(__dirname, "..");
const v = Date.now().toString(36);
const file = path.join(root, "index.html");
let s = fs.readFileSync(file, "utf8");
if (!/window\.LADUE_SITE_VERSION="[^"]*"/.test(s)) throw new Error("version marker missing in index.html");
s = s.replace(/window\.LADUE_SITE_VERSION="[^"]*"/, `window.LADUE_SITE_VERSION="${v}"`);
fs.writeFileSync(file, s);
fs.writeFileSync(path.join(root, "version.json"), JSON.stringify({ v }) + "\n");
console.log("site version", v);
