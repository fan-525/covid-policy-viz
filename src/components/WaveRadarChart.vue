<template>
  <div class="wave-radar-chart">
    <div class="radar-header">
      <div class="wave-selector">
        <button
          v-for="wave in availableWaves"
          :key="wave.id"
          class="wave-btn"
          :class="{ active: currentWave === wave.id, disabled: !wave.available }"
          :disabled="!wave.available"
          @click="wave.available && setCurrentWave(wave.id)"
          :title="wave.available ? `切换到第${wave.id}波` : `第${wave.id}波：当前选中国家无数据`"
        >
          第{{ wave.id }}波
        </button>
      </div>
    </div>

    <div class="radar-main">
      <div class="radar-container">
        <svg ref="svgRef" :width="radarWidth" :height="radarHeight" style="pointer-events: auto;"></svg>
      </div>
      
      <div class="radar-legend">
        <div class="legend-title">已选国家</div>
        <div class="legend-items">
          <div
            v-for="country in selectedCountries"
            :key="country"
            class="legend-item"
            @click="toggleCountry(country)"
          >
            <span class="legend-color" :style="{ backgroundColor: getCountryColor(country) }"></span>
            <span>{{ getCountryName(country) }}</span>
            <span class="legend-remove">✕</span>
          </div>
          <div v-if="!selectedCountries.length" class="legend-empty">
            暂未选择国家
          </div>
        </div>

        <div class="legend-title" style="margin-top: 16px;">添加国家</div>
        <div class="country-list">
          <button
            v-for="country in allCountries"
            :key="country.code"
            class="country-add-btn"
            :class="{
              added: selectedCountries.includes(country.code),
              'no-wave-data': !countryHasWaveData[country.code]
            }"
            @click="toggleCountry(country.code)"
            :title="countryHasWaveData[country.code] ? country.name : country.name + '（当前波次无数据）'"
          >
            <span class="country-code">{{ country.code }}</span>
            <span class="country-name">{{ country.name }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, watch, computed, nextTick } from 'vue'
import { useGlobalStore } from '../stores/global.js'
import * as d3 from 'd3'

