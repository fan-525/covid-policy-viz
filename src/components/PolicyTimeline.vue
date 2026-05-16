                                   <script setup>
/**
 * PolicyTimeline.vue — 图表2：政策时机竞赛时间线（增强版）
 * 
 * 功能说明：
 * - 上方：病例面积图 + 综合政策指数阶梯线（双Y轴叠加对比）
 * - 下方：政策强度分维度分层阶梯图（线条+轻量填充+变化节点标记）
 * - 综合政策指数 = 所有维度之和（0-15），映射为 0-100%
 * - 政策曲线使用阶梯函数（政策为离散变量，更适合阶梯表达）
 * - 鼠标悬浮显示十字线 + 详细 tooltip（含进度条）
 * - 自动标注"最佳干预窗口"（半透明暖橙色竖条 + 图标 + 文字）
 * - 反事实推演滑块：-30 到 +30 天
 * - 模拟曲线：柔和实线 + 半透明填充（替代虚线）
 * - 关键政策变化节点标注（如"封锁↑""口罩↑"）
 * - 响应 store.selectedCountries 和 store.timeRange 变化
 */
import { ref, onMounted, onUnmounted, watch, computed, nextTick } from 'vue'
import { useGlobalStore } from '@/stores/global'
import { computeCounterfactual, detectInflectionPoints, detectPolicyChanges } from '@/utils/counterfactual'
import * as d3 from 'd3'

const props = defineProps({
  showSlider: { type: Boolean, default: false },
  focusMode: { type: Boolean, default: false }
})

const store = useGlobalStore()
const chartContainer = ref(null)

// ==================== 内部状态 ====================
let svg = null
let width = 0
let height = 0
const margin = { top: 30, right: 60, bottom: 40, left: 60 }

// 政策维度颜色映射（降低饱和度，柔和配色）
const POLICY_COLORS = {
  policy_lockdown: '#CC704B',   // 封锁 - 暖橙棕
  policy_testing:  '#4CAF50',   // 检测 - 标准绿
  policy_mask:     '#03A9F4',   // 口罩 - 亮蓝
  policy_vaccine:  '#9C27B0',   // 疫苗 - 紫色
  policy_border:   '#78909C'    // 边境 - 灰蓝
}

const POLICY_LABELS = {
  policy_lockdown: '封锁',
  policy_testing: '检测',
  policy_mask: '口罩',
  policy_vaccine: '疫苗',
  policy_border: '边境'
}

// 模拟曲线颜色（淡粉紫）
const SIM_COLOR = '#BA68C8'

// ISO → 中文国家名称映射
const ISO_TO_CHINESE = {
  'USA': '美国', 'CHN': '中国', 'GBR': '英国', 'FRA': '法国', 'DEU': '德国',
  'ITA': '意大利', 'ESP': '西班牙', 'JPN': '日本', 'KOR': '韩国', 'IND': '印度',
  'BRA': '巴西', 'RUS': '俄罗斯', 'CAN': '加拿大', 'AUS': '澳大利亚', 'MEX': '墨西哥',
  'IDN': '印度尼西亚', 'TUR': '土耳其', 'IRN': '伊朗', 'SAU': '沙特阿拉伯', 'ZAF': '南非',
  'NLD': '荷兰', 'BEL': '比利时', 'CHE': '瑞士', 'AUT': '奥地利', 'SWE': '瑞典',
  'NOR': '挪威', 'DNK': '丹麦', 'FIN': '芬兰', 'POL': '波兰', 'CZE': '捷克',
  'GRC': '希腊', 'PRT': '葡萄牙', 'ROU': '罗马尼亚', 'HUN': '匈牙利', 'UKR': '乌克兰',
  'ARG': '阿根廷', 'CHL': '智利', 'COL': '哥伦比亚', 'PER': '秘鲁', 'VEN': '委内瑞拉',
  'EGY': '埃及', 'NGA': '尼日利亚', 'KEN': '肯尼亚', 'PAK': '巴基斯坦', 'BGD': '孟加拉国',
  'VNM': '越南', 'THA': '泰国', 'MYS': '马来西亚', 'SGP': '新加坡', 'PHL': '菲律宾',
  'NZL': '新西兰', 'ISL': '冰岛', 'IRL': '爱尔兰', 'ISR': '以色列', 'ARE': '阿联酋'
}

function getCountryName(iso) {
  return ISO_TO_CHINESE[iso] || iso
}

// Tooltip 数据
const tooltipData = ref(null)
const tooltipX = ref(0)
const tooltipY = ref(0)

// ==================== 数据处理 ====================

/** 获取主要展示国家的数据 */
const mainCountry = computed(() => {
  if (store.selectedCountries.length > 0) {
    return store.selectedCountries[0]
  }
  return 'USA'
})

/** 获取所有选中国家的高亮数据 */
const highlightedCountries = computed(() => {
  return store.selectedCountries.filter(iso => store.covidData?.[iso])
})

