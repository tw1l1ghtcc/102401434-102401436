# 校园失物招领系统单元测试

## 运行方式

需要安装 Node.js。在项目根目录的 PowerShell 中执行：

```powershell
Set-Location .\unit-tests
npm.cmd install
npm.cmd test -- --runInBand
```

Windows 使用 npm.cmd，避免 npm.ps1 受到 PowerShell 执行策略限制。

## 工具与被测代码

使用 Jest 组织测试、断言和模拟函数，使用 jsdom 模拟页面和 localStorage。

测试直接读取项目根目录的 js/ 和 index.html，不复制正式源码。修改正式源码后，可直接重新运行测试。

## 测试范围

| 文件 | 测试内容 |
|---|---|
| tests/logic.test.js | 搜索、筛选、排序、校验、状态转换和信息组装 |
| tests/render.test.js | 联系方式展示、空列表、表单错误和存储失败提示 |
| tests/storage.test.js | 数据读写、非法 JSON、无效条目和写入失败 |
| tests/submit.test.js | 独立模拟提交模块 api.js 的请求组装及异常处理 |

api.js 尚未接入正式网页。其 9 项测试属于模拟接口测试，不代表网页已实现后台接口。正式网页使用 localStorage 保存数据。

当前结果：4 个测试文件、67 项测试全部通过。其中正式应用相关测试 58 项，独立模拟提交模块测试 9 项。

## 白盒测试与测试数据设计

根据函数内部的条件判断构造输入，覆盖正常、拒绝和异常分支：

- filterItems：匹配与不匹配、空关键词、空列表、类型与分类组合。
- validatePublish：有效输入、必填缺失、长度超限、不存在的日期及未来日期。
- changeStatus：本人和他人发布、进行中和已结束、非法目标状态及不存在的 ID。
- loadItems/saveItems：首次读取、正常往返、非法 JSON、非数组及写入失败。

测试数据结合正常值、等价类、边界条件和异常输入设计。上述用例不等同于已证明全部代码分支覆盖；图片、剪贴板、动画及真实浏览器操作仍需要手动验收。

## 测试限制

jsdom 不代替 Google Chrome 的实际运行测试。Jest 运行结束后仍可能提示异步操作未及时结束，这属于测试环境待清理的问题，应与测试通过结果分别记录。
