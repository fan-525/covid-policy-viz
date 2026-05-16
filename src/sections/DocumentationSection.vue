<script setup>
/**
 * DocumentationSection.vue — 项目说明文档
 * 职责：以独立页面形式展示项目的研究问题、设计决策、外部资源引用和开发流程
 */
</script>

<template>
  <section id="documentation" class="doc-section">
    <div class="doc-container">
      <!-- 页面标题 -->
      <div class="doc-header">
        <h1 class="doc-title">项目说明文档</h1>
        <p class="doc-subtitle">病毒与政策：一场全球博弈 — 交互式数据可视化</p>
      </div>

      <!-- 第一部分：研究问题 -->
      <div class="doc-chapter">
        <div class="doc-chapter-number">01</div>
        <h2 class="doc-chapter-title">研究问题</h2>
        <div class="doc-chapter-body">
          <p>本可视化方案旨在解答以下三个核心问题：</p>
          <div class="doc-question-list">
            <div class="doc-question-item">
              <div class="question-icon">Q1</div>
              <div class="question-content">
                <h3>疫情传播与政策响应之间有何动态博弈关系？</h3>
                <p>新冠疫情在全球范围内的传播并非匀速进行，而是呈现出明显的波次特征。与此同时，各国政府的政策响应也在不断调整。我们希望探究：病毒传播的节奏与政策力度变化之间，是否存在可识别的联动模式？政策的收紧与放松，是否与疫情波峰存在系统性的时间关联？</p>
              </div>
            </div>
            <div class="doc-question-item">
              <div class="question-icon">Q2</div>
              <div class="question-content">
                <h3>不同政策组合的防疫效果差异有多大？</h3>
                <p>各国采取的政策组合千差万别——有的侧重封锁，有的依赖检测，有的强调口罩。我们通过热力矩阵和雷达图等可视化手段，系统性地比较不同政策组合在降低确诊率、死亡率方面的效果差异，试图找出"最优策略"。</p>
              </div>
            </div>
            <div class="doc-question-item">
              <div class="question-icon">Q3</div>
              <div class="question-content">
                <h3>如果政策时机不同，结果会怎样改变？</h3>
                <p>政策出台的时机往往是决定防疫成败的关键因素。我们通过反事实推演模型，让用户直观地看到：如果某国提前或推迟若干天实施关键政策，疫情曲线可能会呈现怎样的不同走势。这一探索有助于回答"早一步，差千里"这一核心命题。</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 第二部分：设计决策 -->
      <div class="doc-chapter">
        <div class="doc-chapter-number">02</div>
        <h2 class="doc-chapter-title">设计决策</h2>
        <div class="doc-chapter-body">
          <!-- 2.1 为什么选择滚动叙事 -->
          <div class="doc-subsection">
            <h3>为什么选择滚动叙事交互文档而非仪表板？</h3>
            <div class="decision-card">
              <div class="decision-row">
                <div class="decision-col">
                  <h4><span class="icon-check">✓</span> 最终选择：滚动叙事（Scrollytelling）</h4>
                  <p>我们选择了以 Scrollama 驱动的滚动叙事布局，将文字叙述与数据图表交织呈现。这种形式的核心优势在于：</p>
                  <ul>
                    <li><strong>引导式探索</strong>：用户按章节顺序阅读，图表随滚动自动切换，降低认知负担</li>
                    <li><strong>叙事连贯性</strong>：从病毒蔓延→政策响应→干预窗口→变异株→疫苗→政策对比，形成完整的逻辑链条</li>
                    <li><strong>沉浸式体验</strong>：sticky 定位的图表始终可见，用户边读边看，无需频繁切换页面</li>
                  </ul>
                </div>
                <div class="decision-col">
                  <h4><span class="icon-cross">✗</span> 考虑过的替代方案</h4>
                  <div class="alternative-item">
                    <strong>方案 A：传统仪表板（Dashboard）</strong>
                    <p>优势在于自由度高，用户可任意筛选；但缺乏叙事引导，容易迷失在海量数据中，不适合向公众传达特定洞见。</p>
                  </div>
                  <div class="alternative-item">
                    <strong>方案 B：幻灯片式展示（Slide-based）</strong>
                    <p>可以控制叙事节奏，但翻页式交互割裂了连续性，且图表无法跟随用户阅读进度动态变化。</p>
                  </div>
                  <div class="alternative-item">
                    <strong>方案 C：视频叙事</strong>
                    <p>可制作精美的数据动画视频，但牺牲了交互性——用户无法自行选择感兴趣的国家、时间范围或政策维度进行深入探索。</p>
                  </div>
                  <p class="decision-reason"><strong>决策依据</strong>：参考了 <a href="https://mbtaviz.github.io/" target="_blank" rel="noopener">MBTA Viz</a> 和 <a href="https://pudding.cool/" target="_blank" rel="noopener">The Pudding</a> 等优秀滚动叙事案例，确认 Scrollytelling 是平衡叙事引导与交互自由度的最佳形式。</p>
                </div>
              </div>
            </div>
          </div>

          <!-- 2.2 为什么选择这些图表 -->
          <div class="doc-subsection">
            <h3>为什么选择脉冲地图 / 时间线 / 热力矩阵 / 雷达图？</h3>
            <div class="chart-decision-grid">
              <div class="chart-decision-card">
                <div class="chart-icon">🌍</div>
                <h4>全球传播脉冲地图</h4>
                <p class="chart-purpose">适合展示：时空维度的传播动态</p>
                <p>地图是最直观的地理信息载体。我们选择脉冲动画编码病例数（半径越大 = 病例越多），叠加粒子流表示跨国传播路径，让用户直观感受疫情如何在短时间内席卷全球。替代方案考虑过静态等值线地图（Choropleth），但无法有效展示时间变化和传播方向感。</p>
              </div>
              <div class="chart-decision-card">
                <div class="chart-icon">📈</div>
                <h4>政策时机竞赛时间线</h4>
                <p class="chart-purpose">适合展示：病例与政策的时间序列关系</p>
                <p>双区域面积图（上方病例曲线 + 下方政策强度堆叠面积图）能同时呈现两个维度的变化，并通过"最佳干预窗口"标注揭示政策时机与疫情拐点的对应关系。替代方案考虑过简单的折线图叠加，但堆叠面积图更清晰地展示了政策维度的累积效果。</p>
              </div>
              <div class="chart-decision-card">
                <div class="chart-icon">🔥</div>
                <h4>政策组合热力矩阵</h4>
                <p class="chart-purpose">适合展示：多维度两两组合的效果对比</p>
                <p>5×5 热力矩阵将 5 个政策维度两两交叉，颜色编码综合防疫效果，使用户一眼看出哪种政策组合最有效。替代方案考虑过平行坐标图（Parallel Coordinates），但热力矩阵在展示两两关系时更直观、更易解读。</p>
              </div>
              <div class="chart-decision-card">
                <div class="chart-icon">🕸️</div>
                <h4>波浪指纹雷达图</h4>
                <p class="chart-purpose">适合展示：多维度波次特征对比</p>
                <p>五轴雷达图（传播速度、峰值、持续时间、地理范围、致命性）能将每次疫情波次浓缩为一个"指纹"形状，便于跨波次、跨国对比。替代方案考虑过柱状图对比，但雷达图在展示多维度平衡关系时更具表现力。</p>
              </div>
            </div>
          </div>

          <!-- 2.3 交互技术选择 -->
          <div class="doc-subsection">
            <h3>交互技术选择的理由</h3>
            <div class="interaction-table">
              <div class="interaction-row">
                <div class="interaction-type">
                  <strong>滚动联动（Scroll-triggered）</strong>
                </div>
                <div class="interaction-desc">
                  <p>作为<strong>主要交互方式</strong>。用户滚动到不同章节时，图表自动切换显示内容、时间范围和高亮国家。这种"被动式"交互确保即使用户没有主动操作，也能获得完整的叙事体验。基于 Scrollama 库实现，利用 Intersection Observer API 高效监听滚动位置。</p>
                </div>
              </div>
              <div class="interaction-row">
                <div class="interaction-type">
                  <strong>点击联动（Click-triggered）</strong>
                </div>
                <div class="interaction-desc">
                  <p>作为<strong>深度探索方式</strong>。用户可点击地图选中国家、点击热力矩阵选择政策组合、拖拽反事实推演滑块——这些主动操作通过 Pinia 全局状态管理实现多视图联动。选择两种方式并存，是因为滚动联动降低了使用门槛，而点击联动满足了深度用户的需求。</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 第三部分：外部资源引用 -->
      <div class="doc-chapter">
        <div class="doc-chapter-number">03</div>
        <h2 class="doc-chapter-title">外部资源引用</h2>
        <div class="doc-chapter-body">
          <!-- 数据源 -->
          <div class="doc-subsection">
            <h3>数据源</h3>
            <div class="resource-list">
              <div class="resource-item">
                <div class="resource-icon">📊</div>
                <div class="resource-info">
                  <h4>Our World in Data — COVID-19 数据集</h4>
                  <p>包含全球各国每日新增确诊、死亡、疫苗接种等核心指标，是本项目病例和疫苗数据的主要来源。</p>
                  <a href="https://github.com/owid/covid-19-data" target="_blank" rel="noopener">https://github.com/owid/covid-19-data</a>
                </div>
              </div>
              <div class="resource-item">
                <div class="resource-icon">📋</div>
                <div class="resource-info">
                  <h4>Oxford COVID-19 Government Response Tracker</h4>
                  <p>牛津大学开发的政府政策响应追踪数据，提供封锁、检测、口罩、疫苗、边境等 5 个维度的政策强度指标（0-3 级标准化），是政策分析的核心数据来源。</p>
                  <a href="https://www.bsg.ox.ac.uk/covidtracker" target="_blank" rel="noopener">https://www.bsg.ox.ac.uk/covidtracker</a>
                </div>
              </div>
              <div class="resource-item">
                <div class="resource-icon">🧬</div>
                <div class="resource-info">
                  <h4>Our World in Data — 变异株分布数据</h4>
                  <p>提供各国主要变异株（Alpha、Delta、Omicron）的流行时间分布数据，用于病毒变异章节的分析与可视化。</p>
                  <a href="https://ourworldindata.org/covid-variants" target="_blank" rel="noopener">https://ourworldindata.org/covid-variants</a>
                </div>
              </div>
              <div class="resource-item">
                <div class="resource-icon">🗺️</div>
                <div class="resource-info">
                  <h4>Natural Earth — 110m TopoJSON 世界地图</h4>
                  <p>提供全球国家边界的地理数据，用于脉冲地图的底图渲染。</p>
                  <a href="https://github.com/topojson/world-atlas" target="_blank" rel="noopener">https://github.com/topojson/world-atlas</a>
                </div>
              </div>
            </div>
          </div>

          <!-- 参考案例 -->
          <div class="doc-subsection">
            <h3>参考案例与灵感来源</h3>
            <div class="resource-list">
              <div class="resource-item">
                <div class="resource-icon">💡</div>
                <div class="resource-info">
                  <h4>MBTA Viz（Massachusetts Bay Transportation Authority 可视化）</h4>
                  <p>滚动叙事布局的主要灵感来源。该项目展示了如何将复杂的数据分析通过 Scrollytelling 形式优雅地呈现给公众。</p>
                  <a href="https://mbtaviz.github.io/" target="_blank" rel="noopener">https://mbtaviz.github.io/</a>
                </div>
              </div>
              <div class="resource-item">
                <div class="resource-icon">💡</div>
                <div class="resource-info">
                  <h4>The Pudding — 视觉散文</h4>
                  <p>其滚动叙事的交互设计理念对本项目的章节过渡、文字排版和视觉节奏产生了重要影响。</p>
                  <a href="https://pudding.cool/" target="_blank" rel="noopener">https://pudding.cool/</a>
                </div>
              </div>
              <div class="resource-item">
                <div class="resource-icon">💡</div>
                <div class="resource-info">
                  <h4>The Atlantic — COVID-19 数据报道</h4>
                  <p>其疫情数据的可视化呈现方式，尤其是热力图和时间线的组合使用，为本项目的图表设计提供了参考。</p>
                  <a href="https://www.theatlantic.com/" target="_blank" rel="noopener">https://www.theatlantic.com/</a>
                </div>
              </div>
            </div>
          </div>

          <!-- 开源库 -->
          <div class="doc-subsection">
            <h3>使用的开源库</h3>
            <div class="tech-stack-grid">
              <div class="tech-tag"><strong>Vue.js 3</strong> — 前端框架</div>
              <div class="tech-tag"><strong>D3.js</strong> — 数据可视化</div>
              <div class="tech-tag"><strong>Scrollama</strong> — 滚动叙事驱动</div>
              <div class="tech-tag"><strong>TopoJSON Client</strong> — 地理数据处理</div>
              <div class="tech-tag"><strong>Pinia</strong> — 状态管理</div>
              <div class="tech-tag"><strong>Vite</strong> — 构建工具</div>
              <div class="tech-tag"><strong>Python (Pandas)</strong> — 数据预处理</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 第四部分：开发流程概述 -->
      <div class="doc-chapter">
        <div class="doc-chapter-number">04</div>
        <h2 class="doc-chapter-title">开发流程概述</h2>
        <div class="doc-chapter-body">
          <!-- 团队分工 -->
          <div class="doc-subsection">
            <h3>团队分工</h3>
            <div class="team-table">
              <div class="team-header">
                <div class="team-cell">角色</div>
                <div class="team-cell">主要任务</div>
                <div class="team-cell">成员</div>
              </div>
              <div class="team-row">
                <div class="team-cell">A — 项目架构 & 数据工程</div>
                <div class="team-cell">基础项目结构搭建、Scrollama 滚动框架集成、全局状态管理、数据下载清洗预处理、数据加载工具函数</div>
                <div class="team-cell">刘小贝</div>
              </div>
              <div class="team-row">
                <div class="team-cell">B — 内容构建 & 核心图表（1）</div>
                <div class="team-cell">滚动叙事文本撰写，开发脉冲地图和政策时间线图表，集成 Scrollama 联动</div>
                <div class="team-cell">王奕凡</div>
              </div>
              <div class="team-row">
                <div class="team-cell">C — 内容构建 & 核心图表（2）</div>
                <div class="team-cell">滚动叙事文本撰写，开发热力矩阵和雷达图表，实现多视图联动协调</div>
                <div class="team-cell">金姜恒</div>
              </div>
              <div class="team-row">
                <div class="team-cell">D — UI/UX & 说明文档</div>
                <div class="team-cell">整体视觉设计与 CSS 样式统一、交互细节打磨优化、响应式布局、说明文档网页撰写</div>
                <div class="team-cell">邢嘉钰</div>
              </div>
            </div>
            <p class="team-note">注：每人仍需交叉协作，但主责明确。各角色之间存在依赖关系，需密切配合。</p>
          </div>

          <!-- 工时估算 -->
          <div class="doc-subsection">
            <h3>工时估算</h3>
            <div class="hours-grid">
              <div class="hours-card">
                <div class="hours-number">约 160</div>
                <div class="hours-label">总工时（小时）</div>
              </div>
              <div class="hours-card">
                <div class="hours-number">约 40</div>
                <div class="hours-label">每人平均（小时）</div>
              </div>
              <div class="hours-card">
                <div class="hours-number">约 3 周</div>
                <div class="hours-label">开发周期</div>
              </div>
            </div>
            <div class="hours-breakdown">
              <h4>各角色工时分布：</h4>
              <ul>
                <li><strong>角色 A（项目架构 & 数据工程）</strong>：约 35 小时 — 项目搭建 8h、数据清洗处理 15h、状态管理 6h、工具函数 6h</li>
                <li><strong>角色 B（内容构建 & 核心图表 1）</strong>：约 45 小时 — 叙事文本撰写 10h、脉冲地图开发 15h、时间线开发 12h、Scrollama 集成 8h</li>
                <li><strong>角色 C（内容构建 & 核心图表 2）</strong>：约 40 小时 — 叙事文本撰写 8h、热力矩阵开发 12h、雷达图开发 10h、多视图联动 10h</li>
                <li><strong>角色 D（UI/UX & 说明文档）</strong>：约 40 小时 — UI 设计 10h、CSS 样式统一 8h、交互打磨 10h、响应式布局 6h、说明文档 6h</li>
              </ul>
            </div>
          </div>

          <!-- 最耗时环节 -->
          <div class="doc-subsection">
            <h3>最耗时环节</h3>
            <div class="time-consumption-list">
              <div class="time-item">
                <div class="time-rank">1</div>
                <div class="time-content">
                  <h4>数据清洗与预处理（约占总工时 25%）</h4>
                  <p>三个数据集（OWID、Oxford、变异株）的格式不统一，国家编码标准各异，缺失值处理策略需要反复调整。特别是将 Oxford 数据的 20+ 政策指标归约为 5 个标准化维度，需要大量手动校验。</p>
                </div>
              </div>
              <div class="time-item">
                <div class="time-rank">2</div>
                <div class="time-content">
                  <h4>脉冲地图动画优化（约占总工时 15%）</h4>
                  <p>Canvas 层的粒子流动画需要保证 30fps 以上的流畅度，同时处理 50+ 个国家的脉冲圆环。性能优化（减少重绘区域、使用 requestAnimationFrame）耗费了大量调试时间。</p>
                </div>
              </div>
              <div class="time-item">
                <div class="time-rank">3</div>
                <div class="time-content">
                  <h4>多视图联动调试（约占总工时 12%）</h4>
                  <p>地图→雷达图→时间线→热力矩阵的双向联动链路复杂，确保状态同步和响应延迟 < 300ms 需要反复测试和优化 Pinia 状态管理逻辑。</p>
                </div>
              </div>
            </div>
          </div>

          <!-- 挑战与解决方案 -->
          <div class="doc-subsection">
            <h3>遇到的挑战与解决方案</h3>
            <div class="challenge-list">
              <div class="challenge-item">
                <h4>挑战一：大规模数据集的前端加载性能</h4>
                <p>合并后的 JSON 数据超过数十万条记录，直接加载会导致页面卡顿。</p>
                <div class="solution">
                  <strong>解决方案</strong>：在 Python 预处理阶段进行数据聚合，仅保留可视化所需的粒度（按周聚合），将数据量压缩至原始的 1/7。同时使用按需加载策略，仅在用户滚动到对应章节时加载该章节数据。
                </div>
              </div>
              <div class="challenge-item">
                <h4>挑战二：Scrollama 与 Vue 3 的兼容性</h4>
                <p>Scrollama 基于原生 DOM 操作，而 Vue 3 的虚拟 DOM 机制可能导致滚动监听时机不对。</p>
                <div class="solution">
                  <strong>解决方案</strong>：在 onMounted 钩子中初始化 Scrollama，确保 DOM 已渲染完成；在 onUnmounted 中销毁实例，避免内存泄漏。使用 ref 引用 DOM 元素而非直接选择器。
                </div>
              </div>
              <div class="challenge-item">
                <h4>挑战三：跨组件状态同步的一致性</h4>
                <p>多视图联动要求 4 个图表组件在状态变化时同步更新，容易出现状态不一致。</p>
                <div class="solution">
                  <strong>解决方案</strong>：采用 Pinia 单一数据源（Single Source of Truth）架构，所有共享状态（选中国家、时间范围、当前波次、指标类型）集中管理，组件仅通过 computed 和 watch 响应变化，避免双向绑定导致的状态冲突。
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 页脚 -->
      <div class="doc-footer">
        <p>本项目为课程作业项目，仅供学术交流使用。数据来源已在上方列出，如有侵权请联系我们。</p>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* ============================================
   说明文档页面样式
   ============================================ */

