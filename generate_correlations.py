#!/usr/bin/env python3
"""
Generate correlation data for D3.js visualizations.
5 key correlations analyzing IC accessibility and socioeconomic indicators.
"""

import json
import pandas as pd
import numpy as np
import os

os.makedirs('public/data/correlations', exist_ok=True)

def load_geojson(path):
    with open(path, 'r') as f:
        return json.load(f)

def geojson_to_df(geojson_data):
    features = geojson_data['features']
    data = [feat['properties'].copy() for feat in features]
    return pd.DataFrame(data)

print('='*70)
print('CORRELATION ANALYSIS: IC Accessibility & Socioeconomic Data')
print('='*70)

# Load datasets
print('\n[1/5] Loading datasets...')
df_income = geojson_to_df(load_geojson('docs/data/income_levels.geojson'))
df_real_estate = geojson_to_df(load_geojson('docs/data/real_estate_prices.geojson'))
df_employment = geojson_to_df(load_geojson('docs/data/municipal_jobs.geojson'))
df_pop = geojson_to_df(load_geojson('docs/data/population_density.geojson'))
df_pt = geojson_to_df(load_geojson('docs/data/public_transport_share.geojson'))
df_acc = geojson_to_df(load_geojson('docs/data/accessibility_overlay.geojson'))

# Merge socioeconomic data
print('[2/5] Merging socioeconomic data...')
df_socio = df_income[['name', 'Avg_Income']].copy()
df_socio = df_socio.merge(df_real_estate[['name', 'Price_per_m2']], on='name', how='left')
df_socio = df_socio.merge(df_employment[['name', 'Total_Jobs']], on='name', how='left')
df_socio = df_socio.merge(df_pop[['name', 'Pop_Density', 'Total_Population']], on='name', how='left')
df_socio = df_socio.merge(df_pt[['name', 'PT_Share']], on='name', how='left')

# Aggregate accessibility by municipality
df_acc_by_muni = df_acc.groupby('GDENAME').agg({
    'min_travel_time_to_ic': 'mean',
    'n_destinations_reachable_6h': 'mean',
    'KTKZ': 'first',
    'KTNAME': 'first'
}).reset_index()
df_acc_by_muni.columns = ['name', 'avg_travel_time_ic', 'avg_destinations', 'canton_code', 'canton']

# Merge all
df = df_socio.merge(df_acc_by_muni, on='name', how='inner')
df['employment_density'] = (df['Total_Jobs'] / df['Total_Population'] * 1000).fillna(0)

