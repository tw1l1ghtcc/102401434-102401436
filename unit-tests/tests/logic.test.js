/**
 * Jest 单元测试（一）：核心业务逻辑
 * 覆盖：关键词搜索 / 类型筛选 / 分类筛选 / 状态流转 / 展示格式化 / 表单校验 / 数据组装 / 边界与异常
 * 说明：被测代码是纯函数（js/logic.js 不碰 DOM、不碰 localStorage），所以能在 node 环境直接跑。
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.join(__dirname, "..", "..");   // 指向项目根：直接测试 js/ 下的真实源码
// 每个测试文件用独立 vm 上下文，避免同一 worker 里重复声明全局 const
const ctx = vm.createContext({ console: console });
vm.runInContext(fs.readFileSync(path.join(ROOT, "js/data.js"), "utf8"), ctx, { filename: "js/data.js" });
vm.runInContext(fs.readFileSync(path.join(ROOT, "js/logic.js"), "utf8"), ctx, { filename: "js/logic.js" });

const L = vm.runInContext("itemLogic", ctx);
const SEED = vm.runInContext("items", ctx);
const HOME_CATEGORIES = vm.runInContext("HOME_CATEGORIES", ctx);
const SEARCH_CATEGORIES = vm.runInContext("SEARCH_CATEGORIES", ctx);
const FORM_CATEGORIES = vm.runInContext("FORM_CATEGORIES", ctx);

const makeItem = (over) => Object.assign({
  id: 1,
  type: "lost",
  name: "蓝色校园卡",
  category: "校园卡",
  location: "图书馆三楼",
  date: "2026-09-23",
  status: "寻找中",
  description: "透明卡套，背面贴有蓝色标签",
  contact: "QQ：12******34",
  image: "",
  isMine: true,
  createdAt: "2026-09-23T10:00:00+08:00"
}, over || {});

const makeList = () => [
  makeItem({ id: 1 }),
  makeItem({ id: 2, type: "found", name: "黑色折叠伞", category: "生活用品", status: "待认领", location: "第二食堂", date: "2026-09-24", description: "黑色长柄折叠伞，伞骨有轻微变形", createdAt: "2026-09-24T10:00:00+08:00" }),
  makeItem({ id: 3, type: "found", name: "Type-C 充电线", category: "电子产品", status: "待认领", location: "教学楼A栋302", date: "2026-09-22", description: "白色数据线，接口缠有黑胶带", isMine: false, createdAt: "2026-09-22T10:00:00+08:00" }),
  makeItem({ id: 4, type: "lost", name: "高等数学教材", category: "书籍", status: "已找回", location: "第一教学楼自习室", date: "2026-09-20", description: "封面写有姓名缩写", isMine: false, createdAt: "2026-09-20T10:00:00+08:00" })
];

const validValues = (over) => Object.assign({
  type: "lost",
  name: "蓝色校园卡",
  category: "校园卡",
  location: "图书馆三楼",
  date: "2026-09-23",
  description: "透明卡套，背面贴有蓝色标签",
  contact: "QQ：12******34",
  image: ""
}, over || {});

/* ============================ 1. 搜索与筛选（减少无效联系的核心） ============================ */

describe("关键词搜索", () => {
  test("按物品名称命中", () => {
    const r = L.filterItems(makeList(), { keyword: "校园卡" });
    expect(r).toHaveLength(1);
    expect(r[0].id).toBe(1);
  });

  test("按描述命中（搜物品特征也能找到）", () => {
    const r = L.filterItems(makeList(), { keyword: "黑胶带" });
    expect(r.map((i) => i.id)).toEqual([3]);
  });

  test("模糊/部分匹配：只输入名称片段也能命中", () => {
    expect(L.filterItems(makeList(), { keyword: "折叠" })).toHaveLength(1);
    expect(L.filterItems(makeList(), { keyword: "校园" })).toHaveLength(1);
  });

  test("忽略大小写与首尾空格", () => {
    expect(L.filterItems(makeList(), { keyword: "type-c" })).toHaveLength(1);
    expect(L.filterItems(makeList(), { keyword: "  TYPe-C  " })).toHaveLength(1);
  });

  test("空关键词 = 不限制，返回全部（边界）", () => {
    expect(L.filterItems(makeList(), { keyword: "" })).toHaveLength(4);
    expect(L.filterItems(makeList(), { keyword: "   " })).toHaveLength(4);
    expect(L.filterItems(makeList(), {})).toHaveLength(4);
  });

  test("搜不到就返回空数组，绝不误报（不返回无关物品）", () => {
    expect(L.filterItems(makeList(), { keyword: "水杯" })).toEqual([]);
  });

  test("特殊字符 / 正则元字符不崩溃，也不误命中", () => {
    ["%", "(", ")", "[", "]", "*", ".*", "\\", "^$", "😀", "'", '"', "1' OR '1'='1"].forEach((k) => {
      expect(() => L.filterItems(makeList(), { keyword: k })).not.toThrow();
    });
    expect(L.filterItems(makeList(), { keyword: ".*" })).toEqual([]);
  });

  test("物品列表为空时不报错，返回空数组（边界）", () => {
    expect(L.filterItems([], { keyword: "校园卡" })).toEqual([]);
    expect(L.filterItems(null, { keyword: "校园卡" })).toEqual([]);
  });
});