.doc-section {
  width: 100%;
  min-height: 100vh;
  padding: 4rem 0;
  background: linear-gradient(135deg, #141429 0%, #1a1a2e 35%, #182038 65%, #141e30 100%);
}

.doc-container {
  max-width: 960px;
  margin: 0 auto;
  padding: 0 2rem;
}

/* 页面标题 */
.doc-header {
  text-align: center;
  margin-bottom: 4rem;
  padding-bottom: 3rem;
  border-bottom: 1px solid var(--color-border);
}

.doc-title {
  font-size: 2.4rem;
  font-weight: 700;
  color: var(--color-text-bright);
  margin-bottom: 0.8rem;
  letter-spacing: -0.5px;
}

.doc-subtitle {
  font-size: 1.1rem;
  color: var(--color-text);
  opacity: 0.7;
}

/* 章节块 */
.doc-chapter {
  margin-bottom: 4rem;
  position: relative;
}

.doc-chapter-number {
  display: inline-block;
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--color-accent);
  background: var(--color-accent-glow);
  padding: 4px 12px;
  border-radius: 4px;
  margin-bottom: 0.8rem;
  font-family: var(--font-mono);
}

.doc-chapter-title {
  font-size: 1.8rem;
  font-weight: 700;
  color: var(--color-text-heading);
  margin-bottom: 2rem;
  padding-bottom: 0.8rem;
  border-bottom: 2px solid var(--color-border);
}

