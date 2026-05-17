<template>
  <div ref="mapContainer" class="chart-container" :class="{ 'map-interactive': props.interactive }"
       @mousemove="handleMouseMove"
       @mouseleave="handleMouseLeave">
    <div v-if="isLoading" class="loading-overlay">
      <div class="loading-spinner"></div>
      <span>加载地图数据...</span>
    </div>

    <div v-if="tooltipData" class="map-tooltip"
         :style="{ left: tooltipX + 'px', top: tooltipY + 'px' }">
      <div class="tooltip-country-name">{{ tooltipData.chineseName }}</div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useGlobalStore } from '@/stores/global'
import * as d3 from 'd3'
import * as topojson from 'topojson-client'

const props = defineProps({
  interactive: { type: Boolean, default: false }
})

const emit = defineEmits(['map-activated'])

const store = useGlobalStore()
const mapContainer = ref(null)
const isLoading = ref(true)
const isMapReady = ref(false)

// 地图交互模式标记（mutable，供 zoom.filter 实时读取）
let mapInteractive = false

const tooltipData = ref(null)
const tooltipX = ref(0)
const tooltipY = ref(0)

// D3 实例
let svg = null
let zoom = null
let g = null
let pulseGroup = null
let projection = null
let pathGenerator = null
let width = 0
let height = 0
let animFrameId = null
let centroidsCache = {}

// 缓存计算结果
let vaccineRateCache = new Map()

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

const NUMERIC_TO_ISO = {
  '004': 'AFG', '008': 'ALB', '012': 'DZA', '024': 'AGO', '032': 'ARG',
  '036': 'AUS', '040': 'AUT', '050': 'BGD', '056': 'BEL', '064': 'BTN',
  '068': 'BOL', '070': 'BIH', '072': 'BWA', '076': 'BRA', '084': 'BLZ',
  '090': 'SLB', '096': 'BRN', '100': 'BGR', '104': 'MMR', '108': 'BDI',
  '112': 'BLR', '116': 'KHM', '120': 'CMR', '124': 'CAN', '140': 'CAF',
  '144': 'LKA', '148': 'TCD', '152': 'CHL', '156': 'CHN', '170': 'COL',
  '174': 'COM', '178': 'COG', '180': 'COD', '188': 'CRI', '191': 'HRV',
  '192': 'CUB', '196': 'CYP', '203': 'CZE', '204': 'BEN', '208': 'DNK',
  '214': 'DOM', '218': 'ECU', '222': 'SLV', '226': 'GNQ', '231': 'ETH',
  '232': 'ERI', '233': 'EST', '246': 'FIN', '250': 'FRA', '262': 'DJI',
  '266': 'GAB', '268': 'GEO', '270': 'GMB', '275': 'PSE', '276': 'DEU',
  '288': 'GHA', '300': 'GRC', '308': 'GRD', '320': 'GTM', '324': 'GIN',
  '328': 'GUY', '332': 'HTI', '340': 'HND', '348': 'HUN', '352': 'ISL',
  '356': 'IND', '360': 'IDN', '364': 'IRN', '368': 'IRQ', '372': 'IRL',
  '376': 'ISR', '380': 'ITA', '384': 'CIV', '388': 'JAM', '392': 'JPN',
  '398': 'KAZ', '400': 'JOR', '404': 'KEN', '408': 'PRK', '410': 'KOR',
  '414': 'KWT', '417': 'KGZ', '418': 'LAO', '422': 'LBN', '426': 'LSO',
  '428': 'LVA', '430': 'LBR', '434': 'LBY', '440': 'LTU', '442': 'LUX',
  '450': 'MDG', '454': 'MWI', '458': 'MYS', '462': 'MDV', '466': 'MLI',
  '470': 'MLT', '478': 'MRT', '480': 'MUS', '484': 'MEX', '496': 'MNG',
  '498': 'MDA', '499': 'MNE', '504': 'MAR', '508': 'MOZ', '512': 'OMN',
  '516': 'NAM', '524': 'NPL', '528': 'NLD', '540': 'NCL', '548': 'VUT',
  '554': 'NZL', '558': 'NIC', '562': 'NER', '566': 'NGA', '578': 'NOR',
  '586': 'PAK', '591': 'PAN', '598': 'PNG', '600': 'PRY', '604': 'PER',
  '608': 'PHL', '616': 'POL', '620': 'PRT', '624': 'GNB', '626': 'TLS',
  '634': 'QAT', '642': 'ROU', '643': 'RUS', '646': 'RWA', '682': 'SAU',
  '686': 'SEN', '688': 'SRB', '694': 'SLE', '702': 'SGP', '703': 'SVK',
  '704': 'VNM', '705': 'SVN', '706': 'SOM', '710': 'ZAF', '716': 'ZWE',
  '724': 'ESP', '728': 'SSD', '729': 'SDN', '740': 'SUR', '748': 'SWZ',
  '752': 'SWE', '756': 'CHE', '760': 'SYR', '762': 'TJK', '764': 'THA',
  '768': 'TGO', '776': 'TON', '780': 'TTO', '784': 'ARE', '788': 'TUN',
  '792': 'TUR', '795': 'TKM', '800': 'UGA', '804': 'UKR', '807': 'MKD',
  '818': 'EGY', '826': 'GBR', '834': 'TZA', '840': 'USA', '854': 'BFA',
  '858': 'URY', '860': 'UZB', '862': 'VEN', '887': 'YEM', '894': 'ZMB'
}

