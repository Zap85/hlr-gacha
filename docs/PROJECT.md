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
│  ├─ permanent-packs.json
│  ├─ events/
│  │  └─ sample-event.json
│  └─ banners/
│     └─ sample-banner.json
├─ docs/
│  └─ PROJECT.md
└─ AGENTS.md
```

## 分层职责

- 页面层：`index.html` 提供基础结构，`style.css` 提供样式，`app.js` 负责用户交互和页面更新。
- 计算层：`calculator.js` 负责纯计算，不直接操作页面。
- 数据加载层：`data-loader.js` 负责加载和基础校验 JSON 数据，不负责业务计算。
- 数据层：`data/*.json` 保存游戏规则、活动、卡池和礼包等数据。

当前仍支持直接双击 `index.html` 打开页面，因此暂不使用 `fetch` 读取本地 JSON。正式接入数据加载功能应等到项目使用本地开发服务器之后。

## 未来计划

- 支持活动 JSON
- 支持卡池 JSON
- 支持常驻礼包 JSON
- 使用 AI 辅助生成活动数据
- 建立数据校验工具
- 与 HLR Wiki 进行数据层合作

当前正式功能尚未开始开发。
