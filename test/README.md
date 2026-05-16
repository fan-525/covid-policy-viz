# 测试套件运行说明

## 环境要求

- Node.js >= 18
- Playwright（在 `test/` 目录内局部安装）
- 项目已有 `dist/` 构建产物（已满足）

## 安装步骤

```bash
cd covid-policy-viz/test

# 局部安装 Playwright
npm init -y
npm install playwright@latest

# 安装 Chromium 浏览器
npx playwright install chromium
```

## 运行测试

```bash
cd covid-policy-viz/test
node test-suite.mjs
```

测试脚本会自动：
1. 在后台启动 `npx vite preview --port 4173`（基于项目已有 `dist/` 目录）
2. 执行所有自动化测试步骤
3. 生成 `report.html` 和截图到 `screenshots/`

## 查看报告

测试完成后在浏览器中打开：
```bash
# Windows
start report.html

# macOS
open report.html
```

## 输出文件

| 文件 | 说明 |
|------|------|
| `test-plan.md` | 详细测试计划与验收标准对照 |
| `test-suite.mjs` | Playwright 自动化测试脚本 |
| `report.html` | 可视化测试报告（含截图） |
| `screenshots/` | 关键步骤截图目录 |

## 手动运行说明

如果无法安装 Playwright，可以手动验证：

1. 启动项目：`npx vite preview --port 4173`（在项目根目录）
2. 在浏览器打开 `http://localhost:4173`
3. 参照 `test-plan.md` 中的 38 个场景逐项手动操作
4. 将实际结果填入 `test-plan.md` 的"实际结果"栏