const ISO_TO_CHINESE = {
  AFG: '阿富汗', ALB: '阿尔巴尼亚', DZA: '阿尔及利亚', AGO: '安哥拉',
  ARG: '阿根廷', AUS: '澳大利亚', AUT: '奥地利', BGD: '孟加拉国',
  BEL: '比利时', BOL: '玻利维亚', BIH: '波黑', BWA: '博茨瓦纳',
  BRA: '巴西', BGR: '保加利亚', KHM: '柬埔寨', CMR: '喀麦隆',
  CAN: '加拿大', CHL: '智利', CHN: '中国', COL: '哥伦比亚',
  COD: '刚果（金）', COG: '刚果（布）', CRI: '哥斯达黎加', HRV: '克罗地亚',
  CUB: '古巴', CYP: '塞浦路斯', CZE: '捷克', DNK: '丹麦',
  DOM: '多米尼加', ECU: '厄瓜多尔', EGY: '埃及', ETH: '埃塞俄比亚',
  FIN: '芬兰', FRA: '法国', DEU: '德国', GHA: '加纳',
  GRC: '希腊', GTM: '危地马拉', HND: '洪都拉斯', HUN: '匈牙利',
  IND: '印度', IDN: '印度尼西亚', IRN: '伊朗', IRQ: '伊拉克',
  IRL: '爱尔兰', ISR: '以色列', ITA: '意大利', JPN: '日本',
  JOR: '约旦', KAZ: '哈萨克斯坦', KEN: '肯尼亚', KOR: '韩国',
  KWT: '科威特', LBN: '黎巴嫩', LBY: '利比亚', MYS: '马来西亚',
  MEX: '墨西哥', MNG: '蒙古', MAR: '摩洛哥', MMR: '缅甸',
  NPL: '尼泊尔', NLD: '荷兰', NZL: '新西兰', NGA: '尼日利亚',
  NOR: '挪威', PAK: '巴基斯坦', PER: '秘鲁', PHL: '菲律宾',
  POL: '波兰', PRT: '葡萄牙', QAT: '卡塔尔', ROU: '罗马尼亚',
  RUS: '俄罗斯', SAU: '沙特阿拉伯', SEN: '塞内加尔', SRB: '塞尔维亚',
  SGP: '新加坡', SVK: '斯洛伐克', VNM: '越南', SVN: '斯洛文尼亚',
  ZAF: '南非', ESP: '西班牙', SDN: '苏丹', SWE: '瑞典',
  CHE: '瑞士', SYR: '叙利亚', THA: '泰国', TUN: '突尼斯',
  TUR: '土耳其', UKR: '乌克兰', ARE: '阿联酋', GBR: '英国',
  USA: '美国', URY: '乌拉圭', VEN: '委内瑞拉', YEM: '也门',
  ZMB: '赞比亚', ZWE: '津巴布韦', ISL: '冰岛', EST: '爱沙尼亚',
  LVA: '拉脱维亚', LTU: '立陶宛', LUX: '卢森堡', MLT: '马耳他'
}

