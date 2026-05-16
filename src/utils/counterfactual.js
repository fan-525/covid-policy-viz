/**
 * counterfactual.js — 反事实推演计算工具
 *
 * 算法：累积政策效应调整法
 *
 * 核心思路：
 *   1. 将政策曲线平移 shiftDays 天（提前为负，延后为正）
 *   2. 对每一天，计算「平移后政策」与「实际政策」的日差值，并累积
 *   3. 用指数函数将累积差值转换为调整因子：
 *        adjustmentFactor = exp(-cumulativeDelta / scalingFactor)
 *   4. 模拟病例 = 实际病例 × 调整因子
 *
 * 物理含义：
 *   - 累积差值 > 0 → 政策总体更强（如提前干预）→ 调整因子 < 1 → 病例更少
 *   - 累积差值 < 0 → 政策总体更弱（如延后干预）→ 调整因子 > 1 → 病例更多
 *
 * 优点（相比旧算法）：
 *   - 无乘积累积误差，曲线平滑自然
 *   - shift = 0 时自然还原实际曲线
 *   - 不会出现上下震荡
 *
 * @param {Array} data — 某国时序数据 [{date, new_cases_smoothed, policy_lockdown, ...}]
 * @param {number} shiftDays — 偏移天数（负数=提前，正数=延后）
 * @returns {Array} — 模拟的病例曲线 [{date, simulated_cases}]
 */
export function computeCounterfactual(data, shiftDays) {
  if (!data || data.length === 0 || shiftDays === 0) return []

  const policyKeys = ['policy_lockdown', 'policy_testing', 'policy_mask', 'policy_vaccine', 'policy_border']

  // 政策值钳位到 [0, 3]，与 PolicyTimeline.vue 中 clampPolicy 一致
  function clampPolicyVal(val) {
    const n = Number(val)
    if (!n || isNaN(n)) return 0
    return Math.max(0, Math.min(3, n))
  }

  // 计算某一天的实际总政策强度（0-15）
  function getActualPolicy(idx) {
    let total = 0
    for (const key of policyKeys) {
      total += clampPolicyVal(data[idx][key])
    }
    return total
  }

  // 计算某一天的平移后总政策强度（0-15）
  function getShiftedPolicy(idx) {
    const sourceIdx = idx - shiftDays
    if (sourceIdx < 0) return 0 // 数据范围之前，无政策
    if (sourceIdx >= data.length) {
      // 数据范围之后，使用最后一个值
      return getActualPolicy(data.length - 1)
    }
    let total = 0
    for (const key of policyKeys) {
      total += clampPolicyVal(data[sourceIdx][key])
    }
    return total
  }

  // scalingFactor 控制灵敏度：
  //   值越小 → 政策差异对病例的影响越大（曲线偏移越明显）
  //   值越大 → 影响越温和
  // 经验值 150：10天提前约产生 20-40% 差异，30天约 40-70%
  const scalingFactor = 150

  // 生成模拟曲线
  const result = []
  let cumulativeDelta = 0

  for (let i = 0; i < data.length; i++) {
    const actualCases = data[i].new_cases_smoothed || 0

    // 计算当天政策差异并累积
    const shiftedPolicy = getShiftedPolicy(i)
    const actualPolicy = getActualPolicy(i)
    cumulativeDelta += (shiftedPolicy - actualPolicy)

    // 指数调整因子
    const adjustmentFactor = Math.exp(-cumulativeDelta / scalingFactor)

    // 限制调整因子范围，防止极端偏移
    const cappedFactor = Math.max(0.05, Math.min(5.0, adjustmentFactor))

    const simulatedCases = actualCases * cappedFactor

    result.push({
      date: data[i].date,
      simulated_cases: Math.max(0, Math.round(simulatedCases * 10) / 10)
    })
  }

  return result
}

/**
 * 检测病例增速拐点（二阶导变号点）
 * 用于标注"最佳干预窗口"
 *
 * @param {Array} data — 时序数据
 * @returns {Array} — 拐点日期数组
 */
export function detectInflectionPoints(data) {
  if (!data || data.length < 7) return []

  const points = []

  // 使用 7 天窗口计算二阶差分
  for (let i = 3; i < data.length - 3; i++) {
    const prev = (data[i-1].new_cases_smoothed || 0)
    const curr = (data[i].new_cases_smoothed || 0)
    const next = (data[i+1].new_cases_smoothed || 0)

    // 一阶差分（增速）
    const d1_prev = curr - prev
    const d1_next = next - curr

    // 二阶差分（加速度）
    const d2 = d1_next - d1_prev

    // 从正变负 → 增速拐点（从加速转减速）
    if (i > 3) {
      const prevD2 = (data[i].new_cases_smoothed || 0) - 2 * (data[i-1].new_cases_smoothed || 0) + (data[i-2].new_cases_smoothed || 0)
      if (prevD2 > 0 && d2 < 0 && curr > 100) {
        points.push({
          date: data[i].date,
          cases: curr,
          type: 'deceleration' // 从加速转减速
        })
      }
    }
  }

  // 只返回第一个拐点（最有意义的"最佳干预窗口"）
  return points.length > 0 ? [points[0]] : []
}

/**
 * 找到政策首次大幅升级的日期
 *
 * @param {Array} data — 时序数据
 * @param {number} threshold — 政策强度变化阈值（默认 2）
 * @returns {Array} — 关键政策日期
 */
export function detectPolicyChanges(data, threshold = 2) {
  if (!data || data.length < 2) return []

  const policyKeys = ['policy_lockdown', 'policy_testing', 'policy_mask', 'policy_vaccine', 'policy_border']
  const changes = []

  let prevTotal = 0
  for (const key of policyKeys) {
    prevTotal += data[0][key] || 0
  }

  for (let i = 1; i < data.length; i++) {
    let currTotal = 0
    for (const key of policyKeys) {
      currTotal += data[i][key] || 0
    }

    if (currTotal - prevTotal >= threshold) {
      changes.push({
        date: data[i].date,
        level: currTotal,
        change: currTotal - prevTotal
      })
    }
    prevTotal = currTotal
  }

  return changes
}