.doc-chapter-body p {
  font-size: 1rem;
  line-height: 1.9;
  color: var(--color-text);
  margin-bottom: 1rem;
}

/* 子章节 */
.doc-subsection {
  margin-bottom: 2.5rem;
}

.doc-subsection h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-text-heading);
  margin-bottom: 1.2rem;
  padding-left: 0.8rem;
  border-left: 3px solid var(--color-accent);
}

/* 问题列表 */
.doc-question-list {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.doc-question-item {
  display: flex;
  gap: 1.2rem;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  padding: 1.5rem;
  transition: border-color var(--transition-normal);
}

.doc-question-item:hover {
  border-color: var(--color-accent);
}

.question-icon {
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--color-accent), #ff6b8a);
  color: #fff;
  font-weight: 700;
  font-size: 0.85rem;
  border-radius: 10px;
  font-family: var(--font-mono);
}

.question-content h3 {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--color-text-bright);
  margin-bottom: 0.6rem;
  border-left: none;
  padding-left: 0;
}

.question-content p {
  font-size: 0.95rem;
  line-height: 1.8;
  color: var(--color-text);
  margin-bottom: 0;
}

/* 决策卡片 */
.decision-card {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  padding: 1.5rem;
}

.decision-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
}

.decision-col h4 {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text-heading);
  margin-bottom: 0.8rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.icon-check {
  color: #66bb6a;
  font-size: 1.1rem;
}

