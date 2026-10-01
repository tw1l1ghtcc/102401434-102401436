/**
 * 数据与常量层 —— 全部对齐 Figma 原型（01-首页 ~ 09-详情页）
 *
 * 字段沿用框架约定：id / type / name / category / location / date / status /
 * description / contact，另加三个可选字段（image / isMine / createdAt）。
 *
 * 分类清单：
 *   原型 01-首页 有 5 个快捷入口、02-搜索页 有 4 个筛选项，但示例数据里存在「生活用品」
 *   （黑色折叠伞），原型两处都没有它的入口 —— 点分类就找不到这条信息。所以这里两处
 *   统一补成需求文档 §5.1 的六类，保证每个分类都点得出来：
 *     首页 6 个快捷入口：校园卡 / 钥匙 / 电子产品 / 书籍 / 生活用品 / 其他
 *     搜索页 6 个筛选项：同上
 *     发布表单下拉：同上
 */

/** 信息类型。文案全部取自原型：寻物信息／招领信息、寻找中／待认领、已找回／已归还。 */
const ITEM_TYPES = {
  lost: {
    key: "lost",
    label: "寻物",
    panelLabel: "寻物信息",
    status: "寻找中",
    resolvedStatus: "已找回",
    locationField: "丢失地点",
    dateField: "丢失日期"
  },
  found: {
    key: "found",
    label: "招领",
    panelLabel: "招领信息",
    status: "待认领",
    resolvedStatus: "已归还",
    locationField: "拾取地点",
    dateField: "拾取日期"
  }
};

/** 六类物品分类（首页快捷入口、搜索页筛选项、发布表单下拉共用一套）。 */
const HOME_CATEGORIES = ["校园卡", "钥匙", "电子产品", "书籍", "生活用品", "其他"];
const SEARCH_CATEGORIES = ["校园卡", "钥匙", "电子产品", "书籍", "生活用品", "其他"];
const FORM_CATEGORIES = ["校园卡", "钥匙", "电子产品", "书籍", "生活用品", "其他"];

/** 筛选控件里代表"不限制"的取值。 */
const ALL_TYPE = "all";
const ALL_CATEGORY = "all";

/** 视为"已结束"的状态；已找到是框架早期写法，一并兼容。 */
const RESOLVED_STATUSES = ["已找到", "已找回", "已归还"];

/** 表单必填字段顺序（校验提示按此顺序聚焦第一个出错项）。 */
const PUBLISH_FIELD_ORDER = ["name", "category", "location", "date", "description", "contact"];

/** 字段中文名。 */
const PUBLISH_FIELD_LABELS = {
  name: "物品名称",
  category: "物品分类",
  location: "地点",
  date: "日期",
  description: "物品描述",
  contact: "联系方式",
  image: "物品图片"
};

/** 图片上限 2MB（localStorage 存不下更大的）。 */
const IMAGE_MAX_BYTES = 2 * 1024 * 1024;

/**
 * 示例数据 18 条：
 *   - 前 7 条的内容取自 Figma 原型出现过的信息（蓝色校园卡、黑色折叠伞、校园卡、
 *     白色蓝牙耳机、高等数学教材、宿舍钥匙、黑色保温杯）；
 *   - 其余 11 条是为了让每个分类都有 3 条、点分类能立刻看出效果而补的同类示例；
 *   - 「白色蓝牙耳机」「黑色折叠伞」标记为 isMine，与原型 07-我的发布页的两张卡片一致。
 *
 * 日期与 createdAt 的安排是为了让列表顺序也和原型一致：
 *   首页「寻物信息」第一条 = 蓝色校园卡（图书馆三楼 · 9月23日 · 状态：寻找中）
 *   首页「招领信息」第一条 = 黑色折叠伞（第二食堂 · 9月24日 · 状态：待认领）
 *   用「校园卡」搜索 = 2 条（蓝色校园卡、校园卡），与原型 03 屏的「找到2条相关信息」一致
 */
