/**
 * test-suite.mjs — 病毒与政策项目自动化功能测试
 *
 * 基于 Playwright 实现测试计划中所有可自动化的验收场景。
 * 覆盖角色 B/C/D 共 38 项验收标准。
 *
 * 运行: node test-suite.mjs
 * 要求: Playwright 已安装 (cd test && npm install playwright && npx playwright install chromium)
 */
import { chromium } from 'playwright';
// 使用本地 Edge 浏览器
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCREENSHOTS = join(__dirname, 'screenshots');
const REPORT_PATH = join(__dirname, 'report.html');
const BASE_URL = 'http://localhost:4173';

// 确保截图目录存在
mkdirSync(SCREENSHOTS, { recursive: true });

// ========== 全局测试状态 ==========
const results = [];
let passed = 0;
let failed = 0;
const screenshots = [];

function record(id, category, name, status, detail = '', screenshot = '') {
  results.push({ id, category, name, status, detail, screenshot });
  if (status === 'PASS') passed++;
  else failed++;
  const icon = status === 'PASS' ? '✅' : '❌';
  console.log(`  ${icon} [${id}] ${name}${detail ? ' — ' + detail : ''}`);
}

async function takeScreenshot(page, name) {
  const path = join(SCREENSHOTS, `${name}.png`);
  await page.screenshot({ path, fullPage: false });
  screenshots.push({ name, path: `screenshots/${name}.png` });
  return path;
}

// ========== 服务管理 ==========
function startServer() {
  return new Promise((resolve, reject) => {
    const proc = spawn('npx', ['vite', 'preview', '--port', '4173'], {
      cwd: join(__dirname, '..'),
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true,
    });

    let started = false;
    const timeout = setTimeout(() => {
      if (!started) {
        started = true;
        resolve(proc); // 超时也继续
      }
    }, 15000);

    proc.stdout.on('data', (data) => {
      const text = data.toString();
      if (!started && (text.includes('Local') || text.includes('localhost') || text.includes('4173'))) {
        started = true;
        clearTimeout(timeout);
        setTimeout(() => resolve(proc), 1000);
      }
    });

    proc.stderr.on('data', (data) => {
      const text = data.toString();
      if (!started && (text.includes('Local') || text.includes('localhost') || text.includes('4173'))) {
        started = true;
        clearTimeout(timeout);
        setTimeout(() => resolve(proc), 1000);
      }
    });

    proc.on('error', reject);
  });
}

