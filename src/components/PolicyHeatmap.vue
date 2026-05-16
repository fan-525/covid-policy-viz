<template>
  <div class="policy-heatmap">
    <div class="heatmap-header">
      <div>
        <h3>政策组合热力矩阵</h3>
        <p>横纵轴为 5 个政策维度，颜色越深表示当前指标下组合表现越优。点击单元格可高亮采取该组合的国家。</p>
      </div>
      <div class="metric-switch">
        <button
          v-for="option in metricOptions"
          :key="option.key"
          :class="{ active: currentMetric === option.key }"
          @click="setMetric(option.key)"
        >
          {{ option.label }}
        </button>
      </div>
    </div>

    <div class="heatmap-board" ref="chartRef">
      <div v-if="!hasData" class="heatmap-empty">正在加载政策与疫情数据...</div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import * as d3 from 'd3'
import { useGlobalStore } from '@/stores/global'

const store = useGlobalStore()
const chartRef = ref(null)
const tooltip = ref(null)

const policies = [
  { key: 'policy_lockdown', label: '封锁' },
  { key: 'policy_testing', label: '检测' },
  { key: 'policy_mask', label: '口罩' },
  { key: 'policy_vaccine', label: '疫苗' },
  { key: 'policy_border', label: '边境' }
]

const metricOptions = [
  { key: 'case', label: '确诊下降率' },
  { key: 'death', label: '死亡率下降率' },
  { key: 'comprehensive', label: '综合评分' }
]

// 各国人口数据（单位：人）
const COUNTRY_POPULATION = {
  'AFG': 38928000, 'ALB': 2878000, 'DZA': 43851000, 'AGO': 32866000,
  'ARG': 45196000, 'AUS': 25788000, 'AUT': 9006400, 'BGD': 164689000,
  'BEL': 11590000, 'BOL': 11673000, 'BIH': 3281000, 'BWA': 2352000,
  'BRA': 213993000, 'BGR': 6948000, 'KHM': 16719000, 'CMR': 26546000,
  'CAN': 38225000, 'CHL': 19116000, 'CHN': 1412000000, 'COL': 50883000,
  'COD': 89561000, 'COG': 5518000, 'CRI': 5094000, 'HRV': 4105000,
  'CUB': 11327000, 'CYP': 1207000, 'CZE': 10709000, 'DNK': 5831000,
  'DOM': 10848000, 'ECU': 17643000, 'EGY': 102334000, 'ETH': 114964000,
  'FIN': 5541000, 'FRA': 67390000, 'DEU': 83280000, 'GHA': 31073000,
  'GRC': 10716000, 'GTM': 17916000, 'HND': 9905000, 'HUN': 9660000,
  'IND': 1380000000, 'IDN': 273524000, 'IRN': 83993000, 'IRQ': 40223000,
  'IRL': 4937800, 'ISR': 8655000, 'ITA': 60263000, 'JPN': 125800000,
  'JOR': 10203000, 'KAZ': 18777000, 'KEN': 53771000, 'KOR': 51781000,
  'KWT': 4271000, 'LBN': 6825000, 'LBY': 6871000, 'MYS': 32366000,
  'MEX': 128933000, 'MNG': 3278000, 'MAR': 36911000, 'MMR': 54410000,
  'NPL': 29137000, 'NLD': 17434000, 'NZL': 4822000, 'NGA': 206140000,
  'NOR': 5379000, 'PAK': 220892000, 'PER': 32972000, 'PHL': 109581000,
  'POL': 37847000, 'PRT': 10197000, 'QAT': 2881000, 'ROU': 19238000,
  'RUS': 145934000, 'SAU': 34814000, 'SEN': 16744000, 'SRB': 8737000,
  'SGP': 5850000, 'SVK': 5460000, 'VNM': 97339000, 'SVN': 2079000,
  'ZAF': 59309000, 'ESP': 47350000, 'SDN': 43849000, 'SWE': 10099000,
  'CHE': 8655000, 'SYR': 17501000, 'THA': 69780000, 'TUN': 11819000,
  'TUR': 84339000, 'UKR': 43734000, 'ARE': 9890000, 'GBR': 67220000,
  'USA': 331000000, 'URY': 3474000, 'VEN': 28436000, 'YEM': 29826000,
  'ZMB': 18384000, 'ZWE': 14863000, 'ISL': 341000, 'EST': 1326000,
  'LVA': 1886000, 'LTU': 2722000, 'LUX': 626000, 'MLT': 442000,
  'PRK': 25779000, 'TWN': 23570000, 'NIC': 6625000, 'NER': 24207000,
  'OMN': 5107000, 'PAN': 4315000, 'PNG': 8947000, 'PRY': 7133000,
  'RWA': 12952000, 'SLV': 6486000, 'SOM': 15893000, 'SSD': 11194000,
  'SUR': 587000, 'SWZ': 1160000, 'TCD': 16426000, 'TGO': 8279000,
  'TJK': 9538000, 'TKM': 6031000, 'TLS': 1318000, 'TON': 1057000,
  'TTO': 1399000, 'UGA': 45741000, 'UZB': 33469000, 'VCT': 110000,
  'YEM': 29826000, 'ZMB': 18384000, 'ZWE': 14863000
}

