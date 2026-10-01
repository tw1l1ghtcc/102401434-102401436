/**
 * 逻辑层（纯函数，不碰 DOM 也不碰 localStorage）—— 文案与规则对齐 Figma 原型。
 *
 * 覆盖我负责的 7 项任务里的全部判断：
 *   - 关键词搜索：名称或描述命中（原型 02→03 的搜索流程）
 *   - 类型筛选：首页两个标签（寻物信息／招领信息）、搜索页三个选项（全部／寻物／招领）
 *   - 分类筛选：搜索页四个分类、首页五个分类快捷入口
 *   - 发布表单校验：六项必填 + 图片格式与体积
 *   - 状态流转：寻找中→已找回、待认领→已归还，且只能改自己发布的
 *   - 展示文案：卡片标题「寻物｜xxx」、日期「9月23日」、状态「状态：寻找中」、
 *     「找到N条相关信息」、详情页类型标签「招领信息｜待认领」等（与原型逐字一致）
 */
const itemLogic = (function () {
  /* ------------------------------ 基础工具 ------------------------------ */

  function normalizeText(value) {
    return String(value == null ? "" : value).trim().toLowerCase();
  }

  function trimText(value) {
    return String(value == null ? "" : value).trim();
  }

  function typeInfo(type) {
    return ITEM_TYPES[type] || ITEM_TYPES.lost;
  }

  function labelOf(type) {
    return typeInfo(type).label;
  }

  function panelLabelOf(type) {
    return typeInfo(type).panelLabel;
  }

  function statusOf(type) {
    return typeInfo(type).status;
  }

  function resolvedStatusOf(type) {
    return typeInfo(type).resolvedStatus;
  }

  function locationFieldOf(type) {
    return typeInfo(type).locationField;
  }

  function dateFieldOf(type) {
    return typeInfo(type).dateField;
  }

  function isResolved(status) {
    return RESOLVED_STATUSES.indexOf(status) !== -1;
  }

  /* ------------------------------ 展示文案（对齐原型） ------------------------------ */

  /** 卡片 / 我的发布里的标题：寻物｜白色蓝牙耳机（原型用全角竖线）。 */
  function cardTitle(item) {
    return labelOf(item.type) + "｜" + trimText(item.name);
  }

  /** 首页与搜索结果卡片的副行：图书馆三楼 · 9月23日。 */
  function metaWithDate(item) {
    return trimText(item.location) + " · " + formatDateShort(item.date);
  }

  /** 我的发布卡片副行：教学楼A栋 · 寻找中（这里显示状态而不是日期）。 */
  function metaWithStatus(item) {
    return trimText(item.location) + " · " + trimText(item.status);
  }

  /** 卡片上的状态行：状态：寻找中（原型带「状态：」前缀）。 */
  function statusLine(item) {
    return "状态：" + trimText(item.status);
  }

  /** 结果页标题：「校园卡」的搜索结果（原型使用全角引号）。 */
  function resultsTitle(keyword, category) {
    const word = trimText(keyword);

    if (word) {
      return "“" + word + "”的搜索结果";
    }

    if (category && category !== ALL_CATEGORY) {
      return category + "的搜索结果";
    }

    return "搜索结果";
  }

  /** 结果条数：找到2条相关信息（原型写法，数字与「条」之间不留空格）。 */
  function resultsCount(count) {
    return "找到" + Math.max(0, Number(count) || 0) + "条相关信息";
  }

  /** 详情页类型标签：招领信息｜待认领。 */
  function detailTypeLabel(item) {
    return panelLabelOf(item.type) + "｜" + trimText(item.status);
  }

  /** 详情页图片占位文案：校园卡图片。 */
  function imagePlaceholder(item) {
    return trimText(item.name) + "图片";
  }

  /** 状态按钮文案：标记为已找回 / 已找回 ✓。 */
  function resolveButtonText(status) {
    return "标记为" + status;
  }

  function doneButtonText(status) {
    return trimText(status) + " ✓";
  }

  /** 2026-09-23 → 9月23日。 */
  function formatDateShort(value) {
    const text = trimText(value);
    const matched = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);

    if (!matched) {
      return text;
    }

    return Number(matched[2]) + "月" + Number(matched[3]) + "日";
  }

  /** 首页标签取值：'lost' / 'found'（原型是两个标签，没有"全部"）。 */
  function homeTypeOptions() {
    return ["lost", "found"];
  }

  /* ------------------------------ 搜索与筛选 ------------------------------ */

  /** 关键词命中：名称或描述包含即可，忽略大小写与首尾空格；空关键词不限制。 */
  function matchKeyword(item, keyword) {
    const needle = normalizeText(keyword);

    if (!needle) {
      return true;
    }

    if (!item) {
      return false;
    }

    return (
      normalizeText(item.name).indexOf(needle) !== -1 ||
      normalizeText(item.description).indexOf(needle) !== -1
    );
  }

  /** 新的在前；同一天按发布时间倒序，再按 id 倒序，保证顺序稳定。 */
  function sortItems(list) {
    return list.slice().sort(function (left, right) {
      const byDate = String(right.date || "").localeCompare(String(left.date || ""));

      if (byDate !== 0) {
        return byDate;
      }

      const byCreated = String(right.createdAt || "").localeCompare(String(left.createdAt || ""));

      if (byCreated !== 0) {
        return byCreated;
      }

      return (Number(right.id) || 0) - (Number(left.id) || 0);
    });
  }

  /** 我的发布：最近发布的排在前面（id 递增即发布顺序，与原型 07 屏的顺序一致）。 */
  function sortMineItems(list) {
    return list.slice().sort(function (left, right) {
      return (Number(right.id) || 0) - (Number(left.id) || 0);
    });
  }

  /** 关键词 + 类型 + 分类是"与"关系；任一为 all/空表示该维度不限制。 */
  function filterItems(list, filters) {
    const options = filters || {};
    const type = options.type || ALL_TYPE;
    const category = options.category || ALL_CATEGORY;
    const keyword = options.keyword || "";

    const matched = (list || []).filter(function (item) {
      if (!item) {
        return false;
      }

      if (type !== ALL_TYPE && item.type !== type) {
        return false;
      }

      if (category !== ALL_CATEGORY && item.category !== category) {
        return false;
      }

      return matchKeyword(item, keyword);
    });

    return sortItems(matched);
  }

  /** 把当前筛选条件说成人话，用于空结果提示。 */
  function describeFilters(filters) {
    const options = filters || {};
    const parts = [];

    if (options.keyword) {
      parts.push("关键词「" + trimText(options.keyword) + "」");
    }

    if (options.type && options.type !== ALL_TYPE) {
      parts.push("类型 " + labelOf(options.type));
    }

    if (options.category && options.category !== ALL_CATEGORY) {
      parts.push("分类 " + options.category);
    }

    return parts.length ? parts.join(" / ") : "全部分类与类型";
  }

  /* ------------------------------ 发布表单校验 ------------------------------ */

  function parseDate(value) {
    const text = trimText(value);

    if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
      return null;
    }

    const parts = text.split("-");
    const year = Number(parts[0]);
    const month = Number(parts[1]);
    const day = Number(parts[2]);
    const date = new Date(year, month - 1, day);

    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
      return null;
    }

    return date;
  }

  function todayString(now) {
    const date = now instanceof Date ? now : new Date();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return date.getFullYear() + "-" + month + "-" + day;
  }

  /** 图片元信息校验（只收类型与大小，方便脱离浏览器单测）。 */
  function validateImageMeta(meta) {
    const errors = {};

    if (!meta) {
      return { ok: true, errors: errors };
    }

    if (String(meta.type || "").indexOf("image/") !== 0) {
      errors.image = "图片格式不支持，请选择 jpg / png 之类的图片";
    } else if (Number(meta.size) > IMAGE_MAX_BYTES) {
      errors.image = "图片过大（超过 2MB），请压缩后再上传";
    }

    return { ok: Object.keys(errors).length === 0, errors: errors };
  }

  /**
   * 校验发布表单。values 含 type / name / category / location / date /
   * description / contact；image 单独走 validateImageMeta。
   */
  function validatePublish(values, today) {
    const input = values || {};
    const errors = {};
    const upperBound = trimText(today) || todayString();

    const name = trimText(input.name);
    const location = trimText(input.location);
    const description = trimText(input.description);
    const contact = trimText(input.contact);

    if (!name) {
      errors.name = "请输入物品名称";
    } else if (name.length < 2) {
      errors.name = "物品名称至少 2 个字";
    } else if (name.length > 30) {
      errors.name = "物品名称不要超过 30 个字";
    }

    if (!input.category) {
      errors.category = "请选择分类";
    } else if (FORM_CATEGORIES.indexOf(input.category) === -1) {
      errors.category = "物品分类不在可选范围内";
    }

    if (!location) {
      errors.location = "请输入丢失或拾取地点";
    } else if (location.length < 2) {
      errors.location = "地点至少 2 个字";
    } else if (location.length > 40) {
      errors.location = "地点不要超过 40 个字";
    }

    if (!trimText(input.date)) {
      errors.date = "请选择日期";
    } else if (!parseDate(input.date)) {
      errors.date = "日期格式应为 YYYY-MM-DD，且必须是真实存在的日期";
    } else if (trimText(input.date) > upperBound) {
      errors.date = "日期不能晚于今天";
    }

    if (!description) {
      errors.description = "请填写物品特征";
    } else if (description.length < 5) {
      errors.description = "物品描述至少 5 个字，写清特征更容易被认出";
    } else if (description.length > 200) {
      errors.description = "物品描述不要超过 200 个字";
    }

    if (!contact) {
      errors.contact = "请输入QQ或手机号";
    } else if (contact.length < 5) {
      errors.contact = "联系方式太短，请写清怎么联系你（如 QQ：12******34）";
    } else if (contact.length > 40) {
      errors.contact = "联系方式不要超过 40 个字";
    }

    const firstField = PUBLISH_FIELD_ORDER.filter(function (field) {
      return Boolean(errors[field]);
    })[0];

    return { ok: Object.keys(errors).length === 0, errors: errors, firstField: firstField || "" };
  }

  /* ------------------------------ 发布与状态流转 ------------------------------ */

  /** 生成新信息：id 取最大值 +1，状态按类型取默认值。 */
  function createItem(values, existingItems) {
    const input = values || {};
    const list = existingItems || [];
    const type = input.type === "found" ? "found" : "lost";
    const maxId = list.reduce(function (max, item) {
      return Math.max(max, Number(item && item.id) || 0);
    }, 0);

    return {
      id: maxId + 1,
      type: type,
      name: trimText(input.name),
      category: input.category,
      location: trimText(input.location),
      date: trimText(input.date),
      status: statusOf(type),
      description: trimText(input.description),
      contact: trimText(input.contact),
      image: typeof input.image === "string" ? input.image : "",
      isMine: true,
      createdAt: new Date().toISOString()
    };
  }

  /** 发布成功页的标题行：已发布「xxx」？—— 成功页文案固定，这里只用于提示。 */
  function summarizeItem(item) {
    if (!item) {
      return "";
    }

    return "「" + trimText(item.name) + "」（" + labelOf(item.type) + "）";
  }

  /** 是否能修改状态：必须是自己发布的且还没结束；目标状态由类型决定。 */
  function canChangeStatus(item) {
    if (!item) {
      return { ok: false, reason: "没有找到这条信息" };
    }

    if (!item.isMine) {
      return { ok: false, reason: "只能修改自己发布的信息" };
    }

    if (isResolved(item.status)) {
      return { ok: false, reason: "这条信息已经是「" + item.status + "」，不需要再修改" };
    }

    return { ok: true, nextStatus: resolvedStatusOf(item.type) };
  }

  /** 修改状态：寻找中 → 已找回、待认领 → 已归还。 */
  function changeStatus(list, itemId, nextStatus) {
    const item = (list || []).find(function (current) {
      return Number(current && current.id) === Number(itemId);
    });

    const allowed = canChangeStatus(item);

    if (!allowed.ok) {
      return { ok: false, reason: allowed.reason };
    }

    if (nextStatus && nextStatus !== allowed.nextStatus) {
      return { ok: false, reason: "状态只能改成「" + allowed.nextStatus + "」" };
    }

    const previous = item.status;
    item.status = allowed.nextStatus;

    return { ok: true, item: item, from: previous, to: allowed.nextStatus };
  }

  return {
    normalizeText: normalizeText,
    trimText: trimText,
    typeInfo: typeInfo,
    labelOf: labelOf,
    panelLabelOf: panelLabelOf,
    statusOf: statusOf,
    resolvedStatusOf: resolvedStatusOf,
    locationFieldOf: locationFieldOf,
    dateFieldOf: dateFieldOf,
    isResolved: isResolved,
    cardTitle: cardTitle,
    metaWithDate: metaWithDate,
    metaWithStatus: metaWithStatus,
    statusLine: statusLine,
    resultsTitle: resultsTitle,
    resultsCount: resultsCount,
    detailTypeLabel: detailTypeLabel,
    imagePlaceholder: imagePlaceholder,
    resolveButtonText: resolveButtonText,
    doneButtonText: doneButtonText,
    formatDateShort: formatDateShort,
    homeTypeOptions: homeTypeOptions,
    matchKeyword: matchKeyword,
    sortItems: sortItems,
    sortMineItems: sortMineItems,
    filterItems: filterItems,
    describeFilters: describeFilters,
    parseDate: parseDate,
    todayString: todayString,
    validateImageMeta: validateImageMeta,
    validatePublish: validatePublish,
    createItem: createItem,
    summarizeItem: summarizeItem,
    canChangeStatus: canChangeStatus,
    changeStatus: changeStatus
  };
})();
