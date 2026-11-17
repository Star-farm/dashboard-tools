import fs from 'node:fs/promises'

const file = new URL('../public/map-data/soil-overlay.json', import.meta.url)
const data = JSON.parse(await fs.readFile(file, 'utf8'))
const names = [
  ['Đất trồng lúa', 'Rice cultivation', '#E8C547'],
  ['Đất trồng cây khác', 'Other crop cultivation', '#81B65D'],
  ['Đất lâm nghiệp', 'Forestry land', '#26734D'],
  ['Đất nuôi trồng thủy sản', 'Aquaculture', '#39B9C5'],
  ['Đất nông nghiệp khác', 'Other agricultural land', '#B2C998'],
  ['Đất ở và khu dân cư', 'Residential and settlement land', '#E88D86'],
  ['Đất công nghiệp, sản xuất và thương mại', 'Industrial, production and commercial land', '#A978BD'],
  ['Đất hạ tầng và công trình công cộng', 'Infrastructure and public facilities', '#D59C6B'],
  ['Đất sông ngòi và mặt nước', 'Rivers and water bodies', '#4A90D6'],
  ['Khác', 'Other', '#A9ADB4'],
]
const landuse = data.layers.find((layer) => layer.id === 'landuse')
if (!landuse || landuse.categories.length !== names.length) throw new Error('Expected ten grouped land use categories.')
landuse.categories = names.map(([vi, en, color], index) => ({ id: String(index + 1), label: { vi, en }, color }))
await fs.writeFile(file, JSON.stringify(data))
