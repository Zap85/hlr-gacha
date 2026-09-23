const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const indexHtml = fs.readFileSync(path.join(projectRoot, "index.html"), "utf8");
const styleCss = fs.readFileSync(path.join(projectRoot, "css", "style.css"), "utf8");
const appJs = fs.readFileSync(path.join(projectRoot, "js", "app.js"), "utf8");
const updateGuideHtml = fs.readFileSync(
  path.join(projectRoot, "docs", "update-guide.html"),
  "utf8",
);

const orderedSectionIds = [
  "date-section-title",
  "pre-conversion-section-title",
  "inventory-section-title",
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
assert.match(indexHtml, /href="docs\/user-guide\.css"/);
assert.match(indexHtml, /id="user-guide-toggle"[^>]*aria-haspopup="dialog"[^>]*>使用说明<\/button>/);
assert.match(indexHtml, /id="update-guide-toggle"[^>]*aria-haspopup="dialog"[^>]*data-guide-source="docs\/update-guide\.html"[^>]*>更新说明<\/button>/);
assert.match(indexHtml, /id="user-guide-modal"[^>]*hidden>/);
assert.match(indexHtml, /class="user-guide-dialog" role="dialog" aria-modal="true" aria-label="使用说明"/);
assert.match(indexHtml, /id="user-guide-close"[^>]*aria-label="关闭使用说明"[^>]*>×<\/button>/);
assert.doesNotMatch(indexHtml, /id="user-guide-panel"/);
assert.doesNotMatch(indexHtml, /class="user-guide-content"/);
assert.match(appJs, /fetch\(source\)/);
assert.match(appJs, /guideCache\.has\(source\)/);
assert.match(appJs, /guideLoadPromises\.has\(source\)/);
assert.match(appJs, /event\.key === "Escape" && !modal\.hidden/);
assert.match(appJs, /document\.body\.classList\.add\("user-guide-modal-open"\)/);
assert.match(updateGuideHtml, /<h2>更新说明<\/h2>/);
assert.match(updateGuideHtml, /09\.23 更新至六周年庆典版本/);
assert.match(updateGuideHtml, /<ol>/);
const sidebarStart = indexHtml.indexOf('<aside class="calculator-sidebar">');
const workflowStart = indexHtml.indexOf('<div class="calculator-workflow">');
const inventoryStart = indexHtml.indexOf('id="inventory-section-title"');
const resourceTotalStart = indexHtml.indexOf('id="pre-conversion-section-title"');
assert.ok(resourceTotalStart > sidebarStart && resourceTotalStart < workflowStart);
assert.ok(inventoryStart > workflowStart);
assert.match(indexHtml, /<details class="pack-disclosure event-income-disclosure">/);
assert.match(indexHtml, /<summary id="event-income-section-title">活动收入<\/summary>/);
assert.match(indexHtml, /<details class="pack-disclosure other-disclosure">/);
assert.match(indexHtml, /<summary id="other-section-title">个性化调整<\/summary>/);
assert.doesNotMatch(indexHtml, /<details class="pack-disclosure (?:event-income|other)-disclosure" open>/);
assert.match(indexHtml, /<p>更多功能将在后续开发。<\/p>/);
assert.doesNotMatch(indexHtml, /更多资源消费与最终折算功能将在后续开发/);
assert.match(indexHtml, /class="resource-total-heading"/);
assert.doesNotMatch(indexHtml, /<(?:h2|summary)[^>]*>\s*[一二三四五六七八九十]+、/);

assert.match(styleCss, /\.calculator-layout\s*\{[^}]*display:\s*grid/s);
assert.match(styleCss, /\.calculator-sidebar\s*\{[^}]*position:\s*sticky/s);
assert.match(styleCss, /\.resource-total-heading\s*\{[^}]*display:\s*flex[^}]*justify-content:\s*space-between/s);
assert.match(styleCss, /\.inventory-fields\s*\{[^}]*grid-template-columns:\s*repeat\(3,/s);
assert.match(styleCss, /\.dynamic-inventory-fields\s*\{[^}]*grid-template-columns:\s*repeat\(2,/s);
assert.match(styleCss, /@media\s*\(max-width:\s*56rem\)[\s\S]*?\.calculator-layout\s*\{[^}]*grid-template-columns:\s*1fr/s);
assert.match(styleCss, /@media\s*\(max-width:\s*32rem\)[\s\S]*?\.dynamic-inventory-fields\s*\{[^}]*grid-template-columns:\s*1fr/s);

console.log("页面双栏布局结构测试通过");
