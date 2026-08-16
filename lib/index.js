// dsh-plugin-manager — host half.
//
// Runs inside the `dsh web` process. Exposes the `pluginManager` Typert Remote
// that the Settings → Plugins → 插件管理 tab drives:
//
//   - snapshot()        — one full, classified inventory of the web profile's
//                         plugins (native system/webui/tool layers + user layer),
//                         merged with live Loader state and editable descriptions.
//   - setEnabled()      — stop/start a user-layer plugin by toggling a
//                         `disabled: true` override block in cordis.patch.yml,
//                         then hot-swapping the live loader entry (no restart).
//   - uninstall()       — permanently remove a user-layer plugin: patch rows,
//                         package.json entries, and the node_modules directory,
//                         then dropping the live loader entry (no restart).
//   - saveDescription() — persist per-plugin display name / description edits.
//
// All reads go to the real profile files under $DSH_HOME/profiles/web plus the
// live Loader entries; every return value is plain JSON with leaf fields only.

import { Remote, TypertRemoteService } from "@deepseek-ai/dsh-typert-protocol";
import { existsSync, readFileSync, writeFileSync, mkdirSync, renameSync, readdirSync, rmSync } from "node:fs";
import { homedir } from "node:os";
import { join, dirname, basename, resolve } from "node:path";
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);

const PROFILE_NAME = "web";

function homeDir() {
	return process.env.DSH_HOME || join(homedir(), ".dsh");
}
function profileDir() {
	return join(homeDir(), "profiles", PROFILE_NAME);
}
function manifestPath() {
	return join(profileDir(), "package.json");
}
function patchPath() {
	return join(profileDir(), "cordis.patch.yml");
}
function dataDir() {
	return join(profileDir(), "plugin-manager");
}
function descPath() {
	return join(dataDir(), "descriptions.json");
}
function hotDir() {
	return join(dataDir(), "hot");
}

const NATIVE_BUNDLES = ["@deepseek-ai/dsh-base", "@deepseek-ai/dsh-web-app"];

// ── tiny fs helpers ─────────────────────────────────────────────────────────

function readJson(path) {
	return JSON.parse(readFileSync(path, "utf8"));
}
function readText(path) {
	return existsSync(path) ? readFileSync(path, "utf8") : "";
}
function writeText(path, text) {
	writeFileSync(path, text, "utf8");
}
/** Atomic write: temp file in the same dir, then rename over the target. */
function writeJsonAtomic(path, value) {
	mkdirSync(dirname(path), { recursive: true });
	const tmp = `${path}.tmp-${process.pid}`;
	writeText(tmp, JSON.stringify(value, null, 2) + "\n");
	renameSync(tmp, path);
}

// ── hot mount (dsh-market hot.ts semantics, isolated to plugin-manager/hot) ──
//
// Restart-free activation: mount a freshly registered plugin into the running
// composition through a market-owned Include subtree. Durable state stays with
// the profile, so the next boot loads the plugin through the normal bundle /
// patch layer; the subtree here exists only for the current process. Its input
// files live under <profile>/plugin-manager/hot/ (OUR OWN directory, distinct
// from dsh-market's .dsh-market/) and are wiped on every boot so a crash can
// never leave a file that collides with the bundle layer.

/** Packages whose host import is replaced by a no-op shim (client-only plugins). */
const shimNames = new Set();
/** Live hot-mount handles: package name → { await, dispose }. */
const hotHandles = new Map();
/** Incrementing id for per-process hot-mount input files. */
let hotSequence = 0;

let hotTreeClass = undefined; // undefined = not loaded, null = unavailable, else class

/**
 * The Include subclass, built once per process. Overrides `write()` so the
 * loader never persists tree changes back to the input file, and `import()`
 * so client-only plugins (shimNames) resolve to a no-op host half.
 */
async function loadHotTreeClass() {
	if (hotTreeClass !== undefined) return hotTreeClass;
	try {
		const specifier = "@deepseek-ai/cordis-plugin-include";
		const mod = await import(specifier);
		const Include = mod.Include;
		if (Include === undefined) throw new Error("no Include export");
		class ManagerHotTree extends Include {
			write() {}
			import(name, getOuterStack) {
				if (shimNames.has(name)) return { name, apply: () => {} };
				return super.import(name, getOuterStack);
			}
		}
		hotTreeClass = ManagerHotTree;
	} catch {
		hotTreeClass = null;
	}
	return hotTreeClass;
}

/** The `dsh` declaration block of an installed package, or null when unreadable. */
function readPkgDsh(packageName) {
	try {
		const manifest = readJson(require.resolve(`${packageName}/package.json`));
		return manifest.dsh ?? {};
	} catch {
		return null;
	}
}

/**
 * Insert rows of a plugin's bundle patch, or null when the patch contains
 * anything beyond plain `id`/`name` insert rows (config blocks, disables,
 * expressions) — those fall back to restart activation.
 */
