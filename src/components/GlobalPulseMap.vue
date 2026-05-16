<script setup>
/**
 * GlobalPulseMap.vue — 图表1：全球传播脉冲地图
 * 
 * 功能说明：
 * - D3.js + TopoJSON 渲染世界地图底图（Natural Earth 投影）
 * - 各国地理中心添加脉冲圆环动画，半径编码当日病例数
 * - Canvas 层渲染跨国传播路径的流动粒子
 * - 支持 D3 zoom 缩放和平移
 * - 点击国家 → 更新 store.selectedCountries
 * - 响应 store.currentTime 和 store.timeRange 变化
 * 
 * Props: 无（直接从 globalStore 读取状态）
 * 响应状态：store.currentTime, store.selectedCountries, store.timeRange
 */
import { ref, onMounted, onUnmounted, watch, computed, nextTick } from 'vue'
import { useGlobalStore } from '@/stores/global'
import * as d3 from 'd3'
import * as topojson from 'topojson-client'

const props = defineProps({
  interactive: { type: Boolean, default: false }
})

const emit = defineEmits(['map-activated'])

const store = useGlobalStore()
const mapContainer = ref(null)

// 地图交互模式标记（mutable，供 zoom.filter 实时读取）
let mapInteractive = false

// Tooltip 状态
const tooltipData = ref(null)
const tooltipX = ref(0)
const tooltipY = ref(0)

// ==================== 内部状态 ====================
let svg = null
let canvas = null
let ctx = null
let projection = null
let pathGenerator = null
let zoom = null
let g = null            // SVG 主图层 <g>
let pulseGroup = null   // 脉冲圆环图层
let width = 0
let height = 0
let animFrameId = null
let worldData = null    // TopoJSON 世界数据
let countryFeatures = null  // GeoJSON 国家要素
let particles = []      // 粒子数组
let centroidsCache = {} // ISO → [x, y] 屏幕坐标缓存

// 简化的变异株时期定义（基于时间自动判定）
const VARIANT_PERIODS = [
  { start: '2020-01-01', end: '2020-09-30', color: '#90a4ae', name: '原始株' },
  { start: '2020-10-01', end: '2021-05-31', color: '#fdd835', name: 'Alpha' },
  { start: '2021-06-01', end: '2021-11-30', color: '#ff9800', name: 'Delta' },
  { start: '2021-12-01', end: '2023-06-30', color: '#66bb6a', name: 'Omicron' }
]

