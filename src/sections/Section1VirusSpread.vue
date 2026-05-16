<script setup>
/**
 * Section1VirusSpread.vue — 章节1：一种新型病毒开始蔓延
 * 
 * 布局：左侧 sticky 脉冲地图 + 右侧滚动文字
 * 滚动行为：
 * - 进入章节 → 切换到脉冲地图，时间定位 2020/01-06
 * - 每个步骤更新 store.currentTime，驱动脉冲动画
 * - 退出章节 → 清理状态
 * 
 * 图表：GlobalPulseMap
 */
import { onMounted, onUnmounted, ref, computed } from 'vue'
import { useGlobalStore } from '@/stores/global'
import GlobalPulseMap from '@/components/GlobalPulseMap.vue'
import scrollama from 'scrollama'

const store = useGlobalStore()
const scrollTextRef = ref(null)
const searchQuery = ref('')
const isSearchFocused = ref(false)
const mapInteractive = ref(false)
let scroller = null

// 激活地图交互模式（点击左侧图表区）
function activateMap() {
  mapInteractive.value = true
}

// 退出地图交互模式（点击右侧文字区）
function deactivateMap() {
  mapInteractive.value = false
}

// 可搜索的国家列表（中英文对照）
const countries = [
  { code: 'ABW', name: '阿鲁巴' },
  { code: 'AFG', name: '阿富汗' },
  { code: 'AGO', name: '安哥拉' },
  { code: 'ALB', name: '阿尔巴尼亚' },
  { code: 'AND', name: '安道尔' },
  { code: 'ARE', name: '阿联酋' },
  { code: 'ARG', name: '阿根廷' },
  { code: 'ARM', name: '亚美尼亚' },
  { code: 'ATG', name: '安提瓜和巴布达' },
  { code: 'AUS', name: '澳大利亚' },
  { code: 'AUT', name: '奥地利' },
  { code: 'AZE', name: '阿塞拜疆' },
  { code: 'BDI', name: '布隆迪' },
  { code: 'BEL', name: '比利时' },
  { code: 'BEN', name: '贝宁' },
  { code: 'BFA', name: '布基纳法索' },
  { code: 'BGD', name: '孟加拉国' },
  { code: 'BGR', name: '保加利亚' },
  { code: 'BHR', name: '巴林' },
  { code: 'BHS', name: '巴哈马' },
  { code: 'BIH', name: '波黑' },
  { code: 'BLR', name: '白俄罗斯' },
  { code: 'BLZ', name: '伯利兹' },
  { code: 'BOL', name: '玻利维亚' },
  { code: 'BRA', name: '巴西' },
  { code: 'BRB', name: '巴巴多斯' },
  { code: 'BRN', name: '文莱' },
  { code: 'BTN', name: '不丹' },
  { code: 'BWA', name: '博茨瓦纳' },
  { code: 'CAF', name: '中非共和国' },
  { code: 'CAN', name: '加拿大' },
  { code: 'CHE', name: '瑞士' },
  { code: 'CHL', name: '智利' },
  { code: 'CHN', name: '中国' },
  { code: 'CIV', name: '科特迪瓦' },
  { code: 'CMR', name: '喀麦隆' },
  { code: 'COD', name: '刚果（金）' },
  { code: 'COG', name: '刚果（布）' },
  { code: 'COL', name: '哥伦比亚' },
  { code: 'COM', name: '科摩罗' },
  { code: 'CPV', name: '佛得角' },
  { code: 'CRI', name: '哥斯达黎加' },
  { code: 'CUB', name: '古巴' },
  { code: 'CYP', name: '塞浦路斯' },
  { code: 'CZE', name: '捷克' },
  { code: 'DEU', name: '德国' },
  { code: 'DJI', name: '吉布提' },
  { code: 'DMA', name: '多米尼克' },
  { code: 'DNK', name: '丹麦' },
  { code: 'DOM', name: '多米尼加' },
  { code: 'DZA', name: '阿尔及利亚' },
  { code: 'ECU', name: '厄瓜多尔' },
  { code: 'EGY', name: '埃及' },
  { code: 'ERI', name: '厄立特里亚' },
  { code: 'ESP', name: '西班牙' },
  { code: 'EST', name: '爱沙尼亚' },
  { code: 'ETH', name: '埃塞俄比亚' },
  { code: 'FIN', name: '芬兰' },
  { code: 'FJI', name: '斐济' },
  { code: 'FRA', name: '法国' },
  { code: 'FSM', name: '密克罗尼西亚' },
  { code: 'GAB', name: '加蓬' },
  { code: 'GBR', name: '英国' },
  { code: 'GEO', name: '格鲁吉亚' },
  { code: 'GHA', name: '加纳' },
  { code: 'GIN', name: '几内亚' },
  { code: 'GMB', name: '冈比亚' },
  { code: 'GNB', name: '几内亚比绍' },
  { code: 'GNQ', name: '赤道几内亚' },
  { code: 'GRC', name: '希腊' },
  { code: 'GRD', name: '格林纳达' },
  { code: 'GTM', name: '危地马拉' },
  { code: 'GUY', name: '圭亚那' },
  { code: 'HND', name: '洪都拉斯' },
  { code: 'HRV', name: '克罗地亚' },
  { code: 'HTI', name: '海地' },
  { code: 'HUN', name: '匈牙利' },
  { code: 'IDN', name: '印度尼西亚' },
  { code: 'IND', name: '印度' },
  { code: 'IRL', name: '爱尔兰' },
  { code: 'IRN', name: '伊朗' },
  { code: 'IRQ', name: '伊拉克' },
  { code: 'ISL', name: '冰岛' },
  { code: 'ISR', name: '以色列' },
  { code: 'ITA', name: '意大利' },
  { code: 'JAM', name: '牙买加' },
  { code: 'JOR', name: '约旦' },
  { code: 'JPN', name: '日本' },
  { code: 'KAZ', name: '哈萨克斯坦' },
  { code: 'KEN', name: '肯尼亚' },
  { code: 'KGZ', name: '吉尔吉斯斯坦' },
  { code: 'KHM', name: '柬埔寨' },
  { code: 'KIR', name: '基里巴斯' },
  { code: 'KNA', name: '圣基茨和尼维斯' },
  { code: 'KOR', name: '韩国' },
  { code: 'KWT', name: '科威特' },
  { code: 'LAO', name: '老挝' },
  { code: 'LBN', name: '黎巴嫩' },
  { code: 'LBR', name: '利比里亚' },
  { code: 'LBY', name: '利比亚' },
  { code: 'LCA', name: '圣卢西亚' },
  { code: 'LIE', name: '列支敦士登' },
  { code: 'LKA', name: '斯里兰卡' },
  { code: 'LSO', name: '莱索托' },
  { code: 'LTU', name: '立陶宛' },
  { code: 'LUX', name: '卢森堡' },
  { code: 'LVA', name: '拉脱维亚' },
  { code: 'MAR', name: '摩洛哥' },
  { code: 'MCO', name: '摩纳哥' },
  { code: 'MDA', name: '摩尔多瓦' },
  { code: 'MDG', name: '马达加斯加' },
  { code: 'MDV', name: '马尔代夫' },
  { code: 'MEX', name: '墨西哥' },
  { code: 'MHL', name: '马绍尔群岛' },
  { code: 'MKD', name: '北马其顿' },
  { code: 'MLI', name: '马里' },
  { code: 'MLT', name: '马耳他' },
  { code: 'MMR', name: '缅甸' },
  { code: 'MNE', name: '黑山' },
  { code: 'MNG', name: '蒙古' },
  { code: 'MOZ', name: '莫桑比克' },
  { code: 'MRT', name: '毛里塔尼亚' },
  { code: 'MUS', name: '毛里求斯' },
  { code: 'MWI', name: '马拉维' },
  { code: 'MYS', name: '马来西亚' },
  { code: 'NAM', name: '纳米比亚' },
  { code: 'NER', name: '尼日尔' },
  { code: 'NGA', name: '尼日利亚' },
  { code: 'NIC', name: '尼加拉瓜' },
  { code: 'NLD', name: '荷兰' },
  { code: 'NOR', name: '挪威' },
  { code: 'NPL', name: '尼泊尔' },
  { code: 'NRU', name: '瑙鲁' },
  { code: 'NZL', name: '新西兰' },
  { code: 'OMN', name: '阿曼' },
  { code: 'PAK', name: '巴基斯坦' },
  { code: 'PAN', name: '巴拿马' },
  { code: 'PER', name: '秘鲁' },
  { code: 'PHL', name: '菲律宾' },
  { code: 'PLW', name: '帕劳' },
  { code: 'PNG', name: '巴布亚新几内亚' },
  { code: 'POL', name: '波兰' },
  { code: 'PRI', name: '波多黎各' },
  { code: 'PRK', name: '朝鲜' },
  { code: 'PRT', name: '葡萄牙' },
  { code: 'PRY', name: '巴拉圭' },
  { code: 'PSE', name: '巴勒斯坦' },
  { code: 'QAT', name: '卡塔尔' },
  { code: 'ROU', name: '罗马尼亚' },
  { code: 'RUS', name: '俄罗斯' },
  { code: 'RWA', name: '卢旺达' },
  { code: 'SAU', name: '沙特阿拉伯' },
  { code: 'SDN', name: '苏丹' },
  { code: 'SEN', name: '塞内加尔' },
  { code: 'SGP', name: '新加坡' },
  { code: 'SLB', name: '所罗门群岛' },
  { code: 'SLE', name: '塞拉利昂' },
  { code: 'SLV', name: '萨尔瓦多' },
  { code: 'SMR', name: '圣马力诺' },
  { code: 'SOM', name: '索马里' },
  { code: 'SRB', name: '塞尔维亚' },
  { code: 'SSD', name: '南苏丹' },
  { code: 'STP', name: '圣多美和普林西比' },
  { code: 'SUR', name: '苏里南' },
  { code: 'SVK', name: '斯洛伐克' },
  { code: 'SVN', name: '斯洛文尼亚' },
  { code: 'SWE', name: '瑞典' },
  { code: 'SWZ', name: '斯威士兰' },
  { code: 'SYC', name: '塞舌尔' },
  { code: 'SYR', name: '叙利亚' },
  { code: 'TCD', name: '乍得' },
  { code: 'TGO', name: '多哥' },
  { code: 'THA', name: '泰国' },
  { code: 'TJK', name: '塔吉克斯坦' },
  { code: 'TKM', name: '土库曼斯坦' },
  { code: 'TLS', name: '东帝汶' },
  { code: 'TON', name: '汤加' },
  { code: 'TTO', name: '特立尼达和多巴哥' },
  { code: 'TUN', name: '突尼斯' },
  { code: 'TUR', name: '土耳其' },
  { code: 'TUV', name: '图瓦卢' },
  { code: 'TZA', name: '坦桑尼亚' },
  { code: 'UGA', name: '乌干达' },
  { code: 'UKR', name: '乌克兰' },
  { code: 'URY', name: '乌拉圭' },
  { code: 'USA', name: '美国' },
  { code: 'UZB', name: '乌兹别克斯坦' },
  { code: 'VCT', name: '圣文森特和格林纳丁斯' },
  { code: 'VEN', name: '委内瑞拉' },
  { code: 'VNM', name: '越南' },
  { code: 'VUT', name: '瓦努阿图' },
  { code: 'WSM', name: '萨摩亚' },
  { code: 'YEM', name: '也门' },
  { code: 'ZAF', name: '南非' },
  { code: 'ZMB', name: '赞比亚' },
  { code: 'ZWE', name: '津巴布韦' }
]