/**
 * 获取平均接种率（0-100%）
 * 基于整个时间范围内的平均接种人数和人口数据计算
 */
function getAverageVaccinationRate(iso) {
  // 检查缓存
  if (vaccineRateCache.has(iso)) {
    return vaccineRateCache.get(iso)
  }
  
  const data = store.covidData?.[iso]
  if (!data?.length) {
    vaccineRateCache.set(iso, 0)
    return 0
  }
  
  const population = COUNTRY_POPULATION[iso]
  if (!population || population === 0) {
    vaccineRateCache.set(iso, 0)
    return 0
  }
  
  const rangeStart = '2020-01-05'
  const rangeEnd = '2023-02-28'
  const filteredData = data.filter(d => d.date >= rangeStart && d.date <= rangeEnd)
  
  if (filteredData.length === 0) {
    vaccineRateCache.set(iso, 0)
    return 0
  }
  
  // 收集所有有效数据（排除异常值）
  let validRates = []
  
  for (const d of filteredData) {
    let doses = d.policy_vaccine || 0
    if (doses <= 0) continue
    
    // 异常值处理：如果数值 > 100，说明是接种人数，计算接种率
    // 假设每人需要2剂完成接种
    let rate = 0
    if (doses > 100) {
      rate = (doses / population )* 100
    } else {
      // 如果已经是 0-3 的政策强度，按比例映射到接种率
      rate = (doses / 3) * 100
    }
    
    // 限制在 0-100 范围内
    rate = Math.min(100, Math.max(0, rate))
    if (rate > 0) {
      validRates.push(rate)
    }
  }
  
  if (validRates.length === 0) {
    vaccineRateCache.set(iso, 0)
    return 0
  }
  
  // 计算平均接种率
  const avgRate = validRates.reduce((sum, val) => sum + val, 0) / validRates.length
  
  vaccineRateCache.set(iso, avgRate)
  return avgRate
}

/**
 * 脉冲半径函数：接种率 0-100 映射到半径 3-12px
 * 接种率 0% → 3px，接种率 50% → 7.5px，接种率 100% → 12px
 */
function pulseRadiusFromRate(rate) {
  const v = Number(rate)
  if (isNaN(v) || v <= 0) return 0
  
  // 接种率 0-100，半径 2-8px
  const radius = 2 + (v / 100) * 6
  return Math.min(8, Math.max(2, radius))
}

function computeCentroids() {
  centroidsCache = {}
  if (!projection) return
  if (!store.centroids) return

  for (const [iso, coords] of Object.entries(store.centroids)) {
    if (!coords || coords.length < 2) continue
    const projected = projection([coords[1], coords[0]])
    if (projected && isFinite(projected[0]) && isFinite(projected[1])) {
      centroidsCache[iso] = projected
    }
  }
}

