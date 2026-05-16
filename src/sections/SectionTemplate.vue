<template>
  <section class="scrollama-section">
    <div class="sticky-graphic">
      <div class="chart-placeholder">
        <h2>图表展示区</h2>
        <p>当前选中的国家: {{ store.selectedCountries.join(', ') || '无' }}</p>
      </div>
    </div>

    <div class="scroll-text" ref="scrollTextRef">
      <div class="step" data-step="1" data-time="2020-01-01">
        <h3>章节标题</h3>
        <p>这里是叙事文本段落 1。当这段文字滚动到屏幕中间时，图表会产生对应的联动响应。</p>
      </div>
      
      <div class="step" data-step="2" data-time="2020-06-01">
        <h3>关键节点</h3>
        <p>这里是叙事文本段落 2。各国纷纷采取封锁措施，但时机大不相同。</p>
      </div>
    </div>
  </section>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useGlobalStore } from '@/stores/global'
import scrollama from 'scrollama'

const store = useGlobalStore()
const scrollTextRef = ref(null)

onMounted(() => {
  // 初始化 Scrollama
  const scroller = scrollama()

  scroller
    .setup({
      step: '.scrollama-section .step',
      offset: 0.5, // 当文字到达屏幕 50% 高度时触发
      debug: false // 开发时可以设为 true 查看触发线
    })
    .onStepEnter((response) => {
      // 当文字滚动进入触发区域时执行
      const stepElement = response.element;
      
      // 更新全局状态，驱动左侧图表变化
      if (stepElement.dataset.time) {
        store.currentTime = stepElement.dataset.time;
      }
      
      // 给当前文字段落添加高亮样式
      stepElement.classList.add('is-active');
    })
    .onStepExit((response) => {
      response.element.classList.remove('is-active');
    })
    
  // 响应窗口大小变化
  window.addEventListener('resize', scroller.resize);
})
</script>