// 过滤国家列表
const filteredCountries = computed(() => {
  if (!searchQuery.value) return []
  const query = searchQuery.value.toLowerCase()
  return countries.filter(c => 
    c.name.toLowerCase().includes(query) || 
    c.code.toLowerCase().includes(query)
  )
})

// 选择国家
function selectCountry(code) {
  store.setSelectedCountries([code], true) 
  searchQuery.value = ''
  isSearchFocused.value = false
}

// 清除搜索
function clearSearch() {
  searchQuery.value = ''
  store.setSelectedCountries([])
}

onMounted(() => {
  // 初始化 Scrollama 滚动监听
  scroller = scrollama()

  scroller
    .setup({
      step: '#section1 .step',
      offset: 0.5,
      debug: false
    })
    .onStepEnter((response) => {
      const el = response.element
      
      // 激活当前步骤样式
      el.classList.add('is-active')
      
      // 更新全局状态
      if (el.dataset.time) {
        store.currentTime = el.dataset.time
      }
      
      // 确保图表类型为脉冲地图
      store.setActiveChart('pulseMap')
      
      // 根据步骤设置时间范围
      if (el.dataset.rangeStart && el.dataset.rangeEnd) {
        store.setTimeRange(el.dataset.rangeStart, el.dataset.rangeEnd)
      }
    })
    .onStepExit((response) => {
      response.element.classList.remove('is-active')
    })

  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  if (scroller) {
    scroller.destroy()
  }
  window.removeEventListener('resize', handleResize)
})