// ISO 3166-1 字母代码 → 中文名称映射
const ISO_TO_CHINESE = {
  'AFG': '阿富汗', 'ALB': '阿尔巴尼亚', 'DZA': '阿尔及利亚', 'AGO': '安哥拉',
  'ARG': '阿根廷', 'AUS': '澳大利亚', 'AUT': '奥地利', 'BGD': '孟加拉国',
  'BEL': '比利时', 'BOL': '玻利维亚', 'BIH': '波黑', 'BWA': '博茨瓦纳',
  'BRA': '巴西', 'BGR': '保加利亚', 'KHM': '柬埔寨', 'CMR': '喀麦隆',
  'CAN': '加拿大', 'CHL': '智利', 'CHN': '中国', 'COL': '哥伦比亚',
  'COD': '刚果（金）', 'COG': '刚果（布）', 'CRI': '哥斯达黎加', 'HRV': '克罗地亚',
  'CUB': '古巴', 'CYP': '塞浦路斯', 'CZE': '捷克', 'DNK': '丹麦',
  'DOM': '多米尼加', 'ECU': '厄瓜多尔', 'EGY': '埃及', 'ETH': '埃塞俄比亚',
  'FIN': '芬兰', 'FRA': '法国', 'DEU': '德国', 'GHA': '加纳',
  'GRC': '希腊', 'GTM': '危地马拉', 'HND': '洪都拉斯', 'HUN': '匈牙利',
  'IND': '印度', 'IDN': '印度尼西亚', 'IRN': '伊朗', 'IRQ': '伊拉克',
  'IRL': '爱尔兰', 'ISR': '以色列', 'ITA': '意大利', 'JPN': '日本',
  'JOR': '约旦', 'KAZ': '哈萨克斯坦', 'KEN': '肯尼亚', 'PRK': '朝鲜',
  'KOR': '韩国', 'KWT': '科威特', 'LBN': '黎巴嫩', 'LBY': '利比亚',
  'MYS': '马来西亚', 'MEX': '墨西哥', 'MDA': '摩尔多瓦', 'MNG': '蒙古',
  'MAR': '摩洛哥', 'MOZ': '莫桑比克', 'MMR': '缅甸', 'NAM': '纳米比亚',
  'NPL': '尼泊尔', 'NLD': '荷兰', 'NZL': '新西兰', 'NIC': '尼加拉瓜',
  'NER': '尼日尔', 'NGA': '尼日利亚', 'NOR': '挪威', 'PAK': '巴基斯坦',
  'PAN': '巴拿马', 'PER': '秘鲁', 'PHL': '菲律宾', 'POL': '波兰',
  'PRT': '葡萄牙', 'QAT': '卡塔尔', 'ROU': '罗马尼亚', 'RUS': '俄罗斯',
  'SAU': '沙特阿拉伯', 'SEN': '塞内加尔', 'SRB': '塞尔维亚', 'SGP': '新加坡',
  'SVK': '斯洛伐克', 'VNM': '越南', 'SVN': '斯洛文尼亚', 'ZAF': '南非',
  'ESP': '西班牙', 'SDN': '苏丹', 'SWE': '瑞典', 'CHE': '瑞士',
  'SYR': '叙利亚', 'TWN': '台湾', 'THA': '泰国', 'TUN': '突尼斯',
  'TUR': '土耳其', 'UGA': '乌干达', 'UKR': '乌克兰', 'ARE': '阿联酋',
  'GBR': '英国', 'USA': '美国', 'URY': '乌拉圭', 'UZB': '乌兹别克斯坦',
  'VEN': '委内瑞拉', 'YEM': '也门', 'ZMB': '赞比亚', 'ZWE': '津巴布韦',
  'ISL': '冰岛', 'GRD': '格林纳达', 'SLV': '萨尔瓦多', 'GUY': '圭亚那',
  'HTI': '海地', 'EST': '爱沙尼亚', 'LVA': '拉脱维亚', 'LTU': '立陶宛',
  'LUX': '卢森堡', 'MLT': '马耳他', 'DJI': '吉布提', 'GAB': '加蓬',
  'GIN': '几内亚', 'GMB': '冈比亚', 'GNB': '几内亚比绍', 'LBR': '利比里亚',
  'RWA': '卢旺达', 'SLE': '塞拉利昂', 'SOM': '索马里', 'SSD': '南苏丹',
  'TGO': '多哥', 'TCD': '乍得', 'CAF': '中非', 'BDI': '布隆迪',
  'TKM': '土库曼斯坦', 'TJK': '塔吉克斯坦', 'KGZ': '吉尔吉斯斯坦', 'ARM': '亚美尼亚',
  'AZE': '阿塞拜疆', 'GEO': '格鲁吉亚', 'BIH': '波黑', 'MKD': '北马其顿',
  'MNE': '黑山', 'CHE': '瑞士', 'AND': '安道尔', 'MON': '摩纳哥',
  'SMR': '圣马力诺', 'LIE': '列支敦士登', 'TLS': '东帝汶', 'PNG': '巴布亚新几内亚',
  'FJI': '斐济', 'VUT': '瓦努阿图', 'TON': '汤加', 'WSM': '萨摩亚',
  'MHL': '马绍尔群岛', 'FSM': '密克罗尼西亚', 'KIR': '基里巴斯', 'NRU': '瑙鲁',
  'PLW': '帕劳', 'COM': '科摩罗', 'MUS': '毛里求斯', 'MDV': '马尔代夫',
  'LKA': '斯里兰卡', 'BTN': '不丹', 'BHR': '巴林', 'OMN': '阿曼',
  'PSE': '巴勒斯坦', 'BHS': '巴哈马', 'BRB': '巴巴多斯', 'CUB': '古巴',
  'DMA': '多米尼克', 'HTI': '海地', 'JAM': '牙买加', 'ATG': '安提瓜和巴布达',
  'KNA': '圣基茨和尼维斯', 'LCA': '圣卢西亚', 'VCT': '圣文森特和格林纳丁斯',
  'TTO': '特立尼达和多巴哥', 'SLB': '所罗门群岛', 'STP': '圣多美和普林西比',
  'CPV': '佛得角', 'SWZ': '斯威士兰', 'LSO': '莱索托', 'MWI': '马拉维',
  'ERI': '厄立特里亚', 'BFA': '布基纳法索', 'MLI': '马里', 'NER': '尼日尔',
  'SUR': '苏里南', 'ABW': '阿鲁巴', 'BRN': '文莱'
}

