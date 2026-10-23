# 豪霸模式 · dsh-haoba-mode

> 性能最好、最费 token 的一档。聊天框旁边一枚土豪金开关，打开就别想省钱。

一枚开关，两种世界：

- **关**：一切照旧，插件只在后台待命。
- **开**：从下一条消息开始，每一步模型调用都被推到该模型支持的上限，并在系统提示里追加一段「豪霸纪律」。

## 安装

在 DeepSeek Harness 里打开 **插件 → 添加插件**，在输入框里填包名，点 **安装**，装好后点 **立即启用**：

```
dsh-haoba-mode
```

也可以填 GitHub 仓库地址 `https://github.com/FelixJiashengFu/dsh-haoba-mode`。连不上 npm 官方源时，在 **安装源** 里选中国大陆镜像源再填包名。

输入框旁随即出现金色的「豪霸」开关。升级：在插件页卸载后，用同样的方式重新安装。

## 它到底做了什么

| 杠杆 | 实现 | 效果 |
| --- | --- | --- |
| 推理强度 | `agent/request` 瀑布里读取 `llm.resolveModelInfo()`，把 `reasoningEffort` 换成该模型对外声明的最强一档 | 思考更久、更不容易跳步 |
| 输出预算 | 同一处把 `maxTokens` 抬到模型的 `defaultMaxTokens` | 不因默认输出上限被截断 |
| 工作纪律 | `systemPrompt.section` 注册一段长提示（`order: 900`，靠后） | 穷尽检索、完整交付、逐条自检、失败即诊断 |
| 视觉 | 关闭时中性描边，开启时金色渐变 + 流光 + 全局品牌色转金 | 一眼看得出花了钱 |

三点说明：

1. **不换模型**。它只在你当前选中的模型上把预算拉满，不改 provider/model，不会打破会话的模型粘性或安全设置。想更贵，自己在模型选择器里挑更贵的。
2. **只喊模型真有的档位**。`reasoningEffort` 取自适配器声明的候选，绝不硬塞一个会被拒的值；模型没有推理档位时只抬 `maxTokens`。
3. **不越过安全边界**。更大的预算不等于更多权限：破坏性操作仍然要确认。

## 结构

```
package.json        dsh.bundle.patch + dsh.client（把 lib/client.js 送进 Web 客户端）
cordis.patch.yml    Host 半边挂载行
lib/protocol.js     路由、section 名与排序、模式名（浏览器半边复制一份常量）
lib/prompt.js       豪霸纪律提示词
lib/index.js        Host：状态持久化 + 回路 HTTP 路由 + agent/request + systemPrompt
lib/client.js       浏览器：金色开关（仅依赖 react，无 JSX、无 import）
locale/zh.json      插件市场里的中文名与简介
locale/en.json      英文名与简介
icon.svg            金色皇冠
```

## 状态与接口

开关状态持久化在 `~/.dsh/haoba-mode.json`（`{ "enabled": true }`），重启后自动恢复。

回环 HTTP 路由 `GET|POST /plugins/dsh-haoba-mode/state`：

```json
{ "ok": true, "enabled": true, "lastError": null,
  "applied": { "provider": "…", "model": "…", "reasoningEffort": "high", "maxTokens": 65536, "at": 0 } }
```

`applied` 是最近一次真正改过的调用参数，开关的悬浮提示会把它显示出来。

## 本地开发与卸载

本地开发：克隆本仓库后，在 **添加插件** 里填本目录的绝对路径，或让 agent 调用插件管理器（不要手改 profile 的 `package.json`）：

```
plugin_manager action=install_bundle target=<本目录绝对路径>
```

卸载：在插件页卸载，或 `plugin_manager action=remove_bundle target=dsh-haoba-mode`。

## 代价

每步多出的 token 主要来自两处：更长的推理、以及每次请求都携带的纪律段落（约 600 tokens/步）。这是这个模式的**设计目的**，不是缺陷——它用钱换确定性和完整度。真在意账单时把开关关掉即可，状态立即生效，无需重启。