const ISO_TO_CHINESE = {
  'ABW': '阿鲁巴', 'AFG': '阿富汗', 'AGO': '安哥拉', 'ALB': '阿尔巴尼亚', 'AND': '安道尔',
  'ARE': '阿联酋', 'ARG': '阿根廷', 'AUS': '澳大利亚', 'AUT': '奥地利', 'AZE': '阿塞拜疆',
  'BDI': '布隆迪', 'BEL': '比利时', 'BEN': '贝宁', 'BFA': '布基纳法索', 'BGD': '孟加拉国',
  'BGR': '保加利亚', 'BHR': '巴林', 'BHS': '巴哈马', 'BIH': '波黑', 'BLR': '白俄罗斯',
  'BLZ': '伯利兹', 'BMU': '百慕大', 'BOL': '玻利维亚', 'BRB': '巴巴多斯', 'BRN': '文莱',
  'BTN': '不丹', 'BWA': '博茨瓦纳', 'CAF': '中非', 'CAN': '加拿大', 'CHE': '瑞士',
  'CHL': '智利', 'CHN': '中国', 'CIV': '科特迪瓦', 'CMR': '喀麦隆', 'COD': '刚果（金）',
  'COG': '刚果（布）', 'COL': '哥伦比亚', 'CRI': '哥斯达黎加', 'CUB': '古巴', 'CYP': '塞浦路斯',
  'CZE': '捷克', 'DEU': '德国', 'DJI': '吉布提', 'DNK': '丹麦', 'DOM': '多米尼加',
  'DZA': '阿尔及利亚', 'ECU': '厄瓜多尔', 'EGY': '埃及', 'ESP': '西班牙', 'EST': '爱沙尼亚',
  'ETH': '埃塞俄比亚', 'FIN': '芬兰', 'FJI': '斐济', 'FRA': '法国', 'GAB': '加蓬',
  'GBR': '英国', 'GEO': '格鲁吉亚', 'GHA': '加纳', 'GIN': '几内亚', 'GMB': '冈比亚',
  'GNB': '几内亚比绍', 'GNQ': '赤道几内亚', 'GRC': '希腊', 'GTM': '危地马拉', 'GUY': '圭亚那',
  'HKG': '香港', 'HND': '洪都拉斯', 'HRV': '克罗地亚', 'HTI': '海地', 'HUN': '匈牙利',
  'IDN': '印度尼西亚', 'IND': '印度', 'IRL': '爱尔兰', 'IRN': '伊朗', 'IRQ': '伊拉克',
  'ISL': '冰岛', 'ISR': '以色列', 'ITA': '意大利', 'JAM': '牙买加', 'JOR': '约旦',
  'JPN': '日本', 'KAZ': '哈萨克斯坦', 'KEN': '肯尼亚', 'KGZ': '吉尔吉斯斯坦', 'KHM': '柬埔寨',
  'KOR': '韩国', 'KWT': '科威特', 'LAO': '老挝', 'LBN': '黎巴嫩', 'LBR': '利比里亚',
  'LBY': '利比亚', 'LCA': '圣卢西亚', 'LIE': '列支敦士登', 'LKA': '斯里兰卡', 'LSO': '莱索托',
  'LTU': '立陶宛', 'LUX': '卢森堡', 'LVA': '拉脱维亚', 'MAC': '澳门', 'MAR': '摩洛哥',
  'MDA': '摩尔多瓦', 'MDG': '马达加斯加', 'MEX': '墨西哥', 'MKD': '北马其顿', 'MLI': '马里',
  'MLT': '马耳他', 'MMR': '缅甸', 'MNE': '黑山', 'MNG': '蒙古', 'MOZ': '莫桑比克',
  'MRT': '毛里塔尼亚', 'MUS': '毛里求斯', 'MWI': '马拉维', 'MYS': '马来西亚', 'NAM': '纳米比亚',
  'NER': '尼日尔', 'NGA': '尼日利亚', 'NIC': '尼加拉瓜', 'NLD': '荷兰', 'NOR': '挪威',
  'NPL': '尼泊尔', 'NZL': '新西兰', 'OMN': '阿曼', 'PAK': '巴基斯坦', 'PAN': '巴拿马',
  'PER': '秘鲁', 'PHL': '菲律宾', 'PNG': '巴布亚新几内亚', 'POL': '波兰', 'PRT': '葡萄牙',
  'PRY': '巴拉圭', 'QAT': '卡塔尔', 'ROU': '罗马尼亚', 'RUS': '俄罗斯', 'RWA': '卢旺达',
  'SAU': '沙特阿拉伯', 'SDN': '苏丹', 'SEN': '塞内加尔', 'SGP': '新加坡', 'SLB': '所罗门群岛',
  'SLE': '塞拉利昂', 'SLV': '萨尔瓦多', 'SMR': '圣马力诺', 'SOM': '索马里', 'SRB': '塞尔维亚',
  'SSD': '南苏丹', 'STP': '圣多美和普林西比', 'SUR': '苏里南', 'SVK': '斯洛伐克', 'SVN': '斯洛文尼亚',
  'SWE': '瑞典', 'SWZ': '斯威士兰', 'SYR': '叙利亚', 'TCD': '乍得', 'TGO': '多哥',
  'THA': '泰国', 'TJK': '塔吉克斯坦', 'TKM': '土库曼斯坦', 'TLS': '东帝汶', 'TON': '汤加',
  'TTO': '特立尼达和多巴哥', 'TUN': '突尼斯', 'TUR': '土耳其', 'TWN': '台湾', 'TZA': '坦桑尼亚',
  'UGA': '乌干达', 'UKR': '乌克兰', 'URY': '乌拉圭', 'USA': '美国', 'UZB': '乌兹别克斯坦',
  'VEN': '委内瑞拉', 'VNM': '越南', 'VUT': '瓦努阿图', 'WSM': '萨摩亚', 'YEM': '也门',
  'ZAF': '南非', 'ZMB': '赞比亚', 'ZWE': '津巴布韦'
}

