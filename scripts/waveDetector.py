import json
import pandas as pd
import numpy as np
from scipy.signal import find_peaks

DATA_DIR = '../public/data/'

def detect_waves():
    print("🌊 开始执行疫情波浪特征检测算法...")
    
    try:
        with open(f'{DATA_DIR}merged_covid_data.json', 'r', encoding='utf-8') as f:
            data = json.load(f)
    except FileNotFoundError:
        print("❌ 找不到 merged_covid_data.json，请确认预处理脚本是否成功执行！")
        return
        
    global_waves = {}
    
    for iso, records in data.items():
        df = pd.DataFrame(records)
        if len(df) < 100: 
            continue # 数据期太短的国家跳过
            
        # 组长要求：基于每日新增病例 7 日移动平均的峰值检测
        # 说明原因：剔除周末不上报带来的数据噪音
        cases_smoothed = df['new_cases_smoothed'].values
        
        # 寻找波峰: 
        # distance=90 确保两波之间至少间隔三个月，避免单波双峰被误判
        # prominence=50 过滤掉微小的波动
        peaks, _ = find_peaks(cases_smoothed, distance=90, prominence=50)
        
        country_waves = []
        for i, peak_idx in enumerate(peaks):
            # 定义每波的范围：波峰前后各45天（简化模型）
            start_idx = max(0, peak_idx - 45)
            end_idx = min(len(df)-1, peak_idx + 45)
            
            wave_data = df.iloc[start_idx:end_idx]
            
            # 计算组长要求的特征
            peak_cases = float(wave_data['new_cases'].max())
            duration = int(end_idx - start_idx)
            cases_sum = float(wave_data['new_cases'].sum())
            deaths_sum = float(wave_data['new_deaths'].sum())
            
            # 计算病死率 (Case Fatality Rate)
            cfr = (deaths_sum / cases_sum * 100) if cases_sum > 0 else 0.0
            
            country_waves.append({
                "wave_id": i + 1,
                "peak_date": df.iloc[peak_idx]['date'],
                "days_to_peak": 45, # 抵达波峰的天数
                "peak_cases": peak_cases,
                "duration_days": duration,
                "case_fatality_rate": round(cfr, 4)
            })
            
        if country_waves:
            global_waves[iso] = country_waves
            
    with open(f'{DATA_DIR}wave_features.json', 'w', encoding='utf-8') as f:
        json.dump(global_waves, f, ensure_ascii=False)
        
    print(f"✅ 波浪检测完成！成功提取了 {len(global_waves)} 个国家的波次特征，已保存至 wave_features.json")

if __name__ == "__main__":
    detect_waves()