print( {len(df)} municipalities across {df["canton"].nunique()} cantons')f'   

# 1. ACCESSIBILITY PARADOX
print('\n[3/5] Computing correlations...')
 Accessibility Paradox (Travel Time vs Real Estate)')print('   
df_scatter = df[['name', 'canton', 'avg_travel_time_ic', 'Price_per_m2', 'Avg_Income']].copy()
df_scatter = df_scatter.dropna(subset=['avg_travel_time_ic', 'Price_per_m2'])
df_scatter['size'] = (df_scatter['Avg_Income'] / df_scatter['Avg_Income'].max() * 30 + 5).fillna(5)

corr_scatter = df_scatter['avg_travel_time_ic'].corr(df_scatter['Price_per_m2'])
scatter_data = {
    'title': 'The Accessibility Paradox',
    'subtitle': 'Do better connections guarantee higher prices?',
    'description': 'Travel time to nearest IC hub vs Real Estate Price per m2',
    'narrative': 'The best connections do not always mean the highest prices. Certain rural areas with excellent IC access have significantly lower property values than isolated suburban regions.',
    'correlation': float(corr_scatter),
    'n_data': len(df_scatter),
    'data': df_scatter.to_dict('records')
}
with open('public/data/correlations/scatter_accessibility_realestate.json', 'w') as f:
    json.dump(scatter_data, f)
print(f'      r = {corr_scatter:.3f}, n = {len(df_scatter)}')

# 2. EMPLOYMENT HUBS
 Employment Hubs Connectivity')print('   
df_emp = df[['name', 'canton', 'canton_code', 'Total_Jobs', 'Total_Population',
              'employment_density', 'avg_travel_time_ic', 'Pop_Density']].copy()
df_emp = df_emp.dropna(subset=['Total_Jobs', 'avg_travel_time_ic'])

canton_emp = df_emp.groupby('canton').agg({
    'Total_Jobs': 'sum',
    'Total_Population': 'sum',
    'avg_travel_time_ic': 'mean',
    'employment_density': 'mean',
    'name': 'count'
}).reset_index()
canton_emp.columns = ['canton', 'total_jobs', 'total_population', 'avg_travel_time', 'avg_employment_density', 'municipalities']
canton_emp['jobs_per_capita'] = canton_emp['total_jobs'] / canton_emp['total_population'] * 1000

corr_emp = df_emp['employment_density'].corr(df_emp['avg_travel_time_ic'])
emp_data = {
    'title': 'Employment Hubs Connectivity',
    'subtitle': 'Are job centers well connected to IC hubs?',
    'description': 'Employment density vs Accessibility to IC hubs',
    'narrative': 'High employment concentration does not guarantee good accessibility to IC hubs. Workers in some job centers face long commutes despite significant employment activity.',
    'correlation': float(corr_emp),
    'n_data': len(df_emp),
    'municipalities': df_emp.to_dict('records'),
    'canton_summary': canton_emp.to_dict('records')
}
with open('public/data/correlations/employment_connectivity.json', 'w') as f:
    json.dump(emp_data, f)
print(f'      r = {corr_emp:.3f}, n = {len(df_emp)} municipalities')

# 3. WEALTH GAPS
 Wealth Gaps & Mobility')print('   
df_wealth = df[['canton', 'canton_code', 'Avg_Income', 'avg_travel_time_ic', 'Total_Population']].copy()
df_wealth = df_wealth.dropna(subset=['Avg_Income', 'avg_travel_time_ic'])

canton_wealth = df_wealth.groupby(['canton', 'canton_code']).agg({
    'Avg_Income': 'mean',
    'avg_travel_time_ic': 'mean',
    'Total_Population': 'sum'
}).reset_index()
canton_wealth.columns = ['canton', 'canton_code', 'avg_income', 'avg_travel_time', 'population']
canton_wealth = canton_wealth.sort_values('avg_income', ascending=False)

corr_wealth = canton_wealth['avg_income'].corr(canton_wealth['avg_travel_time'])
wealth_data = {
    'title': 'Wealth Gaps & Mobility',
    'subtitle': 'Does prosperity correlate with better transport access?',
    'description': 'Average income vs Accessibility to IC hubs by canton',
    'narrative': 'Wealthier cantons do not always enjoy better IC accessibility. Some prosperous regions are geographically isolated, while some lower-income areas benefit from excellent transport networks.',
    'correlation': float(corr_wealth),
    'n_data': len(canton_wealth),
    'data': canton_wealth.to_dict('records')
}
with open('public/data/correlations/wealth_gaps_canton.json', 'w') as f:
    json.dump(wealth_data, f)
print(f'      r = {corr_wealth:.3f}, n = {len(canton_wealth)} cantons')

# 4. DENSITY TRADE-OFF
 Density vs Isolation Trade-off')print('   
df_density = df[['name', 'canton', 'canton_code', 'Pop_Density', 'avg_travel_time_ic', 'Total_Population']].copy()
df_density = df_density.dropna(subset=['Pop_Density', 'avg_travel_time_ic'])

canton_pop = df_density.groupby('canton')['Total_Population'].sum().sort_values(ascending=False)
major_cantons = canton_pop.head(8).index.tolist()

df_density_facet = df_density[df_density['canton'].isin(major_cantons)].copy()

canton_correlations = {}
for canton in major_cantons:
    df_canton = df_density[df_density['canton'] == canton]
    if len(df_canton) > 2:
        corr = df_canton['Pop_Density'].corr(df_canton['avg_travel_time_ic'])
        canton_correlations[canton] = float(corr) if not pd.isna(corr) else None

density_export = {
    'title': 'Density vs Isolation Trade-off',
    'subtitle': 'Does density guarantee or prevent isolation?',
    'description': 'Population density vs Accessibility - faceted by major canton',
    'narrative': 'Dense urban areas are not always more isolated. Some regions show that high population density correlates with better IC access, while others show the opposite pattern.',
    'major_cantons': major_cantons,
    'correlations_by_canton': canton_correlations,
    'n_data': len(df_density_facet),
    'data': df_density_facet.to_dict('records')
}
with open('public/data/correlations/density_isolation.json', 'w') as f:
    json.dump(density_export, f)
print(f'      {len(major_cantons)} major cantons analyzed')

# FULL DATASET
print('\n[4/5] Exporting datasets...')
df.to_csv('public/data/correlations/full_data.csv', index=False)

full_data = {
    'metadata': {
        'municipalities': len(df),
        'cantons': df['canton'].nunique(),
        'fields': list(df.columns)
    },
    'data': df.to_dict('records')
}

with open('public/data/correlations/full_data.json', 'w') as f:
    json.dump(full_data, f)

print( Full dataset: {len(df)} municipalities across {df["canton"].nunique()} cantons')f'   

# SUMMARY
print('\n[5/5] Summary')
print('='*70)
print('Generated correlation data files:')
print('  1. scatter_accessibility_realestate.json  - Paradox visualization')
print('  2. employment_connectivity.json            - Employment hubs analysis')
print('  3. wealth_gaps_canton.json                 - Wealth gaps by canton')
print('  4. density_isolation.json                  - Density trade-off analysis')
print('  5. full_data.csv/json                      - Complete dataset')
print('='*70)
print('\nAll files exported to: public/data/correlations/')
print('Ready for D3.js integration!')