function getCountryName(iso) {
  return ISO_TO_CHINESE[iso] || iso
}

const currentMetric = computed(() => store.currentPolicyMetric || 'comprehensive')
const hasData = computed(() => !!store.covidData)

function clampPolicy(value) {
  const n = Number(value)
  if (Number.isNaN(n)) return 0
  return Math.max(0, Math.min(3, n))
}

/**
 * 计算疫苗政策采用判断
 * 使用 2020-01-05 至 2023-02-28 整个时间范围的数据
 * 接种率平均值 ≥ 75% 才认为采用了疫苗政策
 */
function isVaccinePolicyAdopted(iso, series) {
  const population = COUNTRY_POPULATION[iso]
  if (!population || population === 0) {
    return false
  }
  
  // 收集所有有效数据的接种率
  let vaccinationRates = []
  
  for (const d of series) {
    let value = d.policy_vaccine_raw || 0
    if (value <= 0) continue
    
    let rate = 0
    if (value > 3) {
      // 接种次数：计算接种率 = 接种次数 / 人口 × 100%
      rate = (value / population) * 100
    } else {
      // 政策强度：估算接种率 = (政策强度 / 3) × 100%
      rate = (value / 3) * 100
    }
    
    // 限制在 0-100 范围内
    rate = Math.min(100, Math.max(0, rate))
    vaccinationRates.push(rate)
  }
  
  if (vaccinationRates.length === 0) {
    return false
  }
  
  // 计算平均接种率
  const avgRate = vaccinationRates.reduce((sum, r) => sum + r, 0) / vaccinationRates.length
  
  // 平均接种率 ≥ 75% 才认为采用了疫苗政策
  return avgRate >= 75
}

/**
 * 获取政策的平均强度（非疫苗维度使用原始政策值）
 */
