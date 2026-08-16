window.__ModuleLoader__.load({
	id: "dsh-pluginmanager",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react_jsx_runtime = require("react/jsx-runtime");
		let react = require("react");
		//#region plugin manager css
		const css = ".pm_section{width:100%;max-width:820px;color:var(--dsw-alias-label-primary);flex-direction:column;gap:14px;display:flex}.pm_search{display:flex;align-items:center;gap:8px}.pm_search input{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);height:36px;flex:1;min-width:0;color:var(--dsw-alias-label-primary);font:inherit;border-radius:8px;outline:none;padding:0 12px;font-size:13px}.pm_search input::placeholder{color:var(--dsw-alias-label-tertiary)}.pm_search input:focus-visible{border-color:var(--dsw-alias-state-business-primary);box-shadow:0 0 0 2px color-mix(in srgb,var(--dsw-alias-state-business-primary) 18%,transparent)}.pm_notice{margin:0;font-size:13px;line-height:20px}.pm_notice[data-kind=error]{color:var(--dsw-alias-state-error-primary)}.pm_notice[data-kind=success]{color:var(--dsw-alias-state-success-primary)}.pm_failure{color:var(--dsw-alias-state-error-primary);display:flex;align-items:center;gap:10px;margin:0;font-size:13px;line-height:20px}.pm_failure p{margin:0;flex:1;min-width:0}.pm_failure button{border:1px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-primary);font:inherit;cursor:pointer;background:0 0;border-radius:6px;padding:4px 10px}.pm_restart{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);border-radius:8px;padding:8px 12px;display:flex;align-items:center;gap:10px;font-size:13px}.pm_restart span{flex:1;min-width:0}.pm_restart button{border:1px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-primary);font:inherit;cursor:pointer;background:var(--dsw-alias-bg-layer-3);border-radius:6px;padding:4px 10px}.pm_status{margin:0;color:var(--dsw-alias-label-tertiary);font-size:13px;line-height:20px}.pm_blocks{flex-direction:column;gap:12px;display:flex}.pm_block{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);border-radius:10px;overflow:hidden}.pm_blockHead{display:flex;align-items:center;gap:8px;padding:10px 12px;cursor:pointer;border:0;background:0 0;color:var(--dsw-alias-label-primary);font:inherit;width:100%;text-align:left}.pm_blockHead:hover{background:var(--dsw-alias-bg-layer-2)}.pm_blockTitle{font-size:13px;font-weight:600;flex:1;min-width:0}.pm_badge{background:var(--dsw-alias-bg-layer-3);border:1px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-secondary);border-radius:999px;font-size:11px;font-variant-numeric:tabular-nums;padding:1px 8px}.pm_chevron{color:var(--dsw-alias-label-tertiary);transition:transform .15s ease;display:inline-block}.pm_chevron[data-open=true]{transform:rotate(90deg)}.pm_list{margin:0;padding:0 12px 10px;list-style:none;flex-direction:column;gap:8px;display:flex}.pm_row{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);border-radius:8px;padding:8px 10px;gap:10px;display:flex;align-items:flex-start;flex-direction:column}.pm_rowMain{display:flex;align-items:center;gap:10px;width:100%;min-width:0}.pm_rowName{font-size:13px;font-weight:600;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:flex;align-items:baseline;gap:6px}.pm_rowDisplay{overflow:hidden;text-overflow:ellipsis}.pm_rowPkg{color:var(--dsw-alias-label-tertiary);font-weight:400;font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.pm_rowMeta{display:flex;align-items:center;gap:6px;flex-shrink:0;margin-left:auto}.pm_tag{border:1px solid var(--dsw-alias-border-l2);border-radius:6px;font-size:11px;padding:1px 6px;color:var(--dsw-alias-label-tertiary);white-space:nowrap}.pm_tag[data-kind=on]{color:var(--dsw-alias-state-success-primary);border-color:color-mix(in srgb,var(--dsw-alias-state-success-primary) 40%,transparent)}.pm_tag[data-kind=off]{color:var(--dsw-alias-label-tertiary)}.pm_tag[data-kind=phase]{color:var(--dsw-alias-state-business-primary)}.pm_tag[data-kind=warn]{color:var(--dsw-alias-state-warning-primary,var(--dsw-alias-state-business-primary));border-color:color-mix(in srgb,var(--dsw-alias-state-warning-primary,var(--dsw-alias-state-business-primary)) 45%,transparent)}.pm_desc{margin:0;font-size:12px;line-height:18px;color:var(--dsw-alias-label-secondary);white-space:pre-wrap;word-break:break-word;width:100%}.pm_desc[data-empty=true]{color:var(--dsw-alias-label-tertiary);font-style:italic}.pm_actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.pm_btn{border:1px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-primary);font:inherit;cursor:pointer;background:var(--dsw-alias-bg-layer-3);border-radius:6px;padding:4px 10px;font-size:12px}.pm_btn:hover{border-color:var(--dsw-alias-label-dimmed)}.pm_btn:disabled{opacity:.5;cursor:default}.pm_btn[data-kind=primary]{border-color:var(--dsw-alias-state-business-primary);color:var(--dsw-alias-state-business-primary)}.pm_btn[data-kind=danger]{border-color:color-mix(in srgb,var(--dsw-alias-state-error-primary) 50%,transparent);color:var(--dsw-alias-state-error-primary)}.pm_editor{border-top:1px solid var(--dsw-alias-border-l2);padding-top:8px;width:100%;flex-direction:column;gap:8px;display:flex}.pm_editor input,.pm_editor textarea{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);width:100%;color:var(--dsw-alias-label-primary);font:inherit;border-radius:6px;outline:none;padding:6px 10px;font-size:12px;box-sizing:border-box}.pm_editor textarea{min-height:56px;resize:vertical}.pm_editorRow{display:flex;gap:8px;justify-content:flex-end}.pm_visuallyHidden{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}.pm_hint{margin:0;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}.pm_legend{margin:0;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px;display:flex;flex-wrap:wrap;gap:8px}.pm_cards{flex-direction:column;gap:10px;display:flex}.pm_card{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);border-radius:12px;padding:14px 16px;flex-direction:column;gap:4px;display:flex;cursor:pointer;font:inherit;color:var(--dsw-alias-label-primary);text-align:left;width:100%;transition:border-color .16s,background .16s}.pm_card:hover{border-color:var(--dsw-alias-label-dimmed)}.pm_cardTitleRow{display:flex;align-items:center;gap:10px;width:100%}.pm_cardTitle{font-size:15px;font-weight:600;line-height:1.4;display:flex;align-items:center;gap:8px;flex:1;min-width:0}.pm_cardHint{font-size:13px;line-height:1.5;color:var(--dsw-alias-label-tertiary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.pm_back{border:1px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-primary);font:inherit;cursor:pointer;background:var(--dsw-alias-bg-layer-3);border-radius:6px;padding:4px 10px;font-size:12px;align-self:flex-start}.pm_back:hover{border-color:var(--dsw-alias-label-dimmed)}.pm_tools{margin:0;font-size:12px;line-height:18px;color:var(--dsw-alias-state-business-primary);width:100%}.pm_group{flex-direction:column;gap:8px;display:flex}.pm_groupHead{display:flex;align-items:center;gap:8px;margin:4px 0 0;padding-top:10px;border-top:1px solid var(--dsw-alias-border-l2);font-size:14px;font-weight:600;line-height:20px}.pm_group:first-of-type .pm_groupHead{border-top:0;padding-top:0;margin-top:0}.pm_tag[data-kind=preset]{border-color:var(--dsw-alias-border-l2);color:var(--dsw-alias-label-tertiary);background:var(--dsw-alias-bg-layer-2)}";
		const tagId = "dsh-pluginmanager/manager.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-pluginmanager";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		const s = {
			section: "pm_section", search: "pm_search", notice: "pm_notice", failure: "pm_failure",
			restart: "pm_restart", status: "pm_status", blocks: "pm_blocks", block: "pm_block",
			blockHead: "pm_blockHead", blockTitle: "pm_blockTitle", badge: "pm_badge", chevron: "pm_chevron",
			list: "pm_list", row: "pm_row", rowMain: "pm_rowMain", rowName: "pm_rowName",
			rowDisplay: "pm_rowDisplay", rowPkg: "pm_rowPkg", rowMeta: "pm_rowMeta", tag: "pm_tag",
			desc: "pm_desc", actions: "pm_actions", btn: "pm_btn", editor: "pm_editor",
			editorRow: "pm_editorRow", visuallyHidden: "pm_visuallyHidden", hint: "pm_hint", legend: "pm_legend",
			cards: "pm_cards", card: "pm_card", cardTitleRow: "pm_cardTitleRow", cardTitle: "pm_cardTitle", cardHint: "pm_cardHint", back: "pm_back", tools: "pm_tools", group: "pm_group", groupHead: "pm_groupHead"
		};
		//#endregion
		//#region locales
		const zh = {
			tab: "插件管理",
			loading: "正在读取插件清单…",
			failed: "读取插件清单失败：",
			retry: "重试",
			search: "搜索插件",
			searchPlaceholder: "按名称或描述过滤插件…",
			empty: "没有匹配的插件。",
			legend: "系统层：agent 核心运转 | WebUI 层：浏览器界面 | 工具层：模型工具 | 用户扩展：可停用/卸载 | 标注「预设」的启停由当前预设决定",
			sectionSystem: "系统层",
			sectionWebui: "WebUI 层",
			sectionTool: "工具层",
			sectionUser: "用户扩展",
			sectionDynamic: "运行中（临时）",
			sectionDynamicHint: "当前会话创建并运行的动态 Cordis 插件，进程退出后消失。",
			cardNative: "原生扩展",
			cardNativeHint: "系统层 · WebUI 层 · 工具层",
			cardUser: "用户扩展",
			cardUserHint: "补丁行插件 · 扩展包 · 依赖",
			cardDynamic: "运行中（临时）",
			cardDynamicHint: "当前会话的动态 Cordis 插件",
			back: "返回总览",
			subUserPatch: "补丁行插件",
			subUserBundle: "扩展包",
			subUserDep: "依赖插件",
			subUserOther: "其它",
			enabled: "启用",
			disabled: "已停用",
			running: "运行中",
			stopped: "未运行",
			enable: "启用",
			disable: "停用",
			enabling: "启用中…",
			disabling: "停用中…",
			uninstall: "卸载",
			uninstalling: "卸载中…",
			editDesc: "编辑描述",
			save: "保存",
			cancel: "取消",
			saving: "保存中…",
			displayNameLabel: "显示名称",
			descLabel: "描述",
			noDescription: "（无描述）",
			providesTools: "提供工具",
		toolPluginDynamic: "工具插件（动态注册工具）",
			unregistered: "未登记依赖",
			register: "补登记",
			registering: "补登记中…",
			presetTag: "预设",
			presetHint: "启停由当前预设「{name}」决定",
			doneRegister: "已补登记：",
			failRegister: "补登记失败：",
			confirmUninstall: "确定彻底卸载插件 {name} 吗？\n将移除激活行、依赖声明与包目录，热加载即刻生效。",
			doneEnable: "已停用：",
			doneDisable: "已启用：",
			doneUninstall: "已卸载：",
			doneSave: "描述已保存：",
			failEnable: "停用失败：",
			failDisable: "启用失败：",
			failUninstall: "卸载失败：",
			failSave: "保存失败：",
			hotLive: "（已即时生效，无需重启）",
			bundleRestartHint: "（已从配置移除，但需重启服务才会从运行中彻底消失）",
			restartHint: "更改将在服务重启后生效。",
			restartConfirm: "重启会中断当前正在运行的会话（历史记录保留）。确定现在重启服务吗？",
			restartNow: "立即重启服务",
			nativeOnly: "原生插件，不可卸载",
			sourceProfilePatch: "补丁行",
			sourceBundle: "扩展包",
			sourceDependency: "依赖",
			sourceNative: "原生",
			sourceOther: "其它",
			version: "v",
			dynamicPending: "等待中"
		};
		const en = {
			tab: "Plugin Manager",
			loading: "Reading plugin inventory…",
			failed: "Failed to read plugin inventory: ",
			retry: "Retry",
			search: "Search plugins",
			searchPlaceholder: "Filter by name or description…",
			empty: "No matching plugins.",
			legend: "System: agent core | WebUI: browser surface | Tools: model tools | User extensions: stop/uninstall enabled | rows tagged \"preset\" are governed by the current preset",
			sectionSystem: "System",
			sectionWebui: "WebUI",
			sectionTool: "Tools",
			sectionUser: "User extensions",
			sectionDynamic: "Running (temporary)",
			sectionDynamicHint: "Dynamic Cordis plugins created and run by the current session; they vanish with the process.",
			cardNative: "Native extensions",
			cardNativeHint: "System · WebUI · Tools",
			cardUser: "User extensions",
			cardUserHint: "Patch rows · Bundles · Dependencies",
			cardDynamic: "Running (temporary)",
			cardDynamicHint: "Dynamic Cordis plugins of this session",
			back: "Back to overview",
			subUserPatch: "Patch-row plugins",
			subUserBundle: "Bundles",
			subUserDep: "Dependency plugins",
			subUserOther: "Other",
			enabled: "enabled",
			disabled: "disabled",
			running: "running",
			stopped: "not running",
			enable: "Enable",
			disable: "Disable",
			enabling: "Enabling…",
			disabling: "Disabling…",
			uninstall: "Uninstall",
			uninstalling: "Uninstalling…",
			editDesc: "Edit description",
			save: "Save",
			cancel: "Cancel",
			saving: "Saving…",
			displayNameLabel: "Display name",
			descLabel: "Description",
			noDescription: "(no description)",
			providesTools: "provides tools",
		toolPluginDynamic: "tool plugin (dynamically registered tools)",
			unregistered: "not registered",
			register: "Register",
			registering: "Registering…",
			presetTag: "preset",
			presetHint: "enable/disable owned by current preset \"{name}\"",
			doneRegister: "Registered: ",
			failRegister: "Register failed: ",
			confirmUninstall: "Permanently uninstall {name}?\nThis removes the activation row, dependency entry and package directory; applied live.",
			doneEnable: "Disabled: ",
			doneDisable: "Enabled: ",
			doneUninstall: "Uninstalled: ",
			doneSave: "Description saved: ",
			failEnable: "Disable failed: ",
			failDisable: "Enable failed: ",
			failUninstall: "Uninstall failed: ",
			failSave: "Save failed: ",
			hotLive: " (live, no restart needed)",
			bundleRestartHint: " (removed from config, but a restart is needed to drop it from the running server)",
			restartHint: "Changes take effect after the service restarts.",
			restartConfirm: "Restarting interrupts the running session (history is kept). Restart the service now?",
			restartNow: "Restart service now",
			nativeOnly: "Native plugin, cannot uninstall",
			sourceProfilePatch: "patch row",
			sourceBundle: "bundle",
			sourceDependency: "dependency",
			sourceNative: "native",
			sourceOther: "other",
			version: "v",
			dynamicPending: "pending"
		};
		const NS = "settings.pluginManager";
		//#endregion
		//#region remote face
		const looseCodec = () => ({
			mode: "strict",
			typeSymbol: "dsh-pluginmanager/types#Json",
			schema: { parse: (value) => value }
		});
		const descriptor = (method, parameters) => ({
			id: `dsh-pluginmanager#pluginManager/${method}`,
			service: "pluginManager",
			namespace: "pluginManager",
			method,
			invocation: { kind: "direct" },
			parameters: parameters.map((name) => ({ name, wire: name, source: "json", codec: looseCodec() })),
			result: looseCodec()
		});
		const REMOTE = {
			package: "dsh-pluginmanager",
			descriptors: [
				descriptor("snapshot", []),
				descriptor("setEnabled", ["input"]),
				descriptor("uninstall", ["input"]),
				descriptor("saveDescription", ["input"]),
				descriptor("register", ["input"])
			]
		};
		const failureText = (result) => result.error?.message ?? String(result.error ?? "remote failed");
		//#endregion
		//#region helpers
		function matches(row, query) {
			if (query.length === 0) return true;
			return [row.name, row.displayName, row.description, row.source]
				.filter(Boolean)
				.some((value) => value.toLocaleLowerCase().includes(query));
		}
		function sourceLabel(source, t) {
			if (source === "profile-patch") return t("sourceProfilePatch");
			if (source === "bundle") return t("sourceBundle");
			if (source === "dependency") return t("sourceDependency");
			if (source === "native") return t("sourceNative");
			return t("sourceOther");
		}
		//#endregion
		//#region components
		/** One plugin row; native rows only get the description editor. */
		function PluginRow(props) {
			const t = props.t;
			const row = props.row;
			const editing = props.editing;
			const busy = props.busy;
			const readonly = props.readonly === true;
			const startEdit = () => {
				props.onEditStart();
				props.setDraft({ displayName: row.displayName ?? "", description: row.description ?? "" });
			};
			const phaseTag = row.active
				? react_jsx_runtime.jsx("span", { className: s.tag, "data-kind": "phase", children: t("running") })
				: row.phase && row.phase !== "active"
					? react_jsx_runtime.jsx("span", { className: s.tag, "data-kind": "off", children: t("stopped") })
					: null;
			return react_jsx_runtime.jsx("li", {
				className: s.row,
				children: [
					react_jsx_runtime.jsxs("div", {
						className: s.rowMain,
						children: [
							react_jsx_runtime.jsxs("span", {
								className: s.rowName,
								children: [
									row.displayName
										? react_jsx_runtime.jsx("span", { className: s.rowDisplay, title: row.displayName, children: row.displayName })
										: null,
									react_jsx_runtime.jsx("span", { className: s.rowPkg, title: row.name, children: row.name }),
									row.version ? react_jsx_runtime.jsx("span", { className: s.tag, children: t("version") + row.version }) : null
								]
							}),
							react_jsx_runtime.jsxs("span", {
								className: s.rowMeta,
								children: [
									react_jsx_runtime.jsx("span", { className: s.tag, "data-kind": row.enabled ? "on" : "off", children: row.enabled ? t("enabled") : t("disabled") }),
									row.preset
										? react_jsx_runtime.jsx("span", { className: s.tag, "data-kind": "preset", title: t("presetHint", { name: row.presetName || row.presetId || "" }), children: t("presetTag") })
										: null,
									react_jsx_runtime.jsx("span", { className: s.tag, children: sourceLabel(row.source, t) }),
									!row.native && !row.registered
										? react_jsx_runtime.jsx("span", { className: s.tag, "data-kind": "warn", title: t("unregistered"), children: t("unregistered") })
										: null,
									phaseTag
								]
							})
						]
					}),
					react_jsx_runtime.jsx("p", {
						className: s.desc,
						"data-empty": !row.hasDescription && !row.description,
						children: row.description || t("noDescription")
					}),
					row.tools && row.tools.length > 0
						? react_jsx_runtime.jsx("p", { className: s.tools, children: "🔧 " + t("providesTools") + "：" + row.tools.join("、") })
						: row.isToolPlugin
							? react_jsx_runtime.jsx("p", { className: s.tools, children: "🔧 " + t("toolPluginDynamic") })
							: null,
					readonly ? null : react_jsx_runtime.jsx("div", {
						className: s.actions,
						children: [
							react_jsx_runtime.jsx("button", {
								type: "button",
								className: s.btn,
								disabled: busy !== undefined,
								onClick: startEdit,
								children: t("editDesc")
							}),
							!row.native && !row.registered
								? react_jsx_runtime.jsx("button", {
									type: "button",
									className: s.btn,
									disabled: busy !== undefined,
									onClick: () => props.onRegister(),
									children: busy === "registering" ? t("registering") : t("register")
								})
								: null,
							!row.native
								? react_jsx_runtime.jsx("button", {
									type: "button",
									className: s.btn,
									disabled: busy !== undefined,
									onClick: () => props.onToggle(!row.enabled),
									children: busy === "enabling" ? t("enabling") : busy === "disabling" ? t("disabling") : row.enabled ? t("disable") : t("enable")
								})
								: null,
							!row.native
								? react_jsx_runtime.jsx("button", {
									type: "button",
									className: s.btn,
									"data-kind": "danger",
									disabled: busy !== undefined,
									onClick: () => props.onUninstall(),
									children: busy === "uninstalling" ? t("uninstalling") : t("uninstall")
								})
								: null
						]
					}),
					!readonly && editing
						? react_jsx_runtime.jsxs("div", {
							className: s.editor,
							children: [
								react_jsx_runtime.jsx("input", {
									type: "text",
									value: props.draft.displayName,
									placeholder: t("displayNameLabel"),
									"aria-label": t("displayNameLabel"),
									onChange: (event) => props.setDraft((draft) => ({ ...draft, displayName: event.currentTarget.value }))
								}),
								react_jsx_runtime.jsx("textarea", {
									value: props.draft.description,
									placeholder: t("descLabel"),
									"aria-label": t("descLabel"),
									onChange: (event) => props.setDraft((draft) => ({ ...draft, description: event.currentTarget.value }))
								}),
								react_jsx_runtime.jsxs("div", {
									className: s.editorRow,
									children: [
										react_jsx_runtime.jsx("button", {
											type: "button",
											className: s.btn,
											disabled: busy !== undefined,
											onClick: props.onEditCancel,
											children: t("cancel")
										}),
										react_jsx_runtime.jsx("button", {
											type: "button",
											className: s.btn,
											"data-kind": "primary",
											disabled: busy !== undefined,
											onClick: () => props.onSaveDesc(props.draft),
											children: busy === "saving" ? t("saving") : t("save")
										})
									]
								})
							]
						})
						: null
				]
			});
		}

		/** One collapsible section: heading with count badge + rows. */
		function Section(props) {
			const t = props.t;
			const [open, setOpen] = react.useState(props.defaultOpen);
			const rows = props.rows;
			return react_jsx_runtime.jsxs("section", {
				className: s.block,
				children: [
					react_jsx_runtime.jsxs("button", {
						type: "button",
						className: s.blockHead,
						"aria-expanded": open,
						onClick: () => setOpen((value) => !value),
						children: [
							react_jsx_runtime.jsx("span", { className: s.chevron, "data-open": open, "aria-hidden": "true", children: "›" }),
							react_jsx_runtime.jsx("span", { className: s.blockTitle, children: props.title }),
							react_jsx_runtime.jsx("span", { className: s.badge, children: String(rows.length) })
						]
					}),
					props.hint ? react_jsx_runtime.jsx("p", { className: s.hint, children: props.hint }) : null,
					open && rows.length === 0 ? react_jsx_runtime.jsx("p", { className: s.status, children: t("empty") }) : null,
					open && rows.length > 0
						? react_jsx_runtime.jsx("ul", {
							className: s.list,
							children: rows.map((row) => react_jsx_runtime.jsx(PluginRow, {
								t,
								row,
								readonly: props.readonly,
								editing: props.editingName === row.name,
								busy: props.busy[row.name],
								draft: props.draft,
								setDraft: props.setDraft,
								onEditStart: () => props.onEditStart(row.name),
								onEditCancel: props.onEditCancel,
								onSaveDesc: (draft) => props.onSaveDesc(row.name, draft),
								onToggle: (enabled) => props.onToggle(row.name, enabled),
								onRegister: () => props.onRegister(row.name),
								onUninstall: () => props.onUninstall(row.name)
							}, row.name))
						})
						: null
				]
			});
		}

		/** One collapsible section: heading with count badge + rows. */
		function Section(props) {
			const t = props.t;
			const [open, setOpen] = react.useState(props.defaultOpen);
			const rows = props.rows;
			return react_jsx_runtime.jsxs("section", {
				className: s.block,
				children: [
					react_jsx_runtime.jsxs("button", {
						type: "button",
						className: s.blockHead,
						"aria-expanded": open,
						onClick: () => setOpen((value) => !value),
						children: [
							react_jsx_runtime.jsx("span", { className: s.chevron, "data-open": open, "aria-hidden": "true", children: "›" }),
							react_jsx_runtime.jsx("span", { className: s.blockTitle, children: props.title }),
							react_jsx_runtime.jsx("span", { className: s.badge, children: String(rows.length) })
						]
					}),
					props.hint ? react_jsx_runtime.jsx("p", { className: s.hint, children: props.hint }) : null,
					open && rows.length === 0 ? react_jsx_runtime.jsx("p", { className: s.status, children: t("empty") }) : null,
					open && rows.length > 0
						? react_jsx_runtime.jsx("ul", {
							className: s.list,
							children: rows.map((row) => react_jsx_runtime.jsx(PluginRow, {
								t,
								row,
								readonly: props.readonly,
								editing: props.editingName === row.name,
								busy: props.busy[row.name],
								draft: props.draft,
								setDraft: props.setDraft,
								onEditStart: () => props.onEditStart(row.name),
								onEditCancel: props.onEditCancel,
								onSaveDesc: (draft) => props.onSaveDesc(row.name, draft),
								onToggle: (enabled) => props.onToggle(row.name, enabled),
								onRegister: () => props.onRegister(row.name),
								onUninstall: () => props.onUninstall(row.name)
							}, row.name))
						})
						: null
				]
			});
		}

		/** One top-level card that toggles (folds/unfolds) its section content. */
		function EntryCard(props) {
			return react_jsx_runtime.jsxs("button", {
				type: "button",
				className: s.card,
				"aria-expanded": props.open,
				onClick: props.onClick,
				children: [
					react_jsx_runtime.jsxs("span", {
						className: s.cardTitleRow,
						children: [
							react_jsx_runtime.jsxs("span", {
								className: s.cardTitle,
								children: [
									react_jsx_runtime.jsx("span", { children: props.title }),
									react_jsx_runtime.jsx("span", { className: s.badge, children: String(props.count) })
								]
							}),
							react_jsx_runtime.jsx("span", { className: s.chevron, "data-open": props.open, "aria-hidden": "true", children: "›" })
						]
					}),
					react_jsx_runtime.jsx("span", { className: s.cardHint, children: props.hint })
				]
			});
		}

		/** The manager tab: three top-level cards, each with its layers below. */
		function ManagerTab(props) {
			const t = props.t;
			const [state, setState] = react.useState({ status: "loading", data: null, error: null });
			const [query, setQuery] = react.useState("");
			const [busy, setBusy] = react.useState({});
			const [notice, setNotice] = react.useState(null);
			const [restart, setRestart] = react.useState({ needed: false, available: false });
			const [editingName, setEditingName] = react.useState(null);
			const [draft, setDraft] = react.useState({ displayName: "", description: "" });
			const [dynamic, setDynamic] = react.useState({ status: "loading", rows: [] });
			const [tick, setTick] = react.useState(0);
			const [collapsed, setCollapsed] = react.useState({ native: true, user: true, dynamic: true });

			react.useEffect(() => {
				let alive = true;
				setState((current) => ({ ...current, status: "loading", error: null }));
				props.snapshot().then((result) => {
					if (!alive) return;
					if (!result.ok) { setState({ status: "error", data: null, error: failureText(result) }); return; }
					setState({ status: "ready", data: result.value });
				}, (error) => { if (alive) setState({ status: "error", data: null, error: String(error?.message ?? error) }); });
				return () => { alive = false; };
			}, [tick]);

			react.useEffect(() => {
				let alive = true;
				props.dynamicInventory().then((result) => {
					if (!alive) return;
					const rows = result && result.ok && Array.isArray(result.value) ? result.value : [];
					setDynamic({ status: "ready", rows });
				}, () => { if (alive) setDynamic({ status: "ready", rows: [] }); });
				return () => { alive = false; };
			}, [tick]);

			react.useEffect(() => {
				const bridge = typeof window !== "undefined" ? window.dshDesktop : undefined;
				setRestart((current) => ({ ...current, available: bridge !== undefined && typeof bridge.restartService === "function" }));
			}, []);

			const refresh = () => setTick((value) => value + 1);
			const run = (name, verb, call, donePrefix, failPrefix) => {
				setBusy((current) => ({ ...current, [name]: verb }));
				setNotice(null);
				call().then((result) => {
					setBusy((current) => { const next = { ...current }; delete next[name]; return next; });
					if (!result.ok) { setNotice({ kind: "error", text: failPrefix + failureText(result) }); return; }
					const suffix = result.value?.bundleLayer === true
						? t("bundleRestartHint")
						: result.value?.hot === true ? t("hotLive") : "";
					setNotice({ kind: "success", text: donePrefix + name + suffix });
					setRestart((current) => ({ ...current, needed: result.value?.needsRestart === true }));
					refresh();
				}, (error) => {
					setBusy((current) => { const next = { ...current }; delete next[name]; return next; });
					setNotice({ kind: "error", text: failPrefix + String(error?.message ?? error) });
				});
			};
			const doToggle = (name, enabled) => run(name, enabled ? "enabling" : "disabling", () => props.setEnabled({ name, enabled }), enabled ? t("doneDisable") : t("doneEnable"), enabled ? t("failDisable") : t("failEnable"));
			const doRegister = (name) => run(name, "registering", () => props.register({ name }), t("doneRegister"), t("failRegister"));
			const doUninstall = (name) => {
				if (!window.confirm(t("confirmUninstall", { name }))) return;
				run(name, "uninstalling", () => props.uninstall({ name }), t("doneUninstall"), t("failUninstall"));
			};
			const doSaveDesc = (name, next) => {
				run(name, "saving", () => props.saveDescription({ name, ...next }), t("doneSave"), t("failSave"));
				setEditingName(null);
			};
			const requestRestart = () => {
				if (window.confirm(t("restartConfirm"))) props.restartService().catch(() => {});
			};

			const normalized = query.trim().toLocaleLowerCase();
			const rows = state.status === "ready" && state.data ? state.data.rows ?? [] : [];
			const nativeRows = rows.filter((row) => row.native && matches(row, normalized));
			const userRows = rows.filter((row) => !row.native && matches(row, normalized));
			const dynamicRows = (dynamic.status === "ready" ? dynamic.rows : [])
				.map((row) => ({
					entryId: row.pluginId,
					name: row.name || row.pluginId,
					version: "",
					native: true,
					layer: "dynamic",
					source: "dynamic",
					enabled: true,
					active: true,
					phase: "active",
					displayName: row.name || row.pluginId,
					description: "",
					hasDescription: false
				}))
				.filter((row) => matches(row, normalized));
			const nativeOf = (layer) => nativeRows.filter((row) => row.layer === layer);
			const userOf = (source) => userRows.filter((row) => row.source === source);
			const sectionProps = {
				editingName, busy, draft, setDraft,
				onEditStart: setEditingName,
				onEditCancel: () => setEditingName(null),
				onSaveDesc: doSaveDesc,
				onToggle: doToggle,
				onRegister: doRegister,
				onUninstall: doUninstall
			};
			const userSections = [
				["profile-patch", t("subUserPatch")],
				["bundle", t("subUserBundle")],
				["dependency", t("subUserDep")],
				["other", t("subUserOther")]
			].filter(([source]) => userOf(source).length > 0)
				.map(([source, title]) => react_jsx_runtime.jsx(Section, { t, title, defaultOpen: true, rows: userOf(source), ...sectionProps }, source));

			return react_jsx_runtime.jsxs("div", {
				className: s.section,
				"aria-busy": state.status === "loading",
				children: [
					react_jsx_runtime.jsx("p", { className: s.legend, children: t("legend") }),
					react_jsx_runtime.jsxs("label", {
						className: s.search,
						children: [
							react_jsx_runtime.jsx("span", { className: s.visuallyHidden, children: t("search") }),
							react_jsx_runtime.jsx("input", {
								type: "search",
								value: query,
								placeholder: t("searchPlaceholder"),
								"aria-label": t("search"),
								onChange: (event) => setQuery(event.currentTarget.value)
							})
						]
					}),
					notice !== null ? react_jsx_runtime.jsx("p", { className: s.notice, "data-kind": notice.kind, role: "status", children: notice.text }) : null,
					restart.needed ? react_jsx_runtime.jsxs("div", {
						className: s.restart,
						role: "status",
						children: [
							react_jsx_runtime.jsx("span", { children: t("restartHint") }),
							restart.available ? react_jsx_runtime.jsx("button", { type: "button", onClick: requestRestart, children: t("restartNow") }) : null
						]
					}) : null,
					state.status === "loading" ? react_jsx_runtime.jsx("p", { className: s.status, children: t("loading") }) : null,
					state.status === "error" ? react_jsx_runtime.jsxs("div", {
						className: s.failure,
						role: "alert",
						children: [react_jsx_runtime.jsx("p", { children: state.error ? t("failed") + state.error : t("failed") }), react_jsx_runtime.jsx("button", { type: "button", onClick: refresh, children: t("retry") })]
					}) : null,
					state.status === "ready" ? react_jsx_runtime.jsxs("div", {
						className: s.blocks,
						children: [
							react_jsx_runtime.jsxs("div", {
								className: s.group,
								children: [
									react_jsx_runtime.jsx(EntryCard, { t, title: t("cardNative"), count: nativeRows.length, hint: t("cardNativeHint"), open: !collapsed.native, onClick: () => setCollapsed((c) => ({ ...c, native: !c.native })) }),
									!collapsed.native
										? react_jsx_runtime.jsxs(react_jsx_runtime.Fragment, {
											children: [
												react_jsx_runtime.jsx(Section, { t, title: t("sectionSystem"), defaultOpen: true, rows: nativeOf("system"), ...sectionProps }),
												react_jsx_runtime.jsx(Section, { t, title: t("sectionWebui"), defaultOpen: true, rows: nativeOf("webui"), ...sectionProps }),
												react_jsx_runtime.jsx(Section, { t, title: t("sectionTool"), defaultOpen: true, rows: nativeOf("tool"), ...sectionProps })
											]
										})
										: null
								]
							}),
							react_jsx_runtime.jsxs("div", {
								className: s.group,
								children: [
									react_jsx_runtime.jsx(EntryCard, { t, title: t("cardUser"), count: userRows.length, hint: t("cardUserHint"), open: !collapsed.user, onClick: () => setCollapsed((c) => ({ ...c, user: !c.user })) }),
									!collapsed.user
										? (userSections.length > 0
											? react_jsx_runtime.jsxs(react_jsx_runtime.Fragment, { children: userSections })
											: react_jsx_runtime.jsx("p", { className: s.status, children: t("empty") }))
										: null
								]
							}),
							react_jsx_runtime.jsxs("div", {
								className: s.group,
								children: [
									react_jsx_runtime.jsx(EntryCard, { t, title: t("cardDynamic"), count: dynamicRows.length, hint: t("cardDynamicHint"), open: !collapsed.dynamic, onClick: () => setCollapsed((c) => ({ ...c, dynamic: !c.dynamic })) }),
									!collapsed.dynamic
										? react_jsx_runtime.jsx(Section, {
											t,
											title: t("sectionDynamic"),
											hint: t("sectionDynamicHint"),
											defaultOpen: true,
											readonly: true,
											rows: dynamicRows
										})
										: null
								]
							})
						]
					}) : null
				]
			});
		}
		//#endregion
		//#region client index
		const inject = ["slots", "locale", "remote"];
		/**
		 * Mount the 插件管理 tab into Settings → Plugins. The host Remote face is
		 * mounted in the background and resolved lazily on every call, so a mount
		 * problem surfaces as an in-tab error banner instead of a silent
		 * disappearing tab.
		 */
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, { zh, en }), "dsh-pluginmanager: dictionaries");
			const t = ctx.locale.bind(NS);
			let mountFailure = null;
			const mountPromise = ctx.remote.$mount(REMOTE).then((dispose) => {
				ctx.effect(() => dispose, "dsh-pluginmanager: remote face");
				return true;
			}, (error) => {
				mountFailure = String((error && error.message) || error);
				console.error("dsh-pluginmanager: remote face mount failed", error);
				return false;
			});
			const remote = async () => {
				await mountPromise;
				if (mountFailure !== null) throw new Error("pluginManager 远程接口未就绪: " + mountFailure);
				const service = ctx.get("remote.pluginManager");
				if (service === void 0 || service === null || typeof service !== "object") {
					await new Promise((resolve) => setTimeout(resolve, 50));
					const retry = ctx.get("remote.pluginManager");
					if (retry === void 0 || retry === null || typeof retry !== "object") throw new Error("pluginManager 远程接口未注册");
					return retry;
				}
				return service;
			};
			const dynamicRunner = () => {
				const runner = ctx.get("remote.dynamicCordisRunner");
				return runner !== void 0 && runner !== null && typeof runner.inventory === "function"
					? runner
					: null;
			};
			const injected = () => ({
				snapshot: async () => (await remote()).snapshot(),
				setEnabled: async (input) => (await remote()).setEnabled(input),
				uninstall: async (input) => (await remote()).uninstall(input),
				saveDescription: async (input) => (await remote()).saveDescription(input),
				register: async (input) => (await remote()).register(input),
				dynamicInventory: async () => {
					const runner = dynamicRunner();
					if (runner === null) return { ok: false, error: "dynamicCordisRunner unavailable" };
					const answered = await runner.inventory();
					return { ok: true, value: answered?.rows ?? [] };
				},
				restartService: () => {
					const bridge = typeof window !== "undefined" ? window.dshDesktop : undefined;
					if (bridge !== undefined && typeof bridge.restartService === "function") return bridge.restartService();
					return Promise.resolve({ available: false });
				}
			});
			ctx.slots.inject("settings.plugins.tab", () => ctx.slots.register({
				name: "settings.plugins.tab",
				id: "manager",
				order: 30,
				label: () => t("tab"),
				locale: NS,
				inject: injected
			}, ManagerTab));
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});