describe("类型筛选", () => {
  test("只看寻物 / 只看招领", () => {
    expect(L.filterItems(makeList(), { type: "lost" }).every((i) => i.type === "lost")).toBe(true);
    expect(L.filterItems(makeList(), { type: "found" })).toHaveLength(2);
  });

  test("首页只有两个标签（没有「全部」），搜索页有三个选项", () => {
    expect(L.homeTypeOptions()).toEqual(["lost", "found"]);
  });
});

describe("分类筛选", () => {
  test("按分类过滤，且分类清单与页面/表单一致", () => {
    expect(L.filterItems(makeList(), { category: "电子产品" }).map((i) => i.id)).toEqual([3]);
    expect(HOME_CATEGORIES).toEqual(["校园卡", "钥匙", "电子产品", "书籍", "生活用品", "其他"]);
    expect(SEARCH_CATEGORIES).toEqual(HOME_CATEGORIES);
    expect(FORM_CATEGORIES).toEqual(HOME_CATEGORIES);
  });

  test("示例数据里每个分类都有条目（点分类不会点出空列表）", () => {
    HOME_CATEGORIES.forEach((name) => {
      expect(SEED.filter((i) => i.category === name).length).toBeGreaterThan(0);
    });
  });
});

describe("组合筛选与排序", () => {
  test("关键词 + 类型 + 分类 是「与」的关系", () => {
    expect(L.filterItems(makeList(), { keyword: "校园卡", type: "found", category: "电子产品" })).toEqual([]);
    expect(L.filterItems(makeList(), { keyword: "黑胶带", type: "found", category: "电子产品" })).toHaveLength(1);
  });

  test("列表按日期倒序，同一天按发布时间倒序（稳定排序）", () => {
    const sorted = L.sortItems(makeList());
    expect(sorted[0].date).toBe("2026-09-24");
    const sameDay = L.sortItems([
      makeItem({ id: 21, date: "2026-09-28", createdAt: "2026-09-28T08:00:00+08:00" }),
      makeItem({ id: 22, date: "2026-09-28", createdAt: "2026-09-28T20:00:00+08:00" })
    ]);
    expect(sameDay.map((i) => i.id)).toEqual([22, 21]);
  });

  test("我的发布：最近发布在前", () => {
    const mine = L.sortMineItems([makeItem({ id: 2, name: "黑色折叠伞" }), makeItem({ id: 4, name: "白色蓝牙耳机" })]);
    expect(mine.map((i) => i.name)).toEqual(["白色蓝牙耳机", "黑色折叠伞"]);
  });
});

/* ============================ 2. 状态流转（单向、不可逆、限本人） ============================ */