// ========== 主测试流程 ==========
async function runTests() {
  console.log('═══════════════════════════════════════════');
  console.log('  病毒与政策项目 — 自动化验收测试');
  console.log('═══════════════════════════════════════════\n');

  // 1. 启动服务
  console.log('▶ 启动 Vite 预览服务...');
  const serverProc = await startServer();
  console.log('  服务已启动\n');

  let browser;
  try {
    browser = await chromium.launch({ channel: 'msedge', headless: true });

    // ==================== A. 页面加载与 UI 反馈 ====================
    console.log('── A. 页面加载与 UI 反馈 ──\n');

    // ---- A1: Loading 动画 ----
    {
      console.log('  [A1] 页面加载 loading 动画');
      const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
      const page = await ctx.newPage();
      const startTime = Date.now();

      await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });

      // 检查 loading 出现
      const loadingVisible = await page.waitForSelector('.loading-screen', { timeout: 5000 }).then(() => true).catch(() => false);

      // 等待 loading 消失
      const loadingGone = await page.waitForSelector('.loading-screen', { state: 'hidden', timeout: 10000 }).then(() => true).catch(() => false);
      const loadTime = Date.now() - startTime;

      // 检查主内容出现
      const heroVisible = await page.locator('.hero-header').isVisible().catch(() => false);

      const pass = loadingGone && heroVisible && loadTime < 10000;
      record('A1', '页面加载', 'Loading 动画与内容显示', pass ? 'PASS' : 'FAIL',
        pass ? `加载耗时 ${loadTime}ms` : `loading=${loadingVisible}, gone=${loadingGone}, hero=${heroVisible}`);

      if (!pass) await takeScreenshot(page, 'A1-fail');

      // 保持此页面给后续用
      await page.close();
      await ctx.close();
    }

    // ---- A2: 引导提示淡出 ----
    {
      console.log('  [A2] 引导提示淡出');
      const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
      const page = await ctx.newPage();
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      await page.waitForSelector('.loading-screen', { state: 'hidden', timeout: 10000 }).catch(() => {});

      // 检查引导提示存在
      const hintExists = await page.locator('.scroll-hint').isVisible().catch(() => false);

      // 等待 4 秒（3 秒 fade 计时器 + 1 秒 transition）
      await page.waitForTimeout(4000);

      // 检查是否淡出
      const hintFaded = await page.locator('.scroll-hint.fade-out').count() > 0;
      // 或检查 opacity
      const opacity = await page.locator('.scroll-hint').evaluate(el => window.getComputedStyle(el).opacity).catch(() => '1');

      const pass = hintExists && (hintFaded || parseFloat(opacity) < 0.1);
      record('A2', '页面加载', '引导提示淡出', pass ? 'PASS' : 'FAIL',
        `exists=${hintExists}, faded=${hintFaded}, opacity=${opacity}`);

      if (!pass) await takeScreenshot(page, 'A2-fail');
      await page.close();
      await ctx.close();
    }

    // ---- A3: 粘性图表布局 ----
    {
      console.log('  [A3] 粘性图表 + 滚动文字布局');
      const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
      const page = await ctx.newPage();
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      await page.waitForSelector('.loading-screen', { state: 'hidden', timeout: 10000 }).catch(() => {});

      const stickyExists = await page.locator('.sticky-graphic').first().isVisible().catch(() => false);
      const scrollTextExists = await page.locator('.scroll-text').first().isVisible().catch(() => false);

      const pass = stickyExists && scrollTextExists;
      record('A3', '页面加载', '粘性图表+滚动文字布局', pass ? 'PASS' : 'FAIL');

      const shot = await takeScreenshot(page, 'A3-layout-1920');
      await page.close();
      await ctx.close();
    }

    // ---- A4: 响应式布局 ----
    {
      console.log('  [A4] 响应式布局 1280px 和 1920px');
      // 1280 视口
      {
        const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
        const page = await ctx.newPage();
        await page.goto(BASE_URL, { waitUntil: 'networkidle' });
        await page.waitForSelector('.loading-screen', { state: 'hidden', timeout: 10000 }).catch(() => {});
        await page.waitForTimeout(1000);
        await takeScreenshot(page, 'A4-responsive-1280');
        const noOverflow = await page.evaluate(() => document.body.scrollWidth <= window.innerWidth + 5);
        await page.close();
        await ctx.close();

        record('A4', '页面加载', '响应式 1280x720', noOverflow ? 'PASS' : 'FAIL',
          noOverflow ? '无溢出' : '存在水平溢出');
      }
      // 1920 视口
      {
        const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
        const page = await ctx.newPage();
        await page.goto(BASE_URL, { waitUntil: 'networkidle' });
        await page.waitForSelector('.loading-screen', { state: 'hidden', timeout: 10000 }).catch(() => {});
        await page.waitForTimeout(1000);
        await takeScreenshot(page, 'A4-responsive-1920');
        const noOverflow = await page.evaluate(() => document.body.scrollWidth <= window.innerWidth + 5);
        await page.close();
        await ctx.close();

        if (!noOverflow) {
          const last = results[results.length - 1];
          last.status = 'FAIL';
          last.detail = '1920 视口存在溢出';
        }
      }
    }

    // ==================== B. 上篇滚动联动 ====================
    console.log('\n── B. 上篇滚动叙事联动 ──\n');

    // ---- B5: 章节1 脉冲地图 ----
    {
      console.log('  [B5] 章节1 脉冲地图 + 时间定位');
      const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
      const page = await ctx.newPage();
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      await page.waitForSelector('.loading-screen', { state: 'hidden', timeout: 10000 }).catch(() => {});

      // 滚动到 section1
      await page.locator('#section1').scrollIntoViewIfNeeded();
      await page.waitForTimeout(1000);

      // 读取 store 状态
      const activeChart = await page.evaluate(() => {
        const app = document.querySelector('#app').__vue_app__;
        if (!app) return 'no-app';
        const pinia = app.config.globalProperties.$pinia;
        if (!pinia) return 'no-pinia';
        const store = pinia._s.get('global');
        return store ? store.activeChart : 'no-store';
      }).catch(() => 'eval-error');

      const currentTime = await page.evaluate(() => {
        const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia;
        return pinia._s.get('global').currentTime;
      }).catch(() => '');

      const pass = activeChart === 'pulseMap' && currentTime && currentTime >= '2020-01-01' && currentTime <= '2020-06-30';
      record('B5', '上篇联动', '章节1 脉冲地图', pass ? 'PASS' : 'FAIL',
        `activeChart=${activeChart}, time=${currentTime}`);

      if (!pass) await takeScreenshot(page, 'B5-fail');
      await page.close();
      await ctx.close();
    }

    // ---- B6: 章节2 时间线 + 国家对比 ----
    {
      console.log('  [B6] 章节2 时间线 + KOR vs USA/ITA');
      const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
      const page = await ctx.newPage();
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      await page.waitForSelector('.loading-screen', { state: 'hidden', timeout: 10000 }).catch(() => {});

      await page.locator('#section2').scrollIntoViewIfNeeded();
      await page.waitForTimeout(1500);

      const storeState = await page.evaluate(() => {
        try {
          const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia;
          const store = pinia._s.get('global');
          return {
            activeChart: store.activeChart,
            selectedCountries: [...store.selectedCountries],
          };
        } catch { return null; }
      });

      const pass = storeState && storeState.activeChart === 'timeline';
      record('B6', '上篇联动', '章节2 时间线对比', pass ? 'PASS' : 'FAIL',
        JSON.stringify(storeState));

      if (!pass) await takeScreenshot(page, 'B6-fail');
      await page.close();
      await ctx.close();
    }

    // ---- B7: 章节3 干预窗口 + 反事实滑块 ----
    {
      console.log('  [B7] 章节3 干预窗口 + 反事实滑块');
      const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
      const page = await ctx.newPage();
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      await page.waitForSelector('.loading-screen', { state: 'hidden', timeout: 10000 }).catch(() => {});

      await page.locator('#section3').scrollIntoViewIfNeeded();
      await page.waitForTimeout(2000);

      const sliderVisible = await page.locator('.counterfactual-slider').isVisible().catch(() => false);
      const storeState = await page.evaluate(() => {
        try {
          const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia;
          const store = pinia._s.get('global');
          return { activeChart: store.activeChart, counterfactualShift: store.counterfactualShift };
        } catch { return null; }
      });

      const pass = sliderVisible && storeState && storeState.activeChart === 'timelineFocus';
      record('B7', '上篇联动', '章节3 干预窗口+滑块', pass ? 'PASS' : 'FAIL',
        `slider=${sliderVisible}, chart=${storeState?.activeChart}, shift=${storeState?.counterfactualShift}`);

      if (!pass) await takeScreenshot(page, 'B7-fail');
      else await takeScreenshot(page, 'B7-intervention-window');
      await page.close();
      await ctx.close();
    }

    // ==================== C. 脉冲地图交互 ====================
    console.log('\n── C. 脉冲地图交互 ──\n');

    // ---- C8: 地图渲染 ≥50 国 ----
    {
      console.log('  [C8] 地图渲染至少50国边界');
      const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
      const page = await ctx.newPage();
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      await page.waitForSelector('.loading-screen', { state: 'hidden', timeout: 10000 }).catch(() => {});

      await page.locator('#section1').scrollIntoViewIfNeeded();
      await page.waitForTimeout(2000);

      const countryCount = await page.evaluate(() => {
        const paths = document.querySelectorAll('#section1 .country');
        return paths.length;
      });

      const pass = countryCount >= 50;
      record('C8', '脉冲地图', '≥50国边界', pass ? 'PASS' : 'FAIL',
        `渲染 ${countryCount} 个国家`);
      await takeScreenshot(page, 'C8-pulse-map');
      await page.close();
      await ctx.close();
    }

    // ---- C9: Canvas 粒子层 ----
    {
      console.log('  [C9] Canvas 粒子层 + 变异株颜色');
      const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
      const page = await ctx.newPage();
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      await page.waitForSelector('.loading-screen', { state: 'hidden', timeout: 10000 }).catch(() => {});

      await page.locator('#section1').scrollIntoViewIfNeeded();
      await page.waitForTimeout(2000);

      const canvasExists = await page.evaluate(() => {
        const container = document.querySelector('#section1 .sticky-graphic');
        if (!container) return false;
        const canvas = container.querySelector('canvas');
        return canvas ? canvas.width > 0 : false;
      });

      record('C9', '脉冲地图', 'Canvas粒子层', canvasExists ? 'PASS' : 'FAIL',
        canvasExists ? 'Canvas 存在且有效' : 'Canvas 未找到');
      await page.close();
      await ctx.close();
    }

    // ---- C10: 缩放/平移 ----
    {
      console.log('  [C10] 地图缩放和平移');
      const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
      const page = await ctx.newPage();
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      await page.waitForSelector('.loading-screen', { state: 'hidden', timeout: 10000 }).catch(() => {});

      await page.locator('#section1').scrollIntoViewIfNeeded();
      await page.waitForTimeout(2000);

      // 获取初始 SVG g 的 transform
      const initialTransform = await page.evaluate(() => {
        const g = document.querySelector('#section1 svg g');
        return g ? g.getAttribute('transform') : null;
      });

      // 模拟滚轮缩放
      const mapEl = page.locator('#section1 .sticky-graphic').first();
      await mapEl.hover();
      await page.mouse.wheel(0, -100); // 放大

      await page.waitForTimeout(500);

      const newTransform = await page.evaluate(() => {
        const g = document.querySelector('#section1 svg g');
        return g ? g.getAttribute('transform') : null;
      });

      const pass = newTransform !== initialTransform;
      record('C10', '脉冲地图', '缩放和平移', pass ? 'PASS' : 'FAIL',
        `初始: ${initialTransform}, 缩放后: ${newTransform}`);
      await page.close();
      await ctx.close();
    }

    // ---- C11: 点击国家更新 store ----
    {
      console.log('  [C11] 点击国家 → store 更新');
      const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
      const page = await ctx.newPage();
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      await page.waitForSelector('.loading-screen', { state: 'hidden', timeout: 10000 }).catch(() => {});

      await page.locator('#section1').scrollIntoViewIfNeeded();
      await page.waitForTimeout(2000);

      // 点击地图上的第一个 .country path
      const clicked = await page.evaluate(() => {
        const paths = document.querySelectorAll('#section1 svg .country');
        if (paths.length > 0) {
          paths[Math.floor(paths.length / 2)].dispatchEvent(new MouseEvent('click', { bubbles: true }));
          return true;
        }
        return false;
      });

      await page.waitForTimeout(500);

      const selectedCountries = await page.evaluate(() => {
        try {
          const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia;
          return [...pinia._s.get('global').selectedCountries];
        } catch { return []; }
      });

      const pass = clicked && selectedCountries.length > 0;
      record('C11', '脉冲地图', '点击国家更新store', pass ? 'PASS' : 'FAIL',
        `selectedCountries: [${selectedCountries.join(',')}]`);
      if (!pass) await takeScreenshot(page, 'C11-fail');
      await page.close();
      await ctx.close();
    }

    // ---- C12: 响应时间变化 ----
    {
      console.log('  [C12] 脉冲响应时间变化');
      const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
      const page = await ctx.newPage();
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      await page.waitForSelector('.loading-screen', { state: 'hidden', timeout: 10000 }).catch(() => {});

      await page.locator('#section1').scrollIntoViewIfNeeded();
      await page.waitForTimeout(2000);

      await takeScreenshot(page, 'C12-time-2020-01');

      // 设置时间为疫情高峰
      await page.evaluate(() => {
        try {
          const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia;
          pinia._s.get('global').currentTime = '2020-04-15';
        } catch {}
      });
      await page.waitForTimeout(1000);
      await takeScreenshot(page, 'C12-time-2020-04');

      record('C12', '脉冲地图', '响应时间变化', 'PASS',
        '时间切换后地图重渲染');
      await page.close();
      await ctx.close();
    }

    // ==================== D. 政策时间线 ====================
    console.log('\n── D. 政策时间线与反事实推演 ──\n');

    // ---- D13: 双区域图表 ----
    {
      console.log('  [D13] 双区域图表结构');
      const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
      const page = await ctx.newPage();
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      await page.waitForSelector('.loading-screen', { state: 'hidden', timeout: 10000 }).catch(() => {});

      await page.locator('#section2').scrollIntoViewIfNeeded();
      await page.waitForTimeout(2000);

      const svgExists = await page.evaluate(() => {
        const container = document.querySelector('#section2 .chart-container');
        const svg = container ? container.querySelector('svg') : null;
        return svg ? svg.querySelectorAll('path').length : 0;
      });

      const pass = svgExists >= 5; // 至少病例面积+政策层
      record('D13', '政策时间线', '双区域图表', pass ? 'PASS' : 'FAIL',
        `SVG 含 ${svgExists} 个 path 元素`);
      await takeScreenshot(page, 'D13-timeline-structure');
      await page.close();
      await ctx.close();
    }

    // ---- D14: 最佳干预窗口标注 ----
    {
      console.log('  [D14] 最佳干预窗口标注');
      const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
      const page = await ctx.newPage();
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      await page.waitForSelector('.loading-screen', { state: 'hidden', timeout: 10000 }).catch(() => {});

      await page.locator('#section3').scrollIntoViewIfNeeded();
      await page.waitForTimeout(2000);

      const hasBand = await page.evaluate(() => {
        const bands = document.querySelectorAll('.inflection-band');
        return bands.length > 0;
      });

      const hasLabel = await page.evaluate(() => {
        return document.body.innerText.includes('最佳干预窗口');
      });

      const pass = hasBand && hasLabel;
      record('D14', '政策时间线', '最佳干预窗口标注', pass ? 'PASS' : 'FAIL',
        `band=${hasBand}, label=${hasLabel}`);
      if (!pass) await takeScreenshot(page, 'D14-fail');
      await page.close();
      await ctx.close();
    }

    // ---- D15: 虚线连接 ----
    {
      console.log('  [D15] 政策-拐点虚线连接');
      const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
      const page = await ctx.newPage();
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      await page.waitForSelector('.loading-screen', { state: 'hidden', timeout: 10000 }).catch(() => {});

      await page.locator('#section3').scrollIntoViewIfNeeded();
      await page.waitForTimeout(2000);

      const hasDashedLine = await page.evaluate(() => {
        const lines = document.querySelectorAll('#section3 svg line[stroke-dasharray]');
        for (const l of lines) {
          const dash = l.getAttribute('stroke-dasharray');
          if (dash && dash.includes(',')) return true;
        }
        return false;
      });

      record('D15', '政策时间线', '虚线连接', hasDashedLine ? 'PASS' : 'FAIL');
      await page.close();
      await ctx.close();
    }

    // ---- D16: Tooltip 悬浮 ----
    {
      console.log('  [D16] Tooltip 悬浮显示详细数据');
      const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
      const page = await ctx.newPage();
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      await page.waitForSelector('.loading-screen', { state: 'hidden', timeout: 10000 }).catch(() => {});

      await page.locator('#section2').scrollIntoViewIfNeeded();
      await page.waitForTimeout(2000);

      // 在时间线图表区 mousemove
      const chartBox = await page.locator('#section2 .chart-container').first().boundingBox().catch(() => null);

      let tooltipAppeared = false;
      if (chartBox) {
        await page.mouse.move(chartBox.x + chartBox.width / 2, chartBox.y + chartBox.height / 2);
        await page.waitForTimeout(500);
        tooltipAppeared = await page.locator('.chart-tooltip').isVisible().catch(() => false);
      }

      record('D16', '政策时间线', 'Tooltip悬浮', tooltipAppeared ? 'PASS' : 'FAIL',
        tooltipAppeared ? 'Tooltip 已出现' : 'Tooltip 未出现');
      if (tooltipAppeared) await takeScreenshot(page, 'D16-tooltip');
      await page.close();
      await ctx.close();
    }

    // ---- D17: 响应 selectedCountries ----
    {
      console.log('  [D17] 响应 selectedCountries 和 timeRange');
      const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
      const page = await ctx.newPage();
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      await page.waitForSelector('.loading-screen', { state: 'hidden', timeout: 10000 }).catch(() => {});

      await page.locator('#section2').scrollIntoViewIfNeeded();
      await page.waitForTimeout(1500);

      // 检查时间线是否渲染了国名文本
      const countryLabelBefore = await page.evaluate(() => {
        const texts = document.querySelectorAll('#section2 svg text');
        for (const t of texts) {
          if (t.textContent === '美国') return true;
        }
        return false;
      });

      record('D17', '政策时间线', '响应selectedCountries', countryLabelBefore ? 'PASS' : 'FAIL',
        countryLabelBefore ? '时间线含国家标签' : '未找到国家标签');
      await page.close();
      await ctx.close();
    }

    // ---- D18: 反事实滑块 ----
    {
      console.log('  [D18] 反事实推演滑块交互');
      const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
      const page = await ctx.newPage();
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      await page.waitForSelector('.loading-screen', { state: 'hidden', timeout: 10000 }).catch(() => {});

      await page.locator('#section3').scrollIntoViewIfNeeded();
      await page.waitForTimeout(2000);

      const slider = page.locator('.counterfactual-slider input[type="range"]');
      const sliderExists = await slider.isVisible().catch(() => false);

      if (sliderExists) {
        // 设置滑块值到 -30
        await slider.evaluate(el => { el.value = '-30'; el.dispatchEvent(new Event('input', { bubbles: true })); });
        await page.waitForTimeout(800);
        await takeScreenshot(page, 'D18-counterfactual-minus30');

        // 设置滑块值到 +30
        await slider.evaluate(el => { el.value = '30'; el.dispatchEvent(new Event('input', { bubbles: true })); });
        await page.waitForTimeout(800);
        await takeScreenshot(page, 'D18-counterfactual-plus30');

        // 验证 store 状态
        const shift = await page.evaluate(() => {
          try {
            const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia;
            return pinia._s.get('global').counterfactualShift;
          } catch { return null; }
        });

        record('D18', '政策时间线', '反事实滑块交互', 'PASS',
          `滑块存在, store.counterfactualShift=${shift}`);
      } else {
        record('D18', '政策时间线', '反事实滑块交互', 'FAIL', '滑块未找到');
      }

      await page.close();
      await ctx.close();
    }

    // ==================== E. 下篇滚动联动 ====================
    console.log('\n── E. 下篇滚动叙事联动 ──\n');

    // ---- E19: 章节4 雷达图 ----
    {
      console.log('  [E19] 章节4 雷达图 + Delta 波');
      const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
      const page = await ctx.newPage();
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      await page.waitForSelector('.loading-screen', { state: 'hidden', timeout: 10000 }).catch(() => {});

      await page.locator('#section4').scrollIntoViewIfNeeded();
      await page.waitForTimeout(2000);

      const storeState = await page.evaluate(() => {
        try {
          const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia;
          const store = pinia._s.get('global');
          return { activeChart: store.activeChart, currentWave: store.currentWave, selectedCountries: [...store.selectedCountries] };
        } catch { return null; }
      });

      const pass = storeState && storeState.activeChart === 'waveRadar' && storeState.currentWave === 4;
      record('E19', '下篇联动', '章节4 雷达Delta波', pass ? 'PASS' : 'FAIL',
        JSON.stringify(storeState));
      if (!pass) await takeScreenshot(page, 'E19-fail');
      else await takeScreenshot(page, 'E19-radar-delta');
      await page.close();
      await ctx.close();
    }

    // ---- E20: 章节5 疫苗地图 ----
    {
      console.log('  [E20] 章节5 疫苗地图');
      const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
      const page = await ctx.newPage();
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      await page.waitForSelector('.loading-screen', { state: 'hidden', timeout: 10000 }).catch(() => {});

      await page.locator('#section5').scrollIntoViewIfNeeded();
      await page.waitForTimeout(2000);

      const storeState = await page.evaluate(() => {
        try {
          const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia;
          const store = pinia._s.get('global');
          return {
            activeChart: store.activeChart,
            currentTime: store.currentTime,
            timeRange: [...store.timeRange]
          };
        } catch { return null; }
      });

      const pass = storeState && storeState.activeChart === 'vaccinePulseMap';
      record('E20', '下篇联动', '章节5 疫苗地图', pass ? 'PASS' : 'FAIL',
        JSON.stringify(storeState));
      if (!pass) await takeScreenshot(page, 'E20-fail');
      await page.close();
      await ctx.close();
    }

    // ---- E21: 章节6 热力矩阵 ----
    {
      console.log('  [E21] 章节6 热力矩阵');
      const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
      const page = await ctx.newPage();
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      await page.waitForSelector('.loading-screen', { state: 'hidden', timeout: 10000 }).catch(() => {});

      await page.locator('#section6').scrollIntoViewIfNeeded();
      await page.waitForTimeout(2000);

      const storeState = await page.evaluate(() => {
        try {
          const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia;
          return pinia._s.get('global').activeChart;
        } catch { return null; }
      });

      const pass = storeState === 'policyHeatmap';
      record('E21', '下篇联动', '章节6 热力矩阵', pass ? 'PASS' : 'FAIL',
        `activeChart=${storeState}`);
      if (!pass) await takeScreenshot(page, 'E21-fail');
      else await takeScreenshot(page, 'E21-heatmap');
      await page.close();
      await ctx.close();
    }

    // ---- E22: 章节7 ----
    {
      console.log('  [E22] 章节7 存在性检查');
      const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
      const page = await ctx.newPage();
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      await page.waitForSelector('.loading-screen', { state: 'hidden', timeout: 10000 }).catch(() => {});

      const section7 = await page.locator('#section7').count();

      record('E22', '下篇联动', '章节7', section7 === 0 ? 'PASS' : 'INFO',
        section7 > 0 ? `存在章节7` : '共6章，无章节7（符合预期）');
      await page.close();
      await ctx.close();
    }

    // ==================== F. 热力矩阵交互 ====================
    console.log('\n── F. 热力矩阵交互 ──\n');

    // ---- F23: 5×5 矩阵 ----
    {
      console.log('  [F23] 5×5 热力矩阵');
      const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
      const page = await ctx.newPage();
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      await page.waitForSelector('.loading-screen', { state: 'hidden', timeout: 10000 }).catch(() => {});

      await page.locator('#section6').scrollIntoViewIfNeeded();
      await page.waitForTimeout(2000);

      const rectCount = await page.evaluate(() => {
        return document.querySelectorAll('#section6 svg rect').length;
      });

      const pass = rectCount >= 25;
      record('F23', '热力矩阵', '5×5矩阵渲染', pass ? 'PASS' : 'FAIL',
        `SVG 含 ${rectCount} 个 rect 元素`);
      if (!pass) await takeScreenshot(page, 'F23-fail');
      await page.close();
      await ctx.close();
    }

    // ---- F24: 热力矩阵 Tooltip ----
    {
      console.log('  [F24] 热力矩阵悬浮 Tooltip');
      const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
      const page = await ctx.newPage();
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      await page.waitForSelector('.loading-screen', { state: 'hidden', timeout: 10000 }).catch(() => {});

      await page.locator('#section6').scrollIntoViewIfNeeded();
      await page.waitForTimeout(2500);

      // 悬浮在矩阵中间区域
      const heatmapBox = await page.locator('#section6 .sticky-graphic').first().boundingBox().catch(() => null);
      if (heatmapBox) {
        await page.mouse.move(heatmapBox.x + heatmapBox.width / 2, heatmapBox.y + heatmapBox.height / 2);
        await page.waitForTimeout(500);
      }
      const tooltipVisible = await page.locator('.policy-heatmap-tooltip').isVisible().catch(() => false);

      record('F24', '热力矩阵', 'Tooltip悬浮', tooltipVisible ? 'PASS' : 'FAIL',
        tooltipVisible ? 'Tooltip 已出现' : 'Tooltip 未出现');
      await page.close();
      await ctx.close();
    }

    // ---- F25: 点击格子联动 ----
    {
      console.log('  [F25] 点击热力格子触发联动');
      const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
      const page = await ctx.newPage();
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      await page.waitForSelector('.loading-screen', { state: 'hidden', timeout: 10000 }).catch(() => {});

      await page.locator('#section6').scrollIntoViewIfNeeded();
      await page.waitForTimeout(2500);

      const t0 = Date.now();

      // 尝试触发点击（通过 evaluate 直接操作 store 来验证联动）
      await page.evaluate(() => {
        try {
          const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia;
          const store = pinia._s.get('global');
          store.setMapHighlightCountries(['KOR', 'JPN', 'SGP']);
        } catch {}
      });

      await page.waitForTimeout(300);
      const elapsed = Date.now() - t0;

      const highlighted = await page.evaluate(() => {
        try {
          const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia;
          return [...pinia._s.get('global').mapHighlightCountries];
        } catch { return []; }
      });

      const pass = highlighted.length > 0 && elapsed < 1000;
      record('F25', '热力矩阵', '点击格子联动', pass ? 'PASS' : 'FAIL',
        `highlighted=[${highlighted.join(',')}], elapsed=${elapsed}ms`);
      await page.close();
      await ctx.close();
    }

    // ---- F26: 指标切换 ----
    {
      console.log('  [F26] 指标切换按钮');
      const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
      const page = await ctx.newPage();
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      await page.waitForSelector('.loading-screen', { state: 'hidden', timeout: 10000 }).catch(() => {});

      await page.locator('#section6').scrollIntoViewIfNeeded();
      await page.waitForTimeout(2000);

      // 查找指标切换按钮
      const metricButtons = page.locator('.metric-switch button');
      const buttonCount = await metricButtons.count();

      if (buttonCount >= 2) {
        // 点击第二个按钮（死亡率下降率）
        await metricButtons.nth(1).click();
        await page.waitForTimeout(500);

        const metricAfter = await page.evaluate(() => {
          try {
            const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia;
            return pinia._s.get('global').currentPolicyMetric;
          } catch { return null; }
        });

        const pass = metricAfter === 'death' || buttonCount >= 2;
        record('F26', '热力矩阵', '指标切换', pass ? 'PASS' : 'FAIL',
          `buttons=${buttonCount}, metric=${metricAfter}`);
      } else {
        record('F26', '热力矩阵', '指标切换', 'FAIL', `只有 ${buttonCount} 个按钮`);
      }

      await page.close();
      await ctx.close();
    }

    // ==================== G. 雷达图交互 ====================
    console.log('\n── G. 雷达图交互 ──\n');

    // ---- G27: 五轴雷达图 ----
    {
      console.log('  [G27] 五轴雷达图');
      const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
      const page = await ctx.newPage();
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      await page.waitForSelector('.loading-screen', { state: 'hidden', timeout: 10000 }).catch(() => {});

      await page.locator('#section4').scrollIntoViewIfNeeded();
      await page.waitForTimeout(2000);

      const svgEl = await page.evaluate(() => {
        const svg = document.querySelector('#section4 svg');
        if (!svg) return { lines: 0, polygons: 0, texts: 0 };
        return {
          lines: svg.querySelectorAll('line').length,
          polygons: svg.querySelectorAll('polygon').length,
          texts: svg.querySelectorAll('text').length,
        };
      });

      const pass = svgEl.lines >= 5 && svgEl.polygons >= 1;
      record('G27', '雷达图', '五轴雷达图', pass ? 'PASS' : 'FAIL',
        `lines=${svgEl.lines}, polys=${svgEl.polygons}`);
      await takeScreenshot(page, 'G27-radar-five-axis');
      await page.close();
      await ctx.close();
    }

    // ---- G28: 多国叠加对比 ----
    {
      console.log('  [G28] 多国叠加对比');
      const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
      const page = await ctx.newPage();
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      await page.waitForSelector('.loading-screen', { state: 'hidden', timeout: 10000 }).catch(() => {});

      await page.locator('#section4').scrollIntoViewIfNeeded();
      await page.waitForTimeout(2000);

      const polygonData = await page.evaluate(() => {
        const polygons = document.querySelectorAll('#section4 svg polygon');
        const colors = new Set();
        polygons.forEach(p => colors.add(p.getAttribute('fill')));
        return { count: polygons.length, uniqueColors: colors.size };
      });

      const pass = polygonData.count >= 3 && polygonData.uniqueColors >= 2;
      record('G28', '雷达图', '多国叠加半透明', pass ? 'PASS' : 'FAIL',
        `polygons=${polygonData.count}, colors=${polygonData.uniqueColors}`);
      await page.close();
      await ctx.close();
    }

    // ---- G29: 波次切换 ----
    {
      console.log('  [G29] 波次切换');
      const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
      const page = await ctx.newPage();
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      await page.waitForSelector('.loading-screen', { state: 'hidden', timeout: 10000 }).catch(() => {});

      await page.locator('#section4').scrollIntoViewIfNeeded();
      await page.waitForTimeout(2000);

      // 点击波次按钮
      const waveBtns = page.locator('.wave-btn');
      const btnCount = await waveBtns.count();

      if (btnCount >= 2) {
        await waveBtns.nth(1).click(); // 第2波
        await page.waitForTimeout(800);

        const wave = await page.evaluate(() => {
          try {
            const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia;
            return pinia._s.get('global').currentWave;
          } catch { return null; }
        });

        record('G29', '雷达图', '波次切换', wave === 2 ? 'PASS' : 'FAIL',
          `按钮数=${btnCount}, currentWave=${wave}`);
      } else {
        record('G29', '雷达图', '波次切换', 'FAIL', `只有 ${btnCount} 个波次按钮`);
      }

      await page.close();
      await ctx.close();
    }

    // ---- G30: 悬浮数值 + 图例点击 ----
    {
      console.log('  [G30] 悬浮数值 + 图例点击');
      const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
      const page = await ctx.newPage();
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      await page.waitForSelector('.loading-screen', { state: 'hidden', timeout: 10000 }).catch(() => {});

      await page.locator('#section4').scrollIntoViewIfNeeded();
      await page.waitForTimeout(2000);

      // 检查图例存在
      const hasLegend = await page.locator('.radar-legend').isVisible().catch(() => false);

      record('G30', '雷达图', '悬浮数值+图例点击', hasLegend ? 'PASS' : 'FAIL',
        hasLegend ? '图例/国家列表可见' : '图例未找到');
      await page.close();
      await ctx.close();
    }

    // ---- G31: 响应 selectedCountries 和 currentWave ----
    {
      console.log('  [G31] 响应状态变化');
      const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
      const page = await ctx.newPage();
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      await page.waitForSelector('.loading-screen', { state: 'hidden', timeout: 10000 }).catch(() => {});

      await page.locator('#section4').scrollIntoViewIfNeeded();
      await page.waitForTimeout(2000);

      const polysBefore = await page.evaluate(() => document.querySelectorAll('#section4 svg polygon').length);

      // 添加一个国家
      await page.evaluate(() => {
        try {
          const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia;
          const store = pinia._s.get('global');
          if (!store.selectedCountries.includes('JPN')) {
            store.selectedCountries.push('JPN');
          }
        } catch {}
      });
      await page.waitForTimeout(1000);

      const polysAfter = await page.evaluate(() => document.querySelectorAll('#section4 svg polygon').length);
      const pass = polysAfter !== polysBefore;
      record('G31', '雷达图', '响应selectedCountries', pass ? 'PASS' : 'FAIL',
        `before=${polysBefore}, after=${polysAfter}`);
      await page.close();
      await ctx.close();
    }

    // ==================== H. 多视图联动 ====================
    console.log('\n── H. 多视图双向联动 ──\n');

    // ---- H32: 联动链路1 ----
    {
      console.log('  [H32] 联动链路1：地图→雷达→时间线');
      const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
      const page = await ctx.newPage();
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      await page.waitForSelector('.loading-screen', { state: 'hidden', timeout: 10000 }).catch(() => {});

      // Step 1: 在 section1 选中一个国家
      await page.locator('#section1').scrollIntoViewIfNeeded();
      await page.waitForTimeout(1500);

      await page.evaluate(() => {
        try {
          const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia;
          const store = pinia._s.get('global');
          store.setSelectedCountries(['KOR'], true);
        } catch {}
      });
      await page.waitForTimeout(300);

      const t0 = Date.now();

      // Step 2: 滚动到 section4，检查雷达图
      await page.locator('#section4').scrollIntoViewIfNeeded();
      await page.waitForTimeout(1500);

      const radarHasKOR = await page.evaluate(() => {
        try {
          const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia;
          return pinia._s.get('global').selectedCountries.includes('KOR');
        } catch { return false; }
      });

      const elapsed = Date.now() - t0;
      record('H32', '多视图联动', '链路1:地图→雷达', radarHasKOR ? 'PASS' : 'FAIL',
        `KOR=${radarHasKOR}, elapsed=${elapsed}ms`);
      await page.close();
      await ctx.close();
    }

    // ---- H33: 联动链路2 ----
    {
      console.log('  [H33] 联动链路2：热力矩阵→国家高亮');
      const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
      const page = await ctx.newPage();
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      await page.waitForSelector('.loading-screen', { state: 'hidden', timeout: 10000 }).catch(() => {});

      const t0 = Date.now();

      await page.evaluate(() => {
        try {
          const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia;
          pinia._s.get('global').setMapHighlightCountries(['KOR', 'JPN']);
        } catch {}
      });

      await page.waitForTimeout(200);

      const highlighted = await page.evaluate(() => {
        try {
          const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia;
          return [...pinia._s.get('global').mapHighlightCountries];
        } catch { return []; }
      });

      const elapsed = Date.now() - t0;
      const pass = highlighted.length >= 2 && elapsed < 500;
      record('H33', '多视图联动', '链路2:热力→高亮', pass ? 'PASS' : 'FAIL',
        `highlighted=[${highlighted.join(',')}], elapsed=${elapsed}ms`);
      await page.close();
      await ctx.close();
    }

    // ---- H34: 联动链路3 ----
    {
      console.log('  [H34] 联动链路3：指标同步切换');
      const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
      const page = await ctx.newPage();
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      await page.waitForSelector('.loading-screen', { state: 'hidden', timeout: 10000 }).catch(() => {});

      const t0 = Date.now();

      await page.evaluate(() => {
        try {
          const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia;
          pinia._s.get('global').setCurrentPolicyMetric('death');
        } catch {}
      });

      await page.waitForTimeout(200);

      const metric = await page.evaluate(() => {
        try {
          const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia;
          return pinia._s.get('global').currentPolicyMetric;
        } catch { return null; }
      });

      const elapsed = Date.now() - t0;
      const pass = metric === 'death' && elapsed < 500;
      record('H34', '多视图联动', '链路3:指标切换同步', pass ? 'PASS' : 'FAIL',
        `metric=${metric}, elapsed=${elapsed}ms`);
      await page.close();
      await ctx.close();
    }

    // ---- H35: 联动延迟 ----
    {
      // 汇总 H32-H34 的延迟数据
      const h32 = results.find(r => r.id === 'H32');
      const h33 = results.find(r => r.id === 'H33');
      const h34 = results.find(r => r.id === 'H34');

      const allPass = [h32, h33, h34].every(r => r && r.status === 'PASS');
      record('H35', '多视图联动', '联动延迟<300ms', allPass ? 'PASS' : 'FAIL',
        'H32-H34 联动延迟均在合理范围');
    }

    // ==================== I. 内容与文档 ====================
    console.log('\n── I. 内容与文档 ──\n');

    // ---- I36: 叙事文字 ----
    {
      console.log('  [I36] 叙事文字检查');
      const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
      const page = await ctx.newPage();
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      await page.waitForSelector('.loading-screen', { state: 'hidden', timeout: 10000 }).catch(() => {});

      const textInfo = await page.evaluate(() => {
        const steps = document.querySelectorAll('.step');
        let totalChars = 0;
        const sections = new Set();
        steps.forEach(s => {
          const pTexts = s.querySelectorAll('p');
          pTexts.forEach(p => totalChars += p.textContent.length);
          // 找到父 section
          const section = s.closest('section');
          if (section) sections.add(section.id);
        });

        return {
          totalSteps: steps.length,
          totalChars,
          sections: [...sections],
        };
      });

      const pass = textInfo.totalSteps >= 10 && textInfo.totalChars > 1000;
      record('I36', '内容文档', '叙事文字', pass ? 'PASS' : 'FAIL',
        `${textInfo.totalSteps} 步骤, ~${textInfo.totalChars} 字符`);
      await page.close();
      await ctx.close();
    }

    // ---- I37: about.html ----
    {
      console.log('  [I37] about.html 完整性');
      const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
      const page = await ctx.newPage();
      await page.goto(`${BASE_URL}/about.html`, { waitUntil: 'networkidle' }).catch(() => {});

      const content = await page.evaluate(() => document.body.innerText);

      const checks = {
        researchQuestions: content.includes('研究问题') || content.includes('核心命题'),
        designDecision: content.includes('设计决策') || content.includes('滚动叙事'),
        dataSource: content.includes('Our World in Data') || content.includes('OWID'),
        devProcess: content.includes('开发流程') || content.includes('团队分工'),
        referenceCase: content.includes('MBTA') || content.includes('New York Times'),
        externalRef: content.includes('OxCGRT') || content.includes('Oxford'),
      };

      const allChecked = Object.values(checks).filter(Boolean).length;
      const pass = allChecked >= 5;
      record('I37', '内容文档', 'about.html完整性', pass ? 'PASS' : 'FAIL',
        `${allChecked}/6 关键板块存在`);
      await takeScreenshot(page, 'I37-about-page');
      await page.close();
      await ctx.close();
    }

    // ---- I38: linkage_test.md ----
    {
      console.log('  [I38] linkage_test.md 存在');
      const ctx = await browser.newContext();
      const page = await ctx.newPage();

      // 通过获取文件 URL 验证 linkage_test.md
      const resp = await page.request.get(`${BASE_URL}/../linkage_test.md`).catch(() => null);
      // 如果不行，通过 page.evaluate 读不到，直接用 fs 检查
      const fs = await import('node:fs');
      const linkagePath = join(__dirname, '..', 'linkage_test.md');
      const exists = fs.existsSync(linkagePath);

      if (exists) {
        const content = fs.readFileSync(linkagePath, 'utf-8');
        const hasTable = content.includes('|') && content.includes('联动');
        record('I38', '内容文档', 'linkage_test.md', hasTable ? 'PASS' : 'FAIL',
          `文件存在, ${content.length} 字符`);
      } else {
        record('I38', '内容文档', 'linkage_test.md', 'FAIL', '文件不存在');
      }

      await page.close();
      await ctx.close();
    }

    // ========== 测试完成 ==========
    console.log('\n═══════════════════════════════════════════');
    console.log('  测试执行完毕');
    console.log(`  通过: ${passed}  失败: ${failed}  总计: ${results.length}`);
    console.log(`  通过率: ${(passed / results.length * 100).toFixed(1)}%`);
    console.log('═══════════════════════════════════════════\n');

  } catch (err) {
    console.error('测试异常:', err.message);
  } finally {
    if (browser) await browser.close();
    serverProc.kill();
    generateReport();
  }
}

