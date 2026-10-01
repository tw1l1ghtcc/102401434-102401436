/**
 * 应用装配层：视图路由、返回栈、事件绑定，把逻辑层与渲染层接起来。
 *
 * 视图与原型九屏的对应关系：
 *   home     01-首页          search   02-搜索页        results  03-搜索结果页
 *   detail   04/08/09-详情页   publish  05-发布信息页     success  06-发布成功页
 *   mine     07-我的发布页
 */
(function () {
  const els = itemRender.els;

  const state = {
    view: "home",
    homeType: "lost",
    filters: { keyword: "", type: ALL_TYPE, category: ALL_CATEGORY },
    homeCategory: ALL_CATEGORY,
    publishType: "lost",
    publishImage: "",
    detailItemId: null,
    publishCompleted: false
  };

  /** 返回栈：子页面点「< 返回」时回到上一屏。 */
  const stack = [];

  /* ------------------------------ 数据 ------------------------------ */

  const storedItems = itemStorage.loadItems(items);
  items.splice(0, items.length, ...storedItems);

  function persist() {
    const saved = itemStorage.saveItems(items);

    if (!saved) {
      itemRender.showToast(
        "本地保存失败：浏览器存储不可用，或图片体积超出限制"
      );
    }

    return saved;
  }

  function findItem(itemId) {
    return items.find(function (item) {
      return Number(item.id) === Number(itemId);
    });
  }

  /* ------------------------------ 视图切换 ------------------------------ */

  function showView(name, options) {
    const settings = options || {};
    const target = name || "home";

    if (settings.push !== false && state.view !== target) {
      stack.push(state.view);
    }

    state.view = target;
    itemRender.showView(target);
    itemRender.setActiveNav(target);
    itemRender.setNavVisible(target === "home" || target === "mine");
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  function goBack() {
    const previous = stack.pop();
    showView(previous || "home", { push: false });
  }

  /* ------------------------------ 各屏渲染 ------------------------------ */

  function refreshHome() {
    itemRender.setSegmented(els.homeTypeTabs, state.homeType);
    itemRender.renderCards(
      els.itemList,
      itemLogic.filterItems(items, { type: state.homeType, category: state.homeCategory }),
      "home"
    );
  }

  function refreshResults() {
    const list = itemLogic.filterItems(items, state.filters);
    itemRender.fillResultsHeader(state.filters.keyword, state.filters.category, list.length);
    itemRender.renderCards(els.resultsList, list, "result");
  }

  function refreshMine() {
    const list = itemLogic.sortMineItems(
      items.filter(function (item) {
        return Boolean(item.isMine);
      })
    );

    itemRender.renderCards(els.myList, list, "mine");
  }

  function refreshAll() {
    refreshHome();
    refreshMine();

    if (state.view === "results") {
      refreshResults();
    }
  }

  /* ------------------------------ 详情与状态 ------------------------------ */

  function openDetail(itemId) {
    const item = findItem(itemId);

    if (!item) {
      itemRender.showToast("没有找到这条信息");
      return;
    }

    state.detailItemId = item.id;
    itemRender.fillDetail(item);
    showView("detail");
  }

  /** 修改信息状态：寻找中 → 已找回、待认领 → 已归还（只在自己的信息上可用）。 */
  function resolveItem(itemId) {
    const result = itemLogic.changeStatus(items, itemId, null);

    if (!result.ok) {
      itemRender.showToast(result.reason);
      return;
    }

    if (!persist()) {
      result.item.status = result.from;
      refreshAll();
      return;
    }

    refreshAll();
    itemRender.showToast("已标记为「" + result.to + "」，首页与搜索结果会同步显示");
  }

  /* ------------------------------ 发布 ------------------------------ */

  function enterPublish(type) {
    state.publishType = type === "found" ? "found" : "lost";
    state.publishImage = "";

    // 上一次发布已完成，再进发布页就重置成一张干净表单
    if (state.publishCompleted) {
      itemRender.clearPublishForm(state.publishType);
      state.publishCompleted = false;
    } else {
      itemRender.fillPublishType(state.publishType);
    }

    showView("publish");
  }

  function readImageFile(file, done) {
    const reader = new FileReader();
    reader.onload = function () {
      done(typeof reader.result === "string" ? reader.result : "");
    };
    reader.onerror = function () {
      done("");
    };
    reader.readAsDataURL(file);
  }

  function handleImageChange(file) {
    if (!file) {
      state.publishImage = "";
      itemRender.showImagePreview("", "");
      return;
    }

    const checked = itemLogic.validateImageMeta({ type: file.type, size: file.size });

    if (!checked.ok) {
      state.publishImage = "";
      itemRender.showImagePreview("", "");
      itemRender.showFieldErrors(checked.errors, "image");
      return;
    }

    readImageFile(file, function (dataUrl) {
      if (!dataUrl) {
        itemRender.showFieldErrors({ image: "图片读取失败，请换一张图片试试" }, "image");
        return;
      }

      state.publishImage = dataUrl;
      itemRender.showFieldErrors({}, "");
      itemRender.showImagePreview(dataUrl, file.name);
    });
  }

  function handlePublishSubmit(event) {
    event.preventDefault();
    itemRender.showFormError("");

    const values = itemRender.readPublishValues(state.publishType, state.publishImage);
    const checked = itemLogic.validatePublish(values, itemLogic.todayString());

    if (!checked.ok) {
      itemRender.showFieldErrors(checked.errors, checked.firstField);
      itemRender.showFormError("还有 " + Object.keys(checked.errors).length + " 项没填好，请按提示补全后再发布。");
      return;
    }

    const newItem = itemLogic.createItem(values, items);
    items.push(newItem);

    if (!persist()) {
      items.pop();
      refreshAll();
      return;
    }

    refreshAll();

    state.publishCompleted = true;
    showView("success");
    itemRender.showToast("发布成功，已进入首页列表");
  }

  /* ------------------------------ 复制联系方式 ------------------------------ */

  function copyToClipboard(text) {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      return navigator.clipboard.writeText(text);
    }

    return new Promise(function (resolve, reject) {
      try {
        const holder = document.createElement("textarea");
        holder.value = text;
        holder.setAttribute("readonly", "readonly");
        holder.style.position = "fixed";
        holder.style.opacity = "0";
        document.body.appendChild(holder);
        holder.select();
        const ok = document.execCommand && document.execCommand("copy");
        document.body.removeChild(holder);
        ok ? resolve() : reject(new Error("execCommand copy 失败"));
      } catch (error) {
        reject(error);
      }
    });
  }

  function handleCopyContact() {
    const item = findItem(state.detailItemId);

    if (!item) {
      return;
    }

    copyToClipboard(item.contact).then(
      function () {
        itemRender.markCopyButtonDone();
        itemRender.showToast("联系方式已复制到剪贴板");
      },
      function () {
        // 浏览器不给复制权限时仍进入「已复制 ✓」状态（与原型一致），但如实提示
        itemRender.markCopyButtonDone();
        itemRender.showToast("当前浏览器不允许自动复制，请手动记下：" + item.contact);
      }
    );
  }

  /* ------------------------------ 事件绑定 ------------------------------ */

  document.addEventListener("click", function (event) {
    if (event.target.closest('[data-action="back"]')) {
      goBack();
      return;
    }

    const gotoButton = event.target.closest("[data-goto]");

    if (gotoButton) {
      const target = gotoButton.dataset.goto;

      if (target === "publish") {
        enterPublish(state.publishType);
      } else {
        showView(target);

        if (target === "mine") {
          refreshMine();
        }
      }
      return;
    }

    const actionButton = event.target.closest("[data-action]");

    if (actionButton && actionButton.dataset.action !== "back") {
      const itemId = Number(actionButton.dataset.itemId);

      if (actionButton.dataset.action === "resolve") {
        resolveItem(itemId);
      } else if (actionButton.dataset.action === "detail") {
        openDetail(itemId);
      }
      return;
    }

    // 首页分类入口：原地筛选首页列表；同一个分类再点一次就取消
    const quickChip = event.target.closest("#home-category-chips [data-category]");

    if (quickChip) {
      const value = quickChip.dataset.category;
      state.homeCategory = state.homeCategory === value ? ALL_CATEGORY : value;
      itemRender.setActiveChip(els.homeCategoryChips, "category", state.homeCategory);
      refreshHome();
      return;
    }

    const typeChip = event.target.closest("#search-type-chips [data-type]");

    if (typeChip) {
      state.filters.type = typeChip.dataset.type;
      itemRender.setActiveChip(els.searchTypeChips, "type", state.filters.type);
      return;
    }

    const categoryChip = event.target.closest("#search-category-chips [data-category]");

    if (categoryChip) {
      state.filters.category = categoryChip.dataset.category;
      itemRender.setActiveChip(els.searchCategoryChips, "category", state.filters.category);
  itemRender.setActiveChip(els.homeCategoryChips, "category", state.homeCategory);
      return;
    }

    const homeTab = event.target.closest("#home-type-tabs button[data-type]");

    if (homeTab) {
      state.homeType = homeTab.dataset.type;
      refreshHome();
      return;
    }

    const publishTab = event.target.closest("#publish-type-tabs button[data-type]");

    if (publishTab) {
      state.publishType = publishTab.dataset.type;
      itemRender.fillPublishType(state.publishType);
    }
  });

  // 首页搜索框（原型里整块是热点）→ 搜索页
  const homeSearchEntry = document.getElementById("home-search-entry");

  if (homeSearchEntry) {
    homeSearchEntry.addEventListener("click", function () {
      showView("search");
      itemRender.setKeywordInput(state.filters.keyword);

      if (els.searchKeyword) {
        els.searchKeyword.focus();
      }
    });
  }

  // 搜索页：搜索按钮 → 搜索结果页（对应原型 02→03 的连线）
  if (els.searchForm) {
    els.searchForm.addEventListener("submit", function (event) {
      event.preventDefault();
      state.filters.keyword = itemLogic.trimText(els.searchKeyword ? els.searchKeyword.value : "");
      showView("results");
      refreshResults();
    });
  }

  // 发布表单
  if (els.publishForm) {
    els.publishForm.addEventListener("submit", handlePublishSubmit);

    els.publishForm.addEventListener("input", function (event) {
      const field = event.target;

      if (!field.hasAttribute("aria-invalid")) {
        return;
      }

      field.removeAttribute("aria-invalid");

      const view = field.closest(".view");
      const name = field.id.replace("publish-", "");
      const message = view ? view.querySelector('[data-error-for="' + name + '"]') : null;

      if (message) {
        message.textContent = "";
      }
    });
  }

  const publishImageInput = document.getElementById("publish-image");

  if (publishImageInput) {
    publishImageInput.addEventListener("change", function () {
      handleImageChange(publishImageInput.files ? publishImageInput.files[0] : null);
    });
  }

  if (els.copyContact) {
    els.copyContact.addEventListener("click", handleCopyContact);
  }

  // 键盘：Esc 等同返回；卡片支持回车/空格打开详情
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && state.view !== "home") {
      goBack();
      return;
    }

    const card = event.target.closest ? event.target.closest('.card--tappable[role="button"]') : null;

    if (card && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      openDetail(Number(card.dataset.itemId));
    }
  });

  /* ------------------------------ 启动 ------------------------------ */

  itemRender.clearFieldErrors();
  itemRender.fillPublishType(state.publishType);
  itemRender.fillPublishDate(itemLogic.todayString());
  itemRender.setActiveChip(els.searchTypeChips, "type", state.filters.type);
  itemRender.setActiveChip(els.searchCategoryChips, "category", state.filters.category);
  itemRender.setActiveChip(els.homeCategoryChips, "category", state.homeCategory);
  refreshHome();
  refreshMine();
  showView("home", { push: false });
})();