function updateCountryHighlight() {
  if (!g) return
  
  const selectedSet = new Set(store.selectedCountries || [])
  const highlightedSet = new Set(store.mapHighlightCountries || [])  // 添加这一行
  
  g.selectAll('.country')
    .transition().duration(300)
    .attr('fill', d => {
      const iso = NUMERIC_TO_ISO[d.id]
      if (selectedSet.has(iso)) return '#bbdefb'           // 选中：蓝色
      if (highlightedSet.has(iso)) return '#ffecb3'        // 高亮：橙色
      return '#d8e0ea'                                      // 默认：灰色
    })
    .attr('stroke', d => {
      const iso = NUMERIC_TO_ISO[d.id]
      if (selectedSet.has(iso)) return '#1976d2'
      if (highlightedSet.has(iso)) return '#ff9800'
      return '#94a8bc'
    })
    .attr('stroke-width', d => {
      const iso = NUMERIC_TO_ISO[d.id]
      if (selectedSet.has(iso) || highlightedSet.has(iso)) return 1.5
      return 0.3
    })
}

function updatePulses() {
  if (!isMapReady.value || !pulseGroup) return

  const selected = new Set(store.selectedCountries || [])

  pulseGroup.selectAll('.vaccine-pulse-base').remove()
  pulseGroup.selectAll('.vaccine-pulse-ring').remove()

  let vaccineStats = []
  
  for (const [iso, xy] of Object.entries(centroidsCache)) {
    if (!xy || !isFinite(xy[0]) || !isFinite(xy[1])) continue

    const rate = getAverageVaccinationRate(iso)
    if (rate > 0) {
      vaccineStats.push({ iso, rate, radius: pulseRadiusFromRate(rate) })
    }
  }
  
  vaccineStats.sort((a, b) => b.rate - a.rate)
  // 绘制脉冲
  for (const [iso, xy] of Object.entries(centroidsCache)) {
    if (!xy || !isFinite(xy[0]) || !isFinite(xy[1])) continue

    const rate = getAverageVaccinationRate(iso)
    if (rate <= 0) continue

    const radius = pulseRadiusFromRate(rate)
    if (radius <= 0) continue

    pulseGroup.append('circle')
      .attr('class', 'vaccine-pulse-base')
      .attr('cx', xy[0])
      .attr('cy', xy[1])
      .attr('r', radius)
      .attr('fill', selected.has(iso) ? 'rgba(25,118,210,0.4)' : 'rgba(76,175,80,0.4)')
      .attr('stroke', selected.has(iso) ? '#1976d2' : '#4caf50')
      .attr('stroke-width', selected.has(iso) ? 1.5 : 1)
      .attr('opacity', 0.8)

    pulseGroup.append('circle')
      .attr('class', 'vaccine-pulse-ring')
      .attr('cx', xy[0])
      .attr('cy', xy[1])
      .attr('fill', 'none')
      .attr('stroke', selected.has(iso) ? '#1976d2' : '#4caf50')
      .attr('stroke-width', 1)
      .attr('opacity', 0.6)
      .attr('r', radius)
  }
}

let lastAnimateTime = 0
function animatePulseRings(now) {
  if (!pulseGroup) return
  if (now && now - lastAnimateTime < 50) return
  lastAnimateTime = now || 0

  const rings = pulseGroup.selectAll('.vaccine-pulse-ring')
  if (rings.size() === 0) return

  rings.each(function() {
    const el = d3.select(this)
    let r = parseFloat(el.attr('r'))
    let opacity = parseFloat(el.attr('opacity'))
    
    if (isNaN(r) || r <= 0) return
    if (isNaN(opacity)) opacity = 0.6
    
    const parent = d3.select(this.parentNode)
    const baseCircle = parent.select('.vaccine-pulse-base')
    let originalRadius = r
    
    if (baseCircle.node()) {
      const baseR = parseFloat(baseCircle.attr('r'))
      if (!isNaN(baseR) && baseR > 0) {
        originalRadius = baseR
      }
    }
    
    r += 0.2
    opacity -= 0.008
    
    if (opacity <= 0 || r > originalRadius * 2.5) {
      r = originalRadius
      opacity = 0.6
    }
    
    if (!isNaN(r) && r > 0 && !isNaN(opacity)) {
      el.attr('r', r).attr('opacity', opacity)
    }
  })
}