.icon-cross {
  color: #ef5350;
  font-size: 1.1rem;
}

.decision-col p {
  font-size: 0.9rem;
  line-height: 1.8;
  color: var(--color-text);
}

.decision-col ul {
  margin: 0.5rem 0 1rem 1.2rem;
  line-height: 1.8;
}

.decision-col li {
  font-size: 0.9rem;
  color: var(--color-text);
  margin-bottom: 0.3rem;
}

.alternative-item {
  margin-bottom: 1rem;
  padding-bottom: 0.8rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.alternative-item:last-of-type {
  border-bottom: none;
}

.alternative-item strong {
  font-size: 0.9rem;
  color: var(--color-text-heading);
}

.alternative-item p {
  font-size: 0.85rem;
  margin-top: 0.3rem;
}

.decision-reason {
  margin-top: 1rem;
  padding: 0.8rem;
  background: rgba(233, 69, 96, 0.08);
  border-radius: 8px;
  border-left: 3px solid var(--color-accent);
  font-size: 0.88rem !important;
}

.decision-reason a {
  color: var(--color-accent);
  text-decoration: underline;
}

/* 图表决策网格 */
.chart-decision-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.2rem;
}

.chart-decision-card {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  padding: 1.2rem;
  transition: border-color var(--transition-normal);
}