// ISO 3166-1 数字代码 → 字母代码映射（用于 TopoJSON id 匹配）
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

// ==================== 辅助函数 ====================

/** 获取当前变异株颜色 */
function getVariantColor(dateStr) {
  for (const period of VARIANT_PERIODS) {
    if (dateStr >= period.start && dateStr <= period.end) {
      return period.color
    }
  }
  return '#90a4ae'
}

/** 获取某国某日的数据 */
function getCountryData(iso, dateStr) {
  const data = store.covidData?.[iso]
  if (!data) return null
  // 使用二分查找快速定位日期（数据已按日期排序）
  let lo = 0, hi = data.length - 1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    if (data[mid].date < dateStr) lo = mid + 1
    else if (data[mid].date > dateStr) hi = mid - 1
    else return data[mid]
  }
  // 没有精确匹配，返回最近的（lo 或 hi）
  if (lo < data.length) return data[lo]
  if (hi >= 0) return data[hi]
  return null
}

/** 计算脉冲半径（基于 new_cases_smoothed 日均值） */
function pulseRadius(cases) {
  if (!cases || cases <= 0) return 0
  // 使用平方根缩放 + 对数微调，适配日均值范围（~10 到 ~几百万）
  return Math.min(Math.sqrt(cases) * 0.15, 30)
}

// ==================== 初始化 ====================

onMounted(async () => {
  await nextTick()
  initMap()
})

onUnmounted(() => {
  if (animFrameId) cancelAnimationFrame(animFrameId)
  window.removeEventListener('resize', onResize)
})

