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
│  ├─ PROJECT.md
│  ├─ user-guide.html
│  └─ user-guide.css
└─ AGENTS.md
```

## 分层职责

- 页面层：`index.html` 提供基础结构，`style.css` 提供样式，`app.js` 负责用户交互和页面更新。
- 计算层：`calculator.js` 负责纯计算，不直接操作页面。
- 数据加载层：`data-loader.js` 负责加载和基础校验 JSON 数据，不负责业务计算。
- 数据层：`data/` 下的 JSON 保存游戏规则、活动、卡池和礼包等数据。

面向最终用户的长篇使用说明独立维护在 `docs/user-guide.html`，`docs/user-guide.css` 只负责该正文自身的排版。主页面仅负责加载和展示说明，不在 `index.html` 或 `app.js` 中复制说明正文，以避免内容与页面逻辑重复维护。

数据文件名表达其维护职责：`*-types.json` 保存可复用规则或类型定义，`*.template.json` 是人工或 AI 维护数据时参考的结构模板且不参与业务加载，`test-*.json` 是当前开发阶段使用的真实数据实例。`sample-*` 不再承担模板语义。

礼包统一维护在 `data/packs/`。固定人民币礼包使用 `permanent-packs.json`；Event Pack 与活动范围内的 Currency Pack 分别放在 `event-packs/` 和 `currency-packs/`，按一次活动一个 JSON 文件维护。条件型或周期型 Currency Pack 不要求关联 Event，因此不受“一次活动一个文件”的约束。

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

库存中的限定老荷兰同样复用这一匹配规则。目标方式为 Banner 时，程序根据当前 `targetBanner` 自动列出并汇总 `banner_id` 或 `banner_tag` 匹配的实例，不适用的实例不进入库存总计；自定义日期模式不自动计入限定老荷兰库存。用户无需从全部限定老荷兰类型中手动选择。个性化调整中的限定老荷兰仍视为用户已确认有效，不进行这一步匹配。

限时老荷兰与限定老荷兰不能用同一种数据模型简单处理：前者的可用性取决于目标日期与有效期，后者的可用性取决于目标卡池。分别保留批次时间信息和卡池适用信息，才能进行正确计算并支持后续数据扩展。

## 日期型资源计算原则

用户选择的基础计算区间统一为 `[currentDate, targetDate]`，首尾均包含，并按日历日期处理。这个区间只表示用户希望考察的时间范围，不会覆盖 Banner、Event、Event Pack 等数据对象自身的起止日期或阶段规则；需要按天计算的模块应根据自己的业务含义与对象有效期取交集。

Event 仍使用已有的 `targetDate` 阶段判断，不改为逐日交集。Event Pack 的每日限购次数则取 `[currentDate, targetDate]` 与 `[eventPack.startDate, eventPack.endDate]` 的交集，两端均包含。周期性收入仍须按实际经过的日历日期判断，不能使用天数除以周期或平均月份天数估算。

## 日常收入模块与付费数据归属

“日常收入”统一计算免费日常收入，以及用户选择启用后的长期周期性权益。月卡、季卡、年卡和猫条的持续收益放在同一模块内，可以复用同一日期区间与真实日历规则；各项目的购买行为则按其长期或限时属性分别归属，避免把周期收入和礼包购买混为一体。

日常收入是当前唯一确认的基础区间例外。统一开关 `todayIncomeClaimed`（“今日收入已领取”）默认开启：开启时按 `(currentDate, targetDate]` 计算，关闭时按 `[currentDate, targetDate]` 计算。该开关一次控制当天的每日任务、每周分享、签到、月末奖励以及月卡、年卡、猫条等日常持续收益，避免为同一天收入建立彼此矛盾的多个确认状态。

月卡复用日常收入已经确定的有效天数 `monthlyIncomeDays`，不另建日期算法。它使用非负整数 `remainingDays` 和 `extraPurchases`：`remainingDays` 默认 0，且 0 明确表示当前没有已有月卡覆盖；正数剩余天数在 `todayIncomeClaimed` 开启时覆盖 `remainingDays` 天，关闭时覆盖 `remainingDays + 1` 天。程序据此计算 `uncoveredDays = max(0, monthlyIncomeDays - existingCoveredDays)`、`requiredPurchases = ceil(uncoveredDays / 30)`，最终 `purchaseCount = requiredPurchases + extraPurchases`，不再允许用负数修正购买数量。

月卡启用时默认会购买足够张数覆盖整个计算区间，每日增加 50 钻；每购买一张立即增加 300 钻，同时增加 30 元 RMB 和 30 元限时累充金额。月签到钻石仍在原“月签到奖励”中翻倍，老荷兰颜料不翻倍。月卡未启用时，这些持续收入、购买、RMB 和限时累充均为 0。

季卡在本模块仅计算启用后的每日 50 钻。年卡和猫条也只计算周期收益：每个实际经过的每月 23 日，年卡增加 5 个老荷兰颜料，猫条增加 1 个。季卡、年卡和猫条的价格、购买行为及购买立即奖励不属于日常收入模块，后续统一由 event pack / 活动礼包数据表达。

所有实际人民币付费项目的数据模型支持 `price` 和 `countsTowardLimitedRecharge`。前者记录人民币价格，后者供内部判断是否计入限时累充，不要求前端展示。所有人民币付费项目默认将 `countsTowardLimitedRecharge` 设为 `true`；只有明确标注“不计入限时累充”的项目才设为 `false`。

付费属性跟随具体项目保存，不另建“氪金.md”或重复的中央氪金表。常驻礼包归入 permanent pack 数据，活动礼包以及季卡、年卡、猫条等限时购买行为归入 event pack / 活动礼包数据。人民币金额按 `price × 实际购买数量` 累计，`countsTowardLimitedRecharge` 决定其中计入限时累充的部分。只有实际人民币付费项目影响这两项金额；使用游戏内资源支付的 Currency Pack 不影响它们。

## 常驻礼包（Permanent Pack）与 RMB 礼包估值

常驻礼包表示固定人民币礼包，不限于新人或等级礼包，也不包含 Event Pack、Currency Pack 或免费活动收入。数据存放在 `data/packs/permanent-packs.json`，只保存礼包事实：`id`、`name`、`price`、固定 `purchaseLimit` 或结构化 `purchaseRule`、`contents`、`countsTowardLimitedRecharge`。理论抽数和单抽价格由程序计算，不写入数据文件，避免折算规则变化时产生重复维护。

常驻礼包与 Event Pack 共用一套 RMB pack valuation。共享参数 `redDiamondPerPull` 默认为 `1980 / 28`，即约 70.71 红钻/抽；理论抽数按钻石 `amount / 150`、红钻 `amount / redDiamondPerPull`、普通老荷兰 `amount` 累加。`theoreticalPulls` 与 `pricePerPull` 均允许小数，内部保留完整精度。该参数只用于人民币礼包的理论估值，不代表实际转换库存红钻。

礼包理论估值与当前目标资源可用性是两个不同阶段。Event Pack 与 Currency Pack 的 `theoreticalPulls` 衡量礼包本身包含多少抽卡资源，因此具体实例只要 `category` 为 `limited_paint`，就按 `amount` 计入，不受当前 `targetBanner` 的 `banner_id` 或 `banner_tag` 匹配结果影响。Event Pack 中的结构化 `timed_paint` 仍只有在 `targetDate` 位于 `availableFrom` 至 `expiresAt` 时才计入理论抽数，两类资源不能使用同一种估值判断；这不表示扩展 Currency Pack 当前支持的估值资源类型。

上述估值规则不会改变资源结算规则。限定老荷兰在库存自动匹配，以及 Event Pack、Currency Pack 奖励进入当前资源总计时，仍通过 `applicability` 判断是否适用于 `targetBanner`；限时老荷兰也继续按目标日期判断有效性。这样礼包自身价值不会随所选卡池变化，同时资源总计仍只包含当前目标实际可用的资源。

RMB 礼包估值使用的 `redDiamondPerPull` 与 Currency Pack 红钻礼包按 `redDiamondCost / theoreticalPulls` 得出的实际消费效率是两个独立概念，不得共用。礼包购买后，资源增加量为 `contents × 实际购买数量`，RMB 与限时累充金额按项目的价格、数量及 `countsTowardLimitedRecharge` 规则汇总。

## 活动礼包

Event Pack 数据统一放在 `data/packs/event-packs/`，每次礼包 Event 使用一个独立 JSON 文件，便于按活动维护和增删。Event 描述活动本身及免费活动收入，Event Pack 描述对应的人民币限时礼包；二者是独立实体，只通过稳定的 `eventId` 关联。Event 可以没有礼包，Event Pack 也不与 Banner 强制绑定。

礼包事实数据按用途区分：`contents` 是参与攒抽计算的资源，`otherContents` 只记录或展示非抽卡奖励，`deferredRewards` 记录延期发放内容且不自动进入当前抽卡资源。同一礼包中重复出现的同一种抽卡资源可以合并，避免计算时产生无意义的重复项。

购买规则需要保留各自语义：`total` 表示整个 Event Pack 有效期的总限购，`daily` 表示每日限购；后者的实际可购买次数按基础计算区间与礼包有效期的交集计算。`prerequisites` 使用稳定 pack id 表达购买前置，`pull_count` trigger 表达抽数触发，两者不能混用；当前阶段只展示抽数触发条件，不自动进行解锁判断。

## 钻石 / 红钻礼包

Currency Pack 表示使用游戏内钻石或红钻支付的资源购买项目，与使用人民币购买的 Event Pack 是不同实体。支付资源记录在 `cost` 中，当前支持 `diamond` 和 `red_diamond`；它不使用人民币礼包的 `price` 或 `countsTowardLimitedRecharge`，因此购买不增加 RMB，也不计入限时累充。

Event-scoped Currency Pack 可以通过稳定 `eventId` 关联 Event，并维护自己的 `startDate` 和 `endDate`；只有用户基础计算区间与该有效期存在交集时才可用。条件型或周期型 Currency Pack 不要求关联 Event，也不强制具有活动日期，其可用性由自身业务条件决定，但复用相同的购买、余额校验和资源结算逻辑。

Currency Pack 的 `contents`、`otherContents`、`prerequisites`、`trigger` 和 `deferredRewards` 沿用 Event Pack 的语义。同一活动的钻石礼包与红钻礼包保存在同一个文件中，并根据 `cost.resourceId` 区分。钻石礼包不计算性价比；红钻礼包按当前实现支持的抽卡资源类型计算 `theoreticalPulls`，其中 `limited_paint` 不检查当前 `targetBanner`，再以 `redDiamondCost / theoreticalPulls` 得到实际的单抽红钻价。理论抽数为 0 时，单抽红钻价为 `null`，前端以“—”表示。

Currency Pack 的单抽红钻价表示实际红钻消耗效率；RMB 常驻礼包与 Event Pack 共享的 `redDiamondPerPull` 则是理论估值参数。两者不得共用状态或公式。

计算层保留 Currency Pack 购买前的资源状态，并在其上扣除 `cost`、加入 `contents`，派生当前资源状态。购买不得使钻石或红钻余额为负，也不会自动进行红钻转钻石或钻石转抽数。

月卡每周优惠十连属于条件型 Currency Pack：仅在月卡启用时可用，每周限购 1 次，以 1200 钻石兑换 10 个普通老荷兰。它不依赖 Event 日期，不产生 RMB，也不计入限时累充。

## 个性化调整与资源总计

用户可见的“个性化调整”是不依赖结构化来源的手动资源调整层，允许正数、0 和负数，不修改资源 JSON，也不影响 RMB 或限时累充。这里的限时、限定老荷兰由用户自行确认对当前目标有效，因此不再重复进行有效期或适用卡池判断；`otherState` 等既有内部命名无需随 UI 名称重构。

用户界面只展示一套权威的“资源总计”。内部先汇总库存、日常收入、活动收入、常驻礼包和 Event Pack，得到 Currency Pack 购买前资源；Currency Pack 只以这一状态进行余额校验，并在其上扣除 `cost`、加入 `contents`；个性化调整最后应用，得到最终资源总计。

因此，个性化调整的正数不能帮助购买 Currency Pack，负数也不会造成 Currency Pack 余额不足、取消礼包或改变数量。负调整可以使最终资源为负数，结果不得自动截断为 0。各资源类型始终独立，RMB 总计和限时累充金额仍只受实际人民币购买项目影响。

`availablePulls` 是最终资源总计派生出的当前目标可用抽数，按 `diamond / 150 + common_paint + timed_paint + limited_paint` 计算。它使用 Currency Pack 结算并应用个性化调整后的最终资源，其中限定老荷兰只取当前目标下实际可用的数量；红钻不参与该结果，也不会被自动转换为钻石或抽数。该派生计算保留负调整的真实结果，不自行截断为 0。

## 页面信息架构

用户界面只展示一个权威、实时的“资源总计”。内部可以保留多个计算阶段，但不得把中间阶段重复展示为多个完整资源总计。