.chart-decision-card:hover {
  border-color: var(--color-accent);
}

.chart-icon {
  font-size: 1.8rem;
  margin-bottom: 0.6rem;
}

.chart-decision-card h4 {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text-heading);
  margin-bottom: 0.3rem;
}

.chart-purpose {
  font-size: 0.82rem !important;
  color: var(--color-accent) !important;
  font-weight: 500;
  margin-bottom: 0.6rem !important;
}

.chart-decision-card p {
  font-size: 0.88rem;
  line-height: 1.7;
  color: var(--color-text);
}

/* 交互技术 */
.interaction-table {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.interaction-row {
  display: flex;
  gap: 1.2rem;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  padding: 1.2rem;
}

.interaction-type {
  flex: 0 0 220px;
  display: flex;
  align-items: flex-start;
  padding-top: 0.2rem;
}

.interaction-type strong {
  color: var(--color-text-heading);
  font-size: 0.95rem;
}

.interaction-desc p {
  font-size: 0.9rem;
  line-height: 1.8;
  color: var(--color-text);
}

/* 资源列表 */
.resource-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.resource-item {
  display: flex;
  gap: 1rem;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  padding: 1.2rem;
  transition: border-color var(--transition-normal);
}

.resource-item:hover {
  border-color: var(--color-accent);
}

.resource-icon {
  flex-shrink: 0;
  font-size: 1.5rem;
  width: 40px;
  text-align: center;
}

.resource-info h4 {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--color-text-heading);
  margin-bottom: 0.4rem;
}

