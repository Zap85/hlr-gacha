# HLR Gacha Calculator

这是《时空中的绘旅人》攒抽计算器。

## 项目目标

建立一个结构清晰、代码简洁、易维护、适合长期更新活动数据的静态网页计算器。

## 架构原则

项目分为以下职责：

- 页面层：
  index.html、style.css、app.js

- 计算层：
  calculator.js

- 数据加载层：
  data-loader.js

- 数据层：
  data/**/*.json

必须保持以上职责分离。

## 数据实体边界

### 数据文件命名与目录

- `*-types.json` 保存可复用的规则或类型定义。
- `*.template.json` 只作为人工或 AI 维护数据时使用的结构模板，不得参与正式业务加载。
- `test-*.json` 保存当前开发阶段使用的真实数据实例；不得再使用 `sample-*` 表示模板。
- 礼包数据统一存放在 `data/packs/`：固定人民币礼包使用 `permanent-packs.json`，Event Pack 和 Currency Pack 分别使用 `event-packs/`、`currency-packs/`。
- Event Pack 和活动范围内的 Currency Pack 按一次活动一个 JSON 文件维护；不关联 Event 的条件型或周期型 Currency Pack 不受此规则约束。

### Banner 与 Event

- Banner 和 Event 是两个独立的数据实体，不得混用。
- `data/banners/` 用于保存卡池数据，包括卡池 id、卡池名称、开池日期、结束日期及未来其他卡池属性。
- Banner 必须支持 `tags` 数组；当前唯一确认的 Banner tag 是 `birthday`。
- 不得根据卡池名称、主题、周年、角色或其他语义自行推断或创建 tag；只有用户明确确认后，才能加入新的 tag。
- `data/events/` 用于保存活动数据，包括活动 id、活动名称、活动开始日期、活动结束日期、活动奖励、奖励领取规则及其他活动收入信息。
- Banner 和 Event 的时间可能不重合，这是正常情况。
- 不得用 Event 日期代替 Banner 日期，不得用 Banner 日期代替 Event 日期，也不得假设同名 Banner 和 Event 一定具有相同起止时间。
- “日期与计算方式”模块选择目标卡池时，只读取 Banner 数据。
- “活动收入”模块未来只依据 Event 数据和奖励规则计算活动资源。
- 用户可见文案中，Banner 使用“卡池”，Event 使用“活动”，不得混用术语。

## 活动收入约束

- Event 表示活动本身及免费活动收入，Event Pack 表示人民币限时礼包；两者是独立实体，不得混用。
- `data/events/event-types.json` 维护活动类型模板，具体 Event 通过稳定 `type` 引用模板，不得重复保存模板收入。
- `data/events/test-event.json` 只保存开发测试用的具体 Event 实例，不承担活动类型模板定义职责。
- 实际活动收入为 type 模板值加 Event 的 `incomeAdjustment`；调整分别支持 `available`、`complete`，值可以为正数、0 或负数，未填写的资源视为 0。
- Event 与 Banner 不建立显式关联。活动收入只比较 Event 的 `startDate`、`endDate` 与当前 `targetDate`：目标早于开始日期时不计入，开始日期至结束日期前使用 `available`，到达或超过结束日期时使用 `complete`。
- 活动收入仅在“目标方式 = 选择卡池”时生效；自定义日期模式不得计入活动收入。
- `isRerun: true` 表示复刻活动并默认不选中；普通活动默认选中。用户可以独立切换每个活动的选择状态。
- Event 的 `status` 只允许 `current` 或 `future`，必须由数据明确维护，不得根据日期推断；当前活动显示“可计入”，未来活动显示“预计可计入”，后者表示估算收入而非最终准确奖励。
- `exchanges` 用于表示消耗钻石、红钻等资源换取其他内容，不属于免费活动收入，不得计入 income；后续仅作为可选资源消费处理。
- 活动收入前端只展示最终汇总后的可计入资源，不得展示模板值、`incomeAdjustment` 或具体奖励明细。

## 资源模型约束

- 资源类型定义与具体资源实例必须分开维护。
- `data/resources/resource-types.json` 用于统一定义资源类型；具体的限时批次和限定资源实例通过其他资源数据文件维护。

### 固定资源

- 固定资源目前包括钻石、红钻和老荷兰颜料。
- 钻石和红钻是两个独立资源。
- 红钻可以按 1:1 转换为钻石，但默认不得自动转换。
- 红钻转换只能在需求明确的后续转换流程中发生。

### 限时老荷兰

