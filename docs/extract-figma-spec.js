/**
 * 从之前的 Figma 全量节点导出里，抽取出 9 个屏幕的"规格说明"：
 * 每个屏幕的可视元素按 y/x 排序，带文本、色值、字号、圆角、坐标。
 * 用于把 HTML 前端与 Figma 原型逐屏对齐。
 *
 *   node extract-figma-spec.js            # 打印到终端
 *   node extract-figma-spec.js > spec.txt # 存文件
 */
const fs = require("fs");

const DUMP =
  "C:/Users/xzcho/AppData/Local/Temp/dsh-spill-S326Ey/session-0297638d6070/a62e87130012-mcp__figma__get_node_info.txt";

const SCREEN_PREFIX = /^(0\d)-|^1\d-详情页-/;

function hex(fills) {
  if (!Array.isArray(fills) || fills.length === 0) return null;
  const fill = fills[0];
  if (fill.type !== "SOLID") return fill.type;
  const c = fill.color;
  if (typeof c === "string") return c.toUpperCase();
  const to = (v) => Math.round((v || 0) * 255).toString(16).padStart(2, "0");
  return ("#" + to(c.r) + to(c.g) + to(c.b)).toUpperCase();
}

function box(node) {
  const b = node.absoluteBoundingBox;
  if (!b) return "";
  return `x=${Math.round(b.x)} y=${Math.round(b.y)} ${Math.round(b.width)}×${Math.round(b.height)}`;
}

function font(node) {
  const s = node.style;
  if (!s) return "";
  return `${s.fontSize || "?"}px/${s.fontWeight || "?"}${s.textAlignHorizontal === "CENTER" ? " 居中" : ""}`;
}

function line(node, depth) {
  const pad = "  ".repeat(depth);
  const parts = [`${node.type}`];
  if (node.characters != null) parts.push(`"${node.characters}"`);
  const f = hex(node.fills);
  if (f) parts.push(`fill=${f}`);
  if (node.cornerRadius) parts.push(`r=${node.cornerRadius}`);
  const fo = font(node);
  if (fo) parts.push(`字=${fo}`);
  parts.push(box(node));
  return `${pad}- ${parts.filter(Boolean).join("  ")}`;
}

/** 按 y 再 x 排序，得到视觉上的从上到下顺序。 */
function sorted(children) {
  return (children || []).slice().sort((a, b) => {
    const ay = a.absoluteBoundingBox ? a.absoluteBoundingBox.y : 0;
    const by = b.absoluteBoundingBox ? b.absoluteBoundingBox.y : 0;
    if (Math.round(ay) !== Math.round(by)) return ay - by;
    const ax = a.absoluteBoundingBox ? a.absoluteBoundingBox.x : 0;
    const bx = b.absoluteBoundingBox ? b.absoluteBoundingBox.x : 0;
    return ax - bx;
  });
}

function walk(node, depth, out) {
  out.push(line(node, depth));
  if (node.children && depth < 2) {
    sorted(node.children).forEach((child) => walk(child, depth + 1, out));
  }
}

const raw = fs.readFileSync(DUMP, "utf8");
const page = JSON.parse(raw);
const screens = (page.children || []).filter((child) => SCREEN_PREFIX.test(child.name));

console.log("Figma 页面顶层节点：" + (page.children || []).length + " 个，其中 9 屏主页面 " + screens.length + " 个");
console.log("");

screens.forEach((screen) => {
  console.log("=".repeat(96));
  console.log(`【${screen.name}】 id=${screen.id}  ${box(screen)}  fill=${hex(screen.fills)}`);
  console.log("=".repeat(96));
  const out = [];
  sorted(screen.children).forEach((child) => walk(child, 0, out));
  console.log(out.join("\n"));
  console.log("");
});