.resource-info p {
  font-size: 0.88rem;
  line-height: 1.7;
  color: var(--color-text);
  margin-bottom: 0.4rem;
}

.resource-info a {
  color: var(--color-accent);
  font-size: 0.82rem;
  text-decoration: none;
  word-break: break-all;
}

.resource-info a:hover {
  text-decoration: underline;
}

/* 技术栈标签 */
.tech-stack-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
}

.tech-tag {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 0.5rem 1rem;
  font-size: 0.85rem;
  color: var(--color-text);
}

.tech-tag strong {
  color: var(--color-text-heading);
}

/* 团队表格 */
.team-table {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  overflow: hidden;
}

.team-header {
  display: grid;
  grid-template-columns: 200px 1fr 100px;
  background: rgba(233, 69, 96, 0.12);
  border-bottom: 2px solid var(--color-border);
}

.team-row {
  display: grid;
  grid-template-columns: 200px 1fr 100px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
}

.team-row:last-child {
  border-bottom: none;
}

.team-cell {
  padding: 0.8rem 1rem;
  font-size: 0.88rem;
  color: var(--color-text);
  line-height: 1.5;
}

.team-header .team-cell {
  font-weight: 700;
  color: var(--color-text-heading);
  font-size: 0.85rem;
}

.team-note {
  margin-top: 0.8rem;
  font-size: 0.85rem;
  color: var(--color-text);
  opacity: 0.7;
  font-style: italic;
}