function getPolicyAverage(series, policyKey, iso) {
  if (policyKey === 'policy_vaccine') {
    // 疫苗政策：返回 2 如果采用，否则 0
    return isVaccinePolicyAdopted(iso, series) ? 2 : 0
  }
  // 其他政策维度：计算平均值
  return d3.mean(series, d => clampPolicy(d[policyKey])) || 0
}

function metricKey(metric) {
  return metric === 'case' ? 'caseDrop'
    : metric === 'death' ? 'deathDrop'
    : 'comprehensive'
}

function createTooltip() {
  if (tooltip.value) return tooltip.value
  tooltip.value = d3.select('body')
    .append('div')
    .attr('class', 'policy-heatmap-tooltip')
    .style('position', 'absolute')
    .style('pointer-events', 'none')
    .style('padding', '10px 12px')
    .style('background', 'rgba(30, 30, 50, 0.95)')
    .style('color', '#e0e0e0')
    .style('border-radius', '8px')
    .style('border', '1px solid rgba(255,255,255,0.12)')
    .style('font-size', '12px')
    .style('line-height', '1.5')
    .style('max-width', '260px')
    .style('z-index', '10000')
    .style('box-shadow', '0 4px 20px rgba(0,0,0,0.4)')
    .style('backdrop-filter', 'blur(8px)')
    .style('display', 'none')
  return tooltip.value
}

const countryStats = computed(() => {
  if (!store.covidData) return []
  return Object.entries(store.covidData)
    .map(([iso, series]) => {
      // 重要：不要对 policy_vaccine 使用 clampPolicy，保留原始值
      const rows = series.map(d => ({
        date: d.date,
        location: d.location || iso,
        new_cases_smoothed: Number(d.new_cases_smoothed) || 0,
        new_deaths: Number(d.new_deaths) || 0,
        policy_lockdown: clampPolicy(d.policy_lockdown),
        policy_testing: clampPolicy(d.policy_testing),
        policy_mask: clampPolicy(d.policy_mask),
        policy_vaccine_raw: d.policy_vaccine || 0,  // 保留原始值
        policy_vaccine: clampPolicy(d.policy_vaccine),  // 仅用于显示
        policy_border: clampPolicy(d.policy_border)
      }))
      if (!rows.length) return null
      
      const tailSize = Math.min(30, rows.length)
      const peakCases = d3.max(rows, d => d.new_cases_smoothed) || 0
      const peakDeaths = d3.max(rows, d => d.new_deaths) || 0
      const tailRows = rows.slice(-tailSize)
      const tailCases = d3.mean(tailRows, d => d.new_cases_smoothed) || 0
      const tailDeaths = d3.mean(tailRows, d => d.new_deaths) || 0
      const caseDrop = peakCases > 1 ? Math.max(0, (peakCases - tailCases) / peakCases) : 0
      const deathDrop = peakDeaths > 1 ? Math.max(0, (peakDeaths - tailDeaths) / peakDeaths) : 0
      
      return {
        iso,
        location: rows[0].location || iso,
        caseDrop,
        deathDrop,
        comprehensive: (caseDrop + deathDrop) / 2,
        // 传入原始数据用于疫苗政策判断
        rawSeries: rows,
        avgPolicy: {
          policy_lockdown: d3.mean(rows, d => d.policy_lockdown) || 0,
          policy_testing: d3.mean(rows, d => d.policy_testing) || 0,
          policy_mask: d3.mean(rows, d => d.policy_mask) || 0,
          policy_vaccine: getPolicyAverage(rows, 'policy_vaccine', iso),
          policy_border: d3.mean(rows, d => d.policy_border) || 0
        }
      }
    })
    .filter(Boolean)
})

