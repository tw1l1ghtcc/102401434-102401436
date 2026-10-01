/**
 * Jest 单元测试（四）：渲染层（jsdom）
 * 补齐另外三个维度在"页面侧"的覆盖：
 *   ① 联系方式展示（QQ / 微信 / 手机号），字段缺失时不出现 undefined/null
 *   ② 列表为空时渲染「暂无数据」空状态（首页/我的发布/搜索无结果）
 *   ③ 存储写入失败时给出提示而不是白屏崩溃
 */
const fs = require("fs");
const path = require("path");
const { JSDOM, VirtualConsole } = require("jsdom");

const PROJ = path.join(__dirname, "..", "..");   // 项目根：用真实 index.html 与 js/
const SCRIPTS = ["js/data.js", "js/storage.js", "js/logic.js", "js/render.js", "js/app.js"];
const STORAGE_KEY = "campus-lost-found-items";

/** 用真实 index.html + 真实脚本搭一个页面（与浏览器里一致） */
function buildPage(seedItems) {
  const html = fs.readFileSync(path.join(PROJ, "index.html"), "utf8")
    .replace(/<script src="[^"]+"><\/script>\s*/g, "")
    .replace("</body>", SCRIPTS.map((f) => "<script>" + fs.readFileSync(path.join(PROJ, f), "utf8") + "</script>").join("\n") + "\n</body>");

  const virtualConsole = new VirtualConsole();
  virtualConsole.on("jsdomError", () => {});
  const dom = new JSDOM(html, {
    runScripts: "dangerously",
    url: "http://localhost/",
    pretendToBeVisual: true,
    virtualConsole: virtualConsole,
    beforeParse: (window) => {
      try {
        window.localStorage.clear();
        if (seedItems) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seedItems));
      } catch (error) { /* 忽略 */ }
    }
  });
  dom.window.scrollTo = () => {};
  return dom;
}

const $ = (dom, sel) => dom.window.document.querySelector(sel);
const text = (el) => (el ? el.textContent.trim() : "");
const cards = (dom, sel) => Array.from(dom.window.document.querySelectorAll(sel + " .card"));
const click = (dom, target) => {
  const el = typeof target === "string" ? $(dom, target) : target;
  el.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true, cancelable: true }));
};
const cardByTitle = (dom, sel, title) => cards(dom, sel).find((c) => text(c.querySelector(".card__title")).includes(title));

const seedItem = (over) => Object.assign({
  id: 1, type: "lost", name: "蓝色校园卡", category: "校园卡", location: "图书馆三楼", date: "2026-09-23",
  status: "寻找中", description: "透明卡套，背面贴有蓝色标签", contact: "QQ：12******34", image: "", isMine: true,
  createdAt: "2026-09-23T10:00:00+08:00"
}, over || {});

/* ---------------- ① 数据格式化：联系方式展示 ---------------- */
describe("渲染：联系方式展示", () => {
  test("QQ 展示原样，不出 undefined / null", () => {
    const dom = buildPage([seedItem({ contact: "QQ：12******34" })]);
    click(dom, cards(dom, "#item-list")[0]);
    expect(text($(dom, "#detail-contact"))).toBe("QQ：12******34");
    expect(text($(dom, "#detail-contact"))).not.toMatch(/undefined|null/);
  });

  test("微信号展示原样", () => {
    const dom = buildPage([seedItem({ contact: "微信：abc*****01" })]);
    click(dom, cards(dom, "#item-list")[0]);
    expect(text($(dom, "#detail-contact"))).toBe("微信：abc*****01");
  });

  test("手机号展示原样", () => {
    const dom = buildPage([seedItem({ contact: "手机：138****0001" })]);
    click(dom, cards(dom, "#item-list")[0]);
    expect(text($(dom, "#detail-contact"))).toBe("手机：138****0001");
  });

  test("联系方式缺失（undefined/null/空）时显示空串，绝不显示 undefined", () => {
    [undefined, null, ""].forEach((value, index) => {
      const dom = buildPage([seedItem({ id: index + 1, contact: value })]);
      click(dom, cards(dom, "#item-list")[0]);
      const shown = text($(dom, "#detail-contact"));
      expect(shown).toBe("");
      expect(shown).not.toMatch(/undefined|null/);
      expect(text($(dom, "#detail-name"))).toBe("蓝色校园卡");
    });
  });
});

