/**
 * Jest 单元测试（二）：数据落库与异常降级
 * 覆盖：保存/读取往返、首次写入默认数据、数据损坏回退、写入失败不抛异常（等价于"接口失败前端不白屏"）
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.join(__dirname, "..", "..");   // 指向项目根：直接测试 js/ 下的真实源码
let store = {};
let failWrite = false;

// 用 vm 沙箱加载被测脚本，并把 localStorage 桩注入同一个上下文（浏览器里这两者是同一个全局对象）
const sandbox = {
  console: console,
  localStorage: {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
    setItem: (k, v) => {
      if (failWrite) throw new Error("QuotaExceededError: 存储空间不足");
      store[k] = String(v);
    },
    removeItem: (k) => { delete store[k]; },
    clear: () => { store = {}; }
  }
};
const ctx = vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(ROOT, "js/data.js"), "utf8"), ctx, { filename: "js/data.js" });
vm.runInContext(fs.readFileSync(path.join(ROOT, "js/storage.js"), "utf8"), ctx, { filename: "js/storage.js" });

const itemStorage = vm.runInContext("itemStorage", ctx);
const SEED = vm.runInContext("items", ctx);

beforeEach(() => { store = {}; failWrite = false; });

describe("本地存储", () => {
  test("首次读取会写入默认数据并返回一份副本", () => {
    const loaded = itemStorage.loadItems(SEED);
    expect(loaded).toHaveLength(SEED.length);
    expect(store[itemStorage.STORAGE_KEY]).toBeTruthy();
    expect(loaded).not.toBe(SEED);          // 返回副本，避免外部改动污染默认数据
  });

  test("保存后能原样读回（往返一致）", () => {
    const list = SEED.map((i) => Object.assign({}, i));
    list[0].status = "已找回";
    expect(itemStorage.saveItems(list)).toBe(true);
    expect(itemStorage.loadItems(SEED)[0].status).toBe("已找回");
  });

  test("存进去的字段完整（含 isMine/image/createdAt）", () => {
    itemStorage.saveItems(SEED);
    const loaded = itemStorage.loadItems(SEED);
    ["id", "type", "name", "category", "location", "date", "status", "description", "contact"].forEach((f) => {
      expect(loaded[0]).toHaveProperty(f);
    });
  });

  test("数据被改坏（不是数组）时回退默认数据，不抛异常", () => {
    store[itemStorage.STORAGE_KEY] = JSON.stringify({ oops: true });
    expect(() => itemStorage.loadItems(SEED)).not.toThrow();
    expect(itemStorage.loadItems(SEED)).toHaveLength(SEED.length);
  });

  test("JSON 解析失败（脏数据）时回退默认数据", () => {
    store[itemStorage.STORAGE_KEY] = "{ 这不是合法 JSON";
    expect(itemStorage.loadItems(SEED)).toHaveLength(SEED.length);
  });

  test("写入失败返回 false 而不是抛异常（前端可给提示，不白屏）", () => {
    failWrite = true;
    expect(() => itemStorage.saveItems(SEED)).not.toThrow();
    expect(itemStorage.saveItems(SEED)).toBe(false);
  });

  test("数组里混入无效条目时会被过滤掉", () => {
    store[itemStorage.STORAGE_KEY] = JSON.stringify([SEED[0], null, { name: "没有 id" }, "字符串"]);
    const loaded = itemStorage.loadItems(SEED);
    expect(loaded).toHaveLength(1);
    expect(loaded[0].id).toBe(SEED[0].id);
  });
});