- 初始库存中的限时老荷兰按用户自行确认后的可用总量录入，不按批次管理。
- 只有来源于活动、礼包等结构化数据的限时老荷兰，才按批次记录并保留 `availableFrom`、`expiresAt` 等有效期信息，由程序进行时间判断。
- 每个可用资源批次至少包含内部唯一 `id`、`category: "timed_paint"`、`availableFrom` 和 `expiresAt`；玩家实际库存数量不属于资源批次定义，可在后续库存数据中另行记录 `amount`。
- 限时老荷兰的核心区别是有效时间，不得通过名称推断有效期；程序必须根据 `availableFrom` 和 `expiresAt` 判断某批资源在目标日期是否可用。
- 不同有效期的批次必须分开记录，不得直接合并成一个总库存数字。
- 批次 `id` 只用于程序识别、编辑和删除，不具有游戏业务含义、不向用户展示，也不得要求人工维护复杂命名规则。

### 限定老荷兰

- 限定老荷兰与限时老荷兰是不同资源模型，其核心限制是适用卡池。
- 每一种具体限定老荷兰必须作为独立资源实例记录，至少支持 `id`、`name`、`category: "limited_paint"` 和 `applicability`。
- `applicability.type` 第一版支持 `banner_id` 和 `banner_tag`；一个实例只使用一种类型，不得同时混用。
- 每次新活动或新卡池都可能产生新的限定老荷兰，不维护必须预先穷举全部限定老荷兰的固定表。
- 不同限定老荷兰不得合并成一个统一库存数字。
- 是否可用于目标卡池，必须由 `applicability` 的结构化数据决定；`banner_id` 引用 Banner 的 `id`，`banner_tag` 只能匹配用户已明确确认的 Banner `tags`，不得通过名称猜测。
- Banner 目标模式下，库存中的限定老荷兰必须按当前 `targetBanner` 自动匹配可用实例，不适用的实例不得进入库存总计；自定义日期模式不自动计入限定老荷兰库存。
- 库存匹配只使用 `banner_id` 或 `banner_tag`，不得要求用户从全部限定老荷兰中手动选择资源种类。
- 新限定老荷兰应通过新增数据支持，不应要求修改核心计算代码。

### 稳定 ID 与数据关联

- 结构化数据的 `id` 可以使用中文，不需要强制转换为英文 slug。
- `id` 是稳定引用键，必须唯一；一旦确定，应尽量保持不变。
- `name` 是用户可见的显示名称，可以修改，程序不得依赖 `name` 建立关联或判断类别。
- 数据之间的关联必须使用稳定 `id` 或明确的结构化标签，不得使用显示名称。

## 日期型资源计算约束

- 用户基础计算区间统一为 `[currentDate, targetDate]`，首尾均包含，并按日历日期处理。
- 基础计算区间只表示用户的计算时间范围，不覆盖 Banner、Event、Event Pack 等对象自身的 `startDate`、`endDate` 或阶段规则；各模块必须按自身业务规则决定是否与有效期取交集。
- Event 继续按 `targetDate` 判断收入阶段，不改为逐日交集。
- Event Pack 的 `daily` 可购买次数按 `[currentDate, targetDate]` 与 `[eventPack.startDate, eventPack.endDate]` 的交集计算，两端均包含。
- 周期性收入必须按区间内实际经过的日历日期计算，不得使用天数除以周期或平均月份天数等方式估算。

## 日常收入与付费项目约束