describe("修改信息状态", () => {
  test("寻物：寻找中 → 已找回", () => {
    const list = makeList();
    const r = L.changeStatus(list, 1, "已找回");
    expect(r).toMatchObject({ ok: true, from: "寻找中", to: "已找回" });
    expect(list[0].status).toBe("已找回");
    expect(L.isResolved(list[0].status)).toBe(true);
  });

  test("招领：待认领 → 已归还", () => {
    const r = L.changeStatus(makeList(), 2, null);
    expect(r).toMatchObject({ ok: true, to: "已归还" });
  });

  test("不可逆：已归还/已找回 不能再次修改，也不能回到进行中", () => {
    const list = makeList();
    list.push(makeItem({ id: 5, name: "已归还的雨伞", type: "found", status: "已归还", isMine: true }));
    const again = L.changeStatus(list, 5, null);
    expect(again.ok).toBe(false);
    expect(again.reason).toContain("已归还");
    expect(L.changeStatus(list, 5, "待认领").ok).toBe(false);
    expect(list[4].status).toBe("已归还");
  });

  test("只能改自己发布的信息（防越权）", () => {
    const list = makeList();
    const r = L.changeStatus(list, 3, null);      // id=3 是别人的
    expect(r).toMatchObject({ ok: false, reason: "只能修改自己发布的信息" });
    expect(list[2].status).toBe("待认领");
  });

  test("目标状态不合法时拒绝，且不污染数据", () => {
    const list = makeList();
    expect(L.changeStatus(list, 1, "已归还").ok).toBe(false);
    expect(list[0].status).toBe("寻找中");
  });

  test("不存在的 id 不会崩", () => {
    expect(() => L.changeStatus(makeList(), 999, null)).not.toThrow();
    expect(L.changeStatus(makeList(), 999, null).ok).toBe(false);
  });

  test("canChangeStatus 给出下一步该改成什么", () => {
    expect(L.canChangeStatus(makeItem({ type: "lost", status: "寻找中" }))).toEqual({ ok: true, nextStatus: "已找回" });
    expect(L.canChangeStatus(makeItem({ type: "found", status: "待认领" }))).toEqual({ ok: true, nextStatus: "已归还" });
    expect(L.canChangeStatus(null).ok).toBe(false);
  });

  test("兼容历史状态「已找到」也视为已结束", () => {
    expect(L.isResolved("已找到")).toBe(true);
    expect(L.isResolved("寻找中")).toBe(false);
  });
});

/* ============================ 3. 数据格式化（不出 undefined/null） ============================ */

describe("展示格式化", () => {
  test("卡片标题 = 类型｜名称（全角竖线）", () => {
    expect(L.cardTitle(makeItem())).toBe("寻物｜蓝色校园卡");
    expect(L.cardTitle(makeItem({ type: "found", name: "黑色折叠伞" }))).toBe("招领｜黑色折叠伞");
  });

  test("日期格式：2026-09-23 → 9月23日；非法/空值原样返回", () => {
    expect(L.formatDateShort("2026-09-23")).toBe("9月23日");
    expect(L.formatDateShort("2026-12-05")).toBe("12月5日");
    expect(L.formatDateShort("")).toBe("");
    expect(L.formatDateShort("这不是日期")).toBe("这不是日期");
  });

  test("联系方式缺失或为空时也不会显示 undefined/null", () => {
    const dirty = [makeItem({ contact: undefined }), makeItem({ contact: null }), makeItem({ contact: "" })];
    dirty.forEach((item) => {
      const shown = String(item.contact == null ? "" : item.contact);
      expect(shown).not.toMatch(/undefined|null/);
    });
  });

  test("字段缺失时各行文案不出现 undefined", () => {
    const broken = makeItem({ name: undefined, location: undefined, date: "", status: undefined });
    [L.cardTitle(broken), L.metaWithDate(broken), L.metaWithStatus(broken), L.statusLine(broken),
     L.detailTypeLabel(broken), L.imagePlaceholder(broken)].forEach((text) => {
      expect(text).not.toMatch(/undefined|null/);
    });
  });

  test("结果页标题与条数文案", () => {
    expect(L.resultsTitle("校园卡", "all")).toBe("“校园卡”的搜索结果");
    expect(L.resultsTitle("", "书籍")).toBe("书籍的搜索结果");
    expect(L.resultsTitle("", "all")).toBe("搜索结果");
    expect(L.resultsCount(0)).toBe("找到0条相关信息");
    expect(L.resultsCount("2")).toBe("找到2条相关信息");
  });

  test("详情页字段名随类型变化", () => {
    expect(L.locationFieldOf("lost")).toBe("丢失地点");
    expect(L.locationFieldOf("found")).toBe("拾取地点");
    expect(L.dateFieldOf("found")).toBe("拾取日期");
  });
});

/* ============================ 4. 表单校验（脏数据不进系统） ============================ */

