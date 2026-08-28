# 《时空中的绘旅人》攒抽计算器

## 项目目标

建立一个结构清晰、代码简洁、易维护，并适合长期更新活动数据的静态网页计算器。

## 当前技术方案

- 原生 HTML、CSS、JavaScript
- JSON 数据文件
- 纯静态网页，无后端、数据库或第三方前端框架

## 当前项目结构

```text
hlr gacha/
├─ index.html
├─ css/
│  └─ style.css
├─ js/
│  ├─ app.js
│  ├─ calculator.js
│  └─ data-loader.js
├─ data/
│  ├─ constants.json
│  ├─ packs/
│  │  ├─ permanent-packs.json
│  │  ├─ event-packs/
│  │  └─ currency-packs/
│  ├─ events/
│  │  ├─ event-types.json
│  │  ├─ event.template.json
│  │  └─ test-event.json
│  ├─ banners/
│  │  ├─ banner.template.json
│  │  └─ test-banner.json
│  └─ resources/
│     ├─ resource-types.json
│     ├─ resource.template.json
│     └─ test-resources.json
├─ docs/
│  └─ PROJECT.md
└─ AGENTS.md
```

## 分层职责

- 页面层：`index.html` 提供基础结构，`style.css` 提供样式，`app.js` 负责用户交互和页面更新。
- 计算层：`calculator.js` 负责纯计算，不直接操作页面。
- 数据加载层：`data-loader.js` 负责加载和基础校验 JSON 数据，不负责业务计算。
- 数据层：`data/` 下的 JSON 保存游戏规则、活动、卡池和礼包等数据。

数据文件名表达其维护职责：`*-types.json` 保存可复用规则或类型定义，`*.template.json` 是人工或 AI 维护数据时参考的结构模板且不参与业务加载，`test-*.json` 是当前开发阶段使用的真实数据实例。`sample-*` 不再承担模板语义。

礼包统一维护在 `data/packs/`。固定人民币礼包使用 `permanent-packs.json`；Event Pack 与 Currency Pack 分别放在 `event-packs/` 和 `currency-packs/`，并都按一次活动一个 JSON 文件维护。

### Banner 与 Event 数据边界

Banner 表示卡池及其开池、结束时间，Event 表示活动及其活动周期、奖励和领取规则。两者可能关联，但不是同一个数据实体，起止时间也可以不重合。因此，Banner 单独维护在 `data/banners/`，Event 单独维护在 `data/events/`。

“日期与计算方式”模块选择日期目标时使用 Banner 数据；“活动收入”模块计算活动资源时使用 Event 数据及其奖励规则。

例如，以下数据同时存在是合法且预期的：

- Banner（卡池）：六周年庆典，2026-09-26 ～ 2026-10-12
- Event（活动）：六周年活动，2026-09-20 ～ 2026-10-15

### Event、Event Type 与 Event Pack

Event 表示活动本身及其免费活动收入，Event Pack 表示人民币限时礼包，两者独立维护，避免把免费奖励与付费购买混入同一实体。`data/events/event-types.json` 保存可复用的活动类型模板；具体 Event 通过 `type` 引用模板，并只在 `incomeAdjustment` 中记录该次活动相对模板的差异。`data/events/test-event.json` 仅提供开发阶段使用的具体 Event 实例，不定义活动类型。

实际活动收入由对应 type 的模板值与 Event 的 `incomeAdjustment` 相加得到。模板和调整都按 `available`、`complete` 两个阶段组织；调整允许正数、0 和负数，未出现的资源按 0 处理。这样模板规则只维护一次，同时仍能表达单次活动的例外。

Event 不保存 Banner 关联。活动收入直接使用日期模块确定的 `targetDate` 与 Event 日期比较：`targetDate < startDate` 时不计入，`startDate <= targetDate < endDate` 时使用 `available`，`targetDate >= endDate` 时使用 `complete`。该收入仅在目标方式为“选择卡池”时生效，自定义日期模式不计入。

`isRerun: true` 标记复刻活动并使其默认不选中，普通活动默认选中；用户仍可独立切换。Event 另以显式 `status` 区分 `current` 与 `future`，该状态由数据维护，不从日期推断。当前活动显示“可计入”，未来活动显示“预计可计入”，用于说明未来收入只是估算值，并非最终准确奖励。