const heatmapCells = computed(() => {
  const stats = countryStats.value
  if (!stats.length) return []
  const metricName = metricKey(currentMetric.value)
  const threshold = 1.4  // 政策强度阈值（疫苗为2或0，其他维度平均值）

  const getPolicyValue = (item, key) => {
    // 统一使用 avgPolicy
    return item.avgPolicy[key]
  }

  return policies.flatMap(rowPolicy =>
    policies.map(colPolicy => {
      const adopters = stats.filter(s =>
        getPolicyValue(s, rowPolicy.key) >= threshold &&
        getPolicyValue(s, colPolicy.key) >= threshold
      )
      const metricAverage = d3.mean(adopters, s => s[metricName]) || 0
      
      const fallback = [...stats].sort((a, b) =>
        (b[metricName] * ((getPolicyValue(b, rowPolicy.key) + getPolicyValue(b, colPolicy.key)) / 6 || 0.01)) -
        (a[metricName] * ((getPolicyValue(a, rowPolicy.key) + getPolicyValue(a, colPolicy.key)) / 6 || 0.01))
      ).slice(0, 10)
      
      const topCountries = (adopters.length ? adopters.slice(0, 10) : fallback).map(d => d.iso)
      const allCountries = adopters.map(d => d.iso)
      
      return {
        row: rowPolicy.key,
        col: colPolicy.key,
        rowLabel: rowPolicy.label,
        colLabel: colPolicy.label,
        value: metricAverage,
        count: adopters.length,
        countries: topCountries,
        allCountries: allCountries,
        avgCase: d3.mean(adopters, s => s.caseDrop) || 0,
        avgDeath: d3.mean(adopters, s => s.deathDrop) || 0,
        avgScore: metricAverage
      }
    })
  )
})

const colorScale = computed(() => {
  const values = heatmapCells.value.map(d => d.value)
  if (!values.length) return () => '#1a2a3a'
  // 深色主题友好的绿色梯度：从暗绿到亮绿
  return d3.scaleQuantile()
    .domain(values)
    .range(['#0d3320', '#1a5c35', '#28a745', '#4caf50', '#69f0ae'])
})

function formatPercent(value) {
  return `${(value * 100).toFixed(1)}%`
}

function buildTooltipContent(cell) {
  const metricName = currentMetric.value
  const scoreLabel = metricName === 'case'
    ? '平均确诊下降率'
    : metricName === 'death'
      ? '平均死亡下降率'
      : '平均综合评分'
  const formattedValue = metricName === 'comprehensive'
    ? `${(cell.avgScore * 100).toFixed(1)}%`
    : formatPercent(cell.avgScore)
  const countryText = cell.countries.slice(0, 5).map(getCountryName).join(', ') || '暂无'
  return `
    <div><strong>${cell.rowLabel} + ${cell.colLabel}</strong></div>
    <div>采用该组合的国家数：${cell.count}</div>
    <div>${scoreLabel}：${formattedValue}</div>
    <div>推荐高亮国家：${countryText}${cell.countries.length < cell.count ? ' 等' : ''}</div>
  `
}

function showTooltip(cell, event) {
  const tip = createTooltip()
  tip.html(buildTooltipContent(cell))
    .style('left', `${event.pageX + 12}px`)
    .style('top', `${event.pageY + 12}px`)
    .style('display', 'block')
}

function hideTooltip() {
  if (tooltip.value) {
    tooltip.value.style('display', 'none')
  }
}

function selectCell(cell) {
  console.log('[PolicyHeatmap] 点击单元格，高亮国家:', cell.allCountries)
  store.setMapHighlightCountries(cell.allCountries)
}

function clearHighlight() {
  store.clearMapHighlightCountries()
}

watch(currentMetric, () => {
  clearHighlight()
})