- “日常收入”负责免费日常收入，以及用户选择启用后的月卡、季卡、年卡、猫条等长期周期性权益收入。
- “日常收入”是当前唯一确认的基础区间例外：使用统一的 `todayIncomeClaimed`（“今日收入已领取”）开关，默认 `true`；为 `true` 时按 `(currentDate, targetDate]` 计算，为 `false` 时按 `[currentDate, targetDate]` 计算。该开关统一控制当天的每日任务、每周分享、签到、月末奖励及各类日常持续收益，不得拆分为多个当天确认项。
- 月卡使用非负整数 `remainingDays` 和 `extraPurchases`；`remainingDays` 默认 0，且 0 明确表示没有已有月卡覆盖。正数剩余天数在 `todayIncomeClaimed: true` 时覆盖 `remainingDays` 天，在 `false` 时覆盖 `remainingDays + 1` 天。
- 月卡复用日常收入有效天数 `monthlyIncomeDays`：`uncoveredDays = max(0, monthlyIncomeDays - existingCoveredDays)`，`requiredPurchases = ceil(uncoveredDays / 30)`，`purchaseCount = requiredPurchases + extraPurchases`。不得使用负数调整购买数量。
- 月卡启用时默认购买足够张数覆盖整个计算区间，每日增加 50 钻；每购买一张立即增加 300 钻，并分别增加 30 元 RMB 和 30 元限时累充金额。月卡未启用时，上述收入、购买及金额均为 0。
- 月卡启用后，月签到中的钻石奖励翻倍，老荷兰颜料不翻倍；翻倍结果必须合并在原“月签到奖励”中，不得建立重复收入项目。
- 月卡是长期可持续购买项目，其购买数量和购买金额由日常收入模块处理。
- 季卡在日常收入模块只处理启用后的每日 50 钻；购买价格、购买立即奖励等购买行为归入后续活动礼包。
- 年卡每月 23 日增加 5 个老荷兰颜料，猫条每月 23 日增加 1 个老荷兰颜料；日常收入模块只处理其周期性收益，购买价格和购买行为归入后续活动礼包。
- 所有实际人民币付费项目的数据模型必须支持 `price` 和 `countsTowardLimitedRecharge`；`price` 表示人民币价格，`countsTowardLimitedRecharge` 表示是否计入限时累充，后者仅供内部计算，不要求前端展示。
- 所有人民币付费项目默认 `countsTowardLimitedRecharge: true`；只有用户明确指出“不计入限时累充”时，才可设为 `false`。
- 不得建立独立的“氪金.md”或重复的中央氪金表；`price`、`countsTowardLimitedRecharge` 等属性必须跟随具体付费项目保存。
- 常驻礼包归入 permanent pack 数据；活动礼包以及季卡、年卡、猫条等限时购买行为归入 event pack / 活动礼包数据。不得在多个数据文件中重复维护同一付费项目的价格或累充属性。
- RMB 按 `price × 实际购买数量` 累计；`countsTowardLimitedRecharge` 决定是否计入限时累充。只有实际人民币付费项目影响这两项金额，Currency Pack 等游戏内资源消费不得计入。

## 常驻礼包（Permanent Pack）与人民币礼包估值约束

- 常驻礼包只处理固定人民币礼包，不包含 Event Pack、Currency Pack 或免费活动收入；数据统一存放在 `data/packs/permanent-packs.json`。
- permanent pack 数据保存礼包事实，包括稳定 `id`、`name`、`price`、固定 `purchaseLimit` 或结构化 `purchaseRule`、`contents` 和 `countsTowardLimitedRecharge`；不得保存 `theoreticalPulls` 或 `pricePerPull`。
- 常驻礼包与 Event Pack 共享同一个 `redDiamondPerPull` 理论估值参数，默认值为 `1980 / 28`（约 70.71 红钻/抽）；该参数只用于 RMB 礼包估值，不得触发实际红钻转换。
- 理论抽数按钻石 `amount / 150`、红钻 `amount / redDiamondPerPull`、普通老荷兰 `amount` 计算；`theoreticalPulls` 和 `pricePerPull` 允许小数，内部不得提前取整。
- Event Pack 中的限时老荷兰仅在 `targetDate` 位于实例的 `availableFrom` 至 `expiresAt` 时计入理论抽数；限定老荷兰仅在实例 `applicability` 通过当前 `targetBanner` 的 `banner_id` 或 `banner_tag` 匹配时计入。不得按显示名称判断。
- RMB 礼包的 `redDiamondPerPull` 理论估值与 Currency Pack 红钻礼包的 `redDiamondCost / theoreticalPulls` 实际消费效率完全独立，不得共用或混淆。
- 购买结果按 `contents × 实际购买数量` 增加资源，并按 `price × 实际购买数量` 累计人民币金额。

## 活动礼包约束

- Event Pack 数据存放在 `data/packs/event-packs/`，每个礼包 Event 使用一个 JSON 文件维护。
- Event 与 Event Pack 是独立实体，通过稳定 `eventId` 关联；Event 可以没有对应礼包，Event Pack 不得与 Banner 强制绑定。
- `contents` 只保存参与攒抽计算的资源；`otherContents` 只用于记录或展示非抽卡奖励；`deferredRewards` 表示延期奖励，不自动计入当前抽卡资源。
- `purchaseRule.type = total` 表示整个 Event Pack 有效期内的总限购，`purchaseRule.type = daily` 表示每日限购。
- `prerequisites` 使用稳定 pack id 表示购买前置关系；`pull_count` trigger 与前置关系分离，当前只展示触发条件，不自动判断解锁。
- 同一礼包内重复的同一种抽卡资源可以合并记录。

## 钻石 / 红钻礼包约束

