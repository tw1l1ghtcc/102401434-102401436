# 校园失物招领 · Jest 单元测试（隔离目录）

把单元测试单独放一个目录，不混进主项目；**被测源码不复制**：测试直接加载项目根的 `js/`（data/logic/storage/render/app）与 `index.html`，只有提交层 `api.js` 放在本目录（应用尚未接入）。

## 怎么跑

```
npm install
npm test          # 等价于 npx jest
```

## 覆盖的四个维度

| 维度 | 对应测试文件 | 要点 |
|---|---|---|
| 1. 核心业务逻辑 | `tests/logic.test.js` | 关键词搜索（名称/描述/模糊/大小写空格/空关键词/搜不到/特殊字符与正则元字符/空列表）、类型筛选、分类筛选、组合筛选、排序；状态流转单向不可逆、限本人发布、非法目标拒绝、数据不被污染；卡片标题/日期/字段名等格式化不缺 undefined |
| 2. 表单校验与数据提交 | `tests/logic.test.js` + `tests/submit.test.js` | 六项必填逐项报错并定位首字段、长度与日期规则、分类白名单、图片格式与 2MB 上限；联系方式（QQ/微信/邮箱/手机）非空与长度；`buildPayload` 字段白名单；**Mock API** 验证 POST 路径/请求头/请求体字段与类型、HTTP 500 与网络异常、缺字段不发请求 |
| 3. 可维护性 | 全部 | 被测的都是纯函数（`filterItems / changeStatus / validatePublish / createItem`），改样式或换框架后跑一遍即可回归 |
| 4. 边界与异常 | `tests/logic.test.js` + `tests/storage.test.js` | 空关键词=全部；空列表/ null 不报错；脏数据（非法 JSON、非数组、混入无效条目）回退示例数据；写入失败返回 false 不抛异常（前端可提示、不白屏） |

## 与主项目的关系

- 主项目 `102401434-102401436-html` 保持"已上传状态"，只保留原来自研的零依赖测试（`node tests/run-tests.js`）。
- 本目录的 `js/*.js` 是副本；主项目源码变动后重新复制一份即可（`js/api.js` 是提交层，主项目当前未引用，接入后端时再合并）。