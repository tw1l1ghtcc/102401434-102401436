/**
 * 持久化层：把信息数组保存到 localStorage。
 */
const itemStorage = (function () {
  const STORAGE_KEY = "campus-lost-found-items";

  function loadItems(defaultItems) {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);

      if (!raw) {
        saveItems(defaultItems);
        return defaultItems.map(copyItem);
      }

      const parsed = JSON.parse(raw);

      if (!Array.isArray(parsed)) {
        throw new Error("本地保存的数据不是数组");
      }

      const savedItems = parsed.filter(isUsableItem);

      /*
       * 旧版数据没有 image、isMine、createdAt 字段。
       * 旧版页面还不能发布信息，因此旧数据只有示例数据，
       * 可以安全更新为新版示例数据。
       */
      if (needsMigration(savedItems)) {
        saveItems(defaultItems);
        return defaultItems.map(copyItem);
      }

      return savedItems.map(copyItem);
    } catch (error) {
      console.warn("物品数据读取失败，改用示例数据：", error);
      return defaultItems.map(copyItem);
    }
  }

  function saveItems(list) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      return true;
    } catch (error) {
      console.warn("物品数据保存失败：", error);
      return false;
    }
  }

  function needsMigration(list) {
    return list.some(function (item) {
      return (
        !Object.prototype.hasOwnProperty.call(item, "image") ||
        !Object.prototype.hasOwnProperty.call(item, "isMine") ||
        !Object.prototype.hasOwnProperty.call(item, "createdAt")
      );
    });
  }

  function isUsableItem(item) {
    return (
      Boolean(item) &&
      typeof item === "object" &&
      item.id != null &&
      typeof item.name === "string"
    );
  }

  function copyItem(item) {
    return Object.assign({}, item);
  }

  return {
    STORAGE_KEY: STORAGE_KEY,
    loadItems: loadItems,
    saveItems: saveItems
  };
})();