export default {
  name: 'WaveRadarChart',
  setup() {
    const store = useGlobalStore()
    const svgRef = ref(null)
    const svg = ref(null)
    const tooltip = ref(null)

    const radarWidth = 540
    const radarHeight = 540
    const centerX = radarWidth / 2
    const centerY = radarHeight / 2
    const radius = 200

    // 完整国家列表
    const allCountries = [
      { code: 'KOR', name: '韩国' }, { code: 'ITA', name: '意大利' }, { code: 'USA', name: '美国' },
      { code: 'CHN', name: '中国' }, { code: 'JPN', name: '日本' }, { code: 'DEU', name: '德国' },
      { code: 'FRA', name: '法国' }, { code: 'GBR', name: '英国' }, { code: 'IND', name: '印度' },
      { code: 'BRA', name: '巴西' }, { code: 'RUS', name: '俄罗斯' }, { code: 'CAN', name: '加拿大' },
      { code: 'AUS', name: '澳大利亚' }, { code: 'ESP', name: '西班牙' }, { code: 'MEX', name: '墨西哥' },
      { code: 'IDN', name: '印度尼西亚' }, { code: 'NLD', name: '荷兰' }, { code: 'TUR', name: '土耳其' },
      { code: 'CHE', name: '瑞士' }, { code: 'SWE', name: '瑞典' }, { code: 'BEL', name: '比利时' },
      { code: 'AUT', name: '奥地利' }, { code: 'NOR', name: '挪威' }, { code: 'DNK', name: '丹麦' },
      { code: 'FIN', name: '芬兰' }, { code: 'IRL', name: '爱尔兰' }, { code: 'NZL', name: '新西兰' },
      { code: 'SGP', name: '新加坡' }, { code: 'ISR', name: '以色列' }, { code: 'ZAF', name: '南非' }
    ]

    const getCountryName = (code) => {
      const found = allCountries.find(c => c.code === code)
      return found ? found.name : code
    }
    
    // 雷达图的维度定义
    const dimensions = [
      { key: 'peak', name: '峰值', field: 'peak_cases', inverse: false },
      { key: 'scale', name: '波次规模', field: null, inverse: false },
      { key: 'intensity', name: '爆发强度', field: null, inverse: false },
      { key: 'duration', name: '持续时间', field: 'duration_days', inverse: false },
      { key: 'fatality', name: '致命性', field: 'case_fatality_rate', inverse: false }
    ]
    
    const angles = d3.range(dimensions.length).map(i => (i * 2 * Math.PI) / dimensions.length - Math.PI / 2)

    // 计算多边形面积
    const calculatePolygonArea = (data) => {
      const points = dimensions.map((dim, i) => {
        const value = data[dim.name] || 0
        const angle = angles[i]
        return {
          x: centerX + value * radius * Math.cos(angle),
          y: centerY + value * radius * Math.sin(angle)
        }
      })
      
      let area = 0
      for (let i = 0; i < points.length; i++) {
        const j = (i + 1) % points.length
        area += points[i].x * points[j].y
        area -= points[j].x * points[i].y
      }
      return Math.abs(area) / 2
    }

    const getPercentileValues = (values, percentile) => {
      if (!values.length) return 0
      const sorted = [...values].sort((a, b) => a - b)
      const index = Math.floor(sorted.length * percentile)
      return sorted[Math.min(index, sorted.length - 1)]
    }

    const getNormalizationRanges = () => {
      if (!store.waveFeatures) return {}
      
      const ranges = {}
      dimensions.forEach(dim => {
        const allValues = []
        
        Object.keys(store.waveFeatures).forEach(country => {
          const waves = store.waveFeatures[country]
          if (Array.isArray(waves)) {
            waves.forEach(wave => {
              let value
              if (dim.key === 'intensity') {
                value = wave.peak_cases / wave.days_to_peak || 0
              } else if (dim.key === 'scale') {
                value = (wave.peak_cases || 0) * (wave.duration_days || 0)
              } else if (dim.field) {
                value = wave[dim.field] || 0
              }
              
              if (value !== undefined && value !== null && !isNaN(value) && value > 0) {
                allValues.push(value)
              }
            })
          }
        })
        
        if (allValues.length === 0) {
          ranges[dim.key] = { min: 0, max: 1 }
          return
        }
        
        const maxVal = getPercentileValues(allValues, 0.95)
        const minVal = Math.min(...allValues)
        
        ranges[dim.key] = { min: minVal, max: maxVal }
      })
      
      return ranges
    }
    
    const transformDataForRadar = (countryData, waveId, ranges) => {
      if (!countryData || !Array.isArray(countryData)) return null
      
      const waveData = countryData.find(w => w.wave_id === waveId)
      if (!waveData) return null
      
      const result = {}
      
      dimensions.forEach(dim => {
        let rawValue
        let transformedValue
        
        if (dim.key === 'peak') {
          rawValue = waveData.peak_cases || 0
          const range = ranges[dim.key]
          if (range.max > range.min && rawValue > 0) {
            transformedValue = (rawValue - range.min) / (range.max - range.min)
          } else {
            transformedValue = 0
          }
        }
        else if (dim.key === 'duration') {
          rawValue = waveData.duration_days || 0
          const range = ranges[dim.key]
          if (range.max > range.min) {
            transformedValue = (rawValue - range.min) / (range.max - range.min)
          } else {
            transformedValue = 0.5
          }
        }
        else if (dim.key === 'fatality') {
          rawValue = waveData.case_fatality_rate || 0
          const range = ranges[dim.key]
          if (range.max > range.min) {
            transformedValue = (rawValue - range.min) / (range.max - range.min)
          } else {
            transformedValue = rawValue * 0.5
          }
        }
        else if (dim.key === 'intensity') {
          rawValue = (waveData.peak_cases || 0) / (waveData.days_to_peak || 1)
          const range = ranges[dim.key]
          if (range.max > range.min && rawValue > 0) {
            transformedValue = (rawValue - range.min) / (range.max - range.min)
          } else {
            transformedValue = 0
          }
        }
        else if (dim.key === 'scale') {
          rawValue = (waveData.peak_cases || 0) * (waveData.duration_days || 0)
          const range = ranges[dim.key]
          if (range.max > range.min && rawValue > 0) {
            transformedValue = (rawValue - range.min) / (range.max - range.min)
          } else {
            transformedValue = 0
          }
        }
        
        result[dim.name] = Math.min(0.95, Math.max(0.05, transformedValue || 0))
      })
      
      return { data: result, waveData: waveData }
    }

    const availableWaves = computed(() => {
      if (!store.waveFeatures) return []
      // 统计每个波次有多少国家有数据
      const waveCounts = {}
      Object.values(store.waveFeatures).forEach(countryData => {
        if (Array.isArray(countryData)) {
          const seen = new Set()
          countryData.forEach(wave => {
            if (wave.wave_id && !seen.has(wave.wave_id)) {
              seen.add(wave.wave_id)
              waveCounts[wave.wave_id] = (waveCounts[wave.wave_id] || 0) + 1
            }
          })
        }
      })
      // 只显示至少 5 个国家有数据的波次
      const allWaves = Object.entries(waveCounts)
        .filter(([, count]) => count >= 5)
        .map(([id]) => parseInt(id))
        .sort((a, b) => a - b)

      // 检查哪些波次对当前选中国家有数据
      const selected = store.selectedCountries || []
      const hasDataForWave = {}
      allWaves.forEach(wid => {
        hasDataForWave[wid] = selected.length > 0 && selected.some(country => {
          const cd = store.waveFeatures[country]
          return Array.isArray(cd) && cd.some(w => w.wave_id === wid)
        })
      })

      // 有数据的在前，无数据的在后，各自保持数字顺序
      const withData = allWaves.filter(w => hasDataForWave[w])
      const withoutData = allWaves.filter(w => !hasDataForWave[w])
      return [...withData, ...withoutData].map(wid => ({
        id: wid,
        available: hasDataForWave[wid]
      }))
    })

    // 当前波次下各国家是否有数据
    const countryHasWaveData = computed(() => {
      const result = {}
      if (!store.waveFeatures) return result
      allCountries.forEach(c => {
        const cd = store.waveFeatures[c.code]
        result[c.code] = Array.isArray(cd) && cd.some(w => w.wave_id === store.currentWave)
      })
      return result
    })

    const getCountryColor = (country) => {
      const colors = {
        'KOR': '#2ca02c',
        'ITA': '#ff7f0e',
        'USA': '#d62728',
        'JPN': '#9467bd',
        'DEU': '#8c564b',
        'FRA': '#e377c2',
        'GBR': '#7f7f7f',
        'default': '#1f77b4'
      }
      return colors[country] || colors.default
    }

    const setCurrentWave = (wave) => {
      store.currentWave = wave
    }

    const toggleCountry = (country) => {
      const index = store.selectedCountries.indexOf(country)
      if (index > -1) {
        store.selectedCountries.splice(index, 1)
      } else {
        store.selectedCountries.push(country)
      }
    }

    const drawRadar = () => {
      if (!svg.value || !store.waveFeatures) return

      const svgEl = d3.select(svg.value)
      svgEl.selectAll('*').remove()

      if (!store.selectedCountries || store.selectedCountries.length === 0) {
        svgEl.append('text')
          .attr('x', centerX)
          .attr('y', centerY)
          .attr('text-anchor', 'middle')
          .attr('fill', '#999')
          .attr('font-size', '14px')
          .text('请点击右侧按钮添加国家')
        return
      }

      const ranges = getNormalizationRanges()
      
      const radarData = {}
      store.selectedCountries.forEach(country => {
        const countryData = store.waveFeatures[country]
        const transformed = transformDataForRadar(countryData, store.currentWave, ranges)
        if (transformed) {
          radarData[country] = transformed
        }
      })
      
      if (Object.keys(radarData).length === 0) {
        svgEl.append('text')
          .attr('x', centerX)
          .attr('y', centerY)
          .attr('text-anchor', 'middle')
          .attr('fill', '#999')
          .text('当前波次无数据')
        return
      }

      // 按面积从小到大排序（小面积在上层，避免被大面积覆盖）
      const sortedEntries = Object.entries(radarData).sort((a, b) => {
        const areaA = calculatePolygonArea(a[1].data)
        const areaB = calculatePolygonArea(b[1].data)
        return areaA - areaB
      })

      // 绘制轴
      dimensions.forEach((dim, i) => {
        const angle = angles[i]
        const x = centerX + radius * Math.cos(angle)
        const y = centerY + radius * Math.sin(angle)

        svgEl.append('line')
          .attr('x1', centerX)
          .attr('y1', centerY)
          .attr('x2', x)
          .attr('y2', y)
          .attr('stroke', '#999')
          .attr('stroke-width', 1.5)

        const labelX = centerX + (radius + 35) * Math.cos(angle)
        const labelY = centerY + (radius + 35) * Math.sin(angle)
        svgEl.append('text')
          .attr('x', labelX)
          .attr('y', labelY)
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'middle')
          .attr('font-size', '15px')
          .attr('font-weight', '900')
          .attr('fill', '#e8e8e8')
          .style('text-shadow', '0 0 6px rgba(0,0,0,0.7), 0 0 12px rgba(0,0,0,0.5)')
          .text(dim.name)
      })

      // 绘制网格
      for (let r = 0.2; r <= 1; r += 0.2) {
        const points = angles.map(angle => [
          centerX + r * radius * Math.cos(angle),
          centerY + r * radius * Math.sin(angle)
        ])
        svgEl.append('polygon')
          .attr('points', points.map(p => p.join(',')).join(' '))
          .attr('fill', 'none')
          .attr('stroke', '#ddd')
          .attr('stroke-width', 1)
          .attr('stroke-dasharray', r === 1 ? 'none' : '3,3')
        
        if (r !== 0.2) {
          const labelAngle = angles[0]
          const labelX = centerX + r * radius * Math.cos(labelAngle) - 20
          const labelY = centerY + r * radius * Math.sin(labelAngle) - 8
          svgEl.append('text')
            .attr('x', labelX)
            .attr('y', labelY)
            .attr('text-anchor', 'end')
            .attr('font-size', '9px')
            .attr('fill', '#aaa')
            .text(`${(r * 100).toFixed(0)}%`)
        }
      }

      // 1. 先绘制连线到底层
      sortedEntries.forEach(([country, countryInfo]) => {
        const data = countryInfo.data
        const points = dimensions.map((dim, i) => {
          const value = data[dim.name] || 0
          const angle = angles[i]
          return [
            centerX + value * radius * Math.cos(angle),
            centerY + value * radius * Math.sin(angle)
          ]
        })

        points.forEach((point) => {
          svgEl.append('line')
            .attr('x1', centerX)
            .attr('y1', centerY)
            .attr('x2', point[0])
            .attr('y2', point[1])
            .attr('stroke', getCountryColor(country))
            .attr('stroke-width', 1)
            .attr('stroke-opacity', 0.3)
            .attr('stroke-dasharray', '4,4')
        })
      })

      // 2. 绘制多边形（小面积在上层）
      sortedEntries.forEach(([country, countryInfo]) => {
        const data = countryInfo.data
        const points = dimensions.map((dim, i) => {
          const value = data[dim.name] || 0
          const angle = angles[i]
          return [
            centerX + value * radius * Math.cos(angle),
            centerY + value * radius * Math.sin(angle)
          ]
        })

        svgEl.append('polygon')
          .attr('points', points.map(p => p.join(',')).join(' '))
          .attr('fill', getCountryColor(country))
          .attr('fill-opacity', 0.15)
          .attr('stroke', getCountryColor(country))
          .attr('stroke-width', 2)
          .attr('class', 'radar-polygon')
          .attr('data-country', country)
          .style('cursor', 'pointer')
          .style('pointer-events', 'visible')
          .on('mouseenter', function(event) {
            d3.select(this).attr('fill-opacity', 0.35)
            showTooltip(event, country, countryInfo.data, dimensions, countryInfo.waveData)
          })
          .on('mouseleave', function() {
            d3.select(this).attr('fill-opacity', 0.15)
            hideTooltip()
          })
      })

      // 3. 最后绘制数据点（最上层）
      sortedEntries.forEach(([country, countryInfo]) => {
        const data = countryInfo.data
        const waveData = countryInfo.waveData
        const points = dimensions.map((dim, i) => {
          const value = data[dim.name] || 0
          const angle = angles[i]
          return [
            centerX + value * radius * Math.cos(angle),
            centerY + value * radius * Math.sin(angle)
          ]
        })

        points.forEach((point) => {
          svgEl.append('circle')
            .attr('cx', point[0])
            .attr('cy', point[1])
            .attr('r', 5)
            .attr('fill', getCountryColor(country))
            .attr('stroke', '#fff')
            .attr('stroke-width', 2)
            .attr('class', 'radar-point')
            .attr('data-country', country)
            .style('cursor', 'pointer')
            .style('pointer-events', 'visible')
            .on('mouseenter', (event) => {
              showTooltip(event, country, countryInfo.data, dimensions, waveData)
            })
            .on('mouseleave', hideTooltip)
        })
      })
    }

    const showTooltip = (event, country, data, dimensions, waveData) => {
      if (!tooltip.value) {
        tooltip.value = d3.select('body').append('div')
          .attr('class', 'radar-tooltip')
          .style('position', 'absolute')
          .style('background', 'rgba(30, 30, 50, 0.95)')
          .style('color', '#e0e0e0')
          .style('border-radius', '8px')
          .style('padding', '12px 16px')
          .style('box-shadow', '0 4px 20px rgba(0,0,0,0.4)')
          .style('border', '1px solid rgba(255,255,255,0.12)')
          .style('backdrop-filter', 'blur(8px)')
          .style('pointer-events', 'none')
          .style('z-index', '10000')
          .style('font-size', '12px')
          .style('line-height', '1.6')
          .style('max-width', '260px')
      }

      const formatValue = (dim, wd) => {
        switch (dim.key) {
          case 'peak':
            return wd.peak_cases?.toLocaleString() || '0'
          case 'duration':
            return `${wd.duration_days || 0}天`
          case 'fatality':
            return `${(wd.case_fatality_rate || 0).toFixed(2)}%`
          case 'intensity':
            return `${((wd.peak_cases || 0) / (wd.days_to_peak || 1)).toFixed(0)} 例/天`
          case 'scale':
            return `${((wd.peak_cases || 0) * (wd.duration_days || 0)).toLocaleString()}`
          default:
            return `${((data[dim.name] || 0) * 100).toFixed(1)}%`
        }
      }

      const content = `<strong style="font-size:14px;">${getCountryName(country)}</strong><br/>` +
        dimensions.map(dim => `${dim.name}: ${formatValue(dim, waveData)}`).join('<br/>')

      tooltip.value
        .style('left', (event.pageX + 15) + 'px')
        .style('top', (event.pageY - 10) + 'px')
        .style('display', 'block')
        .html(content)
    }

    const hideTooltip = () => {
      if (tooltip.value) {
        tooltip.value.style('display', 'none')
      }
    }

    onMounted(() => {
      svg.value = svgRef.value
      //if (!store.selectedCountries || store.selectedCountries.length === 0) {
       // store.selectedCountries = ['KOR', 'ITA', 'USA']
      //}
      if (!store.currentWave || !availableWaves.value.some(w => w.id === store.currentWave)) {
        store.currentWave = availableWaves.value[availableWaves.value.length - 1] || 4
      }
      nextTick(() => {
        drawRadar()
      })
    })

    watch(
      () => [store.selectedCountries, store.currentWave, store.waveFeatures],
      () => {
        nextTick(() => drawRadar())
      },
      { deep: true }
    )

    return {
      svgRef,
      radarWidth,
      radarHeight,
      currentWave: computed(() => store.currentWave),
      selectedCountries: computed(() => store.selectedCountries),
      availableWaves,
      allCountries,
      setCurrentWave,
      toggleCountry,
      getCountryColor,
      getCountryName,
      countryHasWaveData
    }
  }
}
</script>