describe("发布表单校验", () => {
  test("六项必填都空缺时逐项报错，并定位第一个字段", () => {
    const r = L.validatePublish({ type: "lost" }, "2026-09-28");
    expect(r.ok).toBe(false);
    expect(r.firstField).toBe("name");
    ["name", "category", "location", "date", "description", "contact"].forEach((f) => {
      expect(r.errors[f]).toBeTruthy();
    });
  });

  test("合法数据通过", () => {
    expect(L.validatePublish(validValues(), "2026-09-28").ok).toBe(true);
  });

  test("物品名称长度限制（太短 / 太长）", () => {
    expect(L.validatePublish(validValues({ name: "卡" }), "2026-09-28").ok).toBe(false);
    expect(L.validatePublish(validValues({ name: "卡".repeat(31) }), "2026-09-28").ok).toBe(false);
  });

  test("联系方式：太短会被拦截；QQ/微信/邮箱/手机号等常见写法都能通过", () => {
    expect(L.validatePublish(validValues({ contact: "QQ" }), "2026-09-28").ok).toBe(false);
    ["QQ：12******34", "微信：abc*****01", "邮箱：student@example.com", "手机：138****0000"].forEach((c) => {
      expect(L.validatePublish(validValues({ contact: c }), "2026-09-28").ok).toBe(true);
    });
  });

  test("日期：不能晚于今天，且挡住不存在的日期", () => {
    expect(L.validatePublish(validValues({ date: "2026-09-29" }), "2026-09-28").errors.date).toContain("不能晚于今天");
    expect(L.validatePublish(validValues({ date: "2026-02-30" }), "2026-09-28").errors.date).toBeTruthy();
    expect(L.validatePublish(validValues({ date: "2026-9-1" }), "2026-09-28").errors.date).toBeTruthy();
  });

  test("描述长度 5~200", () => {
    expect(L.validatePublish(validValues({ description: "太短" }), "2026-09-28").errors.description).toBeTruthy();
  });

  test("分类必须是表单可选项", () => {
    expect(L.validatePublish(validValues({ category: "随便写的" }), "2026-09-28").errors.category).toBeTruthy();
    expect(L.validatePublish(validValues({ category: "书籍" }), "2026-09-28").ok).toBe(true);
  });

  test("图片：只收图片格式，且不超过 2MB", () => {
    expect(L.validateImageMeta(null).ok).toBe(true);
    expect(L.validateImageMeta({ type: "image/png", size: 1024 }).ok).toBe(true);
    expect(L.validateImageMeta({ type: "text/plain", size: 1024 }).ok).toBe(false);
    expect(L.validateImageMeta({ type: "image/png", size: 3 * 1024 * 1024 }).ok).toBe(false);
  });

  test("todayString 生成 YYYY-MM-DD（跨 realm 的 Date 也认）", () => {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const expectToday = d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
    expect(L.todayString()).toBe(expectToday);                       // 不传参 → 今天
    expect(L.todayString("随便传个非 Date")).toBe(expectToday);       // 非法入参 → 回退今天
    const dateInLogicRealm = vm.runInContext("new Date(2026, 8, 5)", ctx);   // 在被测上下文里造 Date
    expect(L.todayString(dateInLogicRealm)).toBe("2026-09-05");
  });
});

/* ============================ 5. 数据组装（提交前字段完整、类型正确） ============================ */

describe("新增信息的组装", () => {
  test("createItem 生成的字段完整、类型正确、状态按类型取默认值", () => {
    const created = L.createItem(validValues(), makeList());
    expect(Object.keys(created).sort()).toEqual(
      ["category", "contact", "createdAt", "date", "description", "id", "image", "isMine", "location", "name", "status", "type"].sort()
    );
    expect(typeof created.id).toBe("number");
    expect(created.id).toBe(5);
    expect(created.status).toBe("寻找中");
    expect(created.isMine).toBe(true);
    expect(new Date(created.createdAt).toString()).not.toBe("Invalid Date");
  });

  test("招领的默认状态是待认领；字段前后空格会被清理", () => {
    const created = L.createItem(validValues({ type: "found", name: "  黑色雨伞  ", contact: " QQ：1 ****** " }), []);
    expect(created.status).toBe("待认领");
    expect(created.name).toBe("黑色雨伞");
    expect(created.contact).toBe("QQ：1 ******");
  });

  test("新信息立刻能被搜到（组装 + 搜索联动）", () => {
    const list = makeList();
    list.push(L.createItem(validValues({ name: "银色保温杯", description: "杯身贴有卡通贴纸" }), list));
    expect(L.filterItems(list, { keyword: "保温杯" })).toHaveLength(1);
  });

  test("describeFilters 能说清当前筛选条件（用于空结果提示）", () => {
    expect(L.describeFilters({ keyword: "校园卡", type: "found", category: "电子产品" })).toContain("校园卡");
    expect(L.describeFilters({})).toBe("全部分类与类型");
  });
});