const items = [
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
    isMine: false,
    createdAt: "2026-09-23T10:00:00+08:00"
  },
  {
    id: 2,
    type: "found",
    name: "黑色折叠伞",
    category: "生活用品",
    location: "第二食堂",
    date: "2026-09-24",
    status: "待认领",
    description: "黑色长柄折叠伞，伞骨有一处轻微变形。",
    contact: "QQ：56******78",
    image: "",
    isMine: true,
    createdAt: "2026-09-24T10:00:00+08:00"
  },
  {
    id: 3,
    type: "lost",
    name: "校园卡",
    category: "校园卡",
    location: "第一教学楼",
    date: "2026-09-23",
    status: "寻找中",
    description: "校园卡边角有磨损，卡面贴有课程表贴纸。",
    contact: "QQ：90******11",
    image: "",
    isMine: false,
    createdAt: "2026-09-23T08:00:00+08:00"
  },
  {
    id: 4,
    type: "lost",
    name: "白色蓝牙耳机",
    category: "电子产品",
    location: "教学楼A栋",
    date: "2026-09-22",
    status: "寻找中",
    description: "白色充电盒，盒盖内侧有一道细划痕。",
    contact: "QQ：33******57",
    image: "",
    isMine: true,
    createdAt: "2026-09-22T10:00:00+08:00"
  },
  {
    id: 5,
    type: "found",
    name: "高等数学教材",
    category: "书籍",
    location: "第一教学楼自习室",
    date: "2026-09-20",
    status: "待认领",
    description: "封面写有姓名缩写，内页夹着一张课程表。",
    contact: "微信：tom*****01",
    image: "",
    isMine: false,
    createdAt: "2026-09-20T10:00:00+08:00"
  },
  {
    id: 6,
    type: "lost",
    name: "宿舍钥匙",
    category: "钥匙",
    location: "3号宿舍楼门口",
    date: "2026-09-21",
    status: "寻找中",
    description: "钥匙上挂着一只灰色毛绒挂件。",
    contact: "QQ：77******22",
    image: "",
    isMine: false,
    createdAt: "2026-09-21T10:00:00+08:00"
  },
  {
    id: 7,
    type: "found",
    name: "黑色保温杯",
    category: "其他",
    location: "第二食堂二楼",
    date: "2026-09-19",
    status: "待认领",
    description: "杯身贴有卡通贴纸，杯盖有一道划痕。",
    contact: "微信：abc*****01",
    image: "",
    isMine: false,
    createdAt: "2026-09-19T10:00:00+08:00"
  },
  {
    id: 8,
    type: "found",
    name: "食堂饭卡",
    category: "校园卡",
    location: "第二食堂",
    date: "2026-09-19",
    status: "待认领",
    description: "饭卡套是透明卡套，里面夹着一张小票。",
    contact: "QQ：45******90",
    image: "",
    isMine: false,
    createdAt: "2026-09-19T09:00:00+08:00"
  },
  {
    id: 9,
    type: "found",
    name: "车钥匙",
    category: "钥匙",
    location: "第六教学楼停车区",
    date: "2026-09-20",
    status: "待认领",
    description: "银色车钥匙，遥控器上有一道划痕。",
    contact: "QQ：61******07",
    image: "",
    isMine: false,
    createdAt: "2026-09-20T09:00:00+08:00"
  },
  {
    id: 10,
    type: "lost",
    name: "一串钥匙",
    category: "钥匙",
    location: "图书馆一楼大厅",
    date: "2026-09-17",
    status: "已找回",
    description: "钥匙串上有三把钥匙和一个黄色门禁扣。",
    contact: "QQ：23******45",
    image: "",
    isMine: false,
    createdAt: "2026-09-17T10:00:00+08:00"
  },
  {
    id: 11,
    type: "found",
    name: "黑色充电宝",
    category: "电子产品",
    location: "图书馆二楼",
    date: "2026-09-18",
    status: "待认领",
    description: "黑色充电宝，表面是磨砂材质，带一根短线。",
    contact: "微信：lee*****26",
    image: "",
    isMine: false,
    createdAt: "2026-09-18T10:00:00+08:00"
  },
  {
    id: 12,
    type: "lost",
    name: "银色平板电脑",
    category: "电子产品",
    location: "第三食堂",
    date: "2026-09-16",
    status: "已找回",
    description: "银色平板，保护壳上贴有卡通贴纸。",
    contact: "QQ：88******13",
    image: "",
    isMine: false,
    createdAt: "2026-09-16T10:00:00+08:00"
  },
  {
    id: 13,
    type: "found",
    name: "线性代数教材",
    category: "书籍",
    location: "图书馆四楼",
    date: "2026-09-19",
    status: "待认领",
    description: "封面有一道折痕，扉页写着班级。",
    contact: "微信：math*****07",
    image: "",
    isMine: false,
    createdAt: "2026-09-19T08:00:00+08:00"
  },
  {
    id: 14,
    type: "lost",
    name: "英语四级词汇书",
    category: "书籍",
    location: "第二教学楼",
    date: "2026-09-15",
    status: "寻找中",
    description: "红色封面，书里夹着几张便利贴。",
    contact: "QQ：52******68",
    image: "",
    isMine: false,
    createdAt: "2026-09-15T10:00:00+08:00"
  },
  {
    id: 15,
    type: "lost",
    name: "灰色水杯",
    category: "生活用品",
    location: "图书馆三楼",
    date: "2026-09-21",
    status: "寻找中",
    description: "灰色保温水杯，杯底贴着一圈贴纸。",
    contact: "QQ：66******31",
    image: "",
    isMine: false,
    createdAt: "2026-09-21T09:00:00+08:00"
  },
  {
    id: 16,
    type: "found",
    name: "白色围巾",
    category: "生活用品",
    location: "第一教学楼走廊",
    date: "2026-09-17",
    status: "待认领",
    description: "白色针织围巾，一端有流苏。",
    contact: "微信：warm*****12",
    image: "",
    isMine: false,
    createdAt: "2026-09-17T09:00:00+08:00"
  },
  {
    id: 17,
    type: "found",
    name: "蓝色雨衣",
    category: "其他",
    location: "第三教学楼门口",
    date: "2026-09-18",
    status: "待认领",
    description: "蓝色一次性雨衣，包装袋还在。",
    contact: "QQ：39******74",
    image: "",
    isMine: false,
    createdAt: "2026-09-18T09:00:00+08:00"
  },
  {
    id: 18,
    type: "lost",
    name: "卡套挂绳",
    category: "其他",
    location: "宿舍楼下",
    date: "2026-09-14",
    status: "已找回",
    description: "灰色挂绳，可以挂卡片和钥匙。",
    contact: "QQ：15******83",
    image: "",
    isMine: false,
    createdAt: "2026-09-14T10:00:00+08:00"
  }
];