- Currency Pack 表示使用游戏内钻石或红钻支付的资源购买项目，与人民币 Event Pack 是不同实体。
- Event 范围内的 Currency Pack 存放在 `data/packs/currency-packs/`，可以通过稳定 `eventId` 关联 Event，并维护自身 `startDate`、`endDate`；仅当基础计算区间与其有效期有交集时可用。
- 条件型或周期型 Currency Pack 不要求关联 Event，也不强制具有活动日期；其可用性由自身业务条件决定，并复用 Currency Pack 的购买、余额校验和资源结算逻辑。
- Currency Pack 使用 `cost` 表示支付资源，不得使用人民币项目的 `price` 或 `countsTowardLimitedRecharge`；当前 `cost.resourceId` 只支持 `diamond` 和 `red_diamond`。
- Currency Pack 不增加 RMB，也不计入限时累充；`contents`、`otherContents`、`prerequisites`、`trigger`、`deferredRewards` 沿用 Event Pack 的数据语义。
- 同一 Currency Pack 文件同时保存钻石礼包和红钻礼包，前端按 `cost.resourceId` 分组，不得拆成两套数据。
- 钻石礼包不计算性价比。红钻礼包计算 `theoreticalPulls` 和 `redDiamondPerPull = redDiamondCost / theoreticalPulls`；该实际消费效率不得使用 RMB 礼包的理论估值参数。
- Currency Pack 必须在购买前资源状态上扣除 `cost`、加入 `contents` 后派生当前资源状态，不得直接修改购买前汇总；购买不得使钻石或红钻余额为负。
- Currency Pack 计算不得自动进行红钻转钻石或钻石转抽数。
- 月卡每周优惠十连是条件型 Currency Pack，仅在月卡启用时可用，每周限购 1 次，以 1200 钻石兑换 10 个普通老荷兰；它不依赖 Event 日期，不产生 RMB，也不计入限时累充。

## 个性化调整与资源总计约束

- 用户可见的“个性化调整”是手动资源调整区，调整量允许正数、0 或负数；不得为调整建立结构化来源或修改资源 JSON，也不得影响 RMB 或限时累充。既有 `otherState` 等内部命名无需因此重构。
- “个性化调整”中的限时、限定老荷兰视为用户已确认对当前目标有效，不再判断有效期或 `applicability`。
- 用户界面统一使用“资源总计”作为唯一权威实时资源结果；内部可以保留购买前汇总等计算阶段，但不得为各阶段重复展示完整资源总计。
- 资源结算顺序必须为：库存、日常收入、活动收入、常驻礼包和 Event Pack 汇总为 Currency Pack 购买前资源；再应用 Currency Pack 的 `cost` 与 `contents`；最后应用个性化调整，得到资源总计。
- Currency Pack 的余额校验只能使用个性化调整前的购买前资源。个性化调整的正数不得提高购买能力，负数可以使最终资源为负；最终负数本身不得触发 Currency Pack 余额不足或改变购买状态。
- `diamond`、`red_diamond`、`common_paint`、`timed_paint`、`limited_paint` 必须保持独立，不得自动进行红钻转换或钻石转抽。
- 库存、收入、人民币礼包、Currency Pack 或个性化调整变化后，资源总计必须即时反映当前状态。
- 手动调整可能使最终汇总为负数，不得自动截断为 0。
- RMB 总计和限时累充金额只受实际人民币购买项目影响；游戏内钻石、红钻消费不得计入 RMB。

## 页面信息架构约束

- 用户界面只展示一个权威、实时的“资源总计”。
- 内部可以保留多个计算阶段，但不得把中间阶段重复展示为多个完整资源总计。

## 技术原则

- 使用原生 HTML、CSS、JavaScript。
- 当前阶段不使用 React、Vue 等框架。
- 当前阶段不使用后端和数据库。
- 页面、计算逻辑和游戏数据必须分离。
- 游戏数据不得硬编码在 HTML 或 UI 逻辑中。
- 活动、卡池、礼包数据优先使用 JSON。
- calculator.js 只负责纯计算，不直接操作 DOM。
- app.js 只负责用户交互和页面更新，不自行实现核心计算规则。
- data-loader.js 只负责数据加载和基础数据校验，不负责业务计算。
- 不得自行假设或补充游戏规则。
- 不得在没有明确需求时增加功能。
- 修改一个模块时，尽量不要修改无关模块。
- 优先保持代码简单、清晰、可读。
- 不要为了“架构完整”而过度拆分文件。
- 等模块真正复杂后，再进行有理由的拆分和重构。

## 开发流程

每次只开发一个明确功能。

完成任务后必须：

1. 检查修改的文件。
2. 运行当前已有测试或基础检查。
3. 报告修改内容。
4. 停止，等待用户确认。

不要在完成当前任务后自动继续开发下一模块。
