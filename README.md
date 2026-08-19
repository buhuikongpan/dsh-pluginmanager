# dsh-pluginmanager · 插件架构师

[![Awesome DSH Plugin](https://awesome-dsh-plugin.com/badge.svg)](https://awesome-dsh-plugin.com)

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

- **停用 / 启用**：只改激活状态、配置保留，可随时反悔
- **彻底卸载**：依赖声明 + 激活行 + 包目录一并清除，二次确认；**按插件来源智能分流**——补丁行插件卸载后热生效无需重启，扩展包（bundle）插件会明确提示重启服务（原因见「热加载，按来源分流」）
- **未生效诊断**：任何一条用户扩展没生效时，自动打上「未生效 / 加载失败」标签，点「为什么未生效？」展开原因与按步修复指引，还能「🤖 AI 修复」——把「诊断 + 修复步骤」整理成提示词复制给一个新的 Agent 对话，由你决定是否发送

### 3. 运行中（临时）

当前会话创建并运行的动态 Cordis 插件（`@pluginId` 那些），只读展示，进程没了它们也就没了。

## 📝 描述系统：插件终于会说话了

- 内置 **90+ 个核心原生插件**的中文名 + 一句话简介（比如 `dsh-agent-loop` = "Agent 主循环：调度模型步骤、并行分发工具调用"）
- 每个插件都可以**点"编辑描述"**自己写备注，持久化到 `~/.dsh/profiles/web/plugin-manager/descriptions.json`
- 没有描述？兜底显示包名，绝不留白

## 🔍 其他小亮点

- **热加载，按来源分流**：启用 / 停用即点即生效——变更先持久化到 `cordis.patch.yml`，再把运行中的 Loader 条目精准热切换（`entry.update({disabled})` + init 竞态重试）。**卸载**按插件来源区分：补丁行插件（在 `cordis.patch.yml`）删除后由 dsh 的 HMR 捕获、服务端自动重载，真正无需重启；扩展包（bundle，在 `package.json` 的 `dsh.profile.bundles`）卸载后服务端内存仍持有该条目，会明确提示重启
- **搜索过滤**：按名称 / 显示名 / 描述 / 来源过滤，全局生效
- **折叠 + 数量徽章**：每层一个数字，谁也别想藏在角落里
- **中文名 + 包名并排**：先给你看人话，再给你看真名
- **中英双语**：跟随 webui 的 locale，切换即生效

## 📦 安装

```bash
# 作为 bundle 装进 web profile（官方推荐方式）
dsh plugin add github:buhuikongpan/dsh-pluginmanager

# 然后重启 dsh web 服务，设置 → 插件 → 插件管理
```

> ⚠️ **只选一种方式安装，不要混用。** 本插件自带 `cordis.patch.yml`（插入行 `id: pluginmanager`），装成 bundle 后由 DSH 在启动时自动应用；如果你**另外**又手工在 profile 的 `cordis.patch.yml` 里写了同样的插入行，启动会报
> `duplicate loader entry id: pluginmanager` 并拒绝启动（同一插件被激活了两次）。
>
> **排查**：启动失败时检查 `~/.dsh/profiles/web/package.json` 的 `dsh.profile.bundles`（bundle 方式）和 `~/.dsh/profiles/web/cordis.patch.yml`（patch 方式）——同一插件只应出现在其中一处。从旧版（patch 行方式）升级时，先删掉 patch 里那一行再装 bundle。

本地开发调试也可以用 `file:` 依赖直接指向仓库目录（记得同样不要叠加 patch 行）。

## 🛠️ 技术速览

- Host 半边：完整 Node 环境，`pluginManager` Typert Remote（snapshot / setEnabled / uninstall / saveDescription / register），直接读写 profile 文件
- 原生判定：`dsh-base` + `dsh-web-app` 官方 bundle 的依赖与 patch 声明 + Loader 内置 `cordis:` builtins
- 卸载来源分流：`bundle` 层 → `needsRestart` 提示重启；`profile-patch` 层 → 热卸载（dsh HMR 覆盖）
- 未生效诊断：每行用 Loader 相位（failed / pending）+ 来源 + 包 dsh 元数据算出「为什么未生效」的 plain-language 原因与修复步骤，并生成可复制的 AI 修复提示词（dsh-market 风格）
- pnpm 漂移恢复：`withHoistRecovery`（hoist-pattern-diff / release-age / transient-network 自动重建并重试）
- 补丁编辑：文本块级操作 `cordis.patch.yml`（保留注释与 `!!js` 表达式），写入前自动备份
- Browser 半边：`settings.plugins.tab` slot 注册，纯 React + CSS 变量，零框架负担

## ⚠️ 免责声明

- 卸载、停用操作会修改 `cordis.patch.yml` 和 `package.json`，每次写入前有备份；但**请自己审阅源码后使用**
- 停用/启用的「即时生效」等于让目标插件在本进程内重启一次：正在使用的会话状态（如运行中的终端）会随之断开，属正常现象
- 卸载扩展包（bundle）插件后，运行中的服务端不会立即遗忘它——dsh 的 HMR 只监听 `cordis.patch.yml`（补丁层）、不监听 `package.json` 的 `dsh.profile.bundles`（扩展包层），所以需重启服务才彻底消失。插件管理器会明确提示，不会假装已即时生效
- 若运行中切换失败，操作已持久化，重启服务后仍会生效
- 原生插件永远不提供卸载按钮，不是因为做不到，是因为没必要作死
- 本项目与 DeepSeek 无隶属关系，纯社区行为

## ❓ 常见问题

**为什么我装的插件没出现在「用户扩展」里？**
插件管理以运行时 Loader 条目为准。如果你只是 `npm i` 了包但没加激活行（`cordis.patch.yml`），它不会出现在任何一层。请到 profile 的 `package.json`（`dsh.profile.bundles`）或 `cordis.patch.yml` 里为它加上激活，再重启服务。

**插件显示「未生效 / 加载失败」怎么办？**
说明它已装好但当前没跑起来。点该行「为什么未生效？」会列出原因和按步修复建议；点「🤖 AI 修复」会把诊断与修复步骤整理成提示词，复制给一个新的 Agent 对话，由它帮你排查修复（发送与否由你决定）。

**原生插件的描述能改吗？**
能。所有插件都支持「编辑描述」，改完存到 `~/.dsh/profiles/web/plugin-manager/descriptions.json`，重启后仍在。

**为什么卸载扩展包（bundle）插件后，它还显示"运行中"？**
因为 dsh 的热重载（HMR）只监听 `cordis.patch.yml`（补丁层），不监听 `package.json` 的 `dsh.profile.bundles`（扩展包层）。卸载补丁行插件能靠 HMR 即时生效；卸载扩展包插件后，服务端内存仍持有该条目，需重启服务才会彻底消失。插件管理器会在这类插件上明确提示「需重启服务」，而不是假装已即时生效。

**启动报 `duplicate loader entry id: pluginmanager`？**
说明插件被激活了两次（bundle 声明 + 手工 patch 行各一次）。打开 `~/.dsh/profiles/web/package.json` 确认 `dsh.profile.bundles` 里有 `dsh-pluginmanager`，再打开同目录 `cordis.patch.yml`，把里面 `- id: pluginmanager` 那一行（含它的 `insert:` 块）删掉即可——保留 bundle 这一种激活方式。

## 📜 License

MIT