function startAnimation() {
  if (animFrameId) cancelAnimationFrame(animFrameId)
  const tick = (t) => {
    animatePulseRings(t)
    animFrameId = requestAnimationFrame(tick)
  }
  animFrameId = requestAnimationFrame(tick)
}

async function initMap() {
  const container = mapContainer.value
  if (!container) return
  
  width = container.clientWidth
  height = container.clientHeight

  try {
    const res = await fetch(import.meta.env.BASE_URL + 'data/world-110m.json')
    if (!res.ok) throw new Error('地图数据加载失败')
    const worldData = await res.json()
    
    const countryFeatures = topojson.feature(worldData, worldData.objects.countries).features

    projection = d3.geoNaturalEarth1().fitSize([width, height], { type: 'Sphere' })
    pathGenerator = d3.geoPath().projection(projection)

    svg = d3.select(container)
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .style('position', 'absolute')
      .style('top', 0)
      .style('left', 0)
      .style('z-index', 1)

    zoom = d3.zoom()
      .scaleExtent([1, 6])
      .filter((event) => {
        if (!mapInteractive) {
          return event.type === 'touchmove'
        }
        return true
      })
      .on('zoom', (event) => {
        g.attr('transform', event.transform)
      })

    svg.call(zoom)

    g = svg.append('g')

    // 海洋背景 — 点击空白区域激活地图缩放模式
    g.append('path')
      .datum({ type: 'Sphere' })
      .attr('d', pathGenerator)
      .attr('fill', '#c4d4e8')
      .attr('stroke', '#8fa4b8')
      .attr('stroke-width', 0.5)
      .style('cursor', 'pointer')
      .on('click', () => {
        emit('map-activated')
      })

    g.selectAll('.country')
      .data(countryFeatures)
      .join('path')
      .attr('class', 'country')
      .attr('d', pathGenerator)
      .attr('fill', '#d8e0ea')
      .attr('stroke', '#94a8bc')
      .attr('stroke-width', 0.5)
      .on('click', (evt, d) => {
        // 阻止冒泡：点击国家只做选中，不触发地图缩放模式
        if (evt) evt.stopPropagation()
  const iso = NUMERIC_TO_ISO[d.id]
  if (iso && store.covidData?.[iso]) {
    // 多选模式：如果已选中则移除，否则添加
    if (store.selectedCountries.includes(iso)) {
      const index = store.selectedCountries.indexOf(iso)
      store.selectedCountries.splice(index, 1)
      if (store.selectedCountries.length === 0) {
        store.userManuallySelected = false
      } else {
        store.userManuallySelected = true
      }
    } else {
      store.selectedCountries.push(iso)
      store.userManuallySelected = true
    }
    updateCountryHighlight()
    updatePulses()
  }
})
      .style('cursor', 'pointer')

    pulseGroup = g.append('g').attr('class', 'vaccine-pulse-layer')
    computeCentroids()
    
    isLoading.value = false
    isMapReady.value = true
    
    updatePulses()
    startAnimation()
    
  } catch (e) {
    console.error('initMap 错误:', e)
    isLoading.value = false
  }
}

