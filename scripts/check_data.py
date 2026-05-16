import json

with open(r'd:\covid-policy-viz\public\data\merged_covid_data.json', 'r', encoding='utf-8') as f:
    d = json.load(f)

keys = list(d.keys())
print('Countries:', len(keys))
print('First 5:', keys[:5])
print('First record fields:', list(d[keys[0]][0].keys()))
print('Sample record:', d[keys[0]][0])