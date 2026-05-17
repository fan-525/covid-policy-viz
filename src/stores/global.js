import { defineStore } from 'pinia'

export const useGlobalStore = defineStore('global', {
  state: () => ({
    // 核心数据
    covidData: null,
    waveFeatures: null,
    centroids: null,
    
    // 交互状态
    selectedCountries: [],
    mapHighlightCountries: [],
    currentTime: null,
    timeRange: ['2020-01-01', '2023-06-30'],
    currentWave: 1,
    currentPolicyMetric: 'comprehensive',
    
    // 图表切换状态
    activeChart: 'pulseMap',
    
    // 反事实推演
    counterfactualShift: 0,
    
    // UI状态
    isLoading: true,
    
    // 用户是否手动选择了国家（用于控制滚动自动切换）
    userManuallySelected: false,
  }),

  actions: {
    // 异步加载数据
    async fetchAllData() {
      this.isLoading = true;
      try {
        const base = import.meta.env.BASE_URL;
        const [covidRes, waveRes, centroidRes] = await Promise.all([
          fetch(base + 'data/merged_covid_data.json'),
          fetch(base + 'data/wave_features.json'),
          fetch(base + 'data/country_centroids.json')
        ]);
        
        this.covidData = await covidRes.json();
        this.waveFeatures = await waveRes.json();
        this.centroids = await centroidRes.json();
      } catch (error) {
        console.error("加载数据失败:", error);
      } finally {
        this.isLoading = false;
      }
    },

    // 联动触发函数：更新选中国家（标记为手动选择）
    toggleCountry(isoCode) {
      const index = this.selectedCountries.indexOf(isoCode);
      if (index > -1) {
        this.selectedCountries.splice(index, 1);
      } else {
        this.selectedCountries.push(isoCode);
      }
      this.userManuallySelected = true;
      console.log('[global] toggleCountry:', isoCode);
    },

    // 设置选中国家（替换整个列表）
    setSelectedCountries(codes, isManual = false) {
    this.selectedCountries = [...codes];
    if (isManual) {
      this.userManuallySelected = true;
      console.log('[global] setSelectedCountries (手动):', codes);
    } else {
      console.log('[global] setSelectedCountries (自动):', codes);
    }
  
    // 如果选中国家为空，重置手动选择标记
    if (this.selectedCountries.length === 0) {
      this.userManuallySelected = false;
      console.log('[global] 选中国家为空，恢复自动滚动');
    }
  },
    

    // 清除所有选中国家
    clearSelectedCountries() {
    this.selectedCountries = [];
    this.userManuallySelected = false;
    console.log('[global] clearSelectedCountries，恢复自动滚动');
    },

    // 重置用户手动选择标记
    resetUserManuallySelected() {
      this.userManuallySelected = false;
      console.log('[global] resetUserManuallySelected');
    },

    // 地图专用高亮方法
    setMapHighlightCountries(codes) {
      console.log('[global] setMapHighlightCountries:', codes)
      this.mapHighlightCountries = [...codes];
    },

    clearMapHighlightCountries() {
      console.log('[global] clearMapHighlightCountries')
      this.mapHighlightCountries = [];
    },

    // 设置当前活跃图表
    setActiveChart(chartName) {
      this.activeChart = chartName;
    },

    // 设置时间范围
    setTimeRange(start, end) {
      this.timeRange = [start, end];
    },

    // 设置当前波次
    setCurrentWave(wave) {
      this.currentWave = wave;
    },

    // 设置热力矩阵当前指标
    setCurrentPolicyMetric(metric) {
      this.currentPolicyMetric = metric;
    },

    // 设置反事实推演偏移天数
    setCounterfactualShift(days) {
      this.counterfactualShift = Math.max(-30, Math.min(30, days));
    },

    // 设置当前时间
    setCurrentTime(date) {
      this.currentTime = date;
    },

    // 重置所有状态
    resetState() {
      this.selectedCountries = [];
      this.mapHighlightCountries = [];
      this.currentTime = null;
      this.currentWave = 1;
      this.currentPolicyMetric = 'comprehensive';
      this.activeChart = 'pulseMap';
      this.counterfactualShift = 0;
      this.timeRange = ['2020-01-01', '2023-06-30'];
      this.userManuallySelected = false;
    }
  }
})