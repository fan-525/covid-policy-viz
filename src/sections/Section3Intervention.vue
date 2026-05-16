<script setup>
/**
 * Section3Intervention.vue — 章节3：最佳干预窗口：早一步，差千里
 * 
 * 布局：左侧 sticky 时间线（聚焦模式 + 反事实滑块）+ 右侧滚动文字
 * 滚动行为：
 * - 进入章节 → 切换到时间线聚焦模式，显示反事实推演滑块
 * - 步骤 1 → 聚焦美国，展示拐点标注
 * - 步骤 2 → 自动演示反事实推演（滑块从 -30 滑到 0）
 * - 步骤 3 → 对比结论
 * 
 * 图表：PolicyTimeline (focusMode=true, showSlider=true)
 */
import { onMounted, onUnmounted, ref } from 'vue'
import { useGlobalStore } from '@/stores/global'
import PolicyTimeline from '@/components/PolicyTimeline.vue'
import scrollama from 'scrollama'

const store = useGlobalStore()
const scrollTextRef = ref(null)
let scroller = null
let autoPlayTimer = null

onMounted(() => {
  scroller = scrollama()

  scroller
    .setup({
      step: '#section3 .step',
      offset: 0.5,
      debug: false
    })
    .onStepEnter((response) => {
      const el = response.element
      el.classList.add('is-active')

      // 切换到聚焦时间线
      store.setActiveChart('timelineFocus')
      
      // 更新时间点
      if (el.dataset.time) {
        store.currentTime = el.dataset.time
      }

      // 步骤 2 时自动演示反事实推演
      const step = parseInt(el.dataset.step)
      if (step === 2) {
        startAutoDemo()
      } else {
        stopAutoDemo()
      }

    // 设置选中国家和时间范围
      // 仅当用户没有手动选择国家时，才自动切换
      if (!store.userManuallySelected) {
        const countries = el.dataset.countries
        if (countries) {
          store.setSelectedCountries(countries.split(','), false)
        }
      }

      const rangeStart = el.dataset.rangeStart
      const rangeEnd = el.dataset.rangeEnd
      if (rangeStart && rangeEnd) {
        store.setTimeRange(rangeStart, rangeEnd)
    }
  })
    .onStepExit((response) => {
      response.element.classList.remove('is-active')
    })

  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  if (scroller) scroller.destroy()
  stopAutoDemo()
  window.removeEventListener('resize', handleResize)
})

/** 自动演示反事实推演滑块 */
function startAutoDemo() {
  stopAutoDemo()
  let shift = -30
  store.setCounterfactualShift(shift)
  
  autoPlayTimer = setInterval(() => {
    shift += 1
    store.setCounterfactualShift(shift)
    if (shift >= 0) {
      stopAutoDemo()
    }
  }, 200) // 每 200ms 移动一天
}

function stopAutoDemo() {
  if (autoPlayTimer) {
    clearInterval(autoPlayTimer)
    autoPlayTimer = null
  }
}

function handleResize() {
  if (scroller) scroller.resize()
}
</script>

<template>
  <section id="section3" class="scrollama-section">
    <!-- 左侧 sticky 时间线（聚焦模式 + 反事实滑块）-->
    <div class="sticky-graphic">
      <PolicyTimeline :show-slider="true" :focus-mode="true" />
    </div>

    <!-- 右侧滚动文字 -->
    <div class="scroll-text" ref="scrollTextRef">
      <!-- 步骤 1：识别最佳干预窗口 -->
      <div class="step" data-step="1" data-time="2020-03-15" data-countries="USA" data-range-start="2020-01-01" data-range-end="2020-12-31">
        <h3>什么是"最佳干预窗口"？</h3>
        <p>
          流行病学中有一个关键概念叫做"拐点"——当病例的增速从加速转为减速的那一刻。
          在这个拐点到来之前的一段短暂时间窗口，就是公共卫生专家所说的"最佳干预窗口"。
          在此期间采取强有力的防控措施，可以用最小的代价获得最大的效果。
        </p>
        <p>
          观察美国的时间线：橙色虚线标注的就是这个关键拐点。
          遗憾的是，美国在拐点到来之前并未采取足够的措施。
          政策强度的上升（下方的彩色面积图）明显滞后于病例曲线的攀升。
          那条从政策出台日到病例拐点之间的蓝色虚线，就是被错失的宝贵时间。
        </p>
      </div>

      <!-- 步骤 2：反事实推演（自动演示）-->
      <div class="step" data-step="2" data-time="2020-03-15" data-countries="USA" data-range-start="2020-01-01" data-range-end="2020-12-31">
        <h3>如果政策提前 30 天？</h3>
        <p>
          现在让我们做一个思想实验：如果美国的防控政策提前 30 天实施，会发生什么？
          看看时间线下方的滑块正在自动演示这个过程。
        </p>
        <p>
          蓝色的虚线代表模拟曲线。随着政策提前天数的增加，
          你可以清晰地看到模拟病例曲线明显低于实际曲线——特别是在疫情初期的关键阶段。
          这意味着更少的感染、更少的住院、更少的死亡。根据我们的简化模型估算，
          如果政策提前 30 天，美国在第一波疫情中的病例数可能减少超过 60%。
        </p>
        <p>
          你也可以手动拖动滑块来探索不同的情景。
          试着将滑块向右拖动（延后干预），你会看到模拟曲线变得更加陡峭——
          那是另一个极端：更晚的干预意味着更惨烈的代价。
        </p>
      </div>

      <!-- 步骤 3：结论与反思 -->
      <div class="step" data-step="3" data-time="2020-06-01" data-countries="KOR,USA,ITA" data-range-start="2020-01-01" data-range-end="2020-12-31">
        <h3>早一步，差千里</h3>
        <p>
          2020 年的疫情留给全人类一个刻骨铭心的教训：在面对新型传染病时，
          时间是最宝贵的资源，而犹豫是最大的敌人。韩国的成功和欧美的挫折不是偶然——
          它们是决策时机差异的直接后果。流行病学模型反复证明：
          在疫情初期提前一周采取干预措施，其效果可能比后期采取一个月的措施还要显著。
        </p>
        <p>
          这个发现不仅仅是历史的回顾，更是面向未来的警示。
          当下一次大流行来临——科学家们说这不是"如果"而是"何时"——
          我们是否能从新冠的教训中学到足够的智慧？
          及早监测、快速响应、果断行动——这不仅是一个国家的责任，更是全球协作的考验。
        </p>
        <p>
          <em>继续向下滚动，探索后续章节中更多关于政策细节与波次特征的深入分析。</em>
        </p>
      </div>
    </div>
  </section>
</template>