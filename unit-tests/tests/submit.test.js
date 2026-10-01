/**
 * Jest 单元测试（三）：数据提交 —— 模拟网络请求（Mock API）
 * 覆盖：请求方法/路径/请求头、请求体字段组装与类型、成功返回、HTTP 失败、网络异常、
 *       缺字段不出网、环境不支持 fetch 时的降级提示。
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.join(__dirname, "..", "..");
// 独立 vm 上下文（同 worker 里多个测试文件不会互相污染全局）
const ctx = vm.createContext({ console: console });
vm.runInContext(fs.readFileSync(path.join(ROOT, "js/data.js"), "utf8"), ctx, { filename: "js/data.js" });
vm.runInContext(fs.readFileSync(path.join(ROOT, "js/logic.js"), "utf8"), ctx, { filename: "js/logic.js" });
vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "api.js"), "utf8"), ctx, { filename: "js/api.js" });

const L = vm.runInContext("itemLogic", ctx);
const api = vm.runInContext("itemApi", ctx);

const createdAt = L.createItem({
  type: "lost",
  name: "蓝色校园卡",
  category: "校园卡",
  location: "图书馆三楼",
  date: "2026-09-23",
  description: "透明卡套，背面贴有蓝色标签",
  contact: "QQ：12******34",
  image: ""
}, []);

/** 造一个 mock fetch：记录调用参数，并返回可控响应 */
const makeMockFetch = (response) =>
  jest.fn(() => Promise.resolve(response || { ok: true, status: 200, json: () => Promise.resolve({ id: 101 }) }));

describe("提交层：请求组装（Mock API）", () => {
  test("用 POST 提交到约定路径，并带上 JSON 请求头", async () => {
    const mockFetch = makeMockFetch();
    await api.submitItem(createdAt, { fetch: mockFetch });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe(api.ENDPOINT);
    expect(init.method).toBe("POST");
    expect(init.headers["Content-Type"]).toBe("application/json");
    expect(() => JSON.parse(init.body)).not.toThrow();
  });

  test("请求体字段完整、类型正确（不含前端内部字段 id / isMine / createdAt）", async () => {
    const mockFetch = makeMockFetch();
    await api.submitItem(createdAt, { fetch: mockFetch });
    const payload = JSON.parse(mockFetch.mock.calls[0][1].body);

    expect(Object.keys(payload).sort()).toEqual(
      ["category", "contact", "date", "description", "image", "location", "name", "status", "type"].sort()
    );
    expect(payload).toMatchObject({
      type: "lost",
      name: "蓝色校园卡",
      category: "校园卡",
      location: "图书馆三楼",
      date: "2026-09-23",
      status: "寻找中"
    });
    expect(payload).not.toHaveProperty("isMine");
    expect(payload).not.toHaveProperty("createdAt");
  });

  test("提交前会清掉字段前后空格（脏数据不出网）", async () => {
    const mockFetch = makeMockFetch();
    await api.submitItem(Object.assign({}, createdAt, { name: "  黑色雨伞  ", contact: " QQ：1 ****** " }), { fetch: mockFetch });
    const payload = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(payload.name).toBe("黑色雨伞");
    expect(payload.contact).toBe("QQ：1 ******");
  });

  test("缺必填字段时直接拒绝，且不发请求", async () => {
    const mockFetch = makeMockFetch();
    await expect(api.submitItem(Object.assign({}, createdAt, { contact: "" }), { fetch: mockFetch })).rejects.toThrow(/缺少必填字段/);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  test("success：返回服务端 JSON", async () => {
    const mockFetch = makeMockFetch({ ok: true, status: 201, json: () => Promise.resolve({ id: 101, ok: true }) });
    await expect(api.submitItem(createdAt, { fetch: mockFetch })).resolves.toMatchObject({ id: 101 });
  });

  test("失败：HTTP 500 时 reject 并带上状态码（调用方可提示，不白屏）", async () => {
    const mockFetch = makeMockFetch({ ok: false, status: 500, json: () => Promise.resolve({}) });
    await expect(api.submitItem(createdAt, { fetch: mockFetch })).rejects.toThrow(/500/);
  });

  test("失败：网络异常（fetch 直接 throw）也能被捕获成 reject", async () => {
    const mockFetch = jest.fn(() => { throw new Error("NetworkError"); });
    await expect(api.submitItem(createdAt, { fetch: mockFetch })).rejects.toThrow(/NetworkError/);
  });

  test("环境不支持 fetch 时给出明确提示，而不是抛未捕获异常", async () => {
    await expect(api.submitItem(createdAt, { fetch: null })).rejects.toThrow(/不支持网络请求/);
  });

  test("buildPayload 对非对象入参会拒绝", () => {
    expect(() => api.buildPayload(null)).toThrow(/没有可提交的信息/);
  });
});