#!/usr/bin/env node
/**
 * 单元测试 + 结构契约检查（在浏览器外的 Node 里跑）
 *
 *   node tests/run-tests.js
 *
 * 两部分：
 *   1) 逻辑用例：把 js/data.js、js/logic.js、tests/cases.js 依次放进一个隔离的
 *      vm 上下文里执行（等价于浏览器里按顺序 <script> 引入），再逐条跑断言。
 *   2) 契约检查：扫 js/*.js 里用到的元素 id 和 data-* 钩子，确认 index.html
 *      里都有，避免"改了 id 忘了改 JS"这类低级错误。
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.join(__dirname, "..");

/* ------------------------------ 一、逻辑用例 ------------------------------ */

function loadContext() {
  const context = vm.createContext({ console: console });
  const files = ["js/data.js", "js/logic.js", "tests/cases.js"];

  files.forEach(function (relativePath) {
    const fullPath = path.join(root, relativePath);
    const code = fs.readFileSync(fullPath, "utf8");
    vm.runInContext(code, context, { filename: relativePath });
  });

  return context;
}

function runCases() {
  const context = loadContext();
  const cases = context.__TEST_CASES__;

  if (!Array.isArray(cases) || cases.length === 0) {
    console.error("✗ 没有取到测试用例（tests/cases.js 是否正常加载？）");
    process.exit(1);
  }

  let passed = 0;
  const failures = [];

  cases.forEach(function (testCase) {
    try {
      testCase.run();
      passed += 1;
      console.log("  ✓ " + testCase.name);
    } catch (error) {
      failures.push({ name: testCase.name, message: error && error.message });
      console.log("  ✗ " + testCase.name + "\n      " + (error && error.message));
    }
  });

  console.log("");
  console.log("逻辑用例：" + passed + "/" + cases.length + " 通过");

  return { total: cases.length, passed: passed, failures: failures };
}

/* ------------------------------ 二、结构契约 ------------------------------ */

function collectSourceFiles() {
  return ["js/data.js", "js/storage.js", "js/logic.js", "js/render.js", "js/app.js"];
}

function checkContract() {
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const htmlIds = new Set(
    (html.match(/\bid="[^"]+"/g) || []).map(function (match) {
      return match.replace(/\bid="|"$/g, "");
    })
  );

  const problems = [];

  collectSourceFiles().forEach(function (relativePath) {
    const source = fs.readFileSync(path.join(root, relativePath), "utf8");
    const usedIds = source.match(/getElementById\("[^"]+"\)/g) || [];

    usedIds.forEach(function (expression) {
      const id = expression.replace(/getElementById\("|"\)$/g, "");

      if (!htmlIds.has(id)) {
        problems.push(relativePath + " 引用了不存在的 id：" + id);
      }
    });
  });

  // data-* 钩子：JS 里按属性选择器找到的元素，必须在 HTML 里存在
  const hooks = [
    { pattern: /data-view/g, label: "[data-view]" },
    { pattern: /data-goto/g, label: "[data-goto]" },
    { pattern: /data-publish-type/g, label: "[data-publish-type]" },
    // data-action 只出现在 render.js 生成的卡片模板里，所以只要求它出现在渲染层代码中
    { pattern: /data-action/g, label: "[data-action]", generatedInJs: true },
    { pattern: /data-type/g, label: "[data-type]" },
    { pattern: /data-error-for/g, label: "[data-error-for]" }
  ];

  hooks.forEach(function (hook) {
    if (hook.generatedInJs) {
      const renderSource = fs.readFileSync(path.join(root, "js/render.js"), "utf8");

      ["detail", "resolve"].forEach(function (action) {
        if (renderSource.indexOf('data-action="' + action + '"') === -1) {
          problems.push("render.js 没有生成 data-action=\"" + action + "\" 的按钮");
        }
      });

      return;
    }

    const inHtml = hook.pattern.test(html);
    hook.pattern.lastIndex = 0;

    const inJs = collectSourceFiles().some(function (relativePath) {
      const source = fs.readFileSync(path.join(root, relativePath), "utf8");
      hook.pattern.lastIndex = 0;
      const found = hook.pattern.test(source);
      hook.pattern.lastIndex = 0;
      return found;
    });

    if (inJs && !inHtml) {
      problems.push("JS 用到 " + hook.label + "，但 index.html 里没有对应的钩子");
    }
  });

  // 每个必填字段都要有对应的错误提示位
  collectSourceFiles().forEach(function (relativePath) {
    const source = fs.readFileSync(path.join(root, relativePath), "utf8");
    const fields = source.match(/data-error-for="[^"]+"/g) || [];

    fields.forEach(function (expression) {
      const field = expression.replace(/data-error-for="|"$/g, "");
      const declared = /FIELD_INPUT_IDS[\s\S]*?\};/.test(source);

      // JS 里用拼接方式生成的选择器（'[data-error-for="' + name + '"]'）不算字面量字段名
      if (!/^[a-z]+$/.test(field)) {
        return;
      }

      if (!declared && !htmlIds.has("publish-" + field)) {
        problems.push(relativePath + " 的字段 " + field + " 没有对应的输入元素");
      }
    });
  });

  console.log("契约检查：" + (problems.length === 0 ? "通过" : problems.length + " 处问题"));
  problems.forEach(function (problem) {
    console.log("  ✗ " + problem);
  });

  return problems;
}

/* ------------------------------ 主流程 ------------------------------ */

console.log("校园失物招领 —— 逻辑与结构检查");
console.log("");
const result = runCases();
console.log("");
const problems = checkContract();
console.log("");

const failed = result.failures.length + problems.length;
console.log(failed === 0 ? "全部通过 ✓" : "有 " + failed + " 处需要修复 ✗");
process.exit(failed === 0 ? 0 : 1);