/* 工时卡片 */
.hours-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.hours-card {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  padding: 1.5rem;
  text-align: center;
}

.hours-number {
  font-size: 2rem;
  font-weight: 700;
  color: var(--color-accent);
  font-family: var(--font-mono);
}

.hours-label {
  font-size: 0.85rem;
  color: var(--color-text);
  margin-top: 0.3rem;
}

.hours-breakdown {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  padding: 1.2rem 1.5rem;
}

.hours-breakdown h4 {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--color-text-heading);
  margin-bottom: 0.8rem;
}

.hours-breakdown ul {
  list-style: none;
  margin: 0;
  padding: 0;
}

.hours-breakdown li {
  font-size: 0.88rem;
  line-height: 1.8;
  color: var(--color-text);
  padding: 0.5rem 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
}

.hours-breakdown li:last-child {
  border-bottom: none;
}

/* 最耗时环节 */
.time-consumption-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.time-item {
  display: flex;
  gap: 1rem;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  padding: 1.2rem;
}

.time-rank {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-accent);
  color: #fff;
  font-weight: 700;
  font-size: 1rem;
  border-radius: 50%;
  font-family: var(--font-mono);
}

.time-content h4 {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--color-text-heading);
  margin-bottom: 0.4rem;
}

.time-content p {
  font-size: 0.88rem;
  line-height: 1.7;
  color: var(--color-text);
}

/* 挑战列表 */
.challenge-list {
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
}

.challenge-item {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  padding: 1.2rem 1.5rem;
}

.challenge-item h4 {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text-heading);
  margin-bottom: 0.5rem;
}

.challenge-item p {
  font-size: 0.9rem;
  line-height: 1.7;
  color: var(--color-text);
  margin-bottom: 0.8rem;
}

.solution {
  background: rgba(76, 175, 80, 0.1);
  border-left: 3px solid #66bb6a;
  padding: 0.8rem 1rem;
  border-radius: 0 8px 8px 0;
  font-size: 0.88rem;
  color: var(--color-text);
  line-height: 1.7;
}

/* 页脚 */
.doc-footer {
  margin-top: 3rem;
  padding-top: 2rem;
  border-top: 1px solid var(--color-border);
  text-align: center;
}

.doc-footer p {
  font-size: 0.85rem;
  color: var(--color-text);
  opacity: 0.6;
}

/* 响应式 */
@media (max-width: 1280px) {
  .decision-row {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }

  .chart-decision-grid {
    grid-template-columns: 1fr;
  }

  .team-header,
  .team-row {
    grid-template-columns: 160px 1fr 80px;
  }
}

@media (max-width: 1024px) {
  .doc-container {
    padding: 0 1.5rem;
  }

  .doc-title {
    font-size: 2rem;
  }

  .doc-chapter-title {
    font-size: 1.5rem;
  }

  .interaction-row {
    flex-direction: column;
    gap: 0.5rem;
  }

  .interaction-type {
    flex: none;
  }

  .team-header,
  .team-row {
    grid-template-columns: 1fr;
  }

  .team-header {
    display: none;
  }

  .team-cell {
    padding: 0.5rem 0.8rem;
  }

  .hours-grid {
    grid-template-columns: 1fr;
  }
}
</style>