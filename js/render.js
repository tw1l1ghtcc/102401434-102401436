/**
 * 渲染层：把数据画成与 Figma 原型一致的页面结构。
 * 只做"读数据 → 写 DOM"，文案与判断全部走 itemLogic。
 */
const itemRender = (function () {
  const els = {
    viewHome: document.getElementById("view-home"),
    viewSearch: document.getElementById("view-search"),
    viewResults: document.getElementById("view-results"),
    viewDetail: document.getElementById("view-detail"),
    viewPublish: document.getElementById("view-publish"),
    viewSuccess: document.getElementById("view-success"),
    viewMine: document.getElementById("view-mine"),
    homeTypeTabs: document.getElementById("home-type-tabs"),
    homeCategoryChips: document.getElementById("home-category-chips"),
    itemList: document.getElementById("item-list"),
    searchForm: document.getElementById("search-form"),
    searchKeyword: document.getElementById("search-keyword"),
    searchTypeChips: document.getElementById("search-type-chips"),
    searchCategoryChips: document.getElementById("search-category-chips"),
    resultsTitle: document.getElementById("results-title"),
    resultsCount: document.getElementById("results-count"),
    resultsList: document.getElementById("results-list"),
    detailTypeLabel: document.getElementById("detail-type-label"),
    detailImage: document.getElementById("detail-image"),
    detailImageText: document.getElementById("detail-image-text"),
    detailName: document.getElementById("detail-name"),
    detailLocationLabel: document.getElementById("detail-location-label"),
    detailLocation: document.getElementById("detail-location"),
    detailDateLabel: document.getElementById("detail-date-label"),
    detailDate: document.getElementById("detail-date"),
    detailDescription: document.getElementById("detail-description"),
    detailContact: document.getElementById("detail-contact"),
    copyContact: document.getElementById("copy-contact"),
    publishTypeTabs: document.getElementById("publish-type-tabs"),
    publishForm: document.getElementById("publish-form"),
    publishFormError: document.getElementById("publish-form-error"),
    uploadBoxText: document.getElementById("upload-box-text"),
    publishImagePreview: document.getElementById("publish-image-preview"),
    myList: document.getElementById("my-list"),
    bottomNav: document.getElementById("bottom-nav"),
    toaster: document.getElementById("toast")
  };

  /** 表单字段 → 元素 id（错误提示与 aria-invalid 用）。 */
  const FIELD_INPUT_IDS = {
    name: "publish-name",
    category: "publish-category",
    location: "publish-location",
    date: "publish-date",
    description: "publish-description",
    contact: "publish-contact",
    image: "publish-image"
  };

  const VIEWS = {
    home: "viewHome",
    search: "viewSearch",
    results: "viewResults",
    detail: "viewDetail",
    publish: "viewPublish",
    success: "viewSuccess",
    mine: "viewMine"
  };

  let toastTimer = null;

  /* ------------------------------ 小工具 ------------------------------ */

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function setText(element, text) {
    if (element) {
      element.textContent = text == null ? "" : String(text);
    }
  }

  function setHidden(element, hidden) {
    if (element) {
      element.hidden = Boolean(hidden);
    }
  }

  /** 状态配色：寻找中橙、待认领绿、已找回/已归还灰。 */
  function statusClassOf(item) {
    if (itemLogic.isResolved(item.status)) {
      return "is-done";
    }

    return item.type === "found" ? "is-found" : "is-lost";
  }

  /* ------------------------------ 三种卡片（对应原型 01/03/07 屏） ------------------------------ */

  /** 首页卡片：标题、地点 · 月日、状态：xx，整卡可点（原型热点覆盖整张卡）。 */
  function homeCardHtml(item) {
    return (
      '<article class="card card--tappable" role="button" tabindex="0" data-action="detail" data-item-id="' +
      escapeHtml(item.id) +
      '">' +
      '<h3 class="card__title">' + escapeHtml(item.name) + "</h3>" +
      '<p class="card__meta">' + escapeHtml(itemLogic.metaWithDate(item)) + "</p>" +
      '<p class="card__status ' + statusClassOf(item) + '">' + escapeHtml(itemLogic.statusLine(item)) + "</p>" +
      "</article>"
    );
  }

  /** 搜索结果卡片：标题是「类型｜名称」，其余与首页一致。 */
  function resultCardHtml(item) {
    return (
      '<article class="card card--compact card--tappable" role="button" tabindex="0" data-action="detail" data-item-id="' +
      escapeHtml(item.id) +
      '">' +
      '<h3 class="card__title">' + escapeHtml(itemLogic.cardTitle(item)) + "</h3>" +
      '<p class="card__meta">' + escapeHtml(itemLogic.metaWithDate(item)) + "</p>" +
      '<p class="card__status ' + statusClassOf(item) + '">' + escapeHtml(itemLogic.statusLine(item)) + "</p>" +
      "</article>"
    );
  }

  /** 我的发布卡片：副行显示「地点 · 状态」，下面是查看详情 + 标记为已找回/已归还。 */
  function mineCardHtml(item) {
    const allowed = itemLogic.canChangeStatus(item);
    const id = escapeHtml(item.id);
    const action = allowed.ok
      ? '<button type="button" class="btn btn-muted btn-small btn-resolve" data-action="resolve" data-item-id="' +
        id + '">' + escapeHtml(itemLogic.resolveButtonText(allowed.nextStatus)) + "</button>"
      : '<button type="button" class="btn btn-done btn-small btn-resolve" disabled>' +
        escapeHtml(itemLogic.doneButtonText(item.status)) + "</button>";

    return (
      '<article class="card card--compact">' +
      '<h3 class="card__title">' + escapeHtml(itemLogic.cardTitle(item)) + "</h3>" +
      '<p class="card__meta">' + escapeHtml(itemLogic.metaWithStatus(item)) + "</p>" +
      '<div class="card__actions">' +
      '<button type="button" class="btn btn-soft btn-small btn-detail" data-action="detail" data-item-id="' +
      id + '">查看详情</button>' +
      action +
      "</div>" +
      "</article>"
    );
  }

  function emptyStateHtml(title, text) {
    return (
      '<div class="empty-state"><strong>' + escapeHtml(title) + "</strong><p>" + escapeHtml(text) + "</p></div>"
    );
  }

  /**
   * 渲染一个卡片列表。kind 决定卡片形态与空状态文案：
   * home / result / mine。
   */
  function renderCards(container, list, kind) {
    if (!container) {
      return;
    }

    if (!list || list.length === 0) {
      if (kind === "mine") {
        container.innerHTML = emptyStateHtml("你还没有发布过信息", "点底部的「发布」，先发一条寻物或招领吧。");
      } else {
        container.innerHTML = emptyStateHtml(
          "没有找到相关信息",
          "换个关键词，或把信息类型、物品分类改成「全部」再试一次。"
        );
      }
      return;
    }

    const builder = kind === "home" ? homeCardHtml : kind === "mine" ? mineCardHtml : resultCardHtml;
    container.innerHTML = list.map(builder).join("");
  }

  /* ------------------------------ 筛选控件 ------------------------------ */

  /** 给一组 chip 设选中态：按属性名（type / category）匹配。 */
  function setActiveChip(container, attribute, value) {
    if (!container) {
      return;
    }

    Array.prototype.forEach.call(container.querySelectorAll("[data-" + attribute + "]"), function (button) {
      const active = button.dataset[attribute] === value;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
  }

  /** 首页「寻物信息／招领信息」分段控件：滑块位置靠 data-active 控制。 */
  function setSegmented(container, value) {
    if (!container) {
      return;
    }

    container.dataset.active = value;

    Array.prototype.forEach.call(container.querySelectorAll("button[data-type]"), function (button) {
      const active = button.dataset.type === value;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
  }

  function setKeywordInput(keyword) {
    if (els.searchKeyword && els.searchKeyword.value !== keyword) {
      els.searchKeyword.value = keyword;
    }
  }

  function fillResultsHeader(keyword, category, count) {
    setText(els.resultsTitle, itemLogic.resultsTitle(keyword, category));
    setText(els.resultsCount, itemLogic.resultsCount(count));
  }

  /* ------------------------------ 详情页 ------------------------------ */

  function fillDetail(item) {
    setText(els.detailTypeLabel, itemLogic.detailTypeLabel(item));
    els.detailTypeLabel.className = "detail-type " + statusClassOf(item);

    if (item.image) {
      els.detailImage.src = item.image;
      els.detailImage.hidden = false;
      setText(els.detailImageText, "");
    } else {
      els.detailImage.removeAttribute("src");
      els.detailImage.hidden = true;
      setText(els.detailImageText, itemLogic.imagePlaceholder(item));
    }

    setText(els.detailName, item.name);
    setText(els.detailLocationLabel, itemLogic.locationFieldOf(item.type) + "：");
    setText(els.detailLocation, item.location);
    setText(els.detailDateLabel, itemLogic.dateFieldOf(item.type) + "：");
    setText(els.detailDate, item.date);
    setText(els.detailDescription, item.description);
    setText(els.detailContact, item.contact);
    resetCopyButton();
  }

  /** 复制按钮回到「复制联系方式」（原型 04 vs Z-04已复制 两个状态）。 */
  function resetCopyButton() {
    if (!els.copyContact) {
      return;
    }

    els.copyContact.textContent = "复制联系方式";
    els.copyContact.classList.remove("is-copied");
    els.copyContact.disabled = false;
  }

  /** 复制成功：按钮变成绿底的「已复制 ✓」。 */
  function markCopyButtonDone() {
    if (!els.copyContact) {
      return;
    }

    els.copyContact.textContent = "已复制 ✓";
    els.copyContact.classList.add("is-copied");
    els.copyContact.disabled = true;
  }

  /* ------------------------------ 发布页 ------------------------------ */

  /** 切换发布类型（只改高亮，不动用户已填内容）。 */
  function fillPublishType(type) {
    if (!els.publishTypeTabs) {
      return;
    }

    Array.prototype.forEach.call(els.publishTypeTabs.querySelectorAll("button[data-type]"), function (button) {
      const active = button.dataset.type === type;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
  }

  function fieldInput(name) {
    const id = FIELD_INPUT_IDS[name];
    return id ? document.getElementById(id) : null;
  }

  function readPublishValues(type, imageDataUrl) {
    const value = function (name) {
      const input = fieldInput(name);
      return input ? input.value : "";
    };

    return {
      type: type,
      name: value("name"),
      category: value("category"),
      location: value("location"),
      date: value("date"),
      description: value("description"),
      contact: value("contact"),
      image: imageDataUrl || ""
    };
  }

  function clearFieldErrors() {
    Object.keys(FIELD_INPUT_IDS).forEach(function (name) {
      setText(document.querySelector('[data-error-for="' + name + '"]'), "");
    });

    Array.prototype.forEach.call(els.publishForm ? els.publishForm.querySelectorAll("[aria-invalid]") : [], function (input) {
      input.removeAttribute("aria-invalid");
    });
  }

  function showFieldErrors(errors, firstField) {
    clearFieldErrors();

    Object.keys(errors || {}).forEach(function (name) {
      setText(document.querySelector('[data-error-for="' + name + '"]'), errors[name]);

      const input = fieldInput(name);

      if (input) {
        input.setAttribute("aria-invalid", "true");
      }
    });

    const firstInput = firstField ? fieldInput(firstField) : null;

    if (firstInput) {
      firstInput.focus();
    }
  }

  function showFormError(text) {
    setText(els.publishFormError, text);
    setHidden(els.publishFormError, !text);
  }

  function showImagePreview(dataUrl, fileName) {
    if (els.publishImagePreview) {
      if (dataUrl) {
        els.publishImagePreview.src = dataUrl;
        els.publishImagePreview.hidden = false;
      } else {
        els.publishImagePreview.removeAttribute("src");
        els.publishImagePreview.hidden = true;
      }
    }

    setText(els.uploadBoxText, dataUrl && fileName ? fileName : "上传图片");
  }

  function clearPublishForm(type) {
    if (els.publishForm) {
      els.publishForm.reset();
    }

    clearFieldErrors();
    showFormError("");
    showImagePreview("", "");
    fillPublishType(type);
    fillPublishDate(itemLogic.todayString());
  }

  function fillPublishDate(dateText) {
    const input = fieldInput("date");

    if (input) {
      input.value = dateText;
    }
  }

  /* ------------------------------ 视图与提示 ------------------------------ */

  function showView(name) {
    Object.keys(VIEWS).forEach(function (key) {
      setHidden(els[VIEWS[key]], key !== name);
    });
  }

  /** 只有首页和我的发布有底部导航（原型 01、07 屏有，02/03/04/05 屏没有）。 */
  function setNavVisible(visible) {
    document.body.dataset.nav = visible ? "on" : "off";
  }

  function setActiveNav(name) {
    if (!els.bottomNav) {
      return;
    }

    Array.prototype.forEach.call(els.bottomNav.querySelectorAll("[data-goto]"), function (button) {
      button.classList.toggle("active", button.dataset.goto === name);
    });
  }

  function showToast(text) {
    if (!els.toaster) {
      return;
    }

    els.toaster.textContent = text;
    els.toaster.hidden = false;

    if (toastTimer) {
      clearTimeout(toastTimer);
    }

    toastTimer = setTimeout(function () {
      els.toaster.hidden = true;
    }, 2600);
  }

  return {
    els: els,
    escapeHtml: escapeHtml,
    setText: setText,
    setHidden: setHidden,
    statusClassOf: statusClassOf,
    renderCards: renderCards,
    setActiveChip: setActiveChip,
    setSegmented: setSegmented,
    setKeywordInput: setKeywordInput,
    fillResultsHeader: fillResultsHeader,
    fillDetail: fillDetail,
    resetCopyButton: resetCopyButton,
    markCopyButtonDone: markCopyButtonDone,
    fillPublishType: fillPublishType,
    readPublishValues: readPublishValues,
    clearFieldErrors: clearFieldErrors,
    showFieldErrors: showFieldErrors,
    showFormError: showFormError,
    showImagePreview: showImagePreview,
    clearPublishForm: clearPublishForm,
    fillPublishDate: fillPublishDate,
    showView: showView,
    setNavVisible: setNavVisible,
    setActiveNav: setActiveNav,
    showToast: showToast
  };
})();