/** 初始化地图 */
async function initMap() {
  const container = mapContainer.value
  if (!container) return

  width = container.clientWidth
  height = container.clientHeight

  // 加载 TopoJSON
  try {
    const resp = await fetch('/data/world-110m.json')
    worldData = await resp.json()
  } catch (e) {
    console.error('加载世界地图数据失败:', e)
    return
  }

  countryFeatures = topojson.feature(worldData, worldData.objects.countries).features

  // 创建投影和路径生成器
  projection = d3.geoNaturalEarth1()
    .fitSize([width, height], { type: 'Sphere' })
  
  pathGenerator = d3.geoPath().projection(projection)

  // 创建 Canvas（粒子层）
  canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  canvas.style.position = 'absolute'
  canvas.style.top = '0'
  canvas.style.left = '0'
  canvas.style.pointerEvents = 'none'
  container.appendChild(canvas)
  ctx = canvas.getContext('2d')

  // 创建 SVG（地图 + 脉冲层）
  svg = d3.select(container)
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .style('position', 'absolute')
    .style('top', 0)
    .style('left', 0)

  // 添加 zoom 行为 — 仅在 mapInteractive 为 true 时响应 wheel/pan
  zoom = d3.zoom()
    .scaleExtent([1, 8])
    .filter((event) => {
      // 非交互模式：仅允许 touchmove（移动端），屏蔽 wheel 和 mousedown 以避免拦截页面滚动
      if (!mapInteractive) {
        return event.type === 'touchmove'
      }
      // 交互模式：允许所有 zoom 手势
      return true
    })
    .on('zoom', (event) => {
      g.attr('transform', event.transform)
      // 同步 canvas 变换
      canvas.style.transform = `translate(${event.transform.x}px, ${event.transform.y}px) scale(${event.transform.k})`
      canvas.style.transformOrigin = '0 0'
      // 拖动/缩放时也更新 tooltip，显示对应国家的疫情信息
      if (event.sourceEvent) {
        handleMouseMove(event.sourceEvent)
      }
    })

  svg.call(zoom)

  // 主图层
  g = svg.append('g')

  // 绘制海洋背景 — 点击空白区域激活地图缩放模式
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

  // 绘制国界线
  g.selectAll('.country')
  .data(countryFeatures)
  .join('path')
  .attr('class', 'country')
  .attr('d', pathGenerator)
  .attr('fill', '#d8e0ea')
  .attr('stroke', '#94a8bc')
  .attr('stroke-width', 0.3)
  .on('click', (event, d) => {
    // 阻止冒泡：点击国家只做选中，不触发地图缩放模式
    event.stopPropagation()
    const iso = NUMERIC_TO_ISO[d.id]
    if (iso && store.covidData?.[iso]) {
      // 多选模式：如果已选中则移除，否则添加
      if (store.selectedCountries.includes(iso)) {
        // 移除国家
        const index = store.selectedCountries.indexOf(iso)
        store.selectedCountries.splice(index, 1)
        // 如果移除后没有国家了，恢复自动滚动
        if (store.selectedCountries.length === 0) {
          store.userManuallySelected = false
        } else {
          store.userManuallySelected = true
        }
        console.log('[GlobalPulseMap] 移除国家:', iso, '当前选中:', store.selectedCountries)
      } else {
        // 添加国家
        store.selectedCountries.push(iso)
        store.userManuallySelected = true
        console.log('[GlobalPulseMap] 添加国家:', iso, '当前选中:', store.selectedCountries)
      }
      updateCountryHighlight()
      updatePulses()
    }
  })
  .style('cursor', 'pointer')
  
  // 脉冲图层
  pulseGroup = g.append('g').attr('class', 'pulse-layer')

  // 预计算国家中心屏幕坐标
  computeCentroids()

  // 监听窗口变化
  window.addEventListener('resize', onResize)

  // 初始渲染
  updatePulses()
  startAnimation()
}

/** 预计算所有国家地理中心的屏幕坐标 */
function computeCentroids() {
  centroidsCache = {}
  if (!store.centroids) return
  for (const [iso, coords] of Object.entries(store.centroids)) {
    const projected = projection([coords[1], coords[0]]) // [lon, lat]
    if (projected) {
      centroidsCache[iso] = projected
    }
  }
}