`exchanges` 表示消耗钻石、红钻等资源换取其他内容，属于后续可选资源消费，不属于免费活动 income。前端因此只展示模板与调整合并后的最终可计入资源，不展示模板值、调整值或具体奖励来源明细。

### Banner 标签与稳定 ID

Banner 的 `id` 是数据之间使用的稳定引用键，`name` 是可修改的用户可见名称。结构化数据不得通过 `name` 建立关联。`id` 可以使用中文，只要保持唯一，并在确定后尽量不变；中文 ID 不需要强制转换为英文 slug。

每个 Banner 支持 `tags` 数组，用来表达经用户确认的稳定卡池类别。当前唯一确认的 tag 是 `birthday`，用于生日画廊。程序不得根据卡池名称、主题、周年、角色或其他语义自行推断类别，也不得自行创建其他 tag；只有用户明确确认后，才能加入新的 tag。

## 资源模型设计

资源类型定义与具体资源实例分开维护。`data/resources/resource-types.json` 统一定义五种资源类型及其管理方式；`data/resources/test-resources.json` 保存开发阶段使用的限时批次和限定资源实例。这样新增具体资源时只需增加数据，不需要修改资源类型定义或核心计算代码。

### 固定资源

固定资源目前包括钻石、红钻和老荷兰颜料。钻石与红钻是两个独立资源；虽然红钻可以按 1:1 转换为钻石，但系统默认不自动转换，只有在明确的后续转换流程中才进行转换。

### 三种老荷兰的区别

- 普通老荷兰：无时间限制，也无特定卡池限制。
- 限时老荷兰：初始库存按用户确认后的可用总量录入；结构化来源按批次记录，通过 `availableFrom` 和 `expiresAt` 判断在目标日期是否可用。
- 限定老荷兰：按独立资源实例记录，核心限制是适用卡池，通过 `applicability` 判断是否可用。

### 结构化来源的限时老荷兰按批次记录

初始库存中的限时老荷兰由用户自行确认可用于当前目标的总量，按一个总数录入，不按批次管理。只有来源于活动、礼包等结构化数据的限时老荷兰，才保留有效期批次信息，并由程序进行时间判断。

结构化来源的限时老荷兰核心差异来自有效时间，而不是资源名称，因此不维护一张固定的种类表，也不通过名称推断有效期。可用资源批次定义至少记录内部 ID、类别和有效时间：

```json
{
  "id": "timed-paint-test-1",
  "category": "timed_paint",
  "availableFrom": "2026-09-20",
  "expiresAt": "2026-10-15"
}
```

程序根据 `availableFrom` 和 `expiresAt` 判断该批资源在目标日期是否可用。不同有效期的批次不能合并为一个总库存，否则会丢失判断资源是否有效所需的信息。

批次 `id` 仅供程序识别、编辑和删除，没有游戏业务含义，不向用户展示，也不要求人工维护复杂命名规则。资源批次定义不包含玩家实际库存数量；未来库存数据可另行记录 `amount`。

### 限定老荷兰按独立实例记录

限定老荷兰的核心差异是适用于哪些卡池。每一种具体限定老荷兰作为独立资源实例记录，至少支持以下数据：

```json
{
  "id": "通票老荷兰",
  "name": "通票老荷兰",
  "category": "limited_paint",
  "applicability": {
    "type": "banner_id",
    "values": ["下一站世界与你"]
  }
}
```

`applicability.type` 第一版支持两种方式：`banner_id` 的 `values` 引用一个或多个 Banner `id`，用于精确匹配；`banner_tag` 的 `values` 引用用户已明确确认的 Banner tag，用于匹配一类卡池。当前可用的 tag 只有 `birthday`。一个限定老荷兰实例只使用一种 `applicability.type`，不同时混用两种方式。

程序必须通过 `applicability` 判断其是否适用于目标卡池，不得从名称猜测。不同限定老荷兰不能合并为统一库存；新实例通过新增数据支持，不要求修改核心计算代码，也不需要预先穷举所有可能的限定老荷兰。

限时老荷兰与限定老荷兰不能用同一种数据模型简单处理：前者的可用性取决于目标日期与有效期，后者的可用性取决于目标卡池。分别保留批次时间信息和卡池适用信息，才能进行正确计算并支持后续数据扩展。

## 日期型资源计算原则

