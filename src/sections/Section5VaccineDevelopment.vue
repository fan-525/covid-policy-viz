<!-- Section5VaccineHope.vue -->
<template>
  <section id="section5" class="scrollama-section">
    <!-- 左侧 sticky 疫苗脉冲地图 -->
    <div class="sticky-graphic" :class="{ 'graphic-interactive': mapInteractive }">
      <div v-if="mapInteractive" class="map-mode-hint">地图交互模式 — 滚轮缩放 · 拖拽平移 · 点击右侧文字退出</div>
      <VaccinePulseMap :interactive="mapInteractive" @map-activated="activateMap" />
    </div>

    <!-- 右侧滚动文字 -->
    <div class="scroll-text" ref="scrollTextRef" :class="{ 'text-locked': mapInteractive }" @click="deactivateMap">
      <div class="step" data-step="1" data-time="2020-12-15" data-range-start="2021-01-01" data-range-end="2021-12-31">
        <h3>科学史上的奇迹</h3>
        <p>
          2020 年 12 月，90 岁的英国祖母玛格丽特·基南成为全球首位新冠疫苗接种者。
          这一刻距离病毒基因序列公布仅过去 11 个月——这是人类疫苗研发史上从未有过的速度。
          mRNA 技术的成熟、全球科学家的开放共享、各国政府前所未有的投资，多重因素汇聚成了一场奇迹。
        </p>
        <p>
          到 2021 年底，全球已有 40 多款疫苗获批使用，超过 80 亿剂次完成接种。
          地图上的<span class="text-highlight-green">绿色脉冲</span>代表着疫苗政策强度——圆环越大，表示该国的疫苗接种推进力度越强。
        </p>
      </div>

      <div class="step" data-step="2" data-time="2021-06-15" data-range-start="2021-01-01" data-range-end="2021-12-31">
        <h3>与 Delta 赛跑的接种运动</h3>
        <p>
          2021 年夏天，Delta 变异株的快速传播让疫苗接种变得比任何时候都紧迫。
          以色列率先实现了 60% 的人口完全接种，随后推出"绿色通行证"制度——
          持有疫苗证明的民众才能进入餐厅、健身房等公共场所。英国紧随其后，
          美国在 4 月达到了每日 400 万剂次的接种高峰。
        </p>
        <p>
          疫苗的效果立竿见影。在以色列、英国等高接种率国家，尽管 Delta 仍在传播，
          但住院率和死亡率出现了断崖式下降。这验证了公共卫生专家长期坚持的核心论点：
          <strong>疫苗的主要目标不是阻断所有感染，而是大幅降低重症和死亡风险。</strong>
        </p>
        <div class="stat-grid">
          <div class="stat-card">
            <div class="stat-number">80亿+</div>
            <div class="stat-label">全球接种总剂次</div>
          </div>
          <div class="stat-card">
            <div class="stat-number">90%</div>
            <div class="stat-label">重症保护率</div>
          </div>
          <div class="stat-card">
            <div class="stat-number">11个月</div>
            <div class="stat-label">从基因序列到疫苗</div>
          </div>
        </div>
      </div>

      <div class="step" data-step="3" data-time="2021-12-15" data-range-start="2021-01-01" data-range-end="2021-12-31">
        <h3>疫苗鸿沟：无法忽视的不平等</h3>
        <p>
          2021 年底，当欧美国家已经开始讨论加强针时，非洲大陆的完整接种率仍不足 10%。
          地图上，非洲地区的绿色脉冲基本上都很小。这种不平等不仅是道德问题，
          更是现实的全球卫生威胁——低接种地区成为病毒持续变异的温床。
          Omicron 在南非被发现，绝非偶然。
        </p>
        <p>
          COVAX 机制虽然努力填补缺口，但"疫苗民族主义"的阴影始终挥之不去。
          这张地图的明暗对比，正是全球卫生治理最深刻的教训之一：
          <strong>病毒不分国界，保护不均衡最终会让所有人付出代价。</strong>
        </p>
        <div class="warning-box">
          <span class="warning-icon">⚠</span>
          <span>部分低收入国家疫苗政策强度较低，疫苗接种率不足 10%，Omicron 等新变异株在此诞生并蔓延全球</span>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { useGlobalStore } from '@/stores/global'
import VaccinePulseMap from '@/components/VaccinePulseMap.vue'
import scrollama from 'scrollama'

const store = useGlobalStore()
const scrollTextRef = ref(null)
const mapInteractive = ref(false)
let scroller = null

function activateMap() { mapInteractive.value = true }
function deactivateMap() { mapInteractive.value = false }

onMounted(() => {
  scroller = scrollama()

  scroller
    .setup({
      step: '#section5 .step',
      offset: 0.5,
      debug: false
    })
    .onStepEnter((response) => {
      const el = response.element
      el.classList.add('is-active')
      
      store.setActiveChart('vaccinePulseMap')
      
      if (el.dataset.time) {
        store.currentTime = el.dataset.time
      }
      
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
  if (scroller) scroller.destroy()
  window.removeEventListener('resize', handleResize)
})

function handleResize() {
  if (scroller) scroller.resize()
}
</script>

<style scoped>
.graphic-interactive {
  outline: 2px solid rgba(233, 69, 96, 0.5);
  outline-offset: -2px;
  z-index: 5;
}

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

.text-locked {
  opacity: 0.45;
  transition: opacity 0.3s ease;
}

.text-locked:hover {
  opacity: 0.8;
}
</style>
