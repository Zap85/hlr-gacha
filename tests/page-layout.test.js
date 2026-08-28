const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const indexHtml = fs.readFileSync(path.join(projectRoot, "index.html"), "utf8");
const styleCss = fs.readFileSync(path.join(projectRoot, "css", "style.css"), "utf8");

const orderedSectionIds = [
  "date-section-title",
  "inventory-section-title",
  "pre-conversion-section-title",
  "free-accumulation-section-title",
  "event-income-section-title",
  "permanent-packs-section-title",
  "event-packs-section-title",
  "currency-packs-section-title",
  "other-section-title",
  "future-calculation-section-title"
];

let previousPosition = -1;
for (const id of orderedSectionIds) {
  const positions = [...indexHtml.matchAll(new RegExp(`id=["']${id}["']`, "g"))];
  assert.equal(positions.length, 1, `${id} 应只存在一个 DOM 实例`);
  assert.ok(positions[0].index > previousPosition, `${id} 应符合窄屏单列阅读顺序`);
  previousPosition = positions[0].index;
}

assert.match(indexHtml, /class="calculator-layout"/);
assert.match(indexHtml, /class="calculator-sidebar"/);
assert.match(indexHtml, /class="calculator-workflow"/);
assert.match(indexHtml, />个性化调整<\/h2>/);
assert.doesNotMatch(indexHtml, /<(?:h2|summary)[^>]*>\s*[一二三四五六七八九十]+、/);

assert.match(styleCss, /\.calculator-layout\s*\{[^}]*display:\s*grid/s);
assert.match(styleCss, /\.calculator-sidebar\s*\{[^}]*position:\s*sticky/s);
assert.match(styleCss, /@media\s*\(max-width:\s*56rem\)[\s\S]*?\.calculator-layout\s*\{[^}]*grid-template-columns:\s*1fr/s);

console.log("页面双栏布局结构测试通过");