用户选择的基础计算区间统一为 `[currentDate, targetDate]`，首尾均包含，并按日历日期处理。这个区间只表示用户希望考察的时间范围，不会覆盖 Banner、Event、Event Pack 等数据对象自身的起止日期或阶段规则；需要按天计算的模块应根据自己的业务含义与对象有效期取交集。

Event 仍使用已有的 `targetDate` 阶段判断，不改为逐日交集。Event Pack 的每日限购次数则取 `[currentDate, targetDate]` 与 `[eventPack.startDate, eventPack.endDate]` 的交集，两端均包含。周期性收入仍须按实际经过的日历日期判断，不能使用天数除以周期或平均月份天数估算。

## 日常收入模块与付费数据归属

“日常收入”统一计算免费日常收入，以及用户选择启用后的长期周期性权益。月卡、季卡、年卡和猫条的持续收益放在同一模块内，可以复用同一日期区间与真实日历规则；各项目的购买行为则按其长期或限时属性分别归属，避免把周期收入和礼包购买混为一体。

日常收入是当前唯一确认的基础区间例外。统一开关 `todayIncomeClaimed`（“今日收入已领取”）默认开启：开启时按 `(currentDate, targetDate]` 计算，关闭时按 `[currentDate, targetDate]` 计算。该开关一次控制当天的每日任务、每周分享、签到、月末奖励以及月卡、年卡、猫条等日常持续收益，避免为同一天收入建立彼此矛盾的多个确认状态。

月卡按整个计算区间每日增加 50 钻，基础购买张数为 `ceil(计算天数 / 30)`，允许在此基础上正负调整，实际张数最低为 0；每张购买立即增加 300 钻。启用月卡时，月签到的钻石奖励在原“月签到奖励”结果中翻倍，老荷兰颜料不翻倍。月卡可以长期持续购买，因此其购买数量和金额仍由日常收入模块处理。

季卡在本模块仅计算启用后的每日 50 钻。年卡和猫条也只计算周期收益：每个实际经过的每月 23 日，年卡增加 5 个老荷兰颜料，猫条增加 1 个。季卡、年卡和猫条的价格、购买行为及购买立即奖励不属于日常收入模块，后续统一由 event pack / 活动礼包数据表达。

所有实际人民币付费项目的数据模型支持 `price` 和 `countsTowardLimitedRecharge`。前者记录人民币价格，后者供内部判断是否计入限时累充，不要求前端展示。所有人民币付费项目默认将 `countsTowardLimitedRecharge` 设为 `true`；只有明确标注“不计入限时累充”的项目才设为 `false`。

付费属性跟随具体项目保存，不另建“氪金.md”或重复的中央氪金表。新人和等级礼包归入 permanent pack 数据，活动礼包以及季卡、年卡、猫条等限时购买行为归入 event pack / 活动礼包数据。这样同一项目的价格和累充属性只有一个维护来源，避免跨文件不一致。

## 新人和等级礼包

“新人和等级礼包”负责固定人民币礼包的选择、数量和购买结果，不包含活动礼包、钻石/红钻礼包或免费活动收入。数据存放在 `data/packs/permanent-packs.json`。模块默认折叠，折叠状态只控制页面展示，不改变已选择的礼包、购买数量或计算结果。

permanent pack 数据只保存礼包事实：`id`、`name`、`price`、固定 `purchaseLimit` 或结构化 `purchaseRule`、`contents`、`countsTowardLimitedRecharge`。理论抽数和理论元/抽不写入礼包数据，而是由程序根据内容实时计算，避免折算规则或用户参数变化后还要同步修改每条礼包数据。

理论抽数按钻石 150 个折合 1 抽、老荷兰颜料 1 个折合 1 抽、红钻除以用户设置的理论折算率计算；默认红钻理论折算率为 70.71 红钻/抽。该折算只用于比较礼包的理论性价比，与库存中红钻是否实际转换完全分离。`theoreticalPulls` 与 `pricePerPull` 均允许小数，内部保留完整精度，前端按 `pricePerPull` 从低到高排序。

礼包默认未购买，点击整张卡片后点亮并计入，再次点击取消。固定 `purchaseLimit: 1` 的礼包点亮即购买 1 份，不显示数量控件；固定 `purchaseLimit > 1` 的礼包点亮后默认 1 份，可在 1 至上限间调整，取消后归零。颜料周礼包使用结构化 `purchaseRule` 保留“每周限购 1 次”的语义，不能简单记录成覆盖整个计算区间的 `purchaseLimit: 1`；按日期区间推导可购买次数留待后续实现。

