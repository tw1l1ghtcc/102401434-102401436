/**
 * 测试用例（环境无关：浏览器由 tests/index.html 加载，Node 由 run-tests.js 加载）
 *
 * 覆盖我负责的 7 项任务的验收点，另外把"与 Figma 原型逐字一致的展示文案"
 * 也写成断言，避免改代码时把原型文案改跑偏。
 */
const TEST_CASES = (function () {
  /* ------------------------------ 断言与夹具 ------------------------------ */

  function assert(condition, message) {
    if (!condition) {
      throw new Error(message);
    }
  }

  function assertEqual(actual, expected, message) {
    if (actual !== expected) {
      throw new Error(message + "（期望 " + JSON.stringify(expected) + "，实际 " + JSON.stringify(actual) + "）");
    }
  }

  /** 造一条测试数据，默认是"我发布的、寻找中的寻物信息"。 */
  function makeItem(overrides) {
    return Object.assign(
      {
        id: 1,
        type: "lost",
        name: "蓝色校园卡",
        category: "校园卡",
        location: "图书馆三楼",
        date: "2026-09-23",
        status: "寻找中",
        description: "校园卡装在透明卡套中，背面贴有蓝色标签。",
        contact: "QQ：12******34",
        image: "",
        isMine: true,
        createdAt: "2026-09-23T10:00:00+08:00"
      },
      overrides || {}
    );
  }

  function makeList() {
    return [
      makeItem({ id: 1 }),
      makeItem({
        id: 2,
        type: "found",
        name: "黑色折叠伞",
        category: "生活用品",
        status: "待认领",
        location: "第二食堂",
        date: "2026-09-24",
        description: "黑色长柄折叠伞，伞骨有一处轻微变形。",
        createdAt: "2026-09-24T10:00:00+08:00"
      }),
      makeItem({
        id: 3,
        type: "found",
        name: "Type-C 充电线",
        category: "电子产品",
        status: "待认领",
        location: "教学楼A栋302",
        date: "2026-09-23",
        description: "白色数据线，接口处缠有黑胶带",
        isMine: false,
        createdAt: "2026-09-23T09:00:00+08:00"
      }),
      makeItem({
        id: 4,
        type: "lost",
        name: "高等数学教材",
        category: "书籍",
        status: "已找回",
        location: "第一教学楼自习室",
        date: "2026-09-20",
        description: "封面写有姓名缩写，内页夹课程表",
        isMine: false,
        createdAt: "2026-09-20T10:00:00+08:00"
      })
    ];
  }

  function ids(list) {
    return list.map(function (item) {
      return item.id;
    });
  }

  function validValues(overrides) {
    return Object.assign(
      {
        type: "lost",
        name: "蓝色校园卡",
        category: "校园卡",
        location: "图书馆三楼",
        date: "2026-09-23",
        description: "校园卡装在透明卡套中，背面贴有蓝色标签。",
        contact: "QQ：12******34",
        image: ""
      },
      overrides || {}
    );
  }

  /* ------------------------------ 用例 ------------------------------ */

  const cases = [
    /* ---- 任务 3：关键词搜索 ---- */
    {
      name: "关键词搜索：命中物品名称",
      run: function () {
        const result = itemLogic.filterItems(makeList(), { keyword: "校园卡" });
        assertEqual(result.length, 1, "应只有 1 条命中");
        assertEqual(result[0].id, 1, "命中的应是蓝色校园卡");
      }
    },
    {
      name: "关键词搜索：命中物品描述里的关键词",
      run: function () {
        const result = itemLogic.filterItems(makeList(), { keyword: "黑胶带" });
        assertEqual(result.length, 1, "描述里含「黑胶带」的应被搜到");
        assertEqual(result[0].id, 3, "命中的应是 Type-C 充电线");
      }
    },
    {
      name: "关键词搜索：忽略大小写与首尾空格",
      run: function () {
        assertEqual(itemLogic.filterItems(makeList(), { keyword: "type-c" }).length, 1, "小写应命中");
        assertEqual(itemLogic.filterItems(makeList(), { keyword: "  TYPe-C  " }).length, 1, "大写加空格也应命中");
      }
    },
    {
      name: "关键词搜索：没有匹配时返回空数组",
      run: function () {
        assertEqual(itemLogic.filterItems(makeList(), { keyword: "不存在的物品xyz" }).length, 0, "应返回 0 条");
      }
    },
    {
      name: "关键词搜索：空关键词视为不限制",
      run: function () {
        assertEqual(itemLogic.filterItems(makeList(), { keyword: "   " }).length, 4, "空关键词应返回全部");
      }
    },

    /* ---- 任务 4：类型筛选 ---- */
    {
      name: "类型筛选：首页标签只有「寻物信息／招领信息」两项",
      run: function () {
        const options = itemLogic.homeTypeOptions();
        assertEqual(options.length, 2, "首页是两个标签，没有「全部」");
        assertEqual(options.join(","), "lost,found", "顺序应为寻物在前");
      }
    },
    {
      name: "类型筛选：只看寻物",
      run: function () {
        const result = itemLogic.filterItems(makeList(), { type: "lost" });
        assertEqual(result.length, 2, "寻物应有 2 条");
        assert(result.every(function (item) { return item.type === "lost"; }), "结果里不能混入招领");
      }
    },
    {
      name: "类型筛选：只看招领",
      run: function () {
        const result = itemLogic.filterItems(makeList(), { type: "found" });
        assertEqual(result.length, 2, "招领应有 2 条");
        assert(result.every(function (item) { return item.type === "found"; }), "结果里不能混入寻物");
      }
    },
    {
      name: "类型筛选：搜索页的「全部」",
      run: function () {
        assertEqual(itemLogic.filterItems(makeList(), { type: "all" }).length, 4, "全部应返回 4 条");
      }
    },

    /* ---- 任务 5：分类筛选 ---- */
    {
      name: "分类筛选：只看电子产品",
      run: function () {
        const result = itemLogic.filterItems(makeList(), { category: "电子产品" });
        assertEqual(result.length, 1, "电子产品应有 1 条");
        assertEqual(result[0].category, "电子产品", "分类必须匹配");
      }
    },
    {
      name: "分类清单：首页 5 个、搜索页 4 个、发布表单 6 个（对齐原型）",
      run: function () {
        assertEqual(HOME_CATEGORIES.join(","), "校园卡,钥匙,电子产品,书籍,生活用品,其他", "首页快捷入口应是六类");
        assertEqual(SEARCH_CATEGORIES.join(","), "校园卡,钥匙,电子产品,书籍,生活用品,其他", "搜索页筛选项应与首页一致");
        assertEqual(FORM_CATEGORIES.length, 6, "发布表单应能选到六类（含生活用品）");
        assert(FORM_CATEGORIES.indexOf("生活用品") !== -1, "表单需要能选生活用品");
      }
    },
    {
      name: "组合筛选：关键词 + 类型 + 分类 同时生效",
      run: function () {
        assertEqual(
          itemLogic.filterItems(makeList(), { keyword: "校园卡", type: "found", category: "电子产品" }).length,
          0,
          "三个条件互斥时应无结果"
        );

        const hit = itemLogic.filterItems(makeList(), { keyword: "黑胶带", type: "found", category: "电子产品" });
        assertEqual(hit.length, 1, "三条件同时命中应有 1 条");
        assertEqual(hit[0].id, 3, "命中的应是 Type-C 充电线");
      }
    },
    {
      name: "排序：日期新的在前，同一天按发布时间倒序",
      run: function () {
        const mixed = itemLogic.sortItems([
          makeItem({ id: 11, date: "2026-09-20" }),
          makeItem({ id: 12, date: "2026-09-28" }),
          makeItem({ id: 13, date: "2026-09-24" })
        ]);
        assertEqual(ids(mixed).join(","), "12,13,11", "应按日期从新到旧排序");

        const sameDay = itemLogic.sortItems([
          makeItem({ id: 21, date: "2026-09-28", createdAt: "2026-09-28T08:00:00+08:00" }),
          makeItem({ id: 22, date: "2026-09-28", createdAt: "2026-09-28T20:00:00+08:00" })
        ]);
        assertEqual(ids(sameDay).join(","), "22,21", "同一天里后发布的排前面");
      }
    },

    {
      name: "排序：我的发布按最近发布在前（与原型 07 屏顺序一致）",
      run: function () {
        const mine = itemLogic.sortMineItems([
          makeItem({ id: 2, name: "黑色折叠伞", type: "found", status: "待认领" }),
          makeItem({ id: 4, name: "白色蓝牙耳机" })
        ]);
        assertEqual(mine[0].name, "白色蓝牙耳机", "后发布（id 更大）的应排前面");
        assertEqual(mine[1].name, "黑色折叠伞", "先发布的排后面");
      }
    },
    /* ---- 与原型逐字一致的展示文案 ---- */
    {
      name: "文案：卡片标题「类型｜名称」（全角竖线）",
      run: function () {
        assertEqual(itemLogic.cardTitle(makeItem()), "寻物｜蓝色校园卡", "寻物卡片标题");
        assertEqual(
          itemLogic.cardTitle(makeItem({ type: "found", name: "黑色折叠伞" })),
          "招领｜黑色折叠伞",
          "招领卡片标题"
        );
      }
    },
    {
      name: "文案：卡片副行「地点 · 月日」与「地点 · 状态」",
      run: function () {
        assertEqual(itemLogic.metaWithDate(makeItem()), "图书馆三楼 · 9月23日", "首页/结果卡片副行");
        assertEqual(
          itemLogic.metaWithStatus(makeItem({ type: "found", status: "待认领", location: "第二食堂" })),
          "第二食堂 · 待认领",
          "我的发布卡片副行"
        );
      }
    },
    {
      name: "文案：日期格式 2026-09-23 → 9月23日",
      run: function () {
        assertEqual(itemLogic.formatDateShort("2026-09-23"), "9月23日", "月份和日期都不补零");
        assertEqual(itemLogic.formatDateShort("2026-12-05"), "12月5日", "12 月 5 日");
        assertEqual(itemLogic.formatDateShort(""), "", "空值原样返回");
      }
    },
    {
      name: "文案：状态行、结果页标题与条数、详情页类型标签",
      run: function () {
        assertEqual(itemLogic.statusLine(makeItem()), "状态：寻找中", "状态行带「状态：」前缀");
        assertEqual(itemLogic.resultsTitle("校园卡", "all"), "“校园卡”的搜索结果", "结果页标题用全角引号");
        assertEqual(itemLogic.resultsTitle("", "书籍"), "书籍的搜索结果", "没有关键词时用分类作标题");
        assertEqual(itemLogic.resultsCount(2), "找到2条相关信息", "条数文案与原型一致");
        assertEqual(
          itemLogic.detailTypeLabel(makeItem({ type: "found", status: "待认领" })),
          "招领信息｜待认领",
          "详情页类型标签"
        );
        assertEqual(itemLogic.imagePlaceholder(makeItem()), "蓝色校园卡图片", "图片占位文案");
      }
    },
    {
      name: "文案：详情页字段名随类型变化（丢失/拾取）",
      run: function () {
        assertEqual(itemLogic.locationFieldOf("lost"), "丢失地点", "寻物用丢失地点");
        assertEqual(itemLogic.locationFieldOf("found"), "拾取地点", "招领用拾取地点");
        assertEqual(itemLogic.dateFieldOf("lost"), "丢失日期", "寻物用丢失日期");
        assertEqual(itemLogic.dateFieldOf("found"), "拾取日期", "招领用拾取日期");
      }
    },
    {
      name: "文案：状态按钮 标记为已找回 / 已找回 ✓",
      run: function () {
        assertEqual(itemLogic.resolveButtonText("已找回"), "标记为已找回", "未处理时的按钮文案");
        assertEqual(itemLogic.doneButtonText("已归还"), "已归还 ✓", "处理完成后的按钮文案");
      }
    },

    /* ---- 任务 1、2：发布表单校验 ---- */
    {
      name: "发布校验：空表单逐个报错并定位第一个字段",
      run: function () {
        const result = itemLogic.validatePublish({ type: "lost" }, "2026-09-28");
        assertEqual(result.ok, false, "空表单不应通过");
        assertEqual(result.firstField, "name", "应聚焦到第一个必填项");
        ["name", "category", "location", "date", "description", "contact"].forEach(function (field) {
          assert(Boolean(result.errors[field]), "缺少 " + field + " 的错误提示");
        });
      }
    },
    {
      name: "发布校验：六项必填都填好就通过",
      run: function () {
        const result = itemLogic.validatePublish(validValues(), "2026-09-28");
        assertEqual(result.ok, true, "合法表单应通过：" + JSON.stringify(result.errors));
      }
    },
    {
      name: "发布校验：日期不能晚于今天、挡住不存在的日期",
      run: function () {
        assert(Boolean(itemLogic.validatePublish(validValues({ date: "2026-09-29" }), "2026-09-28").errors.date), "明天不应通过");
        assert(Boolean(itemLogic.validatePublish(validValues({ date: "2026-02-30" }), "2026-09-28").errors.date), "2 月 30 日不应通过");
      }
    },
    {
      name: "发布校验：描述太短、联系方式太短要提示",
      run: function () {
        assert(Boolean(itemLogic.validatePublish(validValues({ description: "蓝色" }), "2026-09-28").errors.description), "描述过短应提示");
        assert(Boolean(itemLogic.validatePublish(validValues({ contact: "QQ" }), "2026-09-28").errors.contact), "联系方式过短应提示");
      }
    },
    {
      name: "发布校验：分类必须是表单可选项",
      run: function () {
        assert(Boolean(itemLogic.validatePublish(validValues({ category: "不存在的分类" }), "2026-09-28").errors.category), "非法分类应报错");
        assertEqual(itemLogic.validatePublish(validValues({ category: "生活用品" }), "2026-09-28").ok, true, "生活用品应可选");
      }
    },
    {
      name: "图片校验：只收图片格式且不超过 2MB",
      run: function () {
        assertEqual(itemLogic.validateImageMeta(null).ok, true, "不选图片应通过");
        assertEqual(itemLogic.validateImageMeta({ type: "image/png", size: 1024 }).ok, true, "小图应通过");
        assertEqual(itemLogic.validateImageMeta({ type: "text/plain", size: 1024 }).ok, false, "非图片应被拒绝");
        assertEqual(itemLogic.validateImageMeta({ type: "image/png", size: 3 * 1024 * 1024 }).ok, false, "超过 2MB 应被拒绝");
      }
    },
    {
      name: "发布：新信息 id 递增、状态按类型取默认值、标记为本人发布",
      run: function () {
        const list = makeList();
        const lost = itemLogic.createItem(validValues(), list);
        assertEqual(lost.id, 5, "id 应是当前最大值 +1");

        list.push(lost);
        const found = itemLogic.createItem(validValues({ type: "found" }), list);
        assertEqual(found.id, 6, "入列后再发布，id 继续递增");
        assertEqual(found.status, "待认领", "招领默认状态应为待认领");
        assertEqual(lost.status, "寻找中", "寻物默认状态应为寻找中");
        assertEqual(lost.isMine, true, "自己发布的应标记为 isMine");
        assert(Boolean(lost.createdAt), "应记录发布时间");
      }
    },
    {
      name: "发布：新信息立刻能被关键词搜到（集成）",
      run: function () {
        const list = makeList();
        const created = itemLogic.createItem(validValues({ name: "银色保温杯", description: "杯身贴有卡通贴纸" }), list);
        list.push(created);

        const result = itemLogic.filterItems(list, { keyword: "保温杯" });
        assertEqual(result.length, 1, "新发布的信息应能被搜到");
        assertEqual(result[0].id, created.id, "搜到的应是刚发布的那条");
      }
    },

    /* ---- 任务 6：修改信息状态 ---- */
    {
      name: "状态修改：寻物 寻找中 → 已找回",
      run: function () {
        const list = makeList();
        const result = itemLogic.changeStatus(list, 1, "已找回");

        assertEqual(result.ok, true, "寻物应能改成已找回");
        assertEqual(result.from, "寻找中", "应记录原状态");
        assertEqual(result.to, "已找回", "应记录新状态");
        assertEqual(list[0].status, "已找回", "列表里的数据要真的被改掉");
        assertEqual(itemLogic.isResolved(list[0].status), true, "已找回应被视为已结束");
      }
    },
    {
      name: "状态修改：招领 待认领 → 已归还",
      run: function () {
        const list = makeList();
        const result = itemLogic.changeStatus(list, 2, null);
        assertEqual(result.ok, true, "招领应能改成已归还");
        assertEqual(result.to, "已归还", "招领的结束状态是已归还");
      }
    },
    {
      name: "状态修改：不能改别人的信息",
      run: function () {
        const list = makeList();
        const result = itemLogic.changeStatus(list, 3, null);
        assertEqual(result.ok, false, "不是自己发布的不应被修改");
        assertEqual(result.reason, "只能修改自己发布的信息", "应给出明确原因");
        assertEqual(list[2].status, "待认领", "数据不能被改动");
      }
    },
    {
      name: "状态修改：已结束的信息不能重复改",
      run: function () {
        const list = makeList();
        list.push(makeItem({ id: 5, name: "已经找回来的校园卡", status: "已找回", isMine: true }));

        const result = itemLogic.changeStatus(list, 5, null);
        assertEqual(result.ok, false, "已找回的信息不应再被修改");
        assert(result.reason.indexOf("已找回") !== -1, "原因里应带上当前状态：" + result.reason);
        assertEqual(list[4].status, "已找回", "数据不能被改动");
      }
    },
    {
      name: "状态修改：目标状态不合法时拒绝",
      run: function () {
        const list = makeList();
        const result = itemLogic.changeStatus(list, 1, "已归还");
        assertEqual(result.ok, false, "寻物不能改成已归还");
        assertEqual(list[0].status, "寻找中", "拒绝时数据保持原样");
      }
    },
    {
      name: "状态兼容：框架旧的「已找到」也视为已结束",
      run: function () {
        assertEqual(itemLogic.isResolved("已找到"), true, "已找到应视为已结束");
        assertEqual(itemLogic.isResolved("寻找中"), false, "寻找中不是已结束");
      }
    },
    {
      name: "筛选说明文案：能说清当前筛了什么",
      run: function () {
        const text = itemLogic.describeFilters({ keyword: "校园卡", type: "found", category: "电子产品" });
        assert(text.indexOf("校园卡") !== -1, "应包含关键词");
        assert(text.indexOf("招领") !== -1, "应包含类型的中文名");
        assert(text.indexOf("电子产品") !== -1, "应包含分类");
        assertEqual(itemLogic.describeFilters({}), "全部分类与类型", "没有筛选条件时给默认说法");
      }
    }
  ];

  return cases;
})();

// 供 Node 测试脚本从 vm 上下文里取用例（浏览器里直接读全局变量）
if (typeof globalThis !== "undefined") {
  globalThis.__TEST_CASES__ = TEST_CASES;
}