/** 更新国家高亮样式（支持选中 + 地图专用高亮） */
function updateCountryHighlight() {
  if (!g) return
  
  const selectedSet = new Set(store.selectedCountries || [])
  const highlightedSet = new Set(store.mapHighlightCountries || [])
  
  g.selectAll('.country')
    .transition().duration(300)
    .attr('fill', d => {
      const iso = NUMERIC_TO_ISO[d.id]
      if (selectedSet.has(iso)) return '#bbdefb'
      if (highlightedSet.has(iso)) return '#ffecb3'
      return '#d8e0ea'
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

/** 更新脉冲圆环（支持选中 + 地图高亮） */
// 修改 updatePulses 函数
function updatePulses() {
  if (!pulseGroup || !store.covidData) return

  const currentTime = store.currentTime || '2020-01-05'
  const selectedSet = new Set(store.selectedCountries || [])
  const highlightedSet = new Set(store.mapHighlightCountries || [])
  
  const pulses = []

  for (const [iso, xy] of Object.entries(centroidsCache)) {
    const entry = getCountryData(iso, currentTime)
    const cases = entry ? (entry.new_cases_smoothed || entry.new_cases || 0) : 0
    if (cases > 0) {
      pulses.push({
        iso,
        x: xy[0],
        y: xy[1],
        cases: cases,
        radius: pulseRadius(cases),
        isSelected: selectedSet.has(iso),
        isHighlighted: highlightedSet.has(iso)
      })
    }
  }

  // 脉冲圆环（静态底层）- 颜色不受高亮影响
  const baseCircles = pulseGroup.selectAll('.pulse-base').data(pulses, d => d.iso)

  baseCircles.enter()
    .append('circle')
    .attr('class', 'pulse-base')
    .attr('cx', d => d.x)
    .attr('cy', d => d.y)
    .merge(baseCircles)
    .transition().duration(300)
    .attr('r', d => Math.max(d.radius, 2))
    // 关键修改：脉冲颜色只根据是否选中改变，高亮不影响脉冲颜色
    .attr('fill', d => d.isSelected ? 'rgba(25,118,210,0.35)' : 'rgba(239,83,80,0.3)')
    .attr('stroke', d => d.isSelected ? '#1976d2' : '#ef5350')
    .attr('stroke-width', d => d.isSelected ? 1.5 : 0.5)
    .attr('opacity', 0.7)

  baseCircles.exit().remove()

  // 脉冲动画圆环（扩散层）- 颜色也不受高亮影响
  const ringCircles = pulseGroup.selectAll('.pulse-ring').data(pulses, d => d.iso)

  ringCircles.enter()
    .append('circle')
    .attr('class', 'pulse-ring')
    .attr('cx', d => d.x)
    .attr('cy', d => d.y)
    .attr('fill', 'none')
    .attr('stroke', d => d.isSelected ? '#1976d2' : '#ef5350')
    .attr('stroke-width', 1)
    .attr('opacity', 0.6)
    .merge(ringCircles)
    .transition().duration(300)
    .attr('r', d => d.radius)

  ringCircles.exit().remove()
}

/** 启动动画循环（脉冲扩散 + 粒子流动） */
function startAnimation() {
  let frameCount = 0

  function animate() {
    frameCount++
    
    // 每 2 帧更新脉冲动画（性能优化）
    if (frameCount % 2 === 0) {
      animatePulseRings()
    }

    // 粒子动画
    updateParticles()
    renderParticles()

    animFrameId = requestAnimationFrame(animate)
  }

  animFrameId = requestAnimationFrame(animate)
}

/** 脉冲圆环扩散动画 */
function animatePulseRings() {
  if (!pulseGroup) return
  
  // 只操作自己组件内的元素
  const rings = pulseGroup.selectAll('.pulse-ring')
  if (rings.size() === 0) return
  
  rings.each(function(d) {
    // 检查这个元素是否还有效
    if (!this.parentNode) return
    
    const el = d3.select(this)
    let r = parseFloat(el.attr('r'))
    let opacity = parseFloat(el.attr('opacity'))
    
    // 安全检查
    if (isNaN(r) || r <= 0) return
    if (isNaN(opacity)) opacity = 0.6
    
    r += 0.3
    opacity -= 0.01
    
    if (opacity <= 0 || r > (d.radius || 4) * 3) {
      r = d.radius || 4
      opacity = 0.6
    }
    
    if (!isNaN(r) && r > 0) {
      el.attr('r', r).attr('opacity', opacity)
    }
  })
}

/** 更新粒子系统 */
function updateParticles() {
  const currentTime = store.currentTime || '2020-01-05'
  const color = getVariantColor(currentTime)

  // 根据当前时间生成新粒子
  if (Math.random() < 0.3 && particles.length < 60) {
    // 随机选择一个有病例的国家作为起点
    const isoKeys = Object.keys(centroidsCache)
    const fromIso = isoKeys[Math.floor(Math.random() * isoKeys.length)]
    const fromData = getCountryData(fromIso, currentTime)
    
    const fromCases = fromData ? (fromData.new_cases_smoothed || fromData.new_cases || 0) : 0
    if (fromCases > 10) {
      // 随机选一个目的地
      const toIso = isoKeys[Math.floor(Math.random() * isoKeys.length)]
      if (toIso !== fromIso) {
        const from = centroidsCache[fromIso]
        const to = centroidsCache[toIso]
        if (from && to) {
          particles.push({
            x: from[0],
            y: from[1],
            tx: to[0],
            ty: to[1],
            progress: 0,
            speed: 0.005 + Math.random() * 0.01,
            color: color,
            size: 1.5 + Math.random() * 1.5
          })
        }
      }
    }
  }

  // 更新粒子位置
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i]
    p.progress += p.speed
    p.x = p.x + (p.tx - p.x) * p.speed * 2
    p.y = p.y + (p.ty - p.y) * p.speed * 2
    
    if (p.progress >= 1) {
      particles.splice(i, 1)
    }
  }
}

/** 在 Canvas 上渲染粒子 */
function renderParticles() {
  if (!ctx) return
  ctx.clearRect(0, 0, width, height)

  for (const p of particles) {
    const alpha = 1 - p.progress
    ctx.beginPath()
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
    ctx.fillStyle = p.color
    ctx.globalAlpha = alpha * 0.7
    ctx.fill()

    // 拖尾效果
    ctx.beginPath()
    const tailX = p.x - (p.tx - p.x) * 0.05
    const tailY = p.y - (p.ty - p.y) * 0.05
    ctx.moveTo(tailX, tailY)
    ctx.lineTo(p.x, p.y)
    ctx.strokeStyle = p.color
    ctx.globalAlpha = alpha * 0.3
    ctx.lineWidth = p.size * 0.5
    ctx.stroke()
  }
  ctx.globalAlpha = 1
}

/** 窗口大小变化处理 */
function onResize() {
  const container = mapContainer.value
  if (!container) return
  
  width = container.clientWidth
  height = container.clientHeight

  if (svg) {
    svg.attr('width', width).attr('height', height)
  }
  if (canvas) {
    canvas.width = width
    canvas.height = height
  }
  if (projection) {
    projection.fitSize([width, height], { type: 'Sphere' })
    if (pathGenerator) {
      g.selectAll('.country').attr('d', pathGenerator)
      g.select('path:first-child').attr('d', pathGenerator) // Sphere
    }
    computeCentroids()
    updatePulses()
  }
}

// ==================== Tooltip 功能 ====================

/** 格式化数字（添加千分位） */
function formatNumber(num) {
  if (num === null || num === undefined || num === '') return '-'
  return Math.round(num).toLocaleString('zh-CN')
}

/** 鼠标移动处理 - 检测悬停的国家 */
function handleMouseMove(event) {
  const container = mapContainer.value
  if (!container || !g || !store.covidData) return

  const rect = container.getBoundingClientRect()
  const mx = event.clientX - rect.left
  const my = event.clientY - rect.top

  // 转换鼠标坐标到地图坐标（考虑 zoom）
  const transform = d3.zoomTransform(g.node())
  const mapX = (mx - transform.x) / transform.k
  const mapY = (my - transform.y) / transform.k

  // 查找最近的国家
  let nearestCountry = null
  let nearestDistance = Infinity
  const threshold = 20 // 像素阈值

  for (const [iso, xy] of Object.entries(centroidsCache)) {
    const dist = Math.sqrt(Math.pow(xy[0] - mapX, 2) + Math.pow(xy[1] - mapY, 2))
    if (dist < nearestDistance && dist < threshold) {
      nearestDistance = dist
      nearestCountry = iso
    }
  }

  if (nearestCountry) {
    const currentTime = store.currentTime || '2020-01-05'
    const data = getCountryData(nearestCountry, currentTime)
    const chineseName = ISO_TO_CHINESE[nearestCountry] || nearestCountry

    tooltipData.value = {
      iso: nearestCountry,
      chineseName: chineseName,
      date: currentTime,
      cases: data?.new_cases_smoothed || data?.new_cases || 0,
      totalCases: data?.total_cases || 0,
      totalDeaths: data?.total_deaths || 0,
      newDeaths: data?.new_deaths || 0,
      policyLockdown: data?.policy_lockdown || 0,
      policyTesting: data?.policy_testing || 0,
      policyMask: data?.policy_mask || 0,
      policyVaccine: data?.policy_vaccine || 0,
      policyBorder: data?.policy_border || 0
    }

    // 计算 tooltip 位置，避免超出容器
    let left = event.clientX - rect.left + 15
    let top = event.clientY - rect.top - 10

    // 边界检测
    const tooltipWidth = 220
    const tooltipHeight = 150
    if (left + tooltipWidth > width) {
      left = event.clientX - rect.left - tooltipWidth - 15
    }
    if (top + tooltipHeight > height) {
      top = height - tooltipHeight - 10
    }
    if (top < 0) top = 10

    tooltipX.value = left
    tooltipY.value = top
  } else {
    tooltipData.value = null
  }
}

/** 鼠标离开处理 */
function handleMouseLeave() {
  tooltipData.value = null
}

// ==================== 监听 Store 变化 ====================

// 监听时间变化 → 更新脉冲
watch(() => store.currentTime, () => {
  updatePulses()
  // 更新 tooltip 中的日期
  if (tooltipData.value) {
    tooltipData.value.date = store.currentTime || '2020-01-05'
    const data = getCountryData(tooltipData.value.iso, tooltipData.value.date)
    tooltipData.value.cases = data?.new_cases_smoothed || data?.new_cases || 0
    tooltipData.value.totalCases = data?.total_cases || 0
    tooltipData.value.totalDeaths = data?.total_deaths || 0
  }
})

// 监听地图专用高亮变化 → 仅更新地图视觉
watch(() => store.mapHighlightCountries, () => {
  console.log('[GlobalPulseMap] mapHighlightCountries changed:', store.mapHighlightCountries)
  updateCountryHighlight()
  updatePulses()
}, { deep: true })

// 监听选中国家变化 → 更新高亮
watch(() => store.selectedCountries, () => {
  updateCountryHighlight()
  updatePulses()
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

// 滚轮事件处理：交互模式下阻止页面滚动（由 D3 zoom 接管地图缩放）
function onMapWheel(e) {
  e.preventDefault()
  e.stopPropagation()
}
</script>

<template>
  <div ref="mapContainer" class="chart-container" :class="{ 'map-interactive': props.interactive }" style="position: relative; width: 100%; height: 100%;" @mousemove="handleMouseMove" @mouseleave="handleMouseLeave">
    <!-- 变异株图例 -->
    <div class="chart-legend">
      <div class="legend-item">
        <span class="legend-dot" style="background: #90a4ae;"></span>
        <span>原始株</span>
      </div>
      <div class="legend-item">
        <span class="legend-dot" style="background: #42a5f5;"></span>
        <span>Alpha</span>
      </div>
      <div class="legend-item">
        <span class="legend-dot" style="background: #ef5350;"></span>
        <span>Delta</span>
      </div>
      <div class="legend-item">
        <span class="legend-dot" style="background: #ab47bc;"></span>
        <span>Omicron</span>
      </div>
    </div>
    
    <!-- 国家信息 Tooltip -->
    <div v-if="tooltipData" class="map-tooltip" :style="{ left: tooltipX + 'px', top: tooltipY + 'px' }">
      <div class="tooltip-header">
        <span class="tooltip-country-name">{{ tooltipData.chineseName }}</span>
        <span class="tooltip-iso">({{ tooltipData.iso }})</span>
      </div>
      <div class="tooltip-date">{{ tooltipData.date }}</div>
      <div class="tooltip-divider"></div>
      <div class="tooltip-section-title">📈 疫情数据</div>
      <div class="tooltip-row">
        <span class="tooltip-label">当日新增确诊</span>
        <span class="tooltip-value case-value">{{ formatNumber(tooltipData.cases) }}</span>
      </div>
      <div class="tooltip-row">
        <span class="tooltip-label">累计确诊</span>
        <span class="tooltip-value">{{ formatNumber(tooltipData.totalCases) }}</span>
      </div>
      <div class="tooltip-row">
        <span class="tooltip-label">累计死亡</span>
        <span class="tooltip-value death-value">{{ formatNumber(tooltipData.totalDeaths) }}</span>
      </div>
      <div class="tooltip-divider"></div>
      <div class="tooltip-section-title">🛡️ 防控政策</div>
      <div class="tooltip-row">
        <span class="tooltip-label"><span class="policy-dot" style="background: #ff9800;"></span>封锁</span>
        <span class="tooltip-value">{{ tooltipData.policyLockdown }}/3</span>
      </div>
      <div class="tooltip-row">
        <span class="tooltip-label"><span class="policy-dot" style="background: #66bb6a;"></span>检测</span>
        <span class="tooltip-value">{{ tooltipData.policyTesting }}/3</span>
      </div>
      <div class="tooltip-row">
        <span class="tooltip-label"><span class="policy-dot" style="background: #42a5f5;"></span>口罩</span>
        <span class="tooltip-value">{{ tooltipData.policyMask }}/3</span>
      </div>
      <div class="tooltip-row">
        <span class="tooltip-label"><span class="policy-dot" style="background: #ab47bc;"></span>疫苗</span>
        <span class="tooltip-value">{{ tooltipData.policyVaccine }}/3</span>
      </div>
      <div class="tooltip-row">
        <span class="tooltip-label"><span class="policy-dot" style="background: #78909c;"></span>边境</span>
        <span class="tooltip-value">{{ tooltipData.policyBorder }}/3</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.chart-container {
  background: var(--color-bg, #1a1a2e);
  overflow: hidden;
  transition: box-shadow 0.3s ease;
}

.chart-container.map-interactive {
  box-shadow: inset 0 0 0 2px rgba(233, 69, 96, 0.5);
  cursor: grab;
}

.chart-container.map-interactive:active {
  cursor: grabbing;
}

/* 国家信息 Tooltip 样式 */
.map-tooltip {
  position: absolute;
  pointer-events: none;
  background: rgba(30, 30, 50, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 10px;
  padding: 14px 16px;
  font-size: 0.85rem;
  color: #e0e0e0;
  z-index: 100;
  backdrop-filter: blur(10px);
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4);
  min-width: 180px;
  transition: opacity 0.15s ease;
}

.map-tooltip .tooltip-header {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 4px;
}

.map-tooltip .tooltip-country-name {
  font-size: 1.1rem;
  font-weight: 700;
  color: #e94560;
}

.map-tooltip .tooltip-iso {
  font-size: 0.75rem;
  color: #999;
  font-family: 'Consolas', 'Monaco', monospace;
}

.map-tooltip .tooltip-date {
  font-size: 0.75rem;
  color: #999;
  margin-bottom: 8px;
}

.map-tooltip .tooltip-divider {
  height: 1px;
  background: linear-gradient(90deg, rgba(233, 69, 96, 0.2), transparent);
  margin: 8px 0;
}

.map-tooltip .tooltip-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 0;
}

.map-tooltip .tooltip-label {
  color: #b0bec5;
  font-size: 0.8rem;
}

.map-tooltip .tooltip-value {
  font-weight: 600;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 0.9rem;
  color: #e0e0e0;
}

.map-tooltip .case-value {
  color: #ef5350;
}

.map-tooltip .death-value {
  color: #ff9800;
}

.map-tooltip .tooltip-section-title {
  font-size: 0.75rem;
  font-weight: 600;
  color: #b0bec5;
  margin-bottom: 4px;
  letter-spacing: 0.5px;
}

.map-tooltip .policy-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 2px;
  margin-right: 4px;
  vertical-align: middle;
}
</style>
