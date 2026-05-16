<script setup>
/**
 * Section2PolicyResponse.vue — 章节2：各国纷纷采取封锁措施，但时机大不相同
 * 
 * 布局：左侧 sticky 时间线 + 右侧滚动文字
 * 滚动行为：
 * - 进入章节 → 切换到时间线图表
 * - 步骤 1 → 高亮韩国（早期响应代表）
 * - 步骤 2 → 对比高亮美国、意大利（晚期响应代表）
 * - 步骤 3 → 全景展示
 * 
 * 图表：PolicyTimeline
 */
import { onMounted, onUnmounted, ref } from 'vue'
import { useGlobalStore } from '@/stores/global'
import PolicyTimeline from '@/components/PolicyTimeline.vue'
import scrollama from 'scrollama'

const store = useGlobalStore()
const scrollTextRef = ref(null)
let scroller = null

onMounted(() => {
  scroller = scrollama()

  scroller
    .setup({
      step: '#section2 .step',
      offset: 0.5,
      debug: false
    })
    .onStepEnter((response) => {
      const el = response.element
      el.classList.add('is-active')
      
      // 切换到时间线图表
      store.setActiveChart('timeline')
      
      // 更新时间点
      if (el.dataset.time) {
        store.currentTime = el.dataset.time
      }

      // 关键修改：仅当用户没有手动选择国家时，才自动切换
      // 注意：这里需要读取 store.userManuallySelected 状态
      if (!store.userManuallySelected) {
        const countries = el.dataset.countries
        if (countries) {
          // 通过滚动设置的国家，标记为非手动（不覆盖用户的主动选择）
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
  window.removeEventListener('resize', handleResize)
})

function handleResize() {
  if (scroller) scroller.resize()
}
</script>

<template>
  <section id="section2" class="scrollama-section">
    <!-- 左侧 sticky 时间线 -->
    <div class="sticky-graphic">
      <PolicyTimeline :show-slider="false" :focus-mode="false" />
    </div>

    <!-- 右侧滚动文字 -->
    <div class="scroll-text" ref="scrollTextRef">
      <!-- 步骤 1：韩国的早期响应 -->
      <div class="step" data-step="1" data-time="2020-02-20" data-countries="KOR" data-range-start="2020-01-01" data-range-end="2020-12-31">
        <h3>韩国：迅速而精准的响应</h3>
        <p>
          当大多数国家还在观望时，韩国已经在悄然行动。早在 1 月 20 日韩国确诊首例病例后，
          政府便迅速启动了大规模检测和接触者追踪体系。这种"检测—追踪—隔离"的闭环策略，
          被后来证明是对抗新冠病毒最有效的方式之一。
        </p>
        <p>
          2 月中旬，大邱市爆发了与新天地教会相关的超级传播事件，单日新增一度飙升至数百例。
          然而韩国政府没有选择全面封锁城市，而是通过大规模检测（单日检测能力达 2 万次）
          和数字化接触追踪，在短短三周内就将疫情曲线压平。
          时间线上的数据清晰展示了这一"早干预、早控制"的范例。
        </p>
      </div>

      <!-- 步骤 2：意大利和美国的晚期响应 -->
      <div class="step" data-step="2" data-time="2020-03-25" data-countries="ITA,USA" data-range-start="2020-01-01" data-range-end="2020-12-31">
        <h3>意大利与美国：迟来的觉醒</h3>
        <p>
          与韩国形成鲜明对比的是，欧洲和北美的许多国家错失了宝贵的窗口期。
          意大利直到 3 月 9 日才宣布全国封锁——此时伦巴第大区的医院已经不堪重负，
          死亡人数呈指数级增长。政策的延迟使得病毒在人群中广泛传播，
          最终导致意大利成为当时全球病死率最高的国家之一。
        </p>
        <p>
          美国的情况同样令人警醒。尽管在 1 月底就确认了首例病例，
          但联邦政府在长达两个月的时间里未采取实质性的全国性防控措施。
          各州各自为政、检测标准不一、供应链断裂……一系列系统性问题导致美国在 3 月下旬经历了病例数的爆发式增长。
          看看时间线上陡然攀升的红色曲线，再对比韩国平缓的轨迹——时机，就是生与死的差距。
        </p>
      </div>

      <!-- 步骤 3：全球全景对比 -->
      <div class="step" data-step="3" data-time="2020-06-01" data-countries="KOR,USA,ITA,GBR" data-range-start="2020-01-01" data-range-end="2020-12-31">
        <h3>时机决定命运</h3>
        <p>
          回顾 2020 年上半年，一个清晰的规律浮出水面：那些在病例数仍然很低时就迅速启动防控措施的国家，
          无论是韩国、新西兰还是冰岛，都成功避免了医疗系统的崩溃，经济损失也相对可控。
          相反，那些犹豫不决、等待"更多数据"再行动的国家，最终付出了更为惨重的代价。
        </p>
        <p>
          时间线上的对比触目惊心——韩国的政策强度曲线在病例曲线还很平缓时就迅速攀升，
          而欧美国家的政策曲线则明显滞后于病例曲线。这不仅仅是反应速度的差异，
          更反映了不同国家在公共卫生治理理念上的根本分歧。
          接下来的问题是：如果这些国家能更早一步行动，结果会有多大的不同？
        </p>
      </div>
    </div>
  </section>
</template>