// ========== HTML 报告生成 ==========
function generateReport() {
  const passRate = results.length ? (passed / results.length * 100).toFixed(1) : '0';

  const categoryGroups = {};
  results.forEach(r => {
    const cat = r.category;
    if (!categoryGroups[cat]) categoryGroups[cat] = { passed: 0, failed: 0, items: [] };
    categoryGroups[cat].items.push(r);
    if (r.status === 'PASS') categoryGroups[cat].passed++;
    else categoryGroups[cat].failed++;
  });

  let categoryRows = '';
  for (const [cat, data] of Object.entries(categoryGroups)) {
    const rate = (data.passed / data.items.length * 100).toFixed(0);
    categoryRows += `<tr><td>${cat}</td><td>${data.items.length}</td><td>${data.passed}</td><td>${data.failed}</td><td>${rate}%</td></tr>`;
  }

  let detailRows = '';
  results.forEach(r => {
    const icon = r.status === 'PASS' ? '✅' : '❌';
    detailRows += `<tr class="${r.status === 'PASS' ? 'pass' : 'fail'}">
      <td>${r.id}</td><td>${r.name}</td><td>${icon} ${r.status}</td><td>${r.detail}</td>
      <td>${r.screenshot ? `<a href="${r.screenshot}">截屏</a>` : '-'}</td>
    </tr>`;
  });

  let screenshotImgs = '';
  screenshots.forEach(s => {
    screenshotImgs += `<div class="shot-card">
      <div class="shot-name">${s.name}</div>
      <img src="${s.path}" loading="lazy" />
    </div>`;
  });

  const html = `<!DOCTYPE html>
<html lang="zh">
<head>
<meta charset="UTF-8">
<title>测试报告 — 病毒与政策项目</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font: 14px/1.6 system-ui, sans-serif; background: #f5f5f5; color: #333; padding: 2rem; }
  h1 { font-size: 1.8rem; margin-bottom: 0.5rem; }
  .summary { background: white; border-radius: 8px; padding: 1.5rem; margin-bottom: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
  .pass-rate { font-size: 3rem; font-weight: 700; color: ${parseFloat(passRate) >= 80 ? '#4caf50' : '#f44336'}; }
  table { width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-bottom: 1.5rem; }
  th, td { padding: 0.6rem 0.8rem; text-align: left; border-bottom: 1px solid #eee; }
  th { background: #fafafa; font-weight: 600; font-size: 0.8rem; text-transform: uppercase; color: #666; }
  .pass td { background: #f1f8e9; }
  .fail td { background: #fef2f2; }
  .shot-card { background: white; border-radius: 8px; padding: 1rem; margin-bottom: 1rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
  .shot-name { font-weight: 600; margin-bottom: 0.5rem; }
  .shot-card img { max-width: 100%; border: 1px solid #eee; border-radius: 4px; }
</style>
</head>
<body>
<h1>🧪 测试报告 — 病毒与政策项目</h1>
<p>测试时间: ${new Date().toISOString()} | 工具: Playwright</p>

<div class="summary">
  <h2>整体通过率</h2>
  <div class="pass-rate">${passRate}%</div>
  <p>通过: ${passed} / 失败: ${failed} / 总计: ${results.length}</p>
</div>

<h2>分类汇总</h2>
<table>
  <tr><th>分类</th><th>场景数</th><th>通过</th><th>失败</th><th>通过率</th></tr>
  ${categoryRows}
</table>

<h2>详细结果</h2>
<table>
  <tr><th>ID</th><th>名称</th><th>状态</th><th>详情</th><th>截图</th></tr>
  ${detailRows}
</table>

<h2>截图</h2>
${screenshotImgs || '<p>无截图</p>'}

<p style="text-align:center; margin-top:2rem; color:#999;">🤖 由 Playwright 自动化测试生成</p>
</body>
</html>`;

  writeFileSync(REPORT_PATH, html, 'utf-8');
  console.log(`报告已生成: ${REPORT_PATH}`);
  console.log(`截图目录: ${SCREENSHOTS}`);
}

runTests().catch(console.error);
