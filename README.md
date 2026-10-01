# 校园失物招领系统

## 项目成员

- 102401434 包学丰
- 102401436 冯玄

## 项目说明

本项目是2026秋软件工程第二次结对作业。在第一次作业完成的需求分析和交互原型基础上，使用HTML、CSS和原生JavaScript实现校园失物招领系统。

项目采用纯静态Web方案，不依赖后台服务，数据通过浏览器`localStorage`保存在本地。

## 主要功能

- 浏览寻物和招领信息
- 查看物品详情及联系方式
- 根据关键词、信息类型和物品分类进行筛选
- 发布寻物信息
- 发布招领信息
- 查看自己发布的信息
- 将寻物信息修改为“已找回”
- 将招领信息修改为“已归还”
- 使用浏览器本地存储保存数据
- 兼容旧版本地存储数据

## 技术方案

- HTML5
- CSS3
- 原生JavaScript
- 浏览器localStorage
- Node.js测试脚本
- Jest与jsdom单元测试

## 项目结构

```text
102401434-102401436/
├─ index.html                 # 应用入口页面
├─ css/
│  └─ style.css              # 页面样式
├─ js/
│  ├─ data.js                # 示例数据和公共常量
│  ├─ storage.js             # 浏览器本地存储
│  ├─ logic.js               # 搜索、筛选、校验和状态处理
│  ├─ render.js              # 页面内容渲染
│  └─ app.js                 # 页面导航和事件绑定
├─ tests/
│  ├─ cases.js               # 基础测试用例
│  ├─ index.html             # 浏览器测试页面
│  └─ run-tests.js           # Node.js测试入口
├─ unit-tests/
│  ├─ tests/                 # Jest测试文件
│  ├─ api.js                 # 模拟提交接口
│  ├─ package.json
│  └─ README.md
├─ docs/
│  ├─ psp.md                 # PSP预估与实际耗时
│  ├─ psp-复盘.md            # PSP复盘
│  ├─ 上传时间表.md
│  └─ 设计核对清单.md
├─ README.md
└─ .gitignore
```

## 使用说明

### 直接运行

项目不需要构建和安装依赖，克隆仓库后直接打开`index.html`即可运行。

在Developer PowerShell中执行：

```powershell
git clone https://github.com/tw1l1ghtcc/102401434-102401436.git
Set-Location "102401434-102401436"
Start-Process .\index.html
```

也可以在文件资源管理器中双击`index.html`。

### 基本操作

1. 在首页切换“寻物信息”和“招领信息”。
2. 点击分类按钮查看对应分类的信息。
3. 进入搜索页，根据关键词、类型和分类查找物品。
4. 点击信息卡片查看详情和联系方式。
5. 通过底部“发布”入口发布寻物或招领信息。
6. 通过底部“我的”查看本人发布的信息。
7. 在“我的发布”中将信息标记为“已找回”或“已归还”。

## 本地存储说明

应用使用以下键保存物品数据：

```text
campus-lost-found-items
```

刷新或重新打开页面后，已经发布的信息和修改后的状态不会丢失。

如果需要恢复项目自带的示例数据，可以在浏览器开发者工具控制台执行：

```javascript
localStorage.removeItem("campus-lost-found-items");
location.reload();
```

## 测试方法

### 基础测试

在项目根目录执行：

```powershell
node tests/run-tests.js
```

当前基础测试结果为35项全部通过。

### Jest单元测试

执行：

```powershell
Set-Location .\unit-tests
npm install
npm test -- --runInBand
```

当前Jest测试结果为4个测试文件、67项测试全部通过。

## 项目分工

### 包学丰

- 建立项目骨架
- 实现首页信息浏览
- 实现物品详情查看
- 实现浏览器本地存储
- 整理README和项目文档

### 冯玄

- 实现关键词搜索
- 实现类型和分类筛选
- 实现寻物与招领发布
- 实现“我的发布”
- 实现信息状态修改
- 完善页面样式和测试用例

## GitHub协作记录

项目通过分支、Fork和Pull Request完成协作开发。

- PR #1：完成首页基础布局和示例信息展示
- PR #2：实现物品详情查看功能
- PR #3：实现浏览器本地数据存储
- PR #4：合并Fork仓库中的搜索、筛选、发布和状态修改等功能

## 需求与原型

- [第一次作业GitHub仓库](https://github.com/tw1l1ghtcc/campus-lost-found)
- [Figma交互原型](https://www.figma.com/design/tTIMlQHjhwiKaSm3qshgPh/Untitled?node-id=0-1)
- [第二次作业GitHub仓库](https://github.com/tw1l1ghtcc/102401434-102401436)

## 说明

本项目主要用于课程作业展示，没有实现后台服务、实名认证、即时聊天和地图定位。联系方式和物品数据仅保存在当前浏览器中。