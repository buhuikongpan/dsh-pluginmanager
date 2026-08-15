# dsh-pluginmanager · 插件架构师

> 你的 DSH 装了 100 多个插件？恭喜，你现在拥有了一座没有楼层指示牌的摩天大楼。
> 这个插件就是那张楼层指示牌——顺便把"哪层能拆、哪层是承重墙"给你标得明明白白。

**dsh-pluginmanager** 是 DeepSeek Harness Web 的设置页插件管理器。它把全部插件从一张 100+ 行的大平铺（谢谢你，原生 `all` 标签页）整理成**三层架构视图**，让"看懂 DSH 的插件体系"这件事从"考古"变成"观光"。

---

## 🏗️ 它到底解决了什么

DSH 的插件体系很强大，但原生的插件清单长这样：

```
@deepseek-ai/dsh-llm  @deepseek-ai/dsh-tool-bash  @deepseek-ai/dsh-client-ui-theme
@deepseek-ai/dsh-agent-loop  @deepseek-ai/dsh-tool-fs  @deepseek-ai/dsh-client-ui-sidebar
@deepseek-ai/dsh-session  @deepseek-ai/dsh-tool-web  ...
（还有 90 多个，它们全在一个列表里，平等地糊你一脸）
```

谁负责 Agent 大脑？谁负责界面？谁是模型能调的工具？你装的扩展又混在哪？——**都看不出来**。

这个插件把混沌整理成了架构：

```
┌─────────────────────────────────────────────┐
│  dsh-pluginmanager  总览                     │
│                                             │
│  ┌───────────────────────────────────────┐  │
│  │ 原生扩展                    [N]  ›    │  │  ← 点进去：系统层 / WebUI 层 / 工具层
│  │ 系统层 · WebUI 层 · 工具层             │  │
│  ├───────────────────────────────────────┤  │
│  │ 用户扩展                    [M]  ›    │  │  ← 点进去：补丁行 / 扩展包 / 依赖
│  │ 补丁行插件 · 扩展包 · 依赖             │  │
│  ├───────────────────────────────────────┤  │
│  │ 运行中（临时）               [K]  ›    │  │  ← 当前会话的动态 Cordis 插件
│  │ 当前会话的动态 Cordis 插件             │  │
│  └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

## 🧭 三层架构，一眼看懂

### 1. 原生扩展（只读，承重墙）

原生插件按职责自动分成三层，**不提供任何卸载按钮**——防止手滑把 Agent 的脑干摘了：

| 层 | 是什么 | 例子 |
|---|---|---|
| **系统层** | Agent 系统运转的核心：模型、会话、沙箱、审批、子代理 | `dsh-llm`、`dsh-agent-loop`、`dsh-sandbox` |
| **WebUI 层** | 浏览器界面的一切 | `dsh-client-ui-*`、`dsh-client-connection` |
| **工具层** | 模型能调用的原生工具 | `dsh-tool-bash`、`dsh-tool-fs`、`dsh-tool-web` |

分层靠"包名前缀 + 官方 bundle 来源"判定，绝对**不会**因为你的扩展名字里带个 `ui` 就混进 WebUI 层——原生是原生，扩展是扩展，楚河汉界。

### 2. 用户扩展（自由区，可拆）

你自己装的一切：补丁行插件（手工放置的 balance、terminal 之类）、扩展包（bundle）、依赖插件。每行都有：

- **停用 / 启用**：只摘激活行，配置保留，可随时反悔
- **彻底卸载**：激活行 + 依赖声明 + node_modules 三连清，二次确认
- **补登记**：把"手工丢进 node_modules、没写进 dependencies"的插件正式登记进依赖——从此插件市场（marketplace）也认得它
- **未登记依赖**标签：一眼看出哪些是规范安装、哪些是野路子

### 3. 运行中（临时）

当前会话创建并运行的动态 Cordis 插件（`@pluginId` 那些），只读展示，进程没了它们也就没了。

## 📝 描述系统：插件终于会说话了

- 内置 **90+ 个核心原生插件**的中文名 + 一句话简介（比如 `dsh-agent-loop` = "Agent 主循环：调度模型步骤、并行分发工具调用"）
- 每个插件都可以**点"编辑描述"**自己写备注，持久化到 `~/.dsh/profiles/web/plugin-manager/descriptions.json`
- 没有描述？兜底显示包名，绝不留白

## 🔍 其他小亮点

- **热加载，不重启**：启用 / 停用 / 卸载即点即生效——先把变更持久化到 `cordis.patch.yml`，再把运行中的 Loader 条目精准热切换（`loader.update` / `loader.remove`），目标插件即时重启，其它插件不受影响
- **搜索过滤**：按名称 / 显示名 / 描述 / 来源过滤，全局生效
- **折叠 + 数量徽章**：每层一个数字，谁也别想藏在角落里
- **中文名 + 包名并排**：先给你看人话，再给你看真名
- **中英双语**：跟随 webui 的 locale，切换即生效

## 📦 安装

```bash
# 作为 bundle 装进 web profile（官方推荐方式）
dsh plugin add github:buhuikongpan/dsh-pluginmanager

# 或手动（npm / pnpm）
pnpm add github:buhuikongpan/dsh-pluginmanager

# 然后重启 dsh web 服务，设置 → 插件 → 插件管理
```

本地开发调试也可以用 `file:` 依赖直接指向仓库目录。

## 🛠️ 技术速览

- Host 半边：完整 Node 环境，`pluginManager` Typert Remote（snapshot / setEnabled / uninstall / saveDescription / register），直接读写 profile 文件
- 原生判定：`dsh-base` + `dsh-web-app` 官方 bundle 的依赖与 patch 声明 + Loader 内置 `cordis:` builtins
- 补丁编辑：文本块级操作 `cordis.patch.yml`（保留注释与 `!!js` 表达式），写入前自动备份
- Browser 半边：`settings.plugins.tab` slot 注册，纯 React + CSS 变量，零框架负担

## ⚠️ 免责声明

- 卸载、停用操作会修改 `cordis.patch.yml` 和 `package.json`，每次写入前有备份；但**请自己审阅源码后使用**
- 热加载的「即时生效」等于让目标插件在本进程内重启一次：正在使用的会话状态（如运行中的终端）会随之断开，属正常现象；若运行中切换失败，操作已持久化，重启服务后仍会生效
- 原生插件永远不提供卸载按钮，不是因为做不到，是因为没必要作死
- 本项目与 DeepSeek 无隶属关系，纯社区行为

## ❓ 常见问题

**为什么我装的插件没出现在「用户扩展」里？**
插件管理以运行时 Loader 条目为准。如果你只是 `npm i` 了包但没加激活行（`cordis.patch.yml`），它不会出现在任何一层——先在「用户扩展」里用「补登记」把它登记进依赖，再确认激活行存在。

**那些带「未登记依赖」标签的是什么？**
手工丢进 `node_modules`、没写进 `package.json` 的插件（比如你自己拷进去的）。点「补登记」即可纳入依赖管理，插件市场也能看到它。

**原生插件的描述能改吗？**
能。所有插件都支持「编辑描述」，改完存到 `~/.dsh/profiles/web/plugin-manager/descriptions.json`，重启后仍在。

## 📜 License

MIT
