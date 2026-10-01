# 校园失物招领系统

## 项目成员

- 102401434 包学丰
- 102401436 冯玄

## 项目说明

本项目是2026秋软件工程第二次结对作业，基于第一次作业完成的需求分析和原型，实现校园失物招领系统的核心功能。

## 主要功能

- 浏览寻物和招领信息
- 发布寻物信息
- 发布招领信息
- 搜索物品
- 查看详情及联系方式
- 修改信息状态

## 需求与原型

本项目基于第一次结对作业的需求分析和原型设计进行实现。

- [第一次作业GitHub仓库](https://github.com/tw1l1ghtcc/campus-lost-found)
- [Figma交互原型](https://www.figma.com/design/tTIMlQHjhwiKaSm3qshgPh/Untitled?node-id=0-1)

## 实现说明

本项目为 2026 秋软件工程第二次结对作业的 Web 实现，在浏览器直接打开 `index.html` 即可运行（纯静态、无需构建）。

- 页面与脚本：`index.html`、`css/style.css`、`js/`
  - `js/data.js` 数据模型与示例数据；`js/storage.js` 本地存储（兼容旧版数据，缺 `image`/`isMine`/`createdAt` 时回退示例数据）
  - `js/logic.js` 纯逻辑（关键词搜索、类型/分类筛选、表单校验、状态流转）；`js/render.js` 渲染层；`js/app.js` 视图与事件装配
- 测试：`tests/`（零依赖自研测试：`node tests/run-tests.js`）、`unit-tests/`（Jest 单元测试：`cd unit-tests && npm install && npm test`）
- 文档：`docs/`（PSP 表格、Figma 节点对照、复盘、时间表、设计核对清单）