<!-- Section6PolicyReview.vue -->
<template>
  <section id="section6" class="scrollama-section">
    <!-- 左侧 sticky 热力矩阵（宽度更大） -->
    <div class="sticky-graphic">
      <PolicyHeatmap />
    </div>

    <!-- 右侧滚动文字（宽度更小） -->
    <div class="scroll-text" ref="scrollTextRef">
      <div class="step" data-step="1">
        <h3>解码政策组合的"配方"</h3>
        <p>
          疫情两年半，各国政策选择如同调配一副复杂的药剂。这张热力矩阵图将 5 个政策维度（封锁、检测、口罩、疫苗、边境）
          两两组合，颜色深浅代表采取该组合的国家在疫情控制上的平均表现。<strong>绿色越亮，效果越好</strong>。
        </p>
        <p>
          矩阵清晰揭示了一个规律：<strong>深绿色区域集中在"口罩+封锁"和"口罩+检测"这两个交叉点</strong>。
          这正是东亚经济体（韩国、日本、新加坡、中国等）的核心策略——用口罩作为基础防线，
          结合封锁或检测形成双重保障。
        </p>
      </div>

      <div class="step" data-step="2">
        <h3>最佳组合：口罩 + 封锁 / 口罩 + 检测</h3>
        <p>
          在热力矩阵中，<strong>口罩+封锁</strong>和<strong>口罩+检测</strong>两个组合的绿色最深，表现最为突出。
          采用这些组合的国家平均确诊下降率达到 <strong>96.2%</strong>，死亡率下降率超过 <strong>96%</strong>。
        </p>
        <p>
          数据回归分析揭示了清晰的因果链：
        </p>
        <ul style="margin: 0.5rem 0 0.5rem 1.2rem; line-height: 1.7;">
          <li><strong>口罩+封锁</strong>：物理防护阻断飞沫传播 + 减少人员接触，形成双重阻断机制，效果最佳</li>
          <li><strong>口罩+检测</strong>：日常防护降低感染风险 + 早发现早隔离，压制社区传播最有效</li>
          <li><strong>检测+边境</strong>：外防输入 + 内防扩散，为岛国和半岛国家提供天然优势</li>
        </ul>
        <div class="insight-box">
          <strong>核心发现</strong>：<strong>"口罩不是万能的，但没有口罩是万万不能的"</strong>
            <p>
          那些在疫情初期重视口罩政策、将口罩与封锁或检测相结合的国家，以更低的社会经济代价换取了更好的防控效果。
          而忽视口罩、仅依赖封锁的国家，则付出了更高的人均死亡代价。
        </p>
        </div>
      </div>


      <div class="step" data-step="3">
        <h3>为下一次大流行做好准备</h3>
        <p>
          新冠终将过去，但不会是最后一次。从这些数据中，我们提炼出一份面向未来的"准备清单"：
        </p>
        <ul style="margin: 0.5rem 0 0.5rem 1.2rem; line-height: 1.8;">
          <li><strong>口罩储备与文化</strong>：建立战略储备体系，培养"生病戴口罩"的社会规范</li>
          <li><strong>检测产能储备</strong>：快速诊断技术的战略储备与快速分发机制</li>
          <li><strong>全球监测网络</strong>：建立实时病毒变异追踪与早期预警系统</li>
          <li><strong>疫苗研发平台</strong>：mRNA等前沿技术的持续投入与产能保障</li>
          <li><strong>数据共享机制</strong>：跨国界的实时疫情数据交换与协同应对</li>
          <li><strong>公众信任建设</strong>：科学传播与风险沟通能力的长效机制</li>
        </ul>
        <p>
          数据可视化不仅是讲述过去的故事——它更重要的是，<strong>为未来的决策提供可执行的洞见</strong>。
          愿我们不会忘记 2020 到 2022 的教训，也愿我们从中汲取足够的智慧。
        </p>
      </div>
    </div>
  </section>
</template>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { useGlobalStore } from '@/stores/global'
import PolicyHeatmap from '@/components/PolicyHeatmap.vue'
import scrollama from 'scrollama'

const store = useGlobalStore()
const scrollTextRef = ref(null)
let scroller = null

onMounted(() => {
  scroller = scrollama()

  scroller
    .setup({
      step: '#section6 .step',
      offset: 0.5,
      debug: false
    })
    .onStepEnter((response) => {
      const el = response.element
      el.classList.add('is-active')
      store.setActiveChart('policyHeatmap')
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
/* 缩小右侧文字区域，让图表与文字更紧凑 */
.scroll-text {
  flex: 0 0 420px;
  max-width: 420px;
}

@media (max-width: 1280px) {
  .scroll-text {
    flex: 0 0 380px;
    max-width: 380px;
  }
}

@media (max-width: 1200px) {
  .scroll-text {
    flex: 0 0 360px;
    max-width: 360px;
  }
}

@media (max-width: 1024px) {
  .scroll-text {
    flex: 0 0 340px;
    max-width: 340px;
  }
}
</style>