function handleMouseMove(e) {
  if (!mapContainer.value || !g) return
  const rect = mapContainer.value.getBoundingClientRect()
  const mx = e.clientX - rect.left
  const my = e.clientY - rect.top
  const t = d3.zoomTransform(g.node())
  const mxMap = (mx - t.x) / t.k
  const myMap = (my - t.y) / t.k

  let nearest = null
  let minDist = Infinity
  const threshold = 30 / t.k

  for (const [iso, xy] of Object.entries(centroidsCache)) {
    const dx = (xy[0] - mxMap) * t.k
    const dy = (xy[1] - myMap) * t.k
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist < minDist && dist < threshold) {
      minDist = dist
      nearest = iso
    }
  }
  
  if (nearest) {
    const rate = getAverageVaccinationRate(nearest)
    tooltipData.value = {
      iso: nearest,
      chineseName: ISO_TO_CHINESE[nearest] || nearest,
      vaccineRate: rate.toFixed(1)
    }
    let left = e.clientX - rect.left + 15
    let top = e.clientY - rect.top - 10
    if (left + 150 > width) left = e.clientX - rect.left - 155
    if (top < 0) top = 10
    tooltipX.value = left
    tooltipY.value = top
  } else {
    tooltipData.value = null
  }
}

function handleMouseLeave() { tooltipData.value = null }

function onResize() {
  if (!mapContainer.value) return
  width = mapContainer.value.clientWidth
  height = mapContainer.value.clientHeight
  svg?.attr('width', width).attr('height', height)
  if (projection) {
    projection.fitSize([width, height], { type: 'Sphere' })
    g.selectAll('.country').attr('d', pathGenerator)
    g.select('path:first-child').attr('d', pathGenerator)
    computeCentroids()
    updatePulses()
  }
}

onMounted(async () => {
  await nextTick()
  await initMap()
  window.addEventListener('resize', onResize)
})

onUnmounted(() => {
  if (animFrameId) cancelAnimationFrame(animFrameId)
  if (svg) {
    svg.selectAll('*').remove()
    svg.remove()
  }
  window.removeEventListener('resize', onResize)
})

// 监听选中国家变化 → 更新高亮和脉冲
watch(() => store.selectedCountries, () => {
  if (isMapReady.value) {
    updateCountryHighlight()
    updatePulses()
  }
}, { deep: true })

// 监听地图专用高亮变化 → 仅更新地图高亮（脉冲颜色不变）
watch(() => store.mapHighlightCountries, () => {
  if (isMapReady.value) {
    console.log('[VaccinePulseMap] 高亮国家更新:', store.mapHighlightCountries)
    updateCountryHighlight()
    // 不调用 updatePulses()，保持脉冲颜色不变
  }
}, { deep: true })

// 监听 interactive prop → 同步 mutable 标记 + 管理滚轮拦截
watch(() => props.interactive, (val) => {
  mapInteractive = val
  if (!mapContainer.value) return
  if (val) {
    mapContainer.value.addEventListener('wheel', onMapWheel, { passive: false })
  } else {
    mapContainer.value.removeEventListener('wheel', onMapWheel)
  }
})

function onMapWheel(e) {
  e.preventDefault()
  e.stopPropagation()
}
</script>

<style scoped>
.chart-container {
  background: var(--color-bg, #1a1a2e);
  overflow: hidden;
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 500px;
  transition: box-shadow 0.3s ease;
}

.chart-container.map-interactive {
  box-shadow: inset 0 0 0 2px rgba(233, 69, 96, 0.5);
  cursor: grab;
}

.chart-container.map-interactive:active {
  cursor: grabbing;
}
.loading-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(232,236,243,0.9);
  z-index: 100;
  gap: 12px;
}
.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #e0e0e0;
  border-top-color: #4caf50;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.map-tooltip {
  position: absolute;
  background: rgba(30,30,50,0.95);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 8px;
  padding: 8px 14px;
  font-size: 0.85rem;
  color: #e0e0e0;
  box-shadow: 0 4px 12px rgba(0,0,0,0.4);
  backdrop-filter: blur(10px);
  pointer-events: none;
  z-index: 1000;
  text-align: center;
}
.map-tooltip .tooltip-country-name {
  font-size: 0.9rem;
  font-weight: 600;
  color: #1976d2;
}
.map-tooltip .tooltip-vaccine-rate {
  font-size: 0.8rem;
  color: #4caf50;
  font-weight: 500;
  margin-top: 2px;
}
</style>