function renderHeatmap() {
  if (!chartRef.value) return
  d3.select(chartRef.value).selectAll('svg').remove()
  if (!heatmapCells.value.length) return

  const container = chartRef.value
  const parentHeight = container.parentElement?.clientHeight || window.innerHeight
  const width = Math.max(container.clientWidth, 400)
  // 自适应高度：充分利用父容器高度，让热力矩阵更方正
  const maxSvgHeight = Math.min(700, parentHeight - 60)
  const height = Math.max(440, maxSvgHeight)
  const margin = { top: 56, right: 16, bottom: 30, left: 72 }
  // gridSize 取宽高限制中的较小值，保证正方形单元格
  const gridSize = Math.min((width - margin.left - margin.right) / 5, (height - margin.top - margin.bottom) / 5)

  const svg = d3.select(container)
    .append('svg')
    .attr('width', width)
    .attr('height', height)

  const chart = svg.append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`)

  const xScale = d3.scaleBand()
    .domain(policies.map(d => d.key))
    .range([0, gridSize * 5])
    .padding(0.08)

  const yScale = d3.scaleBand()
    .domain(policies.map(d => d.key))
    .range([0, gridSize * 5])
    .padding(0.08)

  chart.selectAll('rect')
    .data(heatmapCells.value)
    .join('rect')
    .attr('x', d => xScale(d.col))
    .attr('y', d => yScale(d.row))
    .attr('width', xScale.bandwidth())
    .attr('height', yScale.bandwidth())
    .attr('rx', 6)
    .attr('fill', d => colorScale.value(d.value))
    .attr('stroke', 'rgba(255,255,255,0.08)')
    .attr('stroke-width', 1)
    .style('cursor', 'pointer')
    .on('mouseenter', function(event, d) {
      d3.select(this)
        .attr('stroke', '#69f0ae')
        .attr('stroke-width', 2)
        .attr('filter', 'drop-shadow(0 0 6px rgba(105,240,174,0.4))')
      showTooltip(d, event)
    })
    .on('mousemove', function(event, d) {
      showTooltip(d, event)
    })
    .on('mouseleave', function() {
      d3.select(this)
        .attr('stroke', 'rgba(255,255,255,0.08)')
        .attr('stroke-width', 1)
        .attr('filter', 'none')
      hideTooltip()
    })
    .on('click', function(_, d) {
      selectCell(d)
    })

  chart.selectAll('.x-label')
    .data(policies)
    .join('text')
    .attr('class', 'x-label')
    .attr('x', d => xScale(d.key) + xScale.bandwidth() / 2)
    .attr('y', -16)
    .attr('text-anchor', 'middle')
    .attr('font-size', 11)
    .attr('fill', '#a0aec0')
    .text(d => d.label)

  chart.selectAll('.y-label')
    .data(policies)
    .join('text')
    .attr('class', 'y-label')
    .attr('x', -10)
    .attr('y', d => yScale(d.key) + yScale.bandwidth() / 2)
    .attr('text-anchor', 'end')
    .attr('dominant-baseline', 'middle')
    .attr('font-size', 11)
    .attr('fill', '#a0aec0')
    .text(d => d.label)

  chart.append('text')
    .attr('x', xScale.bandwidth() * 2.5)
    .attr('y', gridSize * 5 + 24)
    .attr('text-anchor', 'middle')
    .attr('fill', '#7a8a9a')
    .attr('font-size', 11)
    .text('政策维度组合')
}

function setMetric(metric) {
  store.setCurrentPolicyMetric(metric)
}

onMounted(() => {
  nextTick(() => renderHeatmap())
  window.addEventListener('resize', renderHeatmap)
})

onUnmounted(() => {
  window.removeEventListener('resize', renderHeatmap)
  if (tooltip.value) {
    tooltip.value.remove()
    tooltip.value = null
  }
})

watch([hasData, countryStats, currentMetric], () => {
  nextTick(() => renderHeatmap())
}, { deep: true })
</script>

<style scoped>
.policy-heatmap {
  width: 100%;
  padding: 1.2rem 1.5rem 1.2rem 4rem;
  background: transparent;
  border-radius: 0;
  box-shadow: none;
}

.heatmap-header {
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 14px;
  align-items: flex-start;
  margin-bottom: 10px;
}

.heatmap-header h3 {
  margin: 0 0 4px;
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--color-text-heading, #e0e0e0);
  letter-spacing: -0.3px;
}

.heatmap-header p {
  margin: 0;
  color: var(--color-text, #b0bec5);
  opacity: 0.7;
  font-size: 0.78rem;
  max-width: 480px;
  line-height: 1.5;
}

.metric-switch {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.metric-switch button {
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(30, 42, 69, 0.6);
  color: var(--color-text, #b0bec5);
  padding: 6px 12px;
  border-radius: 999px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.78rem;
  backdrop-filter: blur(4px);
}

.metric-switch button.active {
  background: linear-gradient(135deg, #e94560, #ff6b8a);
  color: #fff;
  border-color: transparent;
  box-shadow: 0 2px 10px rgba(233, 69, 96, 0.35);
}

.metric-switch button:hover:not(.active) {
  border-color: rgba(255, 255, 255, 0.25);
  background: rgba(30, 42, 69, 0.85);
}

.heatmap-board {
  position: relative;
  min-height: 320px;
}

.heatmap-empty {
  min-height: 280px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text, #b0bec5);
  opacity: 0.5;
  font-size: 14px;
}

.policy-heatmap-tooltip {
  pointer-events: none;
}
</style>
