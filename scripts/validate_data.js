import { readFileSync } from 'fs'

const files = [
  'public/data/merged_covid_data.json',
  'public/data/wave_features.json', 
  'public/data/country_centroids.json',
  'public/data/world-110m.json'
]

for (const f of files) {
  try {
    const content = readFileSync(f, 'utf8')
    // Check for NaN
    const nanCount = (content.match(/\bNaN\b/g) || []).length
    // Check for Infinity
    const infCount = (content.match(/\bInfinity\b/g) || []).length
    // Try parsing
    try {
      const parsed = JSON.parse(content)
      const sizeMB = (content.length / 1024 / 1024).toFixed(2)
      let info = ''
      if (Array.isArray(parsed)) info = `array of ${parsed.length} items`
      else if (typeof parsed === 'object') info = `object with ${Object.keys(parsed).length} keys`
      console.log(`✅ ${f}: Valid JSON (${sizeMB}MB, ${info})`)
      if (nanCount > 0) console.log(`   ⚠️ Contains ${nanCount} NaN values`)
      if (infCount > 0) console.log(`   ⚠️ Contains ${infCount} Infinity values`)
    } catch (e) {
      console.log(`❌ ${f}: INVALID JSON - ${e.message}`)
      if (nanCount > 0) console.log(`   Contains ${nanCount} NaN values`)
      if (infCount > 0) console.log(`   Contains ${infCount} Infinity values`)
      // Show context around first error
      const match = content.match(/\bNaN\b/)
      if (match) {
        const idx = match.index
        console.log(`   First NaN at char ${idx}: ...${content.substring(Math.max(0,idx-50), idx+50)}...`)
      }
    }
  } catch (e) {
    console.log(`❌ ${f}: Cannot read - ${e.message}`)
  }
}