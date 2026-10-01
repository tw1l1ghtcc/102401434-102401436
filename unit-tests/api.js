/**
 * 提交层：把"发布信息"组装成请求体并提交。
 *
 * 当前演示版本的数据落在浏览器 localStorage；这一层是可单测的提交抽象：
 * fetch 通过参数注入（默认用全局 fetch），因此单元测试里可以 Mock API，
 * 断言请求方法、路径、请求头与请求体字段，以及失败时的处理。
 */
const itemApi = (function () {
  const ENDPOINT = "/api/items";

  /** 只提交后端需要的字段，且校验必需字段齐全，避免脏数据出网。 */
  function buildPayload(item) {
    if (!item || typeof item !== "object") {
      throw new Error("提交失败：没有可提交的信息");
    }

    const payload = {
      type: item.type,
      name: String(item.name == null ? "" : item.name).trim(),
      category: item.category,
      location: String(item.location == null ? "" : item.location).trim(),
      date: item.date,
      description: String(item.description == null ? "" : item.description).trim(),
      contact: String(item.contact == null ? "" : item.contact).trim(),
      image: typeof item.image === "string" ? item.image : "",
      status: item.status
    };

    const missing = ["type", "name", "category", "location", "date", "description", "contact", "status"]
      .filter(function (key) { return !payload[key]; });

    if (missing.length) {
      throw new Error("提交失败：缺少必填字段 " + missing.join(", "));
    }

    return payload;
  }

  /**
   * 提交一条信息。options.fetch 可注入（测试用）；未提供时用全局 fetch。
   * 成功 resolve 服务端返回的 JSON；HTTP 非 2xx 或网络异常都 reject，交给调用方提示。
   */
  function submitItem(item, options) {
    const settings = options || {};
    // 显式传了 fetch（哪怕传 null）就以它为准：null 表示"这个环境不支持网络"
    const injected = Object.prototype.hasOwnProperty.call(settings, "fetch");
    const doFetch = injected ? settings.fetch : (typeof fetch === "function" ? fetch : null);

    if (typeof doFetch !== "function") {
      return Promise.reject(new Error("提交失败：当前环境不支持网络请求"));
    }

    let body;
    try {
      body = JSON.stringify(buildPayload(item));
    } catch (error) {
      return Promise.reject(error);
    }

    let request;
    try {
      request = doFetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body
      });
    } catch (error) {
      // 同步抛出的网络异常也要转成 reject，交给调用方统一提示
      return Promise.reject(error);
    }

    return Promise.resolve(request).then(function (response) {
      if (!response || !response.ok) {
        const status = response && response.status ? response.status : "未知";
        throw new Error("提交失败：服务端返回 " + status);
      }
      return typeof response.json === "function" ? response.json() : {};
    });
  }

  return { ENDPOINT: ENDPOINT, buildPayload: buildPayload, submitItem: submitItem };
})();