购买后，资源增加量为 `contents × 实际购买数量`，人民币金额为 `price × 实际购买数量`。`countsTowardLimitedRecharge` 随礼包事实保存，仅供内部付费计算使用；当前模块不实现限时累充统计。

## 活动礼包

“活动礼包”是默认折叠的一级模块，并允许同时包含多个 Event Pack 二级分组。数据统一放在 `data/packs/event-packs/`，每次礼包 Event 使用一个独立 JSON 文件，便于按活动维护和增删。Event 描述活动本身及免费活动收入，Event Pack 描述对应的人民币限时礼包；二者是独立实体，只通过稳定的 `eventId` 关联。Event 可以没有礼包，Event Pack 也不与 Banner 强制绑定。

礼包事实数据按用途区分：`contents` 是参与攒抽计算的资源，`otherContents` 只记录或展示非抽卡奖励，`deferredRewards` 记录延期发放内容且不自动进入当前抽卡资源。同一礼包中重复出现的同一种抽卡资源可以合并，避免计算时产生无意义的重复项。

购买规则需要保留各自语义：`total` 表示整个 Event Pack 有效期的总限购，`daily` 表示每日限购；后者的实际可购买次数按基础计算区间与礼包有效期的交集计算。`prerequisites` 使用稳定 pack id 表达购买前置，`pull_count` trigger 表达抽数触发，两者不能混用；当前阶段只展示抽数触发条件，不自动进行解锁判断。

## 钻石 / 红钻礼包

Currency Pack 表示使用游戏内钻石或红钻购买的限时礼包，与使用人民币购买的 Event Pack 是不同实体。它通过稳定 `eventId` 关联 Event，同时维护自己的 `startDate` 和 `endDate`；只有用户基础计算区间与该有效期存在交集时才进入可选范围。支付资源记录在 `cost` 中，当前支持 `diamond` 和 `red_diamond`，不使用人民币礼包的 `price` 或 `countsTowardLimitedRecharge`，因此购买不增加 RMB，也不计入限时累充。

Currency Pack 的 `contents`、`otherContents`、`prerequisites`、`trigger` 和 `deferredRewards` 沿用 Event Pack 的语义。同一活动的钻石礼包与红钻礼包保存在同一个文件中，前端根据 `cost.resourceId` 分组。钻石礼包不计算性价比；红钻礼包根据抽卡资源计算 `theoreticalPulls`，并以 `redDiamondCost / theoreticalPulls` 得到实际的单抽红钻价。这个消费效率与新人和等级礼包中用于理论估值的 70.71 红钻/抽参数相互独立。

计算层保留 Currency Pack 购买前的资源状态，并在其上扣除 `cost`、加入 `contents`，派生当前资源状态。购买不得使钻石或红钻余额为负，也不会自动进行红钻转钻石或钻石转抽数。

## 个性化调整与资源总计

用户可见的“个性化调整”是不依赖结构化来源的手动资源调整层，允许正数、0 和负数，不修改资源 JSON，也不影响 RMB 或限时累充。这里的限时、限定老荷兰由用户自行确认对当前目标有效，因此不再重复进行有效期或适用卡池判断；`otherState` 等既有内部命名无需随 UI 名称重构。

用户界面只展示一套权威的“资源总计”。内部购买前汇总仍将库存、日常收入、活动收入、新人和等级礼包、活动礼包及个性化调整合并，并保持各资源类型独立；随后继续应用 Currency Pack 的消耗与奖励，得到当前资源状态。用户修改任一已实现来源后，资源总计即时更新。手动负调整产生的中间负数不自动归零；RMB 总计和限时累充金额仍只受人民币购买项目影响。

## 页面信息架构

页面用户可见模块不使用中文数字编号。桌面端采用双栏：左侧依次承载日期与计算方式、库存资源和资源总计，集中放置基础设置、初始资源与权威实时结果；右侧依次承载日常收入、活动收入、新人和等级礼包、活动礼包、钻石 / 红钻礼包、个性化调整及后续计算模块，集中放置计算过程与用户选择。窄屏可以恢复为相同顺序的单栏布局。内部可以保留多个计算阶段，但各模块不重复展示完整的处理后资源。