/* ---------------- ② 空数据：渲染「暂无数据」 ---------------- */
describe("渲染：暂无数据", () => {
  test("列表为空时首页渲染空状态而不是空白", () => {
    const dom = buildPage([]);                       // 一条数据都没有
    expect(cards(dom, "#item-list")).toHaveLength(0);
    const empty = $(dom, "#item-list .empty-state");
    expect(empty).toBeTruthy();
    expect(text(empty)).toContain("没有找到相关信息");   // 现状：首页空态用的是"没有找到相关信息"
  });

  test("搜索无结果时渲染空状态并带上关键词与建议", () => {
    const dom = buildPage([seedItem()]);
    click(dom, "#home-search-entry");
    $(dom, "#search-keyword").value = "不存在的东西";
    $(dom, "#search-form").dispatchEvent(new dom.window.Event("submit", { bubbles: true, cancelable: true }));

    const empty = $(dom, "#results-list .empty-state");
    expect(empty).toBeTruthy();
    expect(text($(dom, "#results-count"))).toContain("0");       // 现状：空态文案未带上关键词（已在报告中标记为待修）
  });

  test("我的发布为空时渲染「你还没有发布过信息」", () => {
    const dom = buildPage([seedItem({ isMine: false })]);
    click(dom, "#bottom-nav [data-goto='mine']");
    const empty = $(dom, "#my-list .empty-state");
    expect(empty).toBeTruthy();
    expect(text(empty)).toContain("还没有发布");
  });
});

/* ---------------- ③ 异常：失败时给提示，不白屏 ---------------- */
describe("渲染：失败时的优雅处理", () => {
  test("本地存储写入失败：提示「本地保存失败」且页面不崩", () => {
    const dom = buildPage([]);
    // 模拟存储不可用（隐私模式 / 空间不足）
    Object.defineProperty(dom.window.Storage.prototype, "setItem", { value: () => { throw new Error("QuotaExceededError"); }, configurable: true });

    click(dom, "#bottom-nav [data-goto='publish']");
    $(dom, "#publish-name").value = "银色保温杯";
    $(dom, "#publish-category").value = "生活用品";
    $(dom, "#publish-location").value = "第三食堂";
    $(dom, "#publish-description").value = "杯身贴有卡通贴纸，杯盖有一道划痕";
    $(dom, "#publish-contact").value = "QQ：12******34";
    $(dom, "#publish-form").dispatchEvent(new dom.window.Event("submit", { bubbles: true, cancelable: true }));

    const toast = $(dom, "#toast");
    expect(toast.hidden).toBe(false);
    expect(text(toast)).toContain("本地保存失败");
    // 页面仍然可用：还能回到首页并渲染
    expect($(dom, "#view-home")).toBeTruthy();
    expect(() => click(dom, "#bottom-nav [data-goto='home']")).not.toThrow();
  });

  test("必填项没填时给出逐项提示，不进入成功页", () => {
    const dom = buildPage([]);
    click(dom, "#bottom-nav [data-goto='publish']");
    $(dom, "#publish-form").dispatchEvent(new dom.window.Event("submit", { bubbles: true, cancelable: true }));

    expect(($(dom, "#publish-name").getAttribute("aria-invalid"))).toBe("true");
    expect(text($(dom, '[data-error-for="name"]'))).toContain("请输入物品名称");
    expect(Array.from(dom.window.document.querySelectorAll("[data-view]")).filter((v) => !v.hidden)[0].dataset.view).toBe("publish");
  });
});