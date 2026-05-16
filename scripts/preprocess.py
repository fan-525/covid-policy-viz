import pandas as pd
import numpy as np
import json

# 路径配置
DATA_DIR = '../public/data/'
SCRIPT_DIR = './'

def preprocess_data():
    print("🚀 开始加载原始数据 (这可能需要十几秒，请稍候)...")
    try:
        owid = pd.read_csv(f'{SCRIPT_DIR}owid-covid-data.csv')
        oxford = pd.read_csv(f'{SCRIPT_DIR}OxCGRT_latest.csv', low_memory=False)
    except FileNotFoundError as e:
        print(f"❌ 找不到数据文件！请确保 csv 文件名是 owid-covid-data.csv 和 OxCGRT_latest.csv。详细报错: {e}")
        return

    print("🧹 正在清洗 OWID 疫情数据...")
    owid = owid.dropna(subset=['iso_code', 'date', 'new_cases']) 
    owid['date'] = pd.to_datetime(owid['date']).dt.strftime('%Y-%m-%d')
    owid['total_cases'] = owid.groupby('iso_code')['total_cases'].ffill().fillna(0)
    owid['new_cases_smoothed'] = owid.groupby('iso_code')['new_cases_smoothed'].ffill().fillna(0)
    
    print("⚖️ 正在清洗并提取 Oxford 政策数据 (已启用动态表头适配)...")
    oxford['date'] = pd.to_datetime(oxford['Date'], format='%Y%m%d').dt.strftime('%Y-%m-%d')
    
    # 核心修复点：动态获取列名，不管牛津官方加了 'M' 还是 'EV' 都能精准识别
    def get_col(prefix):
        for col in oxford.columns:
            if col.startswith(prefix):
                return col
        return prefix # 保底策略
        
    c1, c2, c3 = get_col('C1'), get_col('C2'), get_col('C3')
    c4, c5, c8 = get_col('C4'), get_col('C5'), get_col('C8')
    h1, h2 = get_col('H1'), get_col('H2')
    h4, h5 = get_col('H4'), get_col('H5')
    
    oxford['policy_lockdown'] = oxford[[c1, c2, c3]].max(axis=1) / 3 * 3
    oxford['policy_testing'] = oxford[[h1, h2]].max(axis=1) / 3 * 3
    oxford['policy_mask'] = oxford[c4] / 4 * 3 
    oxford['policy_vaccine'] = oxford[[h4, h5]].max(axis=1) / 3 * 3
    oxford['policy_border'] = oxford[[c5, c8]].max(axis=1) / 4 * 3
    
    oxford_clean = oxford[['CountryCode', 'date', 'policy_lockdown', 'policy_testing', 'policy_mask', 'policy_vaccine', 'policy_border']].fillna(0)
    for col in ['policy_lockdown', 'policy_testing', 'policy_mask', 'policy_vaccine', 'policy_border']:
        oxford_clean[col] = oxford_clean[col].round().astype(int)
        
    print("🔗 正在按国家和日期合并数据集...")
    merged = pd.merge(owid, oxford_clean, left_on=['iso_code', 'date'], right_on=['CountryCode', 'date'], how='inner')
    
    cols_to_keep = ['iso_code', 'location', 'date', 'new_cases', 'total_cases', 'new_deaths', 'new_cases_smoothed',
                    'policy_lockdown', 'policy_testing', 'policy_mask', 'policy_vaccine', 'policy_border']
    final_df = merged[cols_to_keep]
    
    print("📝 正在生成数据处理报告...")
    countries_count = final_df['iso_code'].nunique()
    start_date = final_df['date'].min()
    end_date = final_df['date'].max()
    
    report_content = f"数据处理报告:\n原始OWID数据行数: {len(owid)}\n清洗合并后行数: {len(final_df)}\n覆盖国家数: {countries_count}\n时间跨度: {start_date} 至 {end_date}\n政策维度分布:\n{final_df[['policy_lockdown', 'policy_testing']].describe().to_string()}"
    
    with open(f'{DATA_DIR}data_report.txt', 'w', encoding='utf-8') as f:
        f.write(report_content)
        
    print("📦 正在导出为前端所需的 JSON 文件...")
    json_dict = {}
    for iso, group in final_df.groupby('iso_code'):
        json_dict[iso] = group.drop('iso_code', axis=1).to_dict('records')
        
    with open(f'{DATA_DIR}merged_covid_data.json', 'w') as f:
        json.dump(json_dict, f)
        
    print("✅ 数据清洗全部完成！")

if __name__ == "__main__":
    preprocess_data()