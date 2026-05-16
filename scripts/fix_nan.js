import { readFileSync, writeFileSync } from 'fs'

const filePath = 'public/data/merged_covid_data.json'
console.log('Reading', filePath, '...')
const content = readFileSync(filePath, 'utf8')

// Replace all NaN with null
const fixed = content.replace(/\bNaN\b/g, 'null')

// Verify it's valid JSON now
try {
  const parsed = JSON.parse(fixed)
  console.log('✅ Fixed! Valid JSON with', Object.keys(parsed).length, 'countries')
  writeFileSync(filePath, fixed, 'utf8')
  console.log('Written fixed file.')
} catch (e) {
  console.error('❌ Still invalid:', e.message)
}