function parseSimplePatch(patchText) {
	const rows = [];
	let pending = null;
	for (const raw of String(patchText ?? "").split("\n")) {
		const line = raw.replace(/#.*$/, "").trimEnd();
		if (line.trim() === "") continue;
		if (/^-\s+insert:\s*$/.test(line)) continue;
		const id = /^\s+-\s+id:\s*(\S+)\s*$/.exec(line);
		if (id !== null) {
			if (pending !== null) return null;
			pending = id[1];
			continue;
		}
		const name = /^\s+name:\s*['"]?([^'"\s]+)['"]?\s*$/.exec(line);
		if (name !== null && pending !== null) {
			rows.push({ id: pending, name: name[1] });
			pending = null;
			continue;
		}
		return null;
	}
	if (pending !== null || rows.length === 0) return null;
	return rows;
}

/** Wipe leftover hot-mount inputs in OUR directory; call once at startup. */
function cleanHotDir() {
	const dir = hotDir();
	let entries;
	try {
		entries = readdirSync(dir);
	} catch {
		return;
	}
	for (const name of entries) {
		if (/^hot-\d+\.yml$/.test(name)) rmSync(join(dir, name), { force: true });
	}
}

/** Package names currently live through a manager hot mount (patch or shim). */
function listHotMounts() {
	return [...hotHandles.keys()];
}

/**
 * Dispose a plugin hot-mounted earlier in this session, removing it from the
 * running composition immediately.
 * @returns true when a live hot mount was found and disposed.
 */
async function hotUnmount(packageName) {
	const handle = hotHandles.get(packageName);
	if (handle === undefined) return false;
	hotHandles.delete(packageName);
	shimNames.delete(packageName);
	try {
		await handle.dispose();
		return true;
	} catch {
		return false;
	}
}

/**
 * Mount `packageName` into the running composition through an Include subtree.
 * @param ctx — the Cordis Context (has `plugin()`).
 * @param packageName — registered package to activate.
 * @returns { ok, reason } — reason explains non-ok results (null when ok).
 */
async function hotMount(ctx, packageName) {
	try {
		const HotTree = await loadHotTreeClass();
		if (HotTree === null) {
			return { ok: false, reason: "宿主不支持热挂载(include 插件不可导入),需重启" };
		}
		let patchText = null;
		try {
			patchText = readText(require.resolve(`${packageName}/cordis.patch.yml`));
		} catch {
			patchText = null;
		}
		let rows;
		if (patchText !== null) {
			rows = parseSimplePatch(patchText);
			if (rows === null) {
				return { ok: false, reason: "bundle patch 含配置行/表达式,热挂载仅支持纯 insert,重启后生效" };
			}
		} else {
			const dsh = readPkgDsh(packageName);
			if (dsh === null || dsh.client === undefined || dsh.bundle !== undefined) {
				return { ok: false, reason: "该包无 bundle patch 且未声明 dsh.client,没有可热挂载的内容" };
			}
			shimNames.add(packageName);
			rows = [{ id: `client-${packageName.replace(/[^A-Za-z0-9_.-]/g, "-")}`, name: packageName }];
		}
		mkdirSync(hotDir(), { recursive: true });
		hotSequence += 1;
		const file = join(hotDir(), `hot-${String(hotSequence)}.yml`);
		const yml = rows.map((row) => `- id: 'mkt-${row.id}'\n  name: '${row.name}'\n`).join("");
		writeText(file, yml);
		const handle = ctx.plugin(HotTree, { path: pathToFileURL(file).href });
		await handle.await();
		hotHandles.set(packageName, handle);
		return { ok: true, reason: null };
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		return { ok: false, reason: `热挂载失败,重启后生效 — ${message}` };
	}
}

/** Best-effort version of a plugin package from any resolvable node_modules. */
function resolveVersion(name) {
	try {
		const pkgPath = require.resolve(`${name}/package.json`);
		return readJson(pkgPath).version ?? "";
	} catch {
		return "";
	}
}

// ── cordis.patch.yml block parsing (text-level, comment and !!js safe) ───────

/**
 * Split a patch document into top-level blocks. A block starts at a line
 * beginning with "- " and runs until the next such line or EOF. Returns blocks
 * as { text, lines: [startLine, endLineExclusive], kind, id, name, disabled }.
 */
function parseBlocks(text) {
	const lines = text.split(/\r?\n/);
	const blocks = [];
	let start = null;
	for (let i = 0; i < lines.length; i++) {
		if (/^-\s/.test(lines[i])) {
			if (start !== null) blocks.push({ ...blockOf(lines, start, i), start, end: i });
			start = i;
		}
	}
	if (start !== null) blocks.push({ ...blockOf(lines, start, lines.length), start, end: lines.length });
	return blocks;
}
function blockOf(lines, start, end) {
	const text = lines.slice(start, end).join("\n");
	const id = match(/^\s*- id:\s*([\w./-]+)/m, text);
	const name = match(/^\s*name:\s*['"]([^'"]+)['"]/m, text);
	const disabled = /\bdisabled:\s*true\b/.test(text);
	const kind = /^\s*- insert:/m.test(text) ? "insert" : "plain";
	return { text, kind, id, name, disabled };
}
function match(re, text) {
	const m = text.match(re);
	return m ? m[1] : null;
}

/** Insert blocks that carry plugin rows (id + name), each row as one entry. */
function patchRows(text) {
	const rows = [];
	for (const block of parseBlocks(text)) {
		if (block.kind !== "insert") continue;
		// walk the indented sub-rows of the insert list
		const lines = block.text.split("\n");
		let current = null;
		for (const line of lines) {
			if (/^\s+- id:/.test(line)) {
				if (current) rows.push(current);
				current = { id: match(/id:\s*([\w./-]+)/, line), name: null, disabled: false, block, lineIndex: null };
			} else if (/^\s+name:/.test(line) && current) {
				current.name = match(/name:\s*['"]([^'"]+)['"]/, line);
			} else if (/^\s+disabled:\s*true/.test(line) && current) {
				current.disabled = true;
			}
		}
		if (current) rows.push(current);
	}
	return rows;
}

/** Patch rows whose insert block contains a given plugin name. */
function rowByPluginName(text, name) {
	return patchRows(text).find((row) => row.name === name) ?? null;
}

/** Top-level plain blocks (id-targeted config / disabled overrides). */
function plainBlocks(text) {
	return parseBlocks(text).filter((block) => block.kind === "plain" && block.id !== null);
}

/** Remove a top-level block range from the document (id-targeted or by index). */
function removeBlockRange(text, block) {
	const lines = text.split(/\r?\n/);
	if (block.end <= block.start || block.start < 0 || block.end > lines.length) return text;
	lines.splice(block.start, block.end - block.start);
	return lines.join("\n");
}

/** Add `- id: <id>\n  disabled: true` at the end (last write wins per loader). */
function addDisabledOverride(text, id) {
	if (plainBlocks(text).some((block) => block.id === id && block.disabled)) return text;
	const trimmed = text.replace(/\s+$/, "");
	return `${trimmed}\n\n- id: ${id}\n  disabled: true\n`;
}

/** Remove the `disabled: true` override block for an id, if present. */
function removeDisabledOverride(text, id) {
	let changed = false;
	for (const block of plainBlocks(text)) {
		if (block.id === id && block.disabled) {
			text = removeBlockRange(text, block);
			changed = true;
		}
	}
	return changed ? text : text;
}

/** Remove the insert block that carries a plugin name, plus its override block. */
function removePluginRows(text, name) {
	let out = text;
	const row = rowByPluginName(out, name);
	if (row) out = removeBlockRange(out, row.block);
	const byId = row ? row.id : null;
	if (byId) out = removeDisabledOverride(out, byId);
	return out;
}

/** Remove plain blocks whose id targets a plugin name's entry (config overrides). */
function removePlainBlocksForId(text, id) {
	let out = text;
	for (const block of plainBlocks(out)) {
		if (block.id === id && !block.disabled) out = removeBlockRange(out, block);
	}
	return out;
}

// ── agent preset composition parsing ─────────────────────────────────────────
//
// Which model tools are actually enabled is decided by the CURRENT agent
// preset (settings.yaml `agent-presets.default` → its agent.cordis.yml), not
// by the host loader tree — the host rows for most tools ship `disabled` and
// each session mounts its own copies through the preset. The snapshot merges
// preset rows on top of the loader state so the shown enable/disable matches
// what the running agent can really do.

/** Parse an agent.cordis.yml into { id, name, disabled } rows (top-level and group children). */
function parsePresetRows(text) {
	const rows = [];
	let current = null;
	for (const raw of String(text ?? "").split(/\r?\n/)) {
		const line = raw.replace(/#.*$/, "").trimEnd();
		if (!line.trim()) continue;
		const idMatch = /^(\s*)- id:\s*['"]?([\w./-]+)['"]?\s*$/.exec(line);
		if (idMatch) {
			if (current) rows.push(current);
			current = { id: idMatch[2], name: null, disabled: null };
			continue;
		}
		const nameMatch = /^(\s*)name:\s*['"]([^'"]+)['"]\s*$/.exec(line);
		if (nameMatch && current) {
			current.name = nameMatch[2];
			continue;
		}
		const disabledMatch = /^(\s*)disabled:\s*(.+?)\s*$/.exec(line);
		if (disabledMatch && current && current.disabled === null) {
			current.disabled = disabledMatch[2];
			continue;
		}
	}
	if (current) rows.push(current);
	return rows.filter((row) => row.name && row.name !== "cordis:group");
}

/**
 * Resolve a preset row's `disabled` value to a boolean. Plain true/false pass
 * through; `!!js <expr>` is evaluated in a tiny sandbox that only exposes
 * `process.platform/arch/version` (the shipped presets use exactly that).
 * Anything unreadable counts as enabled.
 */
function presetDisabledValue(disabled) {
	if (disabled === null || disabled === undefined) return false;
	const value = String(disabled).trim();
	if (value === "true") return true;
	if (value === "false") return false;
	const jsExpr = /^!!js\s+(.+)$/.exec(value);
	if (jsExpr) {
		try {
			// eslint-disable-next-line no-new-func
			const result = new Function("process", "return (" + jsExpr[1] + ")")(
				{ platform: process.platform, arch: process.arch, version: process.version }
			);
			return result === true;
		} catch {
			return false;
		}
	}
	return false;
}

// ── native bundle resolution ─────────────────────────────────────────────────

/** All `name:` values declared by a bundle's cordis.patch.yml. */
function bundlePatchNames(bundleName) {
	try {
		const pkgDir = dirname(require.resolve(`${bundleName}/package.json`));
		const text = readText(join(pkgDir, "cordis.patch.yml"));
		const names = new Set();
		for (const m of text.matchAll(/^\s*name:\s*['"]([^'"]+)['"]\s*$/gm)) names.add(m[1]);
		return names;
	} catch {
		return new Set();
	}
}

/** @deepseek-ai dependency names declared by one package (one level). */
function scopedDeps(packageName) {
	try {
		const pkg = readJson(require.resolve(`${packageName}/package.json`));
		const out = new Set();
		for (const key of Object.keys(pkg.dependencies ?? {})) {
			if (key.startsWith("@deepseek-ai/")) out.add(key);
		}
		return out;
	} catch {
		return new Set();
	}
}

/**
 * The authoritative "native" plugin-name set: the CLI's own dependencies plus
 * the dsh-base / dsh-web-app bundle dependencies and their patch-declared
 * names, plus the Loader's statically mounted `cordis:` builtins (the boot
 * include root and group support). Anything else (profile patch rows, other
 * bundles, npm installs) is a user extension.
 */
const FRAMEWORK_BUILTINS = new Set(["cordis:include", "cordis:group"]);

function nativeNameSet() {
	const set = new Set(FRAMEWORK_BUILTINS);
	for (const name of NATIVE_BUNDLES) {
		for (const dep of scopedDeps(name)) set.add(dep);
		for (const patchName of bundlePatchNames(name)) set.add(patchName);
	}
	try {
		for (const dep of scopedDeps("@deepseek-ai/dsh")) set.add(dep);
	} catch {}
	return set;
}

/** Plugin-name sets per native layer. */
function nativeLayerSets() {
	const tool = new Set();
	const webui = new Set();
	const base = new Set();
	for (const name of NATIVE_BUNDLES) {
		const deps = scopedDeps(name);
		for (const dep of deps) {
			if (/^@deepseek-ai\/dsh-tool-/.test(dep)) tool.add(dep);
			else if (name === "@deepseek-ai/dsh-web-app") webui.add(dep);
			else base.add(dep);
		}
	}
	// web-app bundle patch names are webui by definition
	for (const name of bundlePatchNames("@deepseek-ai/dsh-web-app")) webui.add(name);
	for (const name of bundlePatchNames("@deepseek-ai/dsh-base")) {
		if (/^@deepseek-ai\/dsh-tool-/.test(name)) tool.add(name);
		else base.add(name);
	}
	return { tool, webui, base };
}

// ── descriptions.json ────────────────────────────────────────────────────────

/** Built-in friendly metadata for the well-known native plugins. */
const BUILTIN_META = {
	"cordis:include": { name: "组合根（配置包含）", description: "DSH 引导时静态挂载的根节点：把 base/web bundle 与用户补丁层组合进 Loader。框架内部件，非插件。" },
	"cordis:group": { name: "组合分组", description: "Cordis 内置组合分组，为 isolate realm 提供嵌套条目组。框架内部件，非插件。" },
	"@deepseek-ai/dsh-llm": { name: "语言模型服务", description: "LLM 适配器注册表与流式模型调用，是所有模型请求的核心服务。" },
	"@deepseek-ai/dsh-llm-deepseek": { name: "DeepSeek 适配器", description: "原生 DeepSeek 模型适配器（deepseek-v4 系列），密钥从凭据存储按请求解析。" },
	"@deepseek-ai/dsh-llm-pi-ai": { name: "多提供方适配器", description: "pi-ai 多提供方模型适配器，由设置文档按需挂载路由。" },
	"@deepseek-ai/dsh-llm-retry": { name: "LLM 重试", description: "模型调用失败的重试策略。" },
	"@deepseek-ai/dsh-agent-loop": { name: "Agent 循环", description: "Agent 主循环：调度模型步骤、并行分发工具调用、推进会话。" },
	"@deepseek-ai/dsh-agent": { name: "Agent 工厂", description: "Agent 创建与生命周期管理。" },
	"@deepseek-ai/dsh-agent-default-model": { name: "默认模型", description: "会话默认模型选择与持久化。" },
	"@deepseek-ai/dsh-session": { name: "会话存储", description: "进程内会话存储与事件记录。" },
	"@deepseek-ai/dsh-session-title": { name: "会话标题", description: "会话标题生成与重命名。" },
	"@deepseek-ai/dsh-session-title-first-prompt-llm": { name: "首轮标题生成", description: "用首条用户消息经 LLM 生成会话标题。" },
	"@deepseek-ai/dsh-session-persistence-jsonl": { name: "会话持久化", description: "以 JSONL 日志把会话事件持久化到磁盘。" },
	"@deepseek-ai/dsh-session-query-sqlite": { name: "会话检索", description: "会话全文检索与精确读取（默认只开精确读，不开全文索引）。" },
	"@deepseek-ai/dsh-session-projection": { name: "会话投影", description: "会话投影单元注册表，供浏览器读取状态。" },
	"@deepseek-ai/dsh-session-projection-cache": { name: "投影缓存", description: "会话投影的持久化缓存，按事件数/间隔落盘。" },
	"@deepseek-ai/dsh-session-stats": { name: "会话统计", description: "会话轮次/步骤统计，供聊天底部统计条展示。" },
	"@deepseek-ai/dsh-session-telemetry-otel": { name: "会话遥测", description: "OpenTelemetry 遥测导出（默认关闭）。" },
	"@deepseek-ai/dsh-session-checkpoint-policy": { name: "会话检查点", description: "模型请求前的持久化检查点。" },
	"@deepseek-ai/dsh-session-reference": { name: "会话引用", description: "跨会话消息引用与上下文准备。" },
	"@deepseek-ai/dsh-user-questions": { name: "用户提问", description: "向用户发起结构化提问的服务。" },
	"@deepseek-ai/dsh-user-approval": { name: "审批服务", description: "按权限策略（ask/never）审批危险操作。" },
	"@deepseek-ai/dsh-permission-presets": { name: "权限预设", description: "read-only / workspace-write / danger-full-access 权限档位。" },
	"@deepseek-ai/dsh-sandbox-local": { name: "进程沙箱", description: "命令执行沙箱（进程限制）。" },
	"@deepseek-ai/dsh-sandbox-policy": { name: "沙箱策略", description: "按会话解析沙箱与审批策略。" },
	"@deepseek-ai/dsh-bash-sandbox": { name: "Bash 沙箱", description: "POSIX 命令沙箱执行器。" },
	"@deepseek-ai/dsh-pwsh-sandbox": { name: "PowerShell 沙箱", description: "Windows PowerShell 沙箱执行器。" },
	"@deepseek-ai/dsh-fs-sandbox": { name: "沙箱文件系统", description: "受沙箱策略约束的文件系统提供方。" },
	"@deepseek-ai/dsh-fs-observation-policy": { name: "文件观察策略", description: "文件操作前的读取/编辑观察策略。" },
	"@deepseek-ai/dsh-credentials-local": { name: "凭据存储", description: "API 密钥等机密的安全存储与按引用解析。" },
	"@deepseek-ai/dsh-settings-file": { name: "用户设置", description: "settings.yaml 用户设置文档（热重载）。" },
	"@deepseek-ai/dsh-subprocess-local": { name: "子进程", description: "通用子进程 spawn 服务。" },
	"@deepseek-ai/dsh-shell-env": { name: "Shell 环境", description: "向执行注入可信的 DSH_* 环境变量。" },
	"@deepseek-ai/dsh-jobs-local": { name: "后台任务", description: "后台任务注册表（start/list/kill/wait）。" },
	"@deepseek-ai/dsh-goal": { name: "目标服务", description: "持久化同一会话目标（goal）的领域服务。" },
	"@deepseek-ai/dsh-goal-round-driver": { name: "目标轮次驱动", description: "目标自动续轮驱动。" },
	"@deepseek-ai/dsh-plan-mode": { name: "计划模式", description: "计划模式状态与 /plan 命令、退出计划工具。" },
	"@deepseek-ai/dsh-token-meter": { name: "Token 计量", description: "上下文 token 用量估算与投影。" },
	"@deepseek-ai/dsh-compaction-basic": { name: "上下文压缩", description: "长会话自动压缩。" },
	"@deepseek-ai/dsh-compaction-tool-result-pruner": { name: "结果裁剪", description: "超限工具结果的头/尾裁剪。" },
	"@deepseek-ai/dsh-tool-call-timeout-policy": { name: "工具超时", description: "工具调用超时策略。" },
	"@deepseek-ai/dsh-spill-local": { name: "溢出存储", description: "超长文本的溢出存储后端。" },
	"@deepseek-ai/dsh-spill-policy": { name: "溢出策略", description: "何时把内联文本转为溢出引用。" },
	"@deepseek-ai/dsh-repeat-tool-reminder": { name: "重复工具提醒", description: "连续重复调用同一工具的提醒。" },
	"@deepseek-ai/dsh-subagent": { name: "子代理注册表", description: "命名子代理提供方注册表（spawn/fork）。" },
	"@deepseek-ai/dsh-subagent-spawn-in-process": { name: "子代理 spawn", description: "进程内子代理 spawn 后端。" },
	"@deepseek-ai/dsh-subagent-fork-in-process": { name: "子代理 fork", description: "继承上下文的 fork 后端（一次性）。" },
	"@deepseek-ai/dsh-workflow-worker-thread": { name: "Workflow 工作线程", description: "workflow 编排的工作线程后端。" },
	"@deepseek-ai/dsh-tools": { name: "工具注册表", description: "模型工具注册与执行管线。" },
	"@deepseek-ai/dsh-system-prompt": { name: "系统提示词", description: "系统提示词分节组装服务。" },
	"@deepseek-ai/dsh-agent-instructions": { name: "Agent 指令", description: "注入 agent 指令文本（persona）。" },
	"@deepseek-ai/dsh-commands": { name: "命令注册表", description: "人可用的 /命令 注册表。" },
	"@deepseek-ai/dsh-command-compact": { name: "/compact 命令", description: "手动触发上下文压缩。" },
	"@deepseek-ai/dsh-command-goal": { name: "/goal 命令", description: "目标管理的斜杠命令。" },
	"@deepseek-ai/dsh-command-feedback": { name: "反馈命令", description: "消息反馈的斜杠命令。" },
	"@deepseek-ai/dsh-skill": { name: "技能注册表", description: "分层技能注册表与目录。" },
	"@deepseek-ai/dsh-skill-filesystem": { name: "技能文件系统", description: "从文件系统发现技能。" },
	"@deepseek-ai/dsh-skill-badge": { name: "技能徽章", description: "技能徽章（默认禁用）。" },
	"@deepseek-ai/dsh-typert-registry": { name: "Typert 注册表", description: "Typert 生成的 schema 与包反射注册表。" },
	"@deepseek-ai/dsh-typert-loader": { name: "Typert Loader", description: "从插件源码加载 Typert 契约。" },
	"@deepseek-ai/dsh-api-gateway": { name: "API 网关", description: "传输无关的统一 API 调度面。" },
	"@deepseek-ai/dsh-web": { name: "网络搜索服务", description: "网络搜索/抓取服务抽象。" },
	"@deepseek-ai/dsh-web-search-deepseek": { name: "DeepSeek 搜索", description: "DeepSeek 检索增强搜索提供方。" },
	"@deepseek-ai/dsh-attachment-local": { name: "附件存储", description: "图片等二进制附件的内容寻址存储。" },
	"@deepseek-ai/cordis-plugin-timer": { name: "定时器", description: "Cordis 定时器（timeout/interval）服务。" },
	"@deepseek-ai/cordis-plugin-hmr": { name: "配置热重载", description: "cordis.yml 配置变更热重载。" },
	"@deepseek-ai/cordis-plugin-include": { name: "配置包含", description: "cordis.yml 引用其它文件。" },
	"@deepseek-ai/cordis": { name: "Cordis 框架", description: "依赖注入插件框架本体。" },

	"@deepseek-ai/dsh-web-app": { name: "Web 运行时", description: "webui 宿主运行时：解析前端产物、打印 URL、注册提示词分节。" },
	"@deepseek-ai/dsh-web-app/startup": { name: "Web 启动参数", description: "解析 dsh web 启动参数（host/port/trustedHosts）。" },
	"@deepseek-ai/dsh-host-webserver": { name: "HTTP 服务", description: "webui 的 HTTP 载体（路由/升级/回退）。" },
	"@deepseek-ai/dsh-host-apiproxy": { name: "API 代理", description: "把客户端 RPC 桥接到宿主服务。" },
	"@deepseek-ai/dsh-cordis-host-runner": { name: "宿主插件运行器", description: "动态 Cordis 插件的宿主侧运行器。" },
	"@deepseek-ai/dsh-client-modules": { name: "客户端模块表", description: "扫描 dsh.client 包、组装浏览器启动图并服务 /plugins 脚本。" },
	"@deepseek-ai/dsh-client-connection": { name: "浏览器连接", description: "浏览器与宿主的 fetch/SSE 传输。" },
	"@deepseek-ai/dsh-api-remotes": { name: "远程 API 面", description: "浏览器侧 Typert Remote 客户端。" },
	"@deepseek-ai/dsh-client-runtime": { name: "客户端运行时", description: "浏览器侧 Cordis 运行时。" },
	"@deepseek-ai/dsh-cordis-client-runner": { name: "客户端插件运行器", description: "动态 Cordis 插件的浏览器侧运行器。" },
	"@deepseek-ai/dsh-client-hmr": { name: "客户端热重载", description: "客户端插件 bundle 热重载链。" },
	"@deepseek-ai/dsh-client-ui-theme": { name: "主题", description: "亮/暗主题与 token。" },
	"@deepseek-ai/dsh-client-locale": { name: "多语言", description: "界面文案的 zh/en 字典。" },
	"@deepseek-ai/dsh-client-ui-layout": { name: "布局", description: "三栏布局（侧边栏/会话/详情）。" },
	"@deepseek-ai/dsh-client-ui-sidebar": { name: "侧边栏", description: "工作区/会话浏览与设置入口。" },
	"@deepseek-ai/dsh-client-ui-settings": { name: "设置页", description: "设置面板外壳与分区。" },
	"@deepseek-ai/dsh-client-ui-settings-general": { name: "常规设置", description: "语言、外观、Composer 行为等常规项。" },
	"@deepseek-ai/dsh-client-ui-settings-models": { name: "模型设置", description: "模型提供方与默认模型配置页。" },
	"@deepseek-ai/dsh-client-ui-settings-plugin-inventory": { name: "插件清单页", description: "只读列出全部 Loader 插件（all 标签页）。" },
	"@deepseek-ai/dsh-client-ui-settings-plugins": { name: "插件配置页", description: "可配置插件的设置卡片（configurable 标签页）。" },
	"@deepseek-ai/dsh-client-ui-conversation": { name: "会话视图", description: "聊天主视图：消息流、工具卡片、输入栏。" },
	"@deepseek-ai/dsh-client-ui-workspace": { name: "工作区视图", description: "工作区目录选择与切换。" },
	"@deepseek-ai/dsh-client-ui-tool": { name: "工具视图", description: "工具调用卡片与详情。" },
	"@deepseek-ai/dsh-client-ui-cordis": { name: "动态插件面板", description: "动态 Cordis 插件清单、审批与运行控制。" },
	"@deepseek-ai/dsh-client-ui-workflow-run": { name: "Workflow 节点", description: "workflow 运行的独立聊天节点。" },
	"@deepseek-ai/dsh-client-ui-deliverables": { name: "产出文件行", description: "每轮结束的产出文件行与可点击引用。" },
	"@deepseek-ai/dsh-client-ui-input-trigger": { name: "输入触发器", description: "/ 与 @ 输入管线。" },
	"@deepseek-ai/dsh-client-ui-commands": { name: "命令面板", description: "斜杠命令的弹出选择。" },
	"@deepseek-ai/dsh-client-ui-skill": { name: "技能引用", description: "@ 技能引用来源。" },
	"@deepseek-ai/dsh-client-ui-subagent": { name: "子代理引用", description: "@ 子代理引用来源。" },
	"@deepseek-ai/dsh-client-ui-jobs": { name: "任务视图", description: "会话头部后台任务列表。" },
	"@deepseek-ai/dsh-client-ui-goal": { name: "目标条", description: "输入栏下的目标进度条。" },
	"@deepseek-ai/dsh-client-ui-message-feedback": { name: "消息反馈", description: "点赞/点踩与备注。" },
	"@deepseek-ai/dsh-client-ui-model-selection": { name: "模型选择", description: "/model 与输入栏模型选择。" },
	"@deepseek-ai/dsh-client-ui-permission-presets": { name: "权限预设视图", description: "会话权限档位控制。" },
	"@deepseek-ai/dsh-client-ui-agent-preset": { name: "Agent 预设", description: "新会话默认 agent 预设选择。" },
	"@deepseek-ai/dsh-client-ui-plan": { name: "计划控制", description: "Composer 的计划模式席位。" },
	"@deepseek-ai/dsh-client-ui-user-questions": { name: "提问弹窗", description: "结构化用户提问弹窗。" },
	"@deepseek-ai/dsh-client-ui-trajectory": { name: "轨迹视图", description: "会话轨迹/瀑布视图。" },
	"@deepseek-ai/dsh-storage": { name: "存储中枢", description: "存储后端注册表。" },
	"@deepseek-ai/dsh-storage-json": { name: "JSON 存储", description: "JSON 文件存储后端。" },
	"@deepseek-ai/dsh-storage-domain": { name: "存储域", description: "领域存储（message-feedback 等）。" },
	"@deepseek-ai/dsh-workspace": { name: "工作区注册表", description: "持久化工作区注册表。" },
	"@deepseek-ai/dsh-message-feedback": { name: "反馈存储域", description: "消息反馈的存储域。" },
	"@deepseek-ai/dsh-session-log-export": { name: "会话导出", description: "浏览器会话导出（/export 与下载对话框）。" },
	"@deepseek-ai/dsh-host-directory-picker-auto": { name: "目录选择器", description: "按绑定自动选择原生/浏览式目录选择器。" },
	"@deepseek-ai/dsh-host-plugin-inventory": { name: "插件清单服务", description: "当前 Loader 条目的只读投影（all 标签页数据源）。" },
	"@deepseek-ai/dsh-code-runtime-worker-thread": { name: "代码运行时", description: "受限代码执行运行时（worker 线程）。" },
	"@deepseek-ai/dsh-agent-presets": { name: "Agent 预设注册表", description: "按预设组装 agent 的注册表与挂载。" },
	"@deepseek-ai/dsh-agent-tool-presentation": { name: "工具呈现", description: "工具呈现模式（native/code）。" },

	"@deepseek-ai/dsh-tool-bash": { name: "Bash 工具", description: "执行 bash 命令的模型工具。" },
	"@deepseek-ai/dsh-tool-pwsh": { name: "PowerShell 工具", description: "执行 PowerShell 命令的模型工具。" },
	"@deepseek-ai/dsh-tool-fs": { name: "文件系统工具", description: "读写/编辑文件的模型工具。" },
	"@deepseek-ai/dsh-tool-fs-search": { name: "文件搜索工具", description: "glob/grep 搜索文件的模型工具。" },
	"@deepseek-ai/dsh-tool-jobs": { name: "后台任务工具", description: "查询/终止后台任务的模型工具。" },
	"@deepseek-ai/dsh-tool-goal": { name: "目标工具", description: "创建/更新同会话目标的模型工具。" },
	"@deepseek-ai/dsh-tool-todo": { name: "任务清单工具", description: "维护结构化任务清单的模型工具。" },
	"@deepseek-ai/dsh-tool-web": { name: "网络工具", description: "web 搜索与抓取的模型工具。" },
	"@deepseek-ai/dsh-tool-skill": { name: "技能工具", description: "加载技能指令的模型工具。" },
	"@deepseek-ai/dsh-tool-subagent": { name: "子代理工具", description: "委派子代理的模型工具。" },
	"@deepseek-ai/dsh-tool-subagent-fork": { name: "子代理 Fork 工具", description: "继承上下文的 fork 委派工具。" },
	"@deepseek-ai/dsh-tool-subagent-control": { name: "子代理控制工具", description: "子代理清单/中断控制工具。" },
	"@deepseek-ai/dsh-tool-subagent-list-agents": { name: "子代理清单工具", description: "列出子代理的工具。" },
	"@deepseek-ai/dsh-tool-subagent-report": { name: "子代理回报通道", description: "子代理结果回报注册。" },
	"@deepseek-ai/dsh-tool-workflow": { name: "Workflow 工具", description: "大规模多 agent 编排的模型工具。" },
	"@deepseek-ai/dsh-tool-ralph": { name: "Ralph 工具", description: "fresh-agent 迭代循环工具。" },
	"@deepseek-ai/dsh-tool-str-replace-editor": { name: "字符串替换工具", description: "文本替换编辑工具。" },
	"@deepseek-ai/dsh-tool-ask-user": { name: "提问工具", description: "向用户提问的模型工具。" },
	"@deepseek-ai/dsh-tool-cordis": { name: "动态插件工具集", description: "定义/运行/管理动态 Cordis 插件的工具集。" }
};

/**
 * Native tool plugins → the model-facing tool names they provide (static
 * registry conventions; shown on the plugin row so a tool-oriented plugin's
 * payload is visible at a glance). The runtime tools registry carries no
 * plugin-source metadata, so this table is the reliable way to render it.
 */
const TOOL_PROVIDED = {
	"@deepseek-ai/dsh-tool-bash": ["bash"],
	"@deepseek-ai/dsh-tool-pwsh": ["pwsh"],
	"@deepseek-ai/dsh-tool-fs": ["read", "write", "edit"],
	"@deepseek-ai/dsh-tool-fs-search": ["glob", "grep"],
	"@deepseek-ai/dsh-tool-jobs": ["job_output", "job_list", "job_kill"],
	"@deepseek-ai/dsh-tool-goal": ["create_goal", "get_goal", "update_goal"],
	"@deepseek-ai/dsh-tool-todo": ["todo_write"],
	"@deepseek-ai/dsh-tool-web": ["web_search"],
	"@deepseek-ai/dsh-tool-skill": ["skill"],
	"@deepseek-ai/dsh-tool-subagent": ["subagent", "subagent_fork"],
	"@deepseek-ai/dsh-tool-subagent-fork": ["subagent_fork"],
	"@deepseek-ai/dsh-tool-subagent-control": ["interrupt_agent"],
	"@deepseek-ai/dsh-tool-subagent-list-agents": ["list_agents"],
	"@deepseek-ai/dsh-tool-subagent-report": ["report"],
	"@deepseek-ai/dsh-tool-workflow": ["workflow"],
	"@deepseek-ai/dsh-tool-ralph": ["ralph"],
	"@deepseek-ai/dsh-tool-str-replace-editor": ["edit"],
	"@deepseek-ai/dsh-tool-ask-user": ["ask_user_question"],
	"@deepseek-ai/dsh-tool-cordis": ["cordis_define", "cordis_run", "cordis_stop", "cordis_undefine", "cordis_inspect_list", "cordis_inspect_query", "cordis_inspect_self"]
};

function defaultMeta(name, pkgDescription) {
	const builtin = BUILTIN_META[name];
	if (builtin) return { displayName: builtin.name, description: builtin.description, fromBuiltin: true };
	return { displayName: "", description: pkgDescription || "", fromBuiltin: false };
}

function readDescriptions() {
	try {
		if (existsSync(descPath())) return readJson(descPath());
	} catch {}
	return { version: 1, plugins: {} };
}
function ensureDescriptionsFile() {
	const doc = readDescriptions();
	if (doc && typeof doc.version === "number") return doc;
	writeJsonAtomic(descPath(), { version: 1, plugins: {} });
	return { version: 1, plugins: {} };
}

// ── profile facts ────────────────────────────────────────────────────────────

function profileManifest() {
	try {
		return readJson(manifestPath());
	} catch {
		return {};
	}
}

/** The user's own patch rows (id + name + disabled) declared in cordis.patch.yml. */
function userPatchRows() {
	return patchRows(readText(patchPath()));
}

/** Names contributed by non-native bundles (their patch-declared names). */
function otherBundleNames(manifest) {
	const names = new Set();
	for (const bundle of manifest.dsh?.profile?.bundles ?? []) {
		if (NATIVE_BUNDLES.includes(bundle)) continue;
		try {
			const pkgDir = dirname(require.resolve(`${bundle}/package.json`));
			const text = readText(join(pkgDir, "cordis.patch.yml"));
			for (const m of text.matchAll(/^\s*name:\s*['"]([^'"]+)['"]\s*$/gm)) names.add(m[1]);
		} catch {}
	}
	return names;
}

// ── dsh CLI invocation (mirrors dsh-market/lib/routes.js runDshPlugin) ───────
//
// Uninstall goes through `dsh plugin --profile web remove` (a thin pnpm
// forwarder): it removes the dependency and reconciles the `dsh.profile
// .bundles` layer stack the way the CLI owns it, instead of us hand-editing
// package.json. Patch rows are NOT touched by the CLI, so we clean those
// ourselves; runtime removal of the loader entries is also ours.

/** Re-invoke the CLI that launched this host process; falls back to PATH `dsh`. */
function dshArgv() {
	const entry = process.argv[1];
	if (entry !== undefined && /[\\/](?:bin\.(?:js|ts)|dsh)$/.test(entry)) {
		const abs = resolve(entry);
		return { file: process.execPath, args: [...process.execArgv, abs], cwd: dirname(abs), viaShell: false };
	}
	// Bare `dsh` is a .cmd shim on Windows that only a shell can start.
	return { file: "dsh", args: [], cwd: undefined, viaShell: process.platform === "win32" };
}

function killChild(child) {
	if (process.platform === "win32" && child.pid !== undefined) {
		try {
			spawn("taskkill", ["/pid", String(child.pid), "/t", "/f"], { stdio: "ignore" });
			return;
		} catch {}
	}
	child.kill("SIGKILL");
}

const PLUGIN_TIMEOUT_MS = 5 * 60 * 1000;

/** One-shot bypass for pnpm's fresh-release hold; scoped to a single command. */
const RELEASE_AGE_OVERRIDE = "--config.minimumReleaseAge=0";

/**
 * Decide argv for `dsh plugin <add|remove> …`: inject `-w` exactly when the
 * profile is a pnpm workspace root (has pnpm-workspace.yaml). Mirrors
 * dsh-market's pluginArgsFor — pnpm 9 refuses root add without -w, and every
 * major refuses -w outside a workspace.
 */
function pluginArgsFor(profileDirPath, pluginArgs) {
	if (pluginArgs[0] !== "add" && pluginArgs[0] !== "remove") return pluginArgs;
	if (!existsSync(join(profileDirPath, "pnpm-workspace.yaml"))) return pluginArgs;
	return [pluginArgs[0], "-w", ...pluginArgs.slice(1)];
}

/** Momentary network failures worth exactly one automatic retry (dsh-market #83). */
function isTransientPnpmFailure(output) {
	return /ERR_PNPM_FETCH_5\d\d|ERR_PNPM_META_FETCH_FAIL|FetchError|ECONNRESET|ETIMEDOUT|EAI_AGAIN|ENETUNREACH|socket hang up|network timeout/i.test(output);
}

/** Map a failed pnpm run's combined output to a known failure mode (dsh-market). */
function classifyPnpmFailure(output) {
	if (output.includes("ERR_PNPM_PUBLIC_HOIST_PATTERN_DIFF")) {
		return { code: "hoist-pattern-diff", recoverable: true, message: "profile 的 node_modules 是旧版 pnpm 创建的，与当前 pnpm 不兼容，需重建后重试" };
	}
	if (output.includes("ERR_PNPM_MINIMUM_RELEASE_AGE_VIOLATION") || output.includes("ERR_PNPM_NO_MATURE_MATCHING_VERSION")) {
		return { code: "release-age-violation", recoverable: false, message: "profile 里有刚发布不久的插件版本，pnpm 安全等待期检查拒绝了本次改动；已自动放行重试一次" };
	}
	if (isTransientPnpmFailure(output)) {
		return { code: "transient-network", recoverable: false, message: "拉取依赖时网络临时失败；已自动重试一次仍失败，请稍后再试" };
	}
	if (output.includes("pnpm not found on PATH")) {
		return { code: "pnpm-missing", recoverable: false, message: "找不到 pnpm" };
	}
	return null;
}

/**
 * Run one plugin command with automatic recovery from known pnpm traps
 * (dsh-market's withHoistRecovery): rebuild a stale modules dir, retry a
 * release-age lockfile lock once with a one-shot bypass, and retry once on
 * transient network failures. Cancelled/failed runs that still classify get
 * their bilingual reason appended to stderr.
 */
async function withHoistRecovery(run, profile, pluginArgs) {
	let result = await run(profile, pluginArgs);
	const ok = (r) => r.exitCode === 0 && !r.timedOut;
	if (!ok(result)) {
		const failure = classifyPnpmFailure(`${result.stderr}\n${result.stdout}`);
		if (failure?.code === "hoist-pattern-diff") {
			const rebuild = await run(profile, ["install", "--no-frozen-lockfile"]);
			if (ok(rebuild)) result = await run(profile, pluginArgs);
		} else if (
			failure?.code === "release-age-violation"
			&& (pluginArgs[0] === "add" || pluginArgs[0] === "remove")
			&& !pluginArgs.includes(RELEASE_AGE_OVERRIDE)
		) {
			result = await run(profile, [pluginArgs[0], RELEASE_AGE_OVERRIDE, ...pluginArgs.slice(1)]);
		} else if (
			failure?.code === "transient-network"
			&& (pluginArgs[0] === "add" || pluginArgs[0] === "remove")
		) {
			result = await run(profile, pluginArgs);
		}
	}
	return result;
}

/** Run `dsh plugin --profile <profile> <args...>`; resolves {exitCode,timedOut,stdout,stderr}. */
function runDshPlugin(profile, pluginArgs) {
	const { file, args, cwd, viaShell } = dshArgv();
	pluginArgs = pluginArgsFor(profileDir(), pluginArgs);
	const target = pluginArgs[pluginArgs.length - 1] ?? "";
	if (!/^[A-Za-z0-9@:./_#+-]+$/.test(target)) {
		return Promise.resolve({ exitCode: 1, timedOut: false, stdout: "", stderr: `unsafe plugin target rejected: ${JSON.stringify(target)}` });
	}
	return new Promise((resolvePromise) => {
		const child = spawn(file, [...args, "plugin", "--profile", profile, ...pluginArgs], {
			cwd,
			env: { ...process.env, CI: "true" },
			stdio: ["ignore", "pipe", "pipe"],
			shell: viaShell
		});
		let stdout = "";
		let stderr = "";
		let timedOut = false;
		const timer = setTimeout(() => {
			timedOut = true;
			killChild(child);
		}, PLUGIN_TIMEOUT_MS);
		child.stdout.on("data", (chunk) => { stdout = (stdout + chunk.toString()).slice(-64 * 1024); });
		child.stderr.on("data", (chunk) => { stderr = (stderr + chunk.toString()).slice(-64 * 1024); });
		child.on("error", (error) => {
			clearTimeout(timer);
			resolvePromise({ exitCode: 127, timedOut: false, stdout, stderr: `${stderr}\n${error.message}` });
		});
		child.on("close", (code) => {
			clearTimeout(timer);
			resolvePromise({ exitCode: code, timedOut, stdout, stderr });
		});
	});
}

// ── the gateway ──────────────────────────────────────────────────────────────

class PluginManagerGateway extends TypertRemoteService {
	static inject = ["loader"];

	/** Package names that must never be stopped or uninstalled by this manager. */
	static SELF_NAMES = new Set(["dsh-pluginmanager", "dsh-plugin-manager", "pluginmanager"]);

	constructor(ctx) {
		super(ctx, "pluginManager");
		this.mutating = false;
		// Boot-time wipe: stale hot-mount inputs from a previous session must
		// never survive into a composition where the bundle layer already
		// covers them (dsh-market's cleanHotDir semantics, scoped to our dir).
		cleanHotDir();
		for (const name of ["snapshot", "setEnabled", "uninstall", "saveDescription", "register"]) {
			const decorator = Remote(name);
			decorator(PluginManagerGateway.prototype[name], {
				name,
				private: false,
				static: false,
				addInitializer: (initializer) => initializer.call(this)
			});
		}
	}

	/**
	 * One classified snapshot of the web profile plugins.
	 * Every row is a small plain object; live Loader state contributes only
	 * scalar status fields.
	 */
	async snapshot() {
		const manifest = profileManifest();
		const patchText = readText(patchPath());
		ensureDescriptionsFile();
		const descriptions = readDescriptions().plugins ?? {};

		const nativeNames = nativeNameSet();
		const layers = nativeLayerSets();
		const userRows = userPatchRows();
		const otherBundles = otherBundleNames(manifest);
		const bundles = manifest.dsh?.profile?.bundles ?? [];
		const deps = manifest.dependencies ?? {};

		// Current agent preset (settings.yaml `agent-presets.default`): it owns
		// the real enable/disable of the model tools, so its rows override the
		// host loader state in the rows below. One package can appear several
		// times (e.g. tool-subagent for spawn/fork/codex/claude-code): the row
		// is only "disabled" when EVERY instance is disabled.
		let presetInfo = null;
		const presetMap = new Map();
		try {
			const presets = this.ctx.get("agentPresets");
			if (presets !== undefined) {
				const resolved = await presets.resolve();
				const text = await presets.read(resolved.id);
				for (const row of parsePresetRows(text)) {
					const disabled = presetDisabledValue(row.disabled);
					const current = presetMap.get(row.name);
					presetMap.set(row.name, current === undefined ? disabled : current && disabled);
				}
				presetInfo = { id: resolved.id, name: resolved.name ?? resolved.id };
			}
		} catch {}

		// live Loader state, keyed by entry id
		const live = new Map();
		let runtimeAvailable = false;
		try {
			for (const entry of this.ctx.loader.entries()) {
				if (entry.options?.group) continue;
				// "enabled" reflects the LIVE fiber, the same ground truth
				// dsh-market's verifyActivation uses (`entry.fiber !== undefined`),
				// NOT the `entry.disabled` patch-layer flag which may be stale or
				// absent for bundle entries. A disabled entry has no fiber (or a
				// non-active fiber).
				const fiberUp = entry.fiber !== undefined && entry.fiber.state !== 5 && entry.fiber.state !== 3;
				live.set(entry.id, {
					name: entry.options?.name,
					enabled: fiberUp,
					phase: entry.fiber === undefined ? null : FIBER_PHASE[entry.fiber.state] ?? null
				});
				runtimeAvailable = true;
			}
		} catch {}

		const rows = [];
		const seen = new Set();
		for (const [entryId, state] of live) {
			const name = String(state.name ?? "");
			if (!name) continue;
			// The same plugin can be mounted by more than one loader entry — a
			// profile patch row plus a shim mount from dshmarket's client-only
			// shim (client bundles need a live entry). It is one plugin, so show
			// it once, keeping the first entry's status.
			if (seen.has(name)) continue;
			seen.add(name);
			rows.push(buildRow({ entryId, name, state, nativeNames, layers, userRows, otherBundles, bundles, deps, descriptions, presetMap, presetInfo }));
		}
		// user patch rows that are disabled before load still appear in Loader,
		// but keep a guard for rows not materialized at all
		for (const row of userRows) {
			if (seen.has(row.name)) continue;
			seen.add(row.name);
			rows.push(buildRow({
				entryId: row.id ?? row.name,
				name: row.name,
				state: { enabled: !row.disabled, phase: null },
				nativeNames, layers, userRows, otherBundles, bundles, deps, descriptions, presetMap, presetInfo
			}));
		}

		rows.sort((a, b) => a.name.localeCompare(b.name));
		return {
			profile: PROFILE_NAME,
			profileDir: profileDir(),
			descFile: descPath(),
			nativeBundles: NATIVE_BUNDLES,
			runtimeAvailable,
			preset: presetInfo,
			rows
		};
	}

	/**
	 * Stop or start a user-layer plugin. `enabled: false` adds a
	 * `disabled: true` override block for the entry id; `enabled: true`
	 * removes it. Native plugins are refused.
	 *
	 * The change is persisted to cordis.patch.yml (what survives a reboot)
	 * and then mirrored into the running loader tree via `entry.update()`:
	 * the plugin stops/starts immediately, no service restart needed. The
	 * DSH boot also hot-reloads the patch layer, so the two paths agree.
	 */
	async setEnabled(input) {
		if (this.mutating) return { ok: false, name: validName(input?.name), error: "另一个插件操作正在进行，请稍后再试" };
		const name = validName(input?.name);
		if (PluginManagerGateway.SELF_NAMES.has(name)) {
			return { ok: false, name, error: "插件管理器无法停用/启用自身；请使用 dsh 命令行" };
		}
		this.mutating = true;
		try {
			const row = await this.findUserRow(name);
			if (!row) return { ok: false, name, error: "该插件不是可管理的用户扩展，或未安装" };
			if (!row.entryId) return { ok: false, name, error: "该插件没有可管理的激活行，无法切换（可先「补登记」）" };
			const enabled = !!input.enabled;
			let text = readText(patchPath());
			const nextText = enabled ? removeDisabledOverride(text, row.entryId) : addDisabledOverride(text, row.entryId);
			if (nextText !== text) {
				backupPatch(nextText);
				writeText(patchPath(), nextText);
			}

			// Live hot-swap, dsh-market semantics (setEntryDisabled): flip the
			// running loader entry's disabled flag with a forced update and an
			// init-race retry loop, so the change is effective immediately.
			const hot = await this.setEntryDisabled(name, !enabled);
			return { ok: true, name, enabled, needsRestart: !hot, hot, hotError: null, changed: true };
		} finally {
			this.mutating = false;
		}
	}

	/**
	 * Live-toggle a bundle-layer plugin through its loader entry (dsh-market's
	 * setEntryDisabled): `entry.update({disabled}, false, force=true)` with a
	 * retry that verifies the live fiber state, so a disable landing during an
	 * in-flight init still takes. Never touches files; the caller persists the
	 * choice. @returns true when a matching live entry was updated.
	 */
	async setEntryDisabled(name, disabledFlag) {
		let found = false;
		for (const entry of this.ctx.loader.entries()) {
			if (entry.options?.name !== name) continue;
			for (let attempt = 0; attempt < 3; attempt++) {
				try {
					await entry.update({ disabled: disabledFlag ? true : null }, false, true);
					found = true;
				} catch {
					break;
				}
				const live = entry.fiber !== undefined;
				if (live !== disabledFlag) break;
				await new Promise((resolvePromise) => setTimeout(resolvePromise, 200));
			}
		}
		return found;
	}

	/**
	 * Permanently remove a user-layer plugin, mirroring dsh-market's uninstall
	 * route semantics:
	 *   - refuse to uninstall the manager itself (self-guard);
	 *   - serialize against other plugin operations (mutating lock);
	 *   - run the official CLI remove FIRST, and only touch patch rows /
	 *     bookkeeping after it actually succeeds (failure leaves no half-state);
	 *   - hot-release by SOURCE: a patch-layer plugin is covered by dsh's HMR
	 *     (deleting its cordis.patch.yml row recomposes the running server), so
	 *     it truly hot-releases; a bundle-layer plugin (mounted from
	 *     package.json `dsh.profile.bundles`, which dsh's HMR does NOT watch)
	 *     can only be best-effort disabled in-process and still needs a restart
	 *     to fully drop from the running server.
	 * Native plugins are refused.
	 */
	async uninstall(input) {
		if (this.mutating) return { ok: false, name: validName(input?.name), error: "另一个插件操作正在进行，请稍后再试" };
		const name = validName(input?.name);
		if (PluginManagerGateway.SELF_NAMES.has(name)) {
			return { ok: false, name, error: "插件管理器无法卸载自身；请使用 dsh 命令行" };
		}
		this.mutating = true;
		try {
			const row = await this.findUserRow(name);
			if (!row) return { ok: false, name, error: "该插件不是可管理的用户扩展，或未安装" };

			const manifest = profileManifest();
			const inDeps = manifest.dependencies && name in manifest.dependencies;

			// 1. dependency + bundle bookkeeping through the official CLI FIRST
			//    (`dsh plugin remove` = pnpm remove + bundles reconcile), exactly
			//    as dsh-market's uninstall route does. Only run it for
			//    pnpm-managed packages; a pure patch-row plugin (no dependencies
			//    entry) has no package.json bookkeeping for pnpm to clean up.
			let cli = null;
			let cliOk = true;
			if (inDeps) {
				cli = await withHoistRecovery(runDshPlugin, PROFILE_NAME, ["remove", name]);
				cliOk = cli.exitCode === 0 && !cli.timedOut;
				// Fail hard BEFORE touching patch rows: a failed remove must not
				// leave the loader referencing a half-removed package, which is
				// exactly what bricks the next boot (patch row gone, dep still
				// present → module resolution fails at startup).
				if (!cliOk) {
					return {
						ok: false,
						name,
						cliOk: false,
						cliError: cli?.stderr.trim() || `dsh plugin remove exited ${cli?.exitCode}`,
						needsRestart: false,
						hot: false,
						hotError: null
					};
				}
			}

			// 2. patch rows (the CLI never touches these) — only now that the
			//    dependency bookkeeping has actually succeeded.
			let text = readText(patchPath());
			const before = text;
			text = removePluginRows(text, name);
			if (row.entryId) text = removePlainBlocksForId(text, row.entryId);
			if (text !== before) {
				backupPatch(text);
				writeText(patchPath(), text);
			}

			// 3. description entry
			const desc = readDescriptions();
			if (desc.plugins && name in desc.plugins) {
				delete desc.plugins[name];
				writeJsonAtomic(descPath(), desc);
			}

			// 3. live release, by SOURCE:
			//
			// dsh only registers HMR watching for cordis.patch.yml (the patch
			// layer) — it never watches package.json's `dsh.profile.bundles`
			// (the bundle layer). So:
			//   - a bundle-layer plugin (source === "bundle") is mounted from
			//     package.json at boot; once removed there is NO in-memory
			//     mechanism to drop it without a restart (dsh-market's
			//     hotUnmount only covers its own hot mounts, and naked
			//     loader.remove() races the active fiber). We must tell the
			//     user to restart instead of pretending it hot-released.
			//   - a patch-layer plugin (source === "profile-patch") is fully
			//     covered by HMR: deleting its row from cordis.patch.yml makes
			//     the running server recompose, so it truly hot-releases.
			const isBundleLayer = row.source === "bundle";
			let hot = false;
			let hotError = null;
			if (isBundleLayer) {
				// Best-effort disable so the CURRENT process stops serving it,
				// but a restart is still required for the bundle layer to drop
				// the entry entirely.
				try {
					hot = await this.setEntryDisabled(name, true);
				} catch (error) {
					hotError = error instanceof Error ? error.message : String(error);
				}
			} else {
				hot = await hotUnmount(name);
				if (!hot) {
					try {
						hot = await this.setEntryDisabled(name, true);
					} catch (error) {
						hot = false;
						hotError = error instanceof Error ? error.message : String(error);
					}
				}
			}

			return {
				ok: true,
				name,
				removed: true,
				cliOk,
				cliError: cliOk ? null : (cli?.stderr.trim() || `dsh plugin remove exited ${cli?.exitCode}`),
				// A bundle-layer plugin always needs a restart to fully drop
				// from the running server; a patch-layer plugin is truly hot
				// when hotUnmount/setEntryDisabled succeeded.
				needsRestart: isBundleLayer ? true : !hot,
				hot: isBundleLayer ? false : hot,
				hotError,
				bundleLayer: isBundleLayer
			};
		} finally {
			this.mutating = false;
		}
	}

	/** Persist an edited display name / description for one plugin. */
	async saveDescription(input) {
		const name = validName(input?.name);
		const patch = {
			...(typeof input?.displayName === "string" ? { displayName: input.displayName.trim() } : {}),
			...(typeof input?.description === "string" ? { description: input.description.trim() } : {})
		};
		if (Object.keys(patch).length === 0) return { ok: false, name, error: "没有可保存的内容" };
		ensureDescriptionsFile();
		const doc = readDescriptions();
		doc.plugins ??= {};
		doc.plugins[name] = { ...(doc.plugins[name] ?? {}), ...patch };
		writeJsonAtomic(descPath(), doc);
		return { ok: true, name };
	}

	/**
	 * Register a user-layer plugin into package.json dependencies so other
	 * tooling (the marketplace tab, pnpm) sees it. The value is a local
	 * file: reference pointing at the package's own node_modules directory —
	 * these hand-placed plugins have no npm source, so this keeps future
	 * `pnpm install` offline-safe. After registration succeeds we hot-mount
	 * the package (dsh-market semantics) so it activates without a restart;
	 * when that is not possible (no plain insert patch / no dsh.client
	 * surface) the register still succeeds and the row activates on restart.
	 */
	async register(input) {
		if (this.mutating) return { ok: false, name: validName(input?.name), error: "另一个插件操作正在进行，请稍后再试" };
		const name = validName(input?.name);
		if (PluginManagerGateway.SELF_NAMES.has(name)) {
			return { ok: false, name, error: "插件管理器无法补登记自身；请使用 dsh 命令行" };
		}
		this.mutating = true;
		try {
			const snapshot = await this.snapshot();
			const row = snapshot.rows.find((candidate) => candidate.name === name && !candidate.native);
			if (!row) return { ok: false, name, error: "该插件不是用户扩展" };
			if (row.registered) return { ok: false, name, error: "该插件已登记在依赖里" };
			const manifest = profileManifest();
			manifest.dependencies ??= {};
			const rel = ["node_modules", ...name.split("/")].join("/");
			manifest.dependencies[name] = `file:./${rel}`;
			writeJsonAtomic(manifestPath(), manifest);

			// Hot-mount so the freshly registered package activates now.
			const mount = await hotMount(this.ctx, name);
			return {
				ok: true,
				name,
				hot: mount.ok,
				needsRestart: !mount.ok,
				hotError: mount.ok ? null : mount.reason
			};
		} finally {
			this.mutating = false;
		}
	}

	/** Locate a manageable user-layer plugin row from the current snapshot. */
	async findUserRow(name) {
		const snapshot = await this.snapshot();
		const row = snapshot.rows.find((candidate) => candidate.name === name && !candidate.native);
		if (row) return row;
		// installed but not activated (e.g. a dependency with no loader row)
		const manifest = profileManifest();
		const inBundles = (manifest.dsh?.profile?.bundles ?? []).includes(name);
		const inDeps = manifest.dependencies && name in manifest.dependencies;
		if (inBundles || inDeps) {
			return { entryId: null, name, source: inBundles ? "bundle" : "dependency" };
		}
		return null;
	}
}

// ── row building ─────────────────────────────────────────────────────────────

/** Runtime mirror of FiberState phases (same table as dsh-host-plugin-inventory). */
const FIBER_PHASE = {
	0: "pending",
	1: "loading",
	2: "active",
	3: "failed",
	5: "unloading"
};

function buildRow({ entryId, name, state, nativeNames, layers, userRows, otherBundles, bundles, deps, descriptions, presetMap, presetInfo }) {
	const native = nativeNames.has(name);
	const pkgDescription = packageDescription(name);
	const meta = descriptions[name] ?? {};
	const builtin = defaultMeta(name, pkgDescription);
	let layer;
	let source;
	if (native) {
		if (/^@deepseek-ai\/dsh-tool-/.test(name) || layers.tool.has(name)) layer = "tool";
		else if (layers.webui.has(name)) layer = "webui";
		else layer = "system";
		source = bundles.includes(name) || otherBundles.has(name) ? "bundle" : "native";
	} else {
		layer = "user";
		if (userRows.some((row) => row.name === name)) source = "profile-patch";
		else if (bundles.includes(name) || otherBundles.has(name)) source = "bundle";
		else if (name in deps) source = "dependency";
		else source = "other";
	}
	if (meta.layerOverride === "system" || meta.layerOverride === "webui" || meta.layerOverride === "tool") {
		layer = meta.layerOverride;
	}
	// The current agent preset owns the real enablement of the rows it carries
	// (mostly model tools); its `disabled` verdict replaces the host loader state.
	const presetDisabled = presetMap !== undefined ? presetMap.get(name) : undefined;
	const presetControlled = presetDisabled !== undefined;
	const enabled = presetControlled ? !presetDisabled : !!state?.enabled;
	return {
		entryId,
		name,
		version: resolveVersion(name),
		native,
		layer,
		source,
		registered: native || name in deps,
		enabled,
		active: presetControlled ? enabled : state?.phase === "active",
		phase: state?.phase ?? null,
		preset: presetControlled,
		presetId: presetControlled ? (presetInfo?.id ?? null) : null,
		presetName: presetControlled ? (presetInfo?.name ?? null) : null,
		displayName: meta.displayName || builtin.displayName || "",
		description: meta.description || builtin.description || "",
		hasDescription: !!(meta.description || builtin.description || pkgDescription),
		// A "tool plugin" means it provides model-callable tools — nothing else.
		// The layer (system/webui/tool) is about architecture position, not this
		// flag: a tool-layer row with no registered tool (e.g. a timeout policy)
		// is NOT a tool plugin, and native infrastructure rows are never flagged.
		// User extensions are scanned for real tool registrations.
		tools: layer === "tool" ? (TOOL_PROVIDED[name] ?? []) : (native ? [] : scanToolNames(name).tools),
		isToolPlugin: layer === "tool" ? (TOOL_PROVIDED[name]?.length ?? 0) > 0 : (native ? false : scanToolNames(name).hasTrace)
	};
}

const toolScanCache = new Map();

/**
 * Detect whether a plugin's host entry registers model tools and extract the
 * literal tool names it declares. Third-party tool plugins often register via
 * `ctx.tools.register(...)` with a dynamic name, so this is best-effort:
 * `hasTrace` is the reliable signal (a tool-oriented plugin), `tools` is the
 * names we could read as string literals.
 */
function scanToolNames(name) {
	if (toolScanCache.has(name)) return toolScanCache.get(name);
	let result = { hasTrace: false, tools: [] };
	try {
		const dir = packageDir(name);
		if (dir !== null) {
			const manifest = readJson(join(dir, "package.json"));
			const main = typeof manifest.main === "string" && manifest.main.length > 0 ? manifest.main : "index.js";
			const src = readText(join(dir, main));
			// A tool plugin is one that lets the MODEL call something directly:
			// it registers a ToolDefinition (whose hard structural signature is an
			// `execute` function + an `output` declaration) into the tools registry
			// (ctx.tools.register / harness.registerTool). That is how a tool
			// differs from a service (process-internal), a skill (loaded as
			// documents via the skill tool) or a UI (browser slots). Ordinary
			// plugins using slots.register / ctx.provide / ctx.on must NOT count.
			const apiTrace = /(?:harness\.defineTool|harness\.registerTool|\.defineTool\s*\(|\.registerTool\s*\(|defineTool\s*\(\s*\{|registerTool\s*\(\s*\{|(?:ctx\.)?tools\.register\s*\()/.test(src);
			// Structural signature of a model-callable ToolDefinition: an output
			// declaration and an execute function appear together.
			const structural = /output\s*:\s*\{[^}]*\}[\s\S]{0,600}?execute\s*\(/.test(src) || /execute\s*\([^)]*\)[\s\S]{0,600}?output\s*:/.test(src);
			const hasTrace = apiTrace || structural;
			const tools = new Set();
			for (const m of src.matchAll(/(?:defineTool|registerTool)\s*\([^)]*?name\s*:\s*['"]([^'"]+)['"]/gs)) tools.add(m[1]);
			for (const m of src.matchAll(/(?:ctx\.)?tools\.register\s*\(\s*\{[^}]*?name\s*:\s*['"]([^'"]+)['"]/gs)) tools.add(m[1]);
			result = { hasTrace, tools: [...tools] };
		}
	} catch {}
	toolScanCache.set(name, result);
	return result;
}

/** package.json description of a plugin package, when resolvable. */
function packageDescription(name) {
	try {
		const pkgPath = require.resolve(`${name}/package.json`);
		return readJson(pkgPath).description ?? "";
	} catch {
		return "";
	}
}

function packageDir(name) {
	const candidates = [
		join(profileDir(), "node_modules", ...name.split("/")),
		join(homeDir(), "profiles", "node_modules", ...name.split("/"))
	];
	for (const path of candidates) {
		if (existsSync(path)) return path;
	}
	return null;
}

/** One-time backup of the patch document before the first mutation of a call. */
let lastBackup = null;
function backupPatch(nextText) {
	if (nextText === lastBackup) return;
	lastBackup = nextText;
	try {
		const stamp = new Date().toISOString().replace(/[:.]/g, "-");
		writeText(`${patchPath()}.bak-${stamp}`, readText(patchPath()));
	} catch {}
}

function validName(value) {
	const name = String(value ?? "").trim();
	if (!/^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/.test(name)) {
		throw new Error(`无效的插件名 ${JSON.stringify(name)}`);
	}
	return name;
}

export default PluginManagerGateway;
export { PluginManagerGateway };
