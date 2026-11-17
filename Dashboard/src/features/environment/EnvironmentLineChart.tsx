import { bau3Conditions } from '../economics/bau3Types'
import ChartInfo from '../../components/ChartInfo'
import ChartUnitLabel from '../../components/ChartUnitLabel'
import { ConditionLegend } from '../../components/ConditionFilters'
import {
  CHART_TICK,
  scenarioLineStyle,
} from '../../components/chartStyles'
import { useState } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { Language } from '../../i18n'
import { yearTicks } from '../../utils/yearTicks'
import type {
  Bau3Family,
  Bau3Condition,
} from '../economics/bau3Types'
import { bau3Text } from '../economics/bau3Text'
import type {
  EnvironmentData,
  EnvironmentMetric,
} from './environmentTypes'
import {
  environmentLinePoints,
  environmentNumber,
  environmentUnit,
} from './environmentAnalysis'
import { environmentText } from './environmentText'

export default function EnvironmentLineChart({
  data,
  family,
  metric,
  domain,
  language,
  title,
  visibleConditions = bau3Conditions,
}: {
  data: EnvironmentData
  family: Bau3Family
  metric: EnvironmentMetric
  domain: [number, number]
  language: Language
  title?: string
  visibleConditions?: readonly Bau3Condition[]
}) {
  const [width, setWidth] = useState(620)

  const t = environmentText[language]
  const labels = bau3Text[language]

  const points = environmentLinePoints(
    data,
    family,
    metric
  )

  const unit = environmentUnit(metric, language)

  const hasData = points.some((point) =>
    visibleConditions.some(
      (condition) => point[condition] != null
    )
  )

  return (
    <article
      className={`bau3-chart bau3-chart-${family}`}
      aria-labelledby={`environment-${metric}-${family}-title`}
    >
      <header>
        <h3 id={`environment-${metric}-${family}-title`}>
          {title ?? t[family]}
        </h3>
      </header>

      {hasData ? (
        <div
          className="bau3-plot"
          role="group"
          aria-label={`${t[metric]} · ${t[family]} · ${unit}`}
        >
          <ChartUnitLabel unit={unit} />
          <ResponsiveContainer
            width="100%"
            height="100%"
            initialDimension={{ width: 620, height: 310 }}
            onResize={setWidth}
          >
            <LineChart
              data={points}
              accessibilityLayer
              margin={{
                top: 32,
                right: 20,
                left: 0,
                bottom: 8,
              }}
            >
              <CartesianGrid
                stroke="#b5c2aa"
                strokeWidth={1}
              />

              <XAxis
                dataKey="year"
                type="number"
                domain={[data.startYear, data.endYear]}
                ticks={yearTicks(
                  data.startYear,
                  data.endYear,
                  width,
                  88
                )}
                interval={0}
                allowDecimals={false}
                tickLine={false}
                tickMargin={10}
                axisLine={{ stroke: '#819275' }}
                tick={CHART_TICK}
              />

              <YAxis
                width={68}
                domain={domain}
                allowDataOverflow
                tickFormatter={(value) =>
                  new Intl.NumberFormat(language, {
                    maximumFractionDigits: 1,
                  }).format(Number(value))
                }
                tickLine={false}
                tickMargin={8}
                axisLine={{ stroke: '#819275' }}
                tick={CHART_TICK}
              />

              <Tooltip
                shared
                isAnimationActive={false}
                content={(props) => (
                  <ChartInfo
                    {...props}
                    yearLabel={t.year}
                    format={(value) =>
                      `${environmentNumber(value, language)} ${unit}`
                    }
                  />
                )}
                cursor={{
                  stroke: '#819275',
                  strokeDasharray: '3 3',
                }}
                wrapperStyle={{
                  pointerEvents: 'none',
                  zIndex: 10,
                }}
              />

              {visibleConditions.map((condition) => (
                <Line
                  key={condition}
                  type="linear"
                  dataKey={condition}
                  name={labels[condition]}
                  {...scenarioLineStyle(
                    family,
                    condition,
                    true,
                    false
                  )}
                  connectNulls={false}
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="bau3-no-data">{t.noData}</p>
      )}
      <ConditionLegend language={language} conditions={visibleConditions} />
    </article>
  )
}
