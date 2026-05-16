# 设计文档：UI/UX 布局与视觉规范

> 病毒与政策：一场全球博弈 — 深色主题设计系统

## 1. 页面布局方案

### 总体结构

```
┌──────────────────────────────────────────────────┐
│  Hero Header (全屏标题 + 散景光晕背景)            │
├──────────────────────────────────────────────────┤
│  section-divider (4px 红色渐变分隔线)              │
├────────────────────────┬─────────────────────────┤
│  sticky-graphic (左侧) │  scroll-text (右侧 420px)│
│  ├─ 图表区 (flex: 1)   │  ├─ step 卡片 1          │
│  │  - 脉冲地图          │  ├─ step 卡片 2          │
│  │  - 时间线            │  └─ ...                 │
│  │  - 雷达图 etc.       │                         │
│  └─ position: sticky   │                         │
│     top: 0             │                         │
│     height: 100vh       │                         │
├────────────────────────┴─────────────────────────┤
│  section-divider                                  │
├──────────────────────────────────────────────────┤
│  ... (重复 6 个章节)                               │
└──────────────────────────────────────────────────┘
```

### 章节导航

- **位置**: 页面右侧固定，垂直居中
- **组件**: 进度条 + 6 个导航圆点
- **交互**: 点击圆点 → `scrollIntoView({ behavior: 'smooth' })`
- **Label**: 悬浮时从右侧滑出中文标签

## 2. 章节图文排布说明

| 章节 | 左侧图表 | 右侧文字步骤数 | 特殊交互 |
|------|---------|--------------|---------|
| 1. 病毒蔓延 | GlobalPulseMap | 4 steps | 国家搜索框、**点击激活地图模式**（滚轮缩放+拖拽平移）、点击选中 |
| 2. 政策响应 | PolicyTimeline | 3 steps | 双轴对比、十字线悬浮、国家切换 |
| 3. 干预窗口 | PolicyTimeline (聚焦) | 3 steps | 反事实滑块 -30~+30 天 |
| 4. 病毒变异 | WaveRadarChart | 4 steps | 波次切换 1-5、国家添加/移除 |
| 5. 疫苗研发 | VaccinePulseMap | 3 steps | **点击海洋激活缩放**（滚轮≠滚动）、时间动画 |
| 6. 政策对比 | PolicyHeatmap | 3 steps | 指标切换、单元格点击高亮 |

## 3. 色彩系统

> 全局样式文件路径：`src/assets/styles/main.css`

### CSS 变量（深色主题）

```
主背景:     #1a1a2e (--color-bg)
次背景:     #16213e (--color-bg-section)
卡片背景:   #1e2a45 (--color-bg-card)
文字面板:   #1a2744 (--color-bg-text-panel)
正文:       #b0bec5 (--color-text)
标题:       #e0e0e0 (--color-text-heading)
亮文字:     #ffffff (--color-text-bright)
强调色:     #e94560 (--color-accent)
边框:       #2a3a5c (--color-border)
```

### 语义色

| 语义 | CSS 变量 | 颜色 | 用途 |
|------|---------|------|------|
| 确诊病例 | `--color-cases` | #E53935 | 病例曲线、红色高亮 |
| 死亡 | `--color-deaths` | #FF6D3F | 死亡数据、死亡 tooltip 值 |
| 疫苗 | `--color-vaccine-green` | #66bb6a | 疫苗接种、绿色 |
| 政策蓝 | `--color-policy-blue` | #2196F3 | 政策指数线、yAxisRight |
| 政策指数 | `--color-policy-index` | #e94560 | 政策强度、红色强调 |
| 警告 | `--color-warning` | #ffb74d | 警告框、边界提醒 |
| Alpha 变异株 | `--color-variant-alpha` | #fdd835 | 黄色 |
| Delta 变异株 | `--color-variant-delta` | #ff9800 | 橙色 |
| Omicron 变异株 | `--color-variant-omicron` | #66bb6a | 浅绿色 |

## 4. 间距规范

| 变量 | 值 | 用途 |
|------|-----|------|
| --spacing-xs | 4px | 微小间距 |
| --spacing-sm | 8px | 小间距 |
| --spacing-md | 16px | 中等间距 |
| --spacing-lg | 24px | 大间距 |
| --spacing-xl | 48px | 超大间距 |
| --section-gap | 70vh | step 卡片间距 |

## 5. 响应式断点

| 断点 | 规则 |
|------|------|
| >= 1920px | scroll-text 480px, h1 4rem |
| 1200-1280px | scroll-text 340-360px |
| 1024px | scroll-text 320px, 字体 14px, stat-grid 单列 |
| >= 1024px | min-width 保证（--min-width） |

## 6. 过渡动画规范

| 元素 | 时长 | 缓动 |
|------|------|------|
| step 激活 | 0.3s | ease |
| nav-dot hover | 0.3s | ease |
| tooltip 显示 | 0.15s | ease |
| 滚动提示淡出 | 1s (3s 延迟后) | ease |
| 脉冲动画 | 1.5s | ease-out (组件级) |

## 7. Tooltip 规范

所有图表 tooltip 统一为深色主题：
- 背景: `rgba(30, 30, 50, 0.95)`
- 边框: `1px solid rgba(255, 255, 255, 0.12)`
- 文字: `#e0e0e0`
- 圆角: 8-10px
- 阴影: `0 4px 20px rgba(0, 0, 0, 0.4)`
- 模糊: `backdrop-filter: blur(8-10px)`

## 8. 地图交互模式（章节1专项）

### 问题
脉冲地图支持 D3 zoom（滚轮缩放+拖拽平移），但页面同时也响应滚轮滚动（Scrollama 滚动叙事）。两者冲突导致鼠标在地图区域滚动时右侧文字也会跟着移动。

### 滚轮功能区分

| 模式 | 触发方式 | 滚轮行为 | 右侧文字 | 视觉标识 |
|------|---------|---------|---------|---------|
| **浏览模式**（默认） | 页面加载后自动 | 页面滚动（驱动叙事） | 正常显示 | 无 |
| **地图缩放模式** | 点击海洋/空白区域 | 地图缩放+平移 | 半透明（opacity 0.45）| 红色内边框 + 顶部提示条 |
| **退出缩放模式** | 点击右侧文字区 | 恢复页面滚动 | 恢复正常 | 标识消失 |

### 关键设计决策
- **点击国家 ≠ 激活缩放**：国家点击事件 `stopPropagation()`，只做选中/取消，不冒泡到父容器。避免选中国家时意外进入缩放模式。
- **点击海洋 = 激活缩放**：海洋背景（Sphere path）的点击事件触发 `emit('map-activated')`，专用于进入缩放模式。
- **滚轮始终只有一种职责**：浏览模式 → 页面滚动；缩放模式 → 地图缩放。不会出现"滚轮既滚动又缩放"的冲突。

### 技术实现
- `Section1VirusSpread.vue`：`mapInteractive` ref 控制状态，接收 `@map-activated` 事件
- `GlobalPulseMap.vue`：
  - Props: `interactive: Boolean`； Emits: `map-activated`
  - 国家 path 点击：`event.stopPropagation()` 阻止冒泡
  - 海洋 Sphere 点击：`emit('map-activated')` 激活缩放
  - `d3.zoom().filter()` 实时检查 `mapInteractive`，非交互模式仅放行 touchmove
  - `watch(props.interactive)` → 注册/移除容器级 `wheel` 拦截器（`passive: false`）
