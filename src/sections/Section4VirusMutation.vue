<!-- Section4DeltaVariant.vue -->
<template>
  <section id="section4" class="scrollama-section">
    <!-- 左侧 sticky 雷达图 -->
    <div class="sticky-graphic">
      <WaveRadarChart />
    </div>

    <!-- 右侧滚动文字 -->
    <div class="scroll-text" ref="scrollTextRef">
      <div class="step" data-step="1">
        <h3>一种更危险的变异株</h3>
        <p>
          2021 年春天，当全球疫苗接种刚刚起步、人们开始憧憬疫情终结时，一种新的变异株在印度悄然出现。
          被世界卫生组织命名为"Delta"的 B.1.617.2 变异株，后来被证明是迄今为止传播速度最快、致病性最强的病毒变体之一。
          与原始毒株相比，Delta 的传播能力提高了约 60%，基本再生数 R0 高达 5-7——意味着一个感染者平均可以传染 5 到 7 个人。
        </p>
        <p>
          更令人担忧的是，Delta 感染者的病毒载量比原始毒株高出 1000 倍以上，潜伏期更短、传播窗口更早、无症状传播更普遍。
          左侧雷达图展示了韩国、意大利、美国在 Delta 波期间的五个关键指标对比：
          <strong>峰值、波次规模、爆发强度、持续时间、致命性</strong>。
          雷达图的面积越大，代表该国在这场冲击中承受的压力越严峻。
        </p>
      </div>

      <div class="step" data-step="2">
        <h3>韩国：成熟防疫体系的考验</h3>
        <p>
          韩国的雷达图在"峰值"和"爆发强度"等维度上相对收敛。这并非 Delta 放过了韩国，
          而是其成熟的"检测—追踪—隔离"体系再次发挥了作用。尽管 Delta 期间日增病例一度突破 2000 例，
          但得益于高效的核酸检测和数字化追踪系统，疫情始终没有出现指数级暴发。
        </p>
        <p>
          在"致命性"维度上，韩国的表现尤为突出——病死率长期维持在 1% 左右的低位。
          而在"持续时间"维度上，韩国也相对较短，这充分体现了早发现、早隔离、早治疗策略的核心优势。
          雷达图中韩国的多边形面积最小，说明其防控体系有效降低了 Delta 冲击的规模。
        </p>
      </div>

      <div class="step" data-step="3">
        <h3>意大利：Delta 的沉重一击</h3>
        <p>
          意大利的雷达图在"峰值"和"致命性"两个维度上有时格外突出。作为 2020 年欧洲疫情的第一个重灾区，
          意大利的医疗系统在首轮冲击中已经伤痕累累。Delta 来袭时，伦巴第大区的医院再次面临挤兑风险，
          重症监护室占用率一度超过 30% 的警戒线。
        </p>
        <p>
          雷达图上意大利的"波次规模"维度也明显偏高，反映出 Delta 在整个意大利境内的广泛传播。
          尽管意大利在后期推行了严格的疫苗通行证政策，但由于前期传播范围过大，
          <strong>"峰值"和"波次规模"两个维度的数据仍然触目惊心</strong>。
        </p>
      </div>

      <div class="step" data-step="4">
        <h3>美国：大面积"沦陷"</h3>
        <p>
          美国的雷达图在所有五个维度上都几乎达到极限。"峰值"维度上，美国 Delta 波单日新增一度超过 20 万例；
          "波次规模"维度上，波次总病例超过 1000 万；"爆发强度"更是惊人——日均新增超过 10 万例。
          美国南部和中西部的低疫苗接种率，使这些地区成为 Delta 的"完美培养皿"。
        </p>
        <p>
          "致命性"维度不容乐观，由于医疗系统持续承压，病死率在部分地区出现反弹。
          雷达图中美国的多边形几乎覆盖整个五边形区域，显示其防控体系在几乎所有维度上都承受了最大压力。
        </p>
        <div class="insight-box">
          <strong>核心对比</strong>：雷达图的对比揭示了一个核心结论——防控体系的成熟度，直接决定了 Delta 冲击的峰值高度、波次规模和致命性后果。
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { useGlobalStore } from '@/stores/global'
import WaveRadarChart from '@/components/WaveRadarChart.vue'
import scrollama from 'scrollama'

const store = useGlobalStore()
const scrollTextRef = ref(null)
let scroller = null

onMounted(() => {

  // 关键修复：如果用户没有选择任何一个国家，则设置默认国家
  // 如果用户已经选择了国家，则保留用户的选择
  if (!store.selectedCountries || store.selectedCountries.length === 0) {
    console.log('[Section4] 用户未选择国家，设置默认国家: KOR, ITA, USA')
    store.setSelectedCountries(['KOR', 'ITA', 'USA'], false)  // 传入 false
  } else {
    console.log('[Section4] 用户已选择国家，保留:', store.selectedCountries)
  }
  
  // 设置当前波次为第4波（Delta）
  if (store.currentWave !== 4) {
    store.currentWave = 4
  }

  scroller = scrollama()

  scroller
    .setup({
      step: '#section4 .step',
      offset: 0.5,
      debug: false
    })
    .onStepEnter((response) => {
      const el = response.element
      el.classList.add('is-active')
      store.setActiveChart('waveRadar')
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