/** 获取当前国家的时序数据（含政策值修正） */
const countryData = computed(() => {
  // 如果有多个选中国家，显示平均数据
  if (store.selectedCountries.length > 1) {
    return averageHighlightedData.value
  }
  const data = store.covidData?.[mainCountry.value]
  if (!data) return []
  return data
    .filter(d => d.date >= store.timeRange[0] && d.date <= store.timeRange[1])
    .map(d => ({
      ...d,
      new_cases_smoothed: d.new_cases_smoothed || 0,
      policy_lockdown: clampPolicy(d.policy_lockdown),
      policy_testing: clampPolicy(d.policy_testing),
      policy_mask: clampPolicy(d.policy_mask),
      policy_vaccine: clampPolicy(d.policy_vaccine),
      policy_border: clampPolicy(d.policy_border)
    }))
})

/** 获取所有高亮国家的时序数据 */
const highlightedData = computed(() => {
  return highlightedCountries.value.map(iso => {
    const data = store.covidData?.[iso]
    if (!data) return null
    return {
      iso,
      name: getCountryName(iso),
      data: data
        .filter(d => d.date >= store.timeRange[0] && d.date <= store.timeRange[1])
        .map(d => ({
          ...d,
          new_cases_smoothed: d.new_cases_smoothed || 0,
          policy_lockdown: clampPolicy(d.policy_lockdown),
          policy_testing: clampPolicy(d.policy_testing),
          policy_mask: clampPolicy(d.policy_mask),
          policy_vaccine: clampPolicy(d.policy_vaccine),
          policy_border: clampPolicy(d.policy_border)
        }))
    }
  }).filter(Boolean)
})

/** 计算高亮国家的平均政策数据 */
const averageHighlightedData = computed(() => {
  if (highlightedData.value.length === 0) return []
  const dates = [...new Set(highlightedData.value.flatMap(c => c.data.map(d => d.date)))].sort()
  return dates.map(date => {
    const dayData = highlightedData.value.map(c => c.data.find(d => d.date === date)).filter(Boolean)
    if (dayData.length === 0) return null
    return {
      date,
      new_cases_smoothed: d3.mean(dayData, d => d.new_cases_smoothed) || 0,
      policy_lockdown: d3.mean(dayData, d => d.policy_lockdown) || 0,
      policy_testing: d3.mean(dayData, d => d.policy_testing) || 0,
      policy_mask: d3.mean(dayData, d => d.policy_mask) || 0,
      policy_vaccine: d3.mean(dayData, d => d.policy_vaccine) || 0,
      policy_border: d3.mean(dayData, d => d.policy_border) || 0
    }
  }).filter(Boolean)
})


/** 拐点数据 */
const inflectionPoints = computed(() => {
  return detectInflectionPoints(countryData.value)
})

/** 政策变化日期 */
const policyChanges = computed(() => {
  return detectPolicyChanges(countryData.value)
})

/** 反事实模拟数据 */
const counterfactualData = computed(() => {
  if (store.counterfactualShift === 0) return []
  return computeCounterfactual(countryData.value, store.counterfactualShift)
})

/** 将政策值限制在 [0, maxLevel] 范围（修正数据中疫苗字段可能混入接种人数的问题） */
function clampPolicy(val, maxLevel = 3) {
  const n = Number(val)
  if (!n || isNaN(n)) return 0
  return Math.max(0, Math.min(maxLevel, n))
}

/** 计算综合政策指数（所有维度之和，映射为 0-100%） */
function computePolicyIndex(d) {
  const sum = clampPolicy(d.policy_lockdown) + clampPolicy(d.policy_testing) +
              clampPolicy(d.policy_mask) + clampPolicy(d.policy_vaccine) + clampPolicy(d.policy_border)
  // 最大值为 15（5维度 × 3级），映射为百分比
  return (sum / 15) * 100
}

/** 查找关键政策变化事件（用于图表标注） */
function findKeyPolicyEvents(data, maxEvents = 4) {
  if (!data || data.length < 2) return []
  const events = []
  const keys = ['policy_lockdown', 'policy_testing', 'policy_mask', 'policy_vaccine', 'policy_border']

  for (let i = 1; i < data.length; i++) {
    for (const key of keys) {
      const prev = clampPolicy(data[i - 1][key])
      const curr = clampPolicy(data[i][key])
      const change = curr - prev
      if (change !== 0) {
        events.push({ date: data[i].date, policy: key, change, value: curr })
      }
    }
  }

  // 按变化幅度排序，优先选大的
  const sortedByMag = [...events].sort((a, b) => Math.abs(b.change) - Math.abs(a.change))

  // 选出时间上间隔 >= 20 天的事件
  const selected = []
  for (const event of sortedByMag) {
    if (selected.length >= maxEvents) break
    const eventDate = new Date(event.date)
    const tooClose = selected.some(s =>
      Math.abs(new Date(s.date) - eventDate) < 20 * 86400000
    )
    if (!tooClose) {
      selected.push(event)
    }
  }

  return selected.sort((a, b) => new Date(a.date) - new Date(b.date))
}

// ==================== 图表渲染 ====================

onMounted(async () => {
  await nextTick()
  renderChart()
})

onUnmounted(() => {
  window.removeEventListener('resize', onResize)
})