<style scoped>
/* 样式保持不变 */
.wave-radar-chart {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--color-bg-card, #1e2a45);
  border-radius: 20px;
  padding: 20px;
}

.radar-header {
  display: flex;
  justify-content: center;
  margin-bottom: 20px;
}

.wave-selector {
  display: flex;
  gap: 8px;
  background: var(--color-bg-text-panel, #1a2744);
  padding: 4px;
  border-radius: 40px;
  flex-wrap: wrap;
  justify-content: center;
}

.wave-btn {
  padding: 6px 16px;
  border: none;
  background: transparent;
  border-radius: 30px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
  color: var(--color-text);
}

.wave-btn:hover:not(.disabled) {
  background: rgba(233, 69, 96, 0.1);
}

.wave-btn.active {
  background: var(--color-bg-card, #1e2a45);
  color: var(--color-accent);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.wave-btn.disabled {
  background: rgba(100, 100, 120, 0.2);
  color: #5a6a7a;
  cursor: not-allowed;
  text-decoration: line-through;
  opacity: 0.5;
}

.radar-main {
  display: flex;
  flex: 1;
  gap: 30px;
  min-height: 0;
}

.radar-container {
  flex: 2;
  display: flex;
  justify-content: center;
  align-items: center;
}

.radar-container svg {
  width: 100%;
  height: auto;
  max-width: 540px;
  background: transparent;
  border-radius: 12px;
}

.radar-legend {
  flex: 1;
  background: var(--color-bg-card, #1e2a45);
  border-radius: 16px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: 260px;
  min-width: 200px;
  overflow-y: auto;
  max-height: 540px;
  margin-left: 10px;
}

.legend-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-heading);
  padding-bottom: 6px;
  border-bottom: 1px solid var(--color-border);
}

.legend-items {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 150px;
  overflow-y: auto;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  background: var(--color-bg-text-panel, #1a2744);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 12px;
}

.legend-item:hover {
  background: rgba(233, 69, 96, 0.1);
}

.legend-color {
  width: 12px;
  height: 12px;
  border-radius: 3px;
}

.legend-remove {
  margin-left: auto;
  color: #999;
  font-size: 11px;
  opacity: 0;
  transition: opacity 0.2s;
}

.legend-item:hover .legend-remove {
  opacity: 1;
}

.legend-empty {
  color: #999;
  font-size: 12px;
  text-align: center;
  padding: 12px;
}

.country-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 280px;
  overflow-y: auto;
}

.country-add-btn {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: var(--color-bg-text-panel, #1a2744);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
  width: 100%;
}

.country-add-btn:hover {
  background: rgba(233, 69, 96, 0.1);
  border-color: var(--color-accent);
}

.country-add-btn.added {
  background: rgba(76, 175, 80, 0.15);
  border-color: #4caf50;
  color: #66bb6a;
}

.country-add-btn.no-wave-data {
  opacity: 0.4;
  color: #5a6a7a;
  border-color: rgba(100, 100, 120, 0.15);
  background: rgba(100, 100, 120, 0.08);
}

.country-add-btn.no-wave-data:hover {
  background: rgba(100, 100, 120, 0.12);
  border-color: rgba(100, 100, 120, 0.25);
}

.country-code {
  font-weight: 600;
  color: var(--color-text);
}

.country-name {
  color: var(--color-text);
}

.radar-polygon,
.radar-point {
  pointer-events: visible !important;
}

.radar-tooltip {
  font-size: 12px;
  line-height: 1.6;
  pointer-events: none;
}

/* 滚动条样式 */
.legend-items::-webkit-scrollbar,
.country-list::-webkit-scrollbar {
  width: 4px;
}

.legend-items::-webkit-scrollbar-track,
.country-list::-webkit-scrollbar-track {
  background: var(--color-border);
  border-radius: 2px;
}

.legend-items::-webkit-scrollbar-thumb,
.country-list::-webkit-scrollbar-thumb {
  background: #6a7a8a;
  border-radius: 2px;
}
</style>