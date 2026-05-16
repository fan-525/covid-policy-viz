<script setup>
/**
 * App.vue — 主应用入口
 * 职责：加载数据、显示加载状态、组织滚动章节
 */
import { onMounted, computed, ref, onUnmounted } from 'vue'
import { useGlobalStore } from '@/stores/global'
import Section1VirusSpread from '@/sections/Section1VirusSpread.vue'
import Section2PolicyResponse from '@/sections/Section2PolicyResponse.vue'
import Section3Intervention from '@/sections/Section3Intervention.vue'
import Section4VirusMutation from '@/sections/Section4VirusMutation.vue'
import Section5VaccineDevelopment from '@/sections/Section5VaccineDevelopment.vue'
import Section6PolicyComparison from '@/sections/Section6PolicyComparison.vue'
import DocumentationSection from '@/sections/DocumentationSection.vue'

const store = useGlobalStore()
const scrollProgress = ref(0)
const scrollHintRef = ref(null)

onMounted(async () => {
  await store.fetchAllData()
  // 初始化时间
  store.currentTime = '2020-01-05'

  // 监听滚动以更新进度条 + 弹簧效果
  window.addEventListener('scroll', onScroll, { passive: true })

  // 3 秒后自动淡出滚动提示
  setTimeout(() => {
    if (scrollHintRef.value) {
      scrollHintRef.value.classList.add('fade-out')
    }
  }, 3000)
})

onUnmounted(() => {
  window.removeEventListener('scroll', onScroll)
})

function updateScrollProgress() {
  const scrollTop = window.scrollY
  const docHeight = document.documentElement.scrollHeight - window.innerHeight
  scrollProgress.value = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0
}

function onScroll() {
  updateScrollProgress()
}

const isLoading = computed(() => store.isLoading)

// 章节信息
const chapters = [
  { id: 'section1', label: '病毒蔓延' },
  { id: 'section2', label: '政策响应' },
  { id: 'section3', label: '干预窗口' },
  { id: 'section4', label: '病毒变异' },
  { id: 'section5', label: '疫苗研发' },
  { id: 'section6', label: '政策对比' },
  { id: 'documentation', label: '说明文档' }
]

function scrollToChapter(id) {
  const el = document.getElementById(id)
  if (el) {
    el.scrollIntoView({ behavior: 'smooth' })
  }
}
</script>

<template>
  <!-- 加载屏幕 -->
  <div v-if="isLoading" class="loading-screen">
    <div class="loading-spinner"></div>
    <div class="loading-text">正在加载数据...</div>
  </div>

  <!-- 主内容 -->
  <div v-else>
    <!-- 章节导航指示器 -->
    <nav class="chapter-nav" aria-label="章节导航">
      <div class="nav-progress-bar">
        <div class="nav-progress-fill" :style="{ width: scrollProgress + '%' }"></div>
      </div>
      <div class="nav-dots">
        <button 
          v-for="chapter in chapters" 
          :key="chapter.id"
          class="nav-dot"
          @click="scrollToChapter(chapter.id)"
          :title="chapter.label"
        >
          <span class="dot-label">{{ chapter.label }}</span>
        </button>
      </div>
    </nav>

    <!-- 标题区 -->
    <header class="hero-header">
      <h1>病毒与政策：一场全球博弈</h1>
      <p class="subtitle">
        当一种新型病毒席卷全球，各国的应对时机和力度如何塑造了疫情的走向？
        通过交互式数据叙事，重新回溯这场人类与病毒的赛跑。
      </p>
      <div ref="scrollHintRef" class="scroll-hint">↓ 向下滚动开始探索</div>
    </header>

    <div class="section-divider" aria-hidden="true"></div>

    <!-- 章节 1：一种新型病毒开始蔓延 -->
    <Section1VirusSpread />

    <div class="section-divider" aria-hidden="true"></div>

    <!-- 章节 2：各国纷纷采取封锁措施 -->
    <Section2PolicyResponse />

    <div class="section-divider" aria-hidden="true"></div>

    <!-- 章节 3：最佳干预窗口 -->
    <Section3Intervention />

    <div class="section-divider" aria-hidden="true"></div>

    <!-- 章节 4：病毒变异 -->
    <Section4VirusMutation />

    <div class="section-divider" aria-hidden="true"></div>

    <!-- 章节 5：疫苗研发 -->
    <Section5VaccineDevelopment />

    <div class="section-divider" aria-hidden="true"></div>

    <!-- 章节 6：政策对比 -->
    <Section6PolicyComparison />

    <div class="section-divider" aria-hidden="true"></div>

    <!-- 说明文档 -->
    <DocumentationSection />
  </div>
</template>