/** 主渲染函数 */
function renderChart() {
  const container = chartContainer.value
  if (!container || countryData.value.length === 0) return

  // 清除旧图表
  d3.select(container).selectAll('svg').remove()

  width = container.clientWidth
  height = container.clientHeight

  const innerWidth = width - margin.left - margin.right
  const innerHeight = height - margin.top - margin.bottom
  const caseHeight = innerHeight * 0.52   // 上方病例区占 52%
  const policyHeight = innerHeight * 0.42 // 下方政策区占 42%
  const gap = innerHeight * 0.06          // 小间隔（分隔线+标签空间）

  // 创建 SVG
  svg = d3.select(container)
    .append('svg')
    .attr('width', width)
    .attr('height', height)

  const g = svg.append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`)

  // 数据预处理：确保数值有效，修正 policy_vaccine 等可能混入大数值的字段
  const data = countryData.value.map(d => ({
    ...d,
    new_cases_smoothed: d.new_cases_smoothed || 0,
    policy_lockdown: clampPolicy(d.policy_lockdown),
    policy_testing: clampPolicy(d.policy_testing),
    policy_mask: clampPolicy(d.policy_mask),
    policy_vaccine: clampPolicy(d.policy_vaccine),
    policy_border: clampPolicy(d.policy_border),
    policyIndex: computePolicyIndex(d)
  }))

  const dates = data.map(d => new Date(d.date))
  const cases = data.map(d => d.new_cases_smoothed)
  const policyIndices = data.map(d => d.policyIndex)
  
  // 比例尺
  const xScale = d3.scaleTime()
    .domain(d3.extent(dates))
    .range([0, innerWidth])

  const yCases = d3.scaleLinear()
    .domain([0, d3.max(cases) * 1.1 || 100])
    .range([caseHeight, 0])

  // 右侧 Y 轴：综合政策指数 (0-100%)
  const yPolicyIndex = d3.scaleLinear()
    .domain([0, 100])
    .range([caseHeight, 0])

  const yPolicy = d3.scaleLinear()
    .domain([0, 15]) // 5维度 × 3级 = 最大15
    .range([caseHeight + gap + policyHeight, caseHeight + gap])

  // ==================== 病例面积图（纯色低透明度填充）====================
  const caseArea = d3.area()
    .x((d, i) => xScale(dates[i]))
    .y0(caseHeight)
    .y1((d) => yCases(d))
    .curve(d3.curveMonotoneX)

  g.append('path')
    .datum(cases)
    .attr('fill', '#E53935')
    .attr('fill-opacity', 0.15)
    .attr('d', caseArea)

  // 病例曲线线条：加粗，主数据层级
  const caseLine = d3.line()
    .x((d, i) => xScale(dates[i]))
    .y((d) => yCases(d))
    .curve(d3.curveMonotoneX)

  g.append('path')
    .datum(cases)
    .attr('fill', 'none')
    .attr('stroke', '#E53935')
    .attr('stroke-width', 2)
    .attr('stroke-linejoin', 'round')
    .attr('stroke-linecap', 'round')
    .attr('d', caseLine)

  // ==================== 综合政策指数叠加线（阶梯函数）===================
  // 面积填充
  const policyIndexArea = d3.area()
    .x((d, i) => xScale(dates[i]))
    .y0(caseHeight)
    .y1((d) => yPolicyIndex(d))
    .curve(d3.curveStepAfter)

  g.append('path')
    .datum(policyIndices)
    .attr('fill', '#2196F3')
    .attr('fill-opacity', 0.12)
    .attr('d', policyIndexArea)

  // 阶梯线条
  const policyIndexLine = d3.line()
    .x((d, i) => xScale(dates[i]))
    .y((d) => yPolicyIndex(d))
    .curve(d3.curveStepAfter)

  g.append('path')
    .datum(policyIndices)
    .attr('fill', 'none')
    .attr('stroke', '#2196F3')
    .attr('stroke-width', 1.2)
    .attr('stroke-opacity', 0.75)
    .attr('stroke-linejoin', 'round')
    .attr('d', policyIndexLine)

  // 右侧 Y 轴：只保留关键刻度标签，弱化刻度线
  const yAxisRight = d3.axisRight(yPolicyIndex)
    .tickValues([0, 25, 50, 75, 100])
    .tickFormat(d => d + '%')
    .tickSize(3)

  const yAxisRightG = g.append('g')
    .attr('transform', `translate(${innerWidth}, 0)`)
    .call(yAxisRight)

  yAxisRightG.selectAll('text')
    .style('fill', '#2196F3')
    .style('font-size', '9px')
    .style('font-family', 'system-ui, -apple-system, sans-serif')
    .style('opacity', 0.7)

  yAxisRightG.select('.domain')
    .style('stroke', 'none')

  yAxisRightG.selectAll('.tick line')
    .style('stroke', '#2196F3')
    .style('stroke-opacity', 0.25)

  // ==================== 下方：政策分维度分层阶梯图（线条+轻量填充+节点标记）====================
  const policyKeys = ['policy_border', 'policy_vaccine', 'policy_mask', 'policy_testing', 'policy_lockdown']
  
  const stack = d3.stack()
    .keys(policyKeys)
    (data)

  // 为每层绘制：半透明填充 + 边缘线条 + 变化节点小圆点
  stack.forEach((layer) => {
    const key = layer.key
    const color = POLICY_COLORS[key]

    // 1. 半透明阶梯填充（15% 透明度，避免厚重感）
    const areaGen = d3.area()
      .x((d, i) => xScale(dates[i]))
      .y0(d => yPolicy(d[0]))
      .y1(d => yPolicy(d[1]))
      .curve(d3.curveStepAfter)

    g.append('path')
      .datum(layer)
      .attr('fill', color)
      .attr('fill-opacity', 0.2)
      .attr('d', areaGen)

    // 2. 阶梯边缘线条（清晰勾勒每层边界）
    const lineGen = d3.line()
      .x((d, i) => xScale(dates[i]))
      .y(d => yPolicy(d[1]))
      .curve(d3.curveStepAfter)

    g.append('path')
      .datum(layer)
      .attr('fill', 'none')
      .attr('stroke', color)
      .attr('stroke-width', 1)
      .attr('stroke-opacity', 0.55)
      .attr('d', lineGen)

    // 3. 阶梯变化节点小圆点标记（间距 ≥ 7 天，避免过密）
    let lastDotIdx = -10
    for (let i = 1; i < layer.length; i++) {
      if (layer[i][1] !== layer[i - 1][1] && (i - lastDotIdx) >= 7) {
        g.append('circle')
          .attr('cx', xScale(dates[i]))
          .attr('cy', yPolicy(layer[i][1]))
          .attr('r', 2.5)
          .attr('fill', color)
          .attr('fill-opacity', 0.8)
          .attr('stroke', 'rgba(180,180,180,0.6)')
          .attr('stroke-width', 0.5)
        lastDotIdx = i
      }
    }
  })

  // ==================== 关键政策变化标注（减少用户看图例成本）====================
  const keyEvents = findKeyPolicyEvents(data, 4)
  const policyTop = caseHeight + gap
  keyEvents.forEach((event, idx) => {
    const px = xScale(new Date(event.date))
    const dir = event.change > 0 ? '↑' : '↓'
    const label = POLICY_LABELS[event.policy] + dir
    const labelY = policyTop + 14 + idx * 14

    // 标签背景（半透明深色胶囊）
    const textWidth = label.length * 8 + 10
    g.append('rect')
      .attr('x', px - textWidth / 2).attr('y', labelY - 10)
      .attr('width', textWidth).attr('height', 14)
      .attr('fill', 'rgba(255, 255, 255, 0.85)')
      .attr('rx', 3)
      .attr('stroke', POLICY_COLORS[event.policy])
      .attr('stroke-width', 0.5)
      .attr('stroke-opacity', 0.3)

    // 标签文字
    g.append('text')
      .attr('x', px).attr('y', labelY)
      .attr('text-anchor', 'middle')
      .style('fill', POLICY_COLORS[event.policy])
      .style('font-size', '9px')
      .style('font-weight', '600')
      .style('font-family', 'system-ui, -apple-system, sans-serif')
      .text(label)
  })

  // ==================== X 轴（只保留季度关键节点，拉伸减少刻度）====================
  const xAxis = d3.axisBottom(xScale)
    .ticks(d3.timeMonth.every(4))
    .tickFormat(d3.timeFormat('%Y-%m'))
    .tickSize(4)

  const xAxisG = g.append('g')
    .attr('transform', `translate(0, ${innerHeight})`)
    .call(xAxis)

  xAxisG.selectAll('text')
    .style('fill', '#778899')
    .style('font-size', '10px')
    .style('font-family', 'system-ui, -apple-system, sans-serif')

  xAxisG.select('.domain')
    .style('stroke', '#b0bec5')
    .style('stroke-opacity', 0.4)

  xAxisG.selectAll('.tick line')
    .style('stroke', '#b0bec5')
    .style('stroke-opacity', 0.4)

  // 左侧 Y 轴标签
  g.append('text')
    .attr('transform', 'rotate(-90)')
    .attr('x', -caseHeight / 2)
    .attr('y', -45)
    .attr('text-anchor', 'middle')
    .style('fill', '#ef5350')
    .style('font-size', '10px')
    .style('font-weight', '500')
    .style('font-family', 'system-ui, -apple-system, sans-serif')
    .style('opacity', 0.6)
    .text('日新增病例')

  // 下方政策区 Y 轴标签
  g.append('text')
    .attr('transform', 'rotate(-90)')
    .attr('x', -(caseHeight + gap + policyHeight / 2))
    .attr('y', -45)
    .attr('text-anchor', 'middle')
    .style('fill', '#778899')
    .style('font-size', '10px')
    .style('font-family', 'system-ui, -apple-system, sans-serif')
    .text('分项政策强度')

  // ==================== 拐点标注（半透明暖橙色竖条 + 图标 + 文字）====================
  inflectionPoints.value.forEach(point => {
    const px = xScale(new Date(point.date))

    // 半透明暖橙色竖条（不遮挡数据曲线）
    g.append('rect')
      .attr('class', 'inflection-band')
      .attr('x', px - 28).attr('y', 0)
      .attr('width', 56).attr('height', innerHeight)
      .attr('fill', 'rgba(251, 191, 36, 0.15)')
      .attr('opacity', 1)
      .attr('rx', 3)

    // 竖条中心线
    g.append('line')
      .attr('class', 'inflection-center-line')
      .attr('x1', px).attr('y1', 0)
      .attr('x2', px).attr('y2', innerHeight)
      .attr('stroke', '#c8854a')
      .attr('stroke-width', 0.8)
      .attr('opacity', 0.35)

    // 标签背景（圆角胶囊）
    g.append('rect')
      .attr('class', 'inflection-label')
      .attr('x', px - 62).attr('y', 30)
      .attr('width', 124).attr('height', 20)
      .attr('fill', 'rgba(200, 133, 74, 0.18)')
      .attr('rx', 10)

    // 标签文字
    g.append('text')
      .attr('class', 'inflection-label')
      .attr('x', px).attr('y', 44)
      .attr('text-anchor', 'middle')
      .style('fill', '#d4a06a')
      .style('font-size', '10px')
      .style('font-weight', '600')
      .style('font-family', 'system-ui, -apple-system, sans-serif')
      .text('🎯 最佳干预窗口')
  })

  // ==================== 政策→拐点 连接虚线 ====================
  if (inflectionPoints.value.length > 0 && policyChanges.value.length > 0) {
    const firstChange = policyChanges.value[0]
    const firstInflection = inflectionPoints.value[0]
    const x1 = xScale(new Date(firstChange.date))
    const y1 = yPolicy(firstChange.level)
    const x2 = xScale(new Date(firstInflection.date))
    const y2 = yCases(firstInflection.cases)

    g.append('line')
      .attr('x1', x1).attr('y1', y1)
      .attr('x2', x2).attr('y2', y2)
      .attr('stroke', '#81d4fa')
      .attr('stroke-width', 0.8)
      .attr('stroke-dasharray', '4,4')
      .attr('opacity', 0.4)
  }

  // ==================== 反事实模拟曲线（柔和实线 + 半透明填充）====================
  // 只有当滑块卡片显示时，才渲染模拟曲线（避免在"政策提前/延后X天"出现前就显示曲线）
  if (props.showSlider && counterfactualData.value.length > 0) {
    const simCases = counterfactualData.value.map(d => d.simulated_cases)
    const simDates = counterfactualData.value.map(d => new Date(d.date))

    // 半透明填充区域（曲线下方，10-15% 透明度）
    const simArea = d3.area()
      .x((d, i) => xScale(simDates[i]))
      .y0(caseHeight)
      .y1(d => yCases(d))
      .curve(d3.curveMonotoneX)

    g.append('path')
      .datum(simCases)
      .attr('fill', SIM_COLOR)
      .attr('fill-opacity', 0.12)
      .attr('d', simArea)

    // 模拟曲线（淡粉紫实线，比实际曲线略细）
    const simLine = d3.line()
      .x((d, i) => xScale(simDates[i]))
      .y(d => yCases(d))
      .curve(d3.curveMonotoneX)

    g.append('path')
      .datum(simCases)
      .attr('fill', 'none')
      .attr('stroke', SIM_COLOR)
      .attr('stroke-width', 1.2)
      .attr('stroke-linecap', 'round')
      .attr('stroke-linejoin', 'round')
      .attr('d', simLine)
      .attr('opacity', 0.7)
  }

  // ==================== 当前时间指示器 ====================
  if (store.currentTime) {
    const cx = xScale(new Date(store.currentTime))
    if (cx >= 0 && cx <= innerWidth) {
      g.append('line')
        .attr('class', 'time-indicator')
        .attr('x1', cx).attr('y1', 0)
        .attr('x2', cx).attr('y2', innerHeight)
        .attr('stroke', '#81d4fa')
        .attr('stroke-width', 0.8)
        .attr('opacity', 0.4)
    }
  }

  // ==================== 区块分隔线（简洁虚线）====================
  g.append('line')
    .attr('x1', 0).attr('y1', caseHeight)
    .attr('x2', innerWidth).attr('y2', caseHeight)
    .attr('stroke', '#c0c8d4')
    .attr('stroke-width', 0.5)
    .attr('stroke-dasharray', '4,4')
    .attr('opacity', 0.4)

  // ==================== 国名标签 ====================
  const countryName = data[0]?.location || mainCountry.value
  const chineseName = ISO_TO_CHINESE[mainCountry.value]
  
  g.append('text')
    .attr('x', innerWidth - 10).attr('y', 18)
    .attr('text-anchor', 'end')
    .style('fill', '#81d4fa')
    .style('font-size', '15px')
    .style('font-weight', '700')
    .style('font-family', 'system-ui, -apple-system, sans-serif')
    .text(chineseName || countryName)

  if (chineseName) {
    g.append('text')
      .attr('x', innerWidth - 10).attr('y', 33)
      .attr('text-anchor', 'end')
      .style('fill', '#778899')
      .style('font-size', '10px')
      .style('font-family', 'system-ui, -apple-system, sans-serif')
      .style('font-weight', '400')
      .text(`(${mainCountry.value})`)
  }

  // ==================== 顶部紧凑图例（单行内联）====================
  const legendLineLen = 18
  const legendStartX = 10
  const legendTopY = 16
  const legendGap = 16

  // 图例背景
  g.append('rect')
    .attr('x', legendStartX - 6).attr('y', legendTopY - 10)
    .attr('width', 250).attr('height', 22)
    .attr('fill', 'rgba(255, 255, 255, 0.8)')
    .attr('rx', 4)

  // 病例图例（粗红线）
  g.append('line')
    .attr('x1', legendStartX).attr('y1', legendTopY)
    .attr('x2', legendStartX + legendLineLen).attr('y2', legendTopY)
    .attr('stroke', '#ef5350')
    .attr('stroke-width', 2.5)
    .attr('stroke-linecap', 'round')
  g.append('text')
    .attr('x', legendStartX + legendLineLen + 4).attr('y', legendTopY + 3)
    .style('fill', '#ef5350')
    .style('font-size', '10px')
    .style('font-family', 'system-ui, -apple-system, sans-serif')
    .text('日新增病例')

  // 政策指数图例（细蓝线）
  const legend2X = legendStartX + legendLineLen + 4 + 72 + legendGap
  g.append('line')
    .attr('x1', legend2X).attr('y1', legendTopY)
    .attr('x2', legend2X + legendLineLen).attr('y2', legendTopY)
    .attr('stroke', '#81d4fa')
    .attr('stroke-width', 1.2)
    .attr('stroke-linecap', 'round')
  g.append('text')
    .attr('x', legend2X + legendLineLen + 4).attr('y', legendTopY + 3)
    .style('fill', '#81d4fa')
    .style('font-size', '10px')
    .style('font-family', 'system-ui, -apple-system, sans-serif')
    .text('综合政策指数')

  // ==================== 分项政策图例（底部水平排列）====================
  const legendItems = policyKeys.slice().reverse() // 封锁→检测→口罩→疫苗→边境
  const itemSpacing = 56 // 每个图例项的间距
  const totalLegendWidth = legendItems.length * itemSpacing
  const legendStartXH = (innerWidth - totalLegendWidth) / 2
  const legendBaseY = innerHeight + 28 // X轴标签下方

  legendItems.forEach((key, i) => {
    const ix = legendStartXH + i * itemSpacing
    // 小线条
    g.append('line')
      .attr('x1', ix).attr('y1', legendBaseY)
      .attr('x2', ix + 10).attr('y2', legendBaseY)
      .attr('stroke', POLICY_COLORS[key])
      .attr('stroke-width', 1.5)
      .attr('stroke-opacity', 0.7)
    // 小圆点
    g.append('circle')
      .attr('cx', ix + 5).attr('cy', legendBaseY)
      .attr('r', 2)
      .attr('fill', POLICY_COLORS[key])
      .attr('fill-opacity', 0.8)
    // 文字标签
    g.append('text')
      .attr('x', ix + 14).attr('y', legendBaseY + 3.5)
      .style('fill', '#778899')
      .style('font-size', '9px')
      .style('font-family', 'system-ui, -apple-system, sans-serif')
      .text(POLICY_LABELS[key])
  })

  // ==================== Tooltip 交互层 ====================
  const bisect = d3.bisector(d => new Date(d.date)).left

  // 十字线元素
  const crosshairV = g.append('line')
    .attr('class', 'crosshair')
    .attr('y1', 0).attr('y2', innerHeight)
    .attr('stroke', '#555555')
    .attr('stroke-width', 0.5)
    .attr('stroke-dasharray', '3,3')
    .attr('opacity', 0)

  const crosshairH = g.append('line')
    .attr('class', 'crosshair')
    .attr('x1', 0).attr('x2', innerWidth)
    .attr('stroke', '#555555')
    .attr('stroke-width', 0.5)
    .attr('stroke-dasharray', '3,3')
    .attr('opacity', 0)

  // 病例曲线上的圆点
  const caseDot = g.append('circle')
    .attr('class', 'tooltip-dot')
    .attr('r', 4)
    .attr('fill', '#ef5350')
    .attr('stroke', '#fff')
    .attr('stroke-width', 1.5)
    .attr('opacity', 0)

  // 政策指数线上的圆点
  const policyDot = g.append('circle')
    .attr('class', 'tooltip-dot')
    .attr('r', 4)
    .attr('fill', '#81d4fa')
    .attr('stroke', '#fff')
    .attr('stroke-width', 1.5)
    .attr('opacity', 0)

  // 不可见的覆盖层接收鼠标事件
  g.append('rect')
    .attr('width', innerWidth)
    .attr('height', innerHeight)
    .attr('fill', 'none')
    .attr('pointer-events', 'all')
    .on('mousemove', (event) => {
      const [mx] = d3.pointer(event)
      const x0 = xScale.invert(mx)
      const idx = bisect(data, x0, 1)
      const d = data[Math.min(idx, data.length - 1)]
      if (d) {
        const px = xScale(new Date(d.date))
        const pyCase = yCases(d.new_cases_smoothed)
        const pyPolicy = yPolicyIndex(d.policyIndex)

        // 显示十字线
        crosshairV.attr('x1', px).attr('x2', px).attr('opacity', 0.3)
        crosshairH.attr('y1', pyCase).attr('y2', pyCase).attr('opacity', 0.2)

        // 显示数据点
        caseDot.attr('cx', px).attr('cy', pyCase).attr('opacity', 1)
        policyDot.attr('cx', px).attr('cy', pyPolicy).attr('opacity', 1)

        showTooltip(d, event)
      }
    })
    .on('mouseleave', () => {
      tooltipData.value = null
      crosshairV.attr('opacity', 0)
      crosshairH.attr('opacity', 0)
      caseDot.attr('opacity', 0)
      policyDot.attr('opacity', 0)
    })

  // 窗口大小监听
  window.addEventListener('resize', onResize)
}

/** 显示 tooltip */
function showTooltip(d, event) {
  const rect = chartContainer.value?.getBoundingClientRect()
  if (!rect) return
  
  tooltipData.value = d
  tooltipX.value = event.clientX - rect.left + 15
  tooltipY.value = event.clientY - rect.top - 10

  // 边界检测：避免 tooltip 超出右侧
  const tooltipWidth = 260
  if (tooltipX.value + tooltipWidth > rect.width) {
    tooltipX.value = event.clientX - rect.left - tooltipWidth - 15
  }
}

/** 处理反事实滑块变化 */
function onSliderChange(e) {
  store.setCounterfactualShift(parseInt(e.target.value))
  renderChart()
}

/** 窗口大小变化 */
function onResize() {
  renderChart()
}

// ==================== 监听变化 ====================

watch([mainCountry, () => store.timeRange], () => {
  renderChart()
}, { deep: true })

watch(() => store.counterfactualShift, () => {
  renderChart()
})

watch(() => store.currentTime, () => {
  if (svg) {
    svg.selectAll('.time-indicator').remove()
    renderChart()
  }
})
</script>

<template>
  <div style="position: relative; width: 100%; height: 100%;">
    <div ref="chartContainer" class="chart-container"></div>
    
    <!-- Tooltip -->
    <div v-if="tooltipData" class="chart-tooltip" 
         :style="{ left: tooltipX + 'px', top: tooltipY + 'px' }">
      <div class="tooltip-country">
        <span class="tooltip-country-name">{{ ISO_TO_CHINESE[mainCountry] || mainCountry }}</span>
        <span class="tooltip-country-code">({{ mainCountry }})</span>
      </div>
      <div class="tooltip-date">{{ tooltipData.date }}</div>
      <div class="tooltip-divider"></div>
      <div class="tooltip-section-title">疫情数据</div>
      <div class="tooltip-row">
        <span class="tooltip-label">日新增（7日均）</span>
        <span class="tooltip-value case-value">{{ Math.round(tooltipData.new_cases_smoothed || 0).toLocaleString() }}</span>
      </div>
      <div class="tooltip-row">
        <span class="tooltip-label">累计确诊</span>
        <span class="tooltip-value">{{ Math.round(tooltipData.total_cases || 0).toLocaleString() }}</span>
      </div>
      <div class="tooltip-row">
        <span class="tooltip-label">综合政策指数</span>
        <span class="tooltip-value policy-index-value">{{ tooltipData.policyIndex?.toFixed(0) || 0 }}%</span>
      </div>
      <div class="tooltip-divider"></div>
      <div class="tooltip-section-title">分项政策强度</div>
      <!-- 进度条形式的政策强度展示 -->
      <div class="tooltip-policy-bar-row">
        <span class="tooltip-policy-name"><span class="policy-dot" :style="{ background: '#d4a07a' }"></span>封锁</span>
        <div class="tooltip-progress-track">
          <div class="tooltip-progress-fill" :style="{ width: (tooltipData.policy_lockdown / 3 * 100) + '%', background: '#d4a07a' }"></div>
        </div>
        <span class="tooltip-policy-num">{{ tooltipData.policy_lockdown }}/3</span>
      </div>
      <div class="tooltip-policy-bar-row">
        <span class="tooltip-policy-name"><span class="policy-dot" :style="{ background: '#8fc994' }"></span>检测</span>
        <div class="tooltip-progress-track">
          <div class="tooltip-progress-fill" :style="{ width: (tooltipData.policy_testing / 3 * 100) + '%', background: '#8fc994' }"></div>
        </div>
        <span class="tooltip-policy-num">{{ tooltipData.policy_testing }}/3</span>
      </div>
      <div class="tooltip-policy-bar-row">
        <span class="tooltip-policy-name"><span class="policy-dot" :style="{ background: '#7ab3d9' }"></span>口罩</span>
        <div class="tooltip-progress-track">
          <div class="tooltip-progress-fill" :style="{ width: (tooltipData.policy_mask / 3 * 100) + '%', background: '#7ab3d9' }"></div>
        </div>
        <span class="tooltip-policy-num">{{ tooltipData.policy_mask }}/3</span>
      </div>
      <div class="tooltip-policy-bar-row">
        <span class="tooltip-policy-name"><span class="policy-dot" :style="{ background: '#c4a0d4' }"></span>疫苗</span>
        <div class="tooltip-progress-track">
          <div class="tooltip-progress-fill" :style="{ width: (tooltipData.policy_vaccine / 3 * 100) + '%', background: '#c4a0d4' }"></div>
        </div>
        <span class="tooltip-policy-num">{{ tooltipData.policy_vaccine }}/3</span>
      </div>
      <div class="tooltip-policy-bar-row">
        <span class="tooltip-policy-name"><span class="policy-dot" :style="{ background: '#8b9bab' }"></span>边境</span>
        <div class="tooltip-progress-track">
          <div class="tooltip-progress-fill" :style="{ width: (tooltipData.policy_border / 3 * 100) + '%', background: '#8b9bab' }"></div>
        </div>
        <span class="tooltip-policy-num">{{ tooltipData.policy_border }}/3</span>
      </div>
    </div>

    <!-- 反事实推演滑块 -->
    <div v-if="showSlider" class="counterfactual-slider">
      <div class="slider-header">
        <span class="slider-title">如果政策提前/延后 X 天</span>
        <span class="slider-shift-value">
          {{ store.counterfactualShift > 0 ? '+' : '' }}{{ store.counterfactualShift }} 天
          <span v-if="store.counterfactualShift < 0" class="shift-tag shift-early">提前干预</span>
          <span v-else-if="store.counterfactualShift > 0" class="shift-tag shift-late">延后干预</span>
          <span v-else class="shift-tag shift-actual">实际值</span>
        </span>
      </div>
      <input type="range" :value="store.counterfactualShift"
             @input="onSliderChange"
             min="-30" max="30" step="1" />
      <div class="slider-legend">
        <span class="slider-legend-item">
          <span class="slider-legend-line" style="border-top: 2.5px solid #ef5350;"></span> 实际曲线
        </span>
        <span class="slider-legend-item">
          <span class="slider-legend-line slider-legend-sim"></span> 模拟曲线
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.chart-container {
  background: var(--color-bg, #1a1a2e);
}

/* ==================== Tooltip 样式 ==================== */
.chart-tooltip {
  position: absolute;
  pointer-events: none;
  background: rgba(30, 30, 50, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 10px;
  padding: 12px 14px;
  font-size: 0.8rem;
  color: #e0e0e0;
  z-index: 100;
  backdrop-filter: blur(10px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
  min-width: 240px;
  transition: opacity 0.12s ease;
  font-family: system-ui, -apple-system, sans-serif;
}

.chart-tooltip .tooltip-country {
  display: flex;
  align-items: baseline;
  gap: 6px;
  margin-bottom: 2px;
}

.chart-tooltip .tooltip-country-name {
  font-size: 1rem;
  font-weight: 700;
  color: #e94560;
}

.chart-tooltip .tooltip-country-code {
  font-size: 0.7rem;
  color: #999;
  font-family: 'Consolas', 'Monaco', monospace;
}

.chart-tooltip .tooltip-date {
  font-size: 0.7rem;
  color: #999;
  margin-bottom: 6px;
}

.chart-tooltip .tooltip-divider {
  height: 1px;
  background: rgba(233, 69, 96, 0.15);
  margin: 8px 0;
}

.chart-tooltip .tooltip-section-title {
  font-size: 0.7rem;
  font-weight: 600;
  color: #b0bec5;
  letter-spacing: 0.3px;
  margin-bottom: 5px;
}

.chart-tooltip .tooltip-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 2px 0;
  gap: 12px;
}

.chart-tooltip .tooltip-label {
  color: #b0bec5;
  font-size: 0.75rem;
  display: flex;
  align-items: center;
  gap: 5px;
}

.chart-tooltip .tooltip-value {
  font-weight: 600;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 0.85rem;
  color: #e0e0e0;
}

.chart-tooltip .case-value {
  color: #ef5350;
}

.chart-tooltip .policy-index-value {
  color: #e94560;
}

/* 进度条形式的政策强度 */
.tooltip-policy-bar-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 2.5px 0;
}

.tooltip-policy-name {
  font-size: 0.72rem;
  color: #8899aa;
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 42px;
  flex-shrink: 0;
}

.tooltip-policy-name .policy-dot {
  width: 7px;
  height: 7px;
  border-radius: 2px;
  flex-shrink: 0;
  display: inline-block;
}

.tooltip-progress-track {
  flex: 1;
  height: 5px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  overflow: hidden;
}

.tooltip-progress-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.15s ease;
}

.tooltip-policy-num {
  font-size: 0.68rem;
  font-family: 'Consolas', 'Monaco', monospace;
  color: #b0bec5;
  min-width: 24px;
  text-align: right;
  flex-shrink: 0;
}

/* ==================== 反事实推演滑块样式 ==================== */
.counterfactual-slider {
  position: absolute;
  bottom: 50px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(30, 30, 50, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  border-radius: 10px;
  padding: 14px 20px;
  z-index: 50;
  min-width: 320px;
  font-family: system-ui, -apple-system, sans-serif;
}

.slider-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 8px;
}

.slider-title {
  color: #8899aa;
  font-size: 0.8rem;
  font-weight: 500;
}

.slider-shift-value {
  color: #e0e0e0;
  font-size: 0.9rem;
  font-weight: 700;
  font-family: 'Consolas', 'Monaco', monospace;
}

.shift-tag {
  font-size: 0.65rem;
  font-weight: 500;
  font-family: system-ui, -apple-system, sans-serif;
  margin-left: 4px;
  padding: 1px 5px;
  border-radius: 3px;
}

.shift-tag.shift-early {
  color: #66bb6a;
  background: rgba(76, 175, 80, 0.15);
}

.shift-tag.shift-late {
  color: #ef5350;
  background: rgba(239, 83, 80, 0.15);
}

.shift-tag.shift-actual {
  color: #b0bec5;
  background: rgba(176, 190, 197, 0.1);
}

.counterfactual-slider input[type="range"] {
  width: 100%;
  accent-color: #e94560;
  margin: 4px 0;
}

.slider-legend {
  display: flex;
  gap: 16px;
  margin-top: 6px;
}

.slider-legend-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.7rem;
  color: #b0bec5;
}

.slider-legend-line {
  display: inline-block;
  width: 16px;
  height: 0;
}

/* 模拟曲线图例：淡粉紫实线 */
.slider-legend-sim {
  border-top: 1.5px solid #c9a0dc !important;
  opacity: 0.7;
}
</style>