function handleResize() {
  if (scroller) scroller.resize()
}
</script>

<template>
  <section id="section1" class="scrollama-section">
    <!-- 左侧 sticky 脉冲地图 -->
    <div class="sticky-graphic" :class="{ 'graphic-interactive': mapInteractive }">
      <!-- 地图交互模式提示 -->
      <div v-if="mapInteractive" class="map-mode-hint">地图交互模式 — 滚轮缩放 · 拖拽平移 · 点击右侧文字退出</div>
      <!-- 国家搜索框 -->
      <div class="country-search">
        <div class="search-input-wrapper">
          <input
            type="text"
            v-model="searchQuery"
            @focus="isSearchFocused = true"
            @blur="setTimeout(() => isSearchFocused = false, 200)"
            placeholder="搜索国家..."
            class="search-input"
          />
          <button v-if="searchQuery" @click="clearSearch" class="clear-btn">×</button>
        </div>
        <div v-if="isSearchFocused && filteredCountries.length > 0" class="search-results">
          <button
            v-for="country in filteredCountries"
            :key="country.code"
            @mousedown.prevent="selectCountry(country.code)"
            class="search-result-item"
          >
            <span class="country-code">{{ country.code }}</span>
            <span class="country-name">{{ country.name }}</span>
          </button>
        </div>
      </div>
      <GlobalPulseMap :interactive="mapInteractive" @map-activated="activateMap" />
    </div>

    <!-- 右侧滚动文字 -->
    <div class="scroll-text" ref="scrollTextRef" :class="{ 'text-locked': mapInteractive }" @click="deactivateMap">
      <!-- 步骤 1：武汉爆发 -->
      <div class="step" data-step="1" data-time="2020-01-12" data-range-start="2020-01-01" data-range-end="2020-06-30">
        <h3>一种新型病毒开始蔓延</h3>
        <p>
          2019 年末，中国武汉报告了多例原因不明的肺炎病例。2020 年 1 月 12 日，世界卫生组织正式将这种新型冠状病毒命名为"2019-nCoV"。
          彼时，大多数人尚未意识到，一场席卷全球的公共卫生危机正在悄然展开。
        </p>
        <p>
          在最初几周里，病毒以惊人的速度在人群中传播。确诊病例从数十例迅速攀升至数千例，
          城市的医院开始承受巨大的压力。1 月 23 日，武汉实施了史无前例的封城措施——
          这成为人类防疫史上最具争议但也最具标志性的决策之一。
        </p>
      </div>

      <!-- 步骤 2：全球扩散 -->
      <div class="step" data-step="2" data-time="2020-02-15" data-range-start="2020-01-01" data-range-end="2020-06-30">
        <h3>从局部暴发到全球扩散</h3>
        <p>
          尽管各国在 1 月中旬便陆续启动了边境管控，但病毒早已随着国际航班悄然传播。
          到 2 月中旬，东亚的韩国和日本、欧洲的意大利和法国、北美洲的美国都出现了社区传播的迹象。
          世界地图上的红色光点开始此起彼伏地亮起，每一个闪烁都代表着一条新的传播链。
        </p>
        <p>
          值得注意的是，各国检测能力的差异导致了报告病例数的巨大落差。
          有些国家看似"安全"，实际上只是因为没有进行足够的检测。
          这种信息不对称为后续的政策分歧埋下了伏笔。
        </p>
      </div>

      <!-- 步骤 3：大流行宣告 -->
      <div class="step" data-step="3" data-time="2020-03-11" data-range-start="2020-01-01" data-range-end="2020-06-30">
        <h3>世卫组织宣布全球大流行</h3>
        <p>
          2020 年 3 月 11 日，世界卫生组织总干事谭德塞正式宣布新冠肺炎为"全球大流行病"（Pandemic）。
          此刻，全球 114 个国家报告了超过 11.8 万例病例，超过 4200 人因此丧生。
          这个宣告如同一声惊雷，终于唤醒了许多仍在观望的政府。
        </p>
        <p>
          在接下来的数周内，全球每日新增病例呈指数级增长。地图上的脉冲光圈不断扩散，
          从最初的几个热点迅速蔓延到几乎每一个有人居住的大洲。
          人类正在面对一个多世纪以来最严峻的公共卫生挑战。
        </p>
      </div>

      <!-- 步骤 4：第一波高峰 -->
      <div class="step" data-step="4" data-time="2020-04-15" data-range-start="2020-01-01" data-range-end="2020-06-30">
        <h3>第一波疫情高峰</h3>
        <p>
          到 2020 年 4 月中旬，全球单日新增病例突破 8 万例。
          欧洲成为疫情的中心——意大利北部的医院不堪重负，西班牙的死亡病例急剧上升，
          纽约市的 ICU 病床几乎用尽。与此同时，南半球的巴西和南非也开始经历快速传播。
        </p>
        <p>
          然而，就在大多数国家还在苦苦应对第一波冲击时，东亚的几个经济体已经初步控制住了疫情。
          这种鲜明的对比引发了全球范围内的反思：
          同样面对一种全新的病毒，为什么有些国家的应对如此高效，而另一些却步履维艰？
          答案很大程度上与一个因素有关——<strong>政策的响应时机</strong>。
        </p>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* 地图交互模式 — 左侧图表区激活态 */
.graphic-interactive {
  outline: 2px solid rgba(233, 69, 96, 0.5);
  outline-offset: -2px;
  z-index: 5;
}

/* 地图模式提示条 */
.map-mode-hint {
  position: absolute;
  top: 10px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(233, 69, 96, 0.9);
  color: #fff;
  padding: 6px 20px;
  border-radius: 20px;
  font-size: 0.75rem;
  z-index: 30;
  pointer-events: none;
  white-space: nowrap;
  animation: fade-in 0.3s ease;
}

/* 右侧文字锁定态 — 降低视觉活跃度，点击可退出地图模式 */
.text-locked {
  opacity: 0.45;
  transition: opacity 0.3s ease;
}

.text-locked:hover {
  opacity: 0.8;
}
</style>