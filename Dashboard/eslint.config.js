import js from '@eslint/js'
import { readFileSync } from 'node:fs'
import globals from 'globals'
import { join } from 'node:path'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

const noGlobalPlotPopupContext = {
  meta: {
    type: 'problem',
    docs: { description: 'keep global year, harvest, and scenario context out of plot popups' },
    schema: [],
    messages: {
      noGlobalContext: 'Keep the plot popup focused on plot values; show year, harvest, and scenario context in the map controls instead.',
    },
  },
  create(context) {
    const forbidden = /\b(year|harvest|scenario)\b/i
    return {
      JSXIdentifier(node) {
        if (forbidden.test(node.name)) context.report({ node, messageId: 'noGlobalContext' })
      },
      JSXText(node) {
        if (forbidden.test(node.value)) context.report({ node, messageId: 'noGlobalContext' })
      },
    }
  },
}

const noScenarioNameInSeasonalPieTooltip = {
  meta: {
    type: 'problem',
    docs: { description: 'keep the mobile seasonal pie tooltip focused on the crop period' },
    schema: [],
    messages: {
      cropPeriodOnly: 'Show only the active crop period in this tooltip; use active.label and remove the scenario group name.',
    },
  },
  create(context) {
    return {
      JSXElement(node) {
        const className = node.openingElement.attributes.find((attribute) =>
          attribute.type === 'JSXAttribute' && attribute.name.name === 'className',
        )
        if (className?.type !== 'JSXAttribute' || className.value?.type !== 'Literal' || className.value.value !== 'seasonal-pie-tooltip-name') return
        const referencesScenarioName = (child) => {
          if (child.type === 'Identifier' && child.name === 'name') return true
          return (context.sourceCode.visitorKeys[child.type] ?? []).some((key) => {
            const value = child[key]
            return Array.isArray(value) ? value.some((item) => item && referencesScenarioName(item)) : value && referencesScenarioName(value)
          })
        }
        if (referencesScenarioName(node)) context.report({ node, messageId: 'cropPeriodOnly' })
      },
    }
  },
}

const noSourceComments = {
  meta: {
    type: 'suggestion',
    docs: { description: 'keep source intent clear through code rather than comments' },
    schema: [],
    messages: {
      removeComment: 'Remove this comment and express the intent through clear names, structure, or executable documentation.',
    },
  },
  create(context) {
    return {
      Program() {
        for (const comment of context.sourceCode.getAllComments()) {
          context.report({ loc: comment.loc, messageId: 'removeComment' })
        }
      },
    }
  },
}

const noPerChartTooltipLabelDeduplication = {
  meta: {
    type: 'problem',
    docs: { description: 'keep tooltip label de-duplication in the shared ChartInfo component' },
    schema: [],
    messages: {
      useSharedDeduplication: 'Remove this per-chart label suppression; ChartInfo should omit the row label automatically when it matches the tooltip heading.',
    },
  },
  create(context) {
    return {
      JSXAttribute(node) {
        if (node.name.type === 'JSXIdentifier' && node.name.name === 'hideEntryLabel') {
          context.report({ node, messageId: 'useSharedDeduplication' })
        }
      },
    }
  },
}

const requireAbbreviationPopupRightAndBelowCursor = {
  meta: {
    type: 'problem',
    docs: { description: 'place abbreviation popups to the right and below the cursor' },
    schema: [],
    messages: {
      rightAndBelow: 'Place the abbreviation popup to the right and below the cursor with pointer.x + 14 and pointer.y + 14; keep edge handling so it stays in the viewport.',
    },
  },
  create(context) {
    const isOffset = (node, axis) => node?.type === 'BinaryExpression'
      && node.operator === '+'
      && node.left?.type === 'MemberExpression'
      && node.left.object?.name === 'pointer'
      && node.left.property?.name === axis
      && node.right?.type === 'Literal'
      && node.right.value === 14
    let hasRightOffset = false
    let hasBelowOffset = false

    return {
      VariableDeclarator(node) {
        if (node.id.type !== 'Identifier') return
        if (node.id.name === 'right' && isOffset(node.init, 'x')) hasRightOffset = true
        if (node.id.name === 'top' && node.init?.type === 'ConditionalExpression' && isOffset(node.init.consequent, 'y')) hasBelowOffset = true
      },
      'Program:exit'(node) {
        if (!hasRightOffset || !hasBelowOffset) context.report({ node, messageId: 'rightAndBelow' })
      },
    }
  },
}

const requireFilteredSeasonalChartData = {
  meta: {
    type: 'problem',
    docs: { description: 'filter seasonal chart categories that have no value in any selected scenario' },
    schema: [],
    messages: {
      useSharedFilter: 'Pass chartData built with pointsWithSharedData(...) so categories with no values in any selected scenario are omitted.',
    },
  },
  create(context) {
    return {
      JSXOpeningElement(node) {
        if (node.name.type !== 'JSXIdentifier' || node.name.name !== 'ComposedChart') return
        const data = node.attributes.find((attribute) => attribute.type === 'JSXAttribute' && attribute.name.type === 'JSXIdentifier' && attribute.name.name === 'data')
        if (data?.type !== 'JSXAttribute' || data.value?.type !== 'JSXExpressionContainer' || data.value.expression.type !== 'Identifier' || data.value.expression.name !== 'chartData') {
          context.report({ node: data ?? node, messageId: 'useSharedFilter' })
        }
      },
    }
  },
}

const requireFittingSeasonalOverviewTables = {
  meta: {
    type: 'problem',
    docs: { description: 'keep annual and seasonal overview tables readable within their available width' },
    schema: [],
    messages: {
      fitInContainer: 'Keep table words intact with word-break: normal, overflow-wrap: normal, and hyphens: none; size each overview as an inline-size container and switch to its card layout at 767px or narrower. Keep both tables at width: 100% with min-width: 0 and fixed layout, and align the climate column with its sticky offset.',
    },
  },
  create(context) {
    const stylesheet = readFileSync(join(process.cwd(), 'src/styles/economics.css'), 'utf8')
    const tableRule = stylesheet.match(/\.economic-table\s*\{([^}]*)\}/)?.[1] ?? ''
    const tableCellRule = stylesheet.match(/\.economic-table th,\s*\.economic-table td\s*\{([^}]*)\}/)?.[1] ?? ''
    const tableUnitRule = stylesheet.match(/\.economic-table thead small\s*\{([^}]*)\}/)?.[1] ?? ''
    const numericCellRule = stylesheet.match(/\.economic-table td\.economic-numeric\s*\{([^}]*)\}/)?.[1] ?? ''
    const seasonalTableRule = stylesheet.match(/\.seasonal-table\s*\{([^}]*)\}/)?.[1] ?? ''
    const annualTableRule = stylesheet.match(/\.economic-overview-table\s*\{([^}]*)\}/)?.[1] ?? ''
    const seasonalStylesheet = readFileSync(join(process.cwd(), 'src/styles/seasonal-comparison.css'), 'utf8')
    const hasStickySecondColumn = /\.economics-page\s+\.economic-table[^{}]*nth-child\(2\)[^{}]*\{[^}]*position:\s*sticky\s*;/s.test(stylesheet)
    const hasAnnualScenarioSecondColumn = /\.economic-overview-table[^{}]*nth-child\(2\)[^{}]*\{[^}]*position:\s*sticky\s*;[^}]*left:\s*var\(--economic-climate-column-width\)\s*;/s.test(stylesheet)
    const hasAnnualClimateWidthVariable = /--economic-climate-column-width:\s*[^;]+;/.test(annualTableRule)
    const hasContainerSizedAnnualTable = /\bwidth:\s*100%\s*;/.test(annualTableRule)
      && /\bmin-width:\s*0\s*;/.test(annualTableRule)
      && /\btable-layout:\s*fixed\s*;/.test(annualTableRule)
      && hasAnnualClimateWidthVariable
    const hasContainerSizedSeasonalTable = /\bwidth:\s*100%\s*;/.test(seasonalTableRule)
      && /\bmin-width:\s*0\s*;/.test(seasonalTableRule)
      && /\btable-layout:\s*fixed\s*;/.test(seasonalTableRule)
    const hasAutoAnnualColumns = /\.economics-page\s+\.economic-overview-table\s+col\s*\{[^}]*width:\s*auto\s*;/s.test(stylesheet)
    const hasAlignedAnnualClimateColumn = /\.economics-page\s+\.economic-overview-table\s+col\.economic-climate-column\s*\{[^}]*width:\s*var\(--economic-climate-column-width\)\s*;/s.test(stylesheet)
    const hasAnnualMetricWidthOverride = /\.economic-overview-table[^{}]*col\.economic-(?:money|roi|margin|yield|labor)-column[^{}]*\{[^}]*width\s*:/s.test(stylesheet)
      || /\.economics-page\s+\.economic-table[^{}]*col\.economic-(?:money|roi|margin|yield|labor)-column[^{}]*\{[^}]*width\s*:/s.test(stylesheet)
    const hasStickySeasonalGroupHeader = /\.economics-page\s+\.economic-table\s+\.economic-column-groups\s*>\s*th:first-child[^{}]*\{[^}]*position:\s*sticky\s*;/s.test(stylesheet)
    const hasStickySpanningGroupCell = /\.economic-table\s+tbody\s+th\s*\{[^}]*position:\s*sticky\s*;/s.test(stylesheet)
    const hasStickyGroupTitle = /\.economic-pivot-group-title\s*\{[^}]*position:\s*sticky\s*;[^}]*left:\s*0\s*;/s.test(stylesheet)
    const hasStickyAwdLabel = /\.economic-pivot-group-awd\s*\{[^}]*position:\s*sticky\s*;[^}]*right:\s*0\s*;/s.test(stylesheet)
    const hasWrappedSeasonalHeaders = /\.seasonal-table thead tr:last-child th > span,\s*\.seasonal-table thead tr:last-child th > small\s*\{[^}]*white-space:\s*normal\s*;[^}]*overflow-wrap:\s*normal\s*;/s.test(stylesheet)
    const hasWrappedAnnualHeaders = /\.economics-page \.economic-table thead tr:last-child th > span,\s*\.economics-page \.economic-table thead tr:last-child th > small\s*\{[^}]*white-space:\s*normal\s*;[^}]*overflow-wrap:\s*normal\s*;/s.test(stylesheet)
    const hasUnbrokenTableWords = /\bword-break:\s*normal\s*;/.test(tableRule)
      && /\bhyphens:\s*none\s*;/.test(tableRule)
      && /\boverflow-wrap:\s*normal\s*;/.test(tableCellRule)
      && /\boverflow-wrap:\s*normal\s*;/.test(tableUnitRule)
      && /\boverflow-wrap:\s*normal\s*;/.test(numericCellRule)
    const hasContainerMobileOverview = /\.economics-page\s*\{[^}]*container-type:\s*inline-size\s*;/s.test(stylesheet)
      && /\.seasonal-overview\s*\{[^}]*container-type:\s*inline-size\s*;/s.test(stylesheet)
      && /@container\s*\(max-width:\s*767px\)/.test(stylesheet)
      && /\.economics-page \.economic-pivot,\s*\.seasonal-overview \.seasonal-pivot\s*\{[^}]*display:\s*none\s*;/s.test(stylesheet)
      && /\.economics-page \.economic-table-region,\s*\.seasonal-overview \.seasonal-table-region\s*\{[^}]*display:\s*none\s*;/s.test(stylesheet)
      && /\.economics-page \.economic-cards,\s*\.seasonal-overview \.economic-cards\s*\{[^}]*display:\s*grid\s*;/s.test(stylesheet)
    const hasSeasonalIntrinsicMinimumWidth = /\.seasonal-table[^{}]*\{[^}]*min-width:\s*(?:max-content|[1-9]\d*(?:px|rem|%))\s*;/s.test(`${stylesheet}\n${seasonalStylesheet}`)
    const hasHorizontalScrollRule = /\.(?:economics-page\s+)?economic-table-region\s*\{[^}]*overflow-x:\s*auto\s*;/s.test(stylesheet)
      || /\.seasonal-table-region\s*\{[^}]*overflow-x:\s*auto\s*;/s.test(stylesheet)
    const hasFittingTables = hasContainerSizedAnnualTable
      && hasContainerSizedSeasonalTable
      && hasWrappedSeasonalHeaders
      && hasWrappedAnnualHeaders
      && hasUnbrokenTableWords
      && hasContainerMobileOverview
      && !hasSeasonalIntrinsicMinimumWidth
      && !hasHorizontalScrollRule
      && !hasStickySecondColumn
      && hasAnnualScenarioSecondColumn
      && hasAutoAnnualColumns
      && hasAlignedAnnualClimateColumn
      && !hasAnnualMetricWidthOverride
      && !hasStickySeasonalGroupHeader
      && !hasStickySpanningGroupCell
      && hasStickyGroupTitle
      && hasStickyAwdLabel
    return {
      Program(node) {
        if (!hasFittingTables) context.report({ node, messageId: 'fitInContainer' })
      },
      JSXOpeningElement(node) {
        if (node.name.type !== 'JSXIdentifier' || node.name.name !== 'col') return
        const className = node.attributes.find((attribute) => attribute.type === 'JSXAttribute' && attribute.name.type === 'JSXIdentifier' && attribute.name.name === 'className')
        const isSeasonalMetricColumn = className?.type === 'JSXAttribute' && (
          className.value?.type === 'Literal' && className.value.value === 'seasonal-metric-column'
          || className.value?.type === 'JSXExpressionContainer'
            && className.value.expression.type === 'TemplateLiteral'
            && className.value.expression.quasis.some((part) => part.value.cooked?.includes('seasonal-metric-column'))
        )
        if (!isSeasonalMetricColumn) return
        const width = node.attributes.find((attribute) => attribute.type === 'JSXAttribute' && attribute.name.type === 'JSXIdentifier' && attribute.name.name === 'style')
        if (width) context.report({ node: width, messageId: 'fitInContainer' })
      },
    }
  },
}

const requireStickyEconomicGroupHeadings = {
  meta: {
    type: 'problem',
    docs: { description: 'keep economic pivot group titles and AWD labels aligned at opposite table edges' },
    schema: [],
    messages: {
      pinTitleAndAwd: 'Wrap group text in .economic-pivot-group-title and its AWD label in .economic-pivot-group-awd so both stay aligned with the group row edges.',
    },
  },
  create(context) {
    const className = (node) => node.type === 'JSXOpeningElement'
      ? node.attributes.find((attribute) => attribute.type === 'JSXAttribute' && attribute.name.type === 'JSXIdentifier' && attribute.name.name === 'className')
      : null
    const hasClass = (node, name) => {
      const attribute = className(node)
      return attribute?.type === 'JSXAttribute' && attribute.value?.type === 'Literal' && attribute.value.value.split(/\s+/).includes(name)
    }
    const findClasses = (node, found) => {
      if (hasClass(node, 'economic-pivot-group-title')) found.title = true
      if (hasClass(node, 'economic-pivot-group-awd')) found.awd = true
      for (const key of context.sourceCode.visitorKeys[node.type] ?? []) {
        const value = node[key]
        if (Array.isArray(value)) value.forEach((child) => child && findClasses(child, found))
        else if (value) findClasses(value, found)
      }
    }
    return {
      JSXElement(node) {
        if (node.openingElement.name.type !== 'JSXIdentifier' || node.openingElement.name.name !== 'tr' || !hasClass(node.openingElement, 'economic-group-heading')) return
        const found = { title: false, awd: false }
        findClasses(node, found)
        if (!found.title || !found.awd) context.report({ node: node.openingElement, messageId: 'pinTitleAndAwd' })
      },
    }
  },
}

const requireFullWidthJustifiedCopy = {
  meta: {
    type: 'problem',
    docs: { description: 'let justified home and page copy use the full content width' },
    schema: [],
    messages: {
      useContentWidth: 'Set .home-about-copy, .intro .page-description, and .map-description to max-width: none and text-align: justify so they reach their content container edges.',
    },
  },
  create(context) {
    const homeStylesheet = readFileSync(join(process.cwd(), 'src/styles/home.css'), 'utf8')
    const homeCopyRule = homeStylesheet.match(/\.home-about\s*>\s*p\.home-about-copy\s*\{([^}]*)\}/)?.[1] ?? ''
    const pageHelpStylesheet = readFileSync(join(process.cwd(), 'src/styles/page-help.css'), 'utf8')
    const pageDescriptionRule = pageHelpStylesheet.match(/\.intro\s+\.page-description\s*\{([^}]*)\}/)?.[1] ?? ''
    const mapStylesheet = readFileSync(join(process.cwd(), 'src/styles/map.css'), 'utf8')
    const mapDescriptionRule = mapStylesheet.match(/\.map-description\s*\{([^}]*)\}/)?.[1] ?? ''
    const usesFullWidthHomeCopy = /\bmax-width:\s*none\s*;/.test(homeCopyRule)
      && /\btext-align:\s*justify\s*;/.test(homeCopyRule)
    const usesFullWidthPageDescription = /\bmax-width:\s*none\s*;/.test(pageDescriptionRule)
      && /\btext-align:\s*justify\s*;/.test(pageDescriptionRule)
    const usesFullWidthMapDescription = /\bmax-width:\s*none\s*;/.test(mapDescriptionRule)
      && /\btext-align:\s*justify\s*;/.test(mapDescriptionRule)
    return {
      Program(node) {
        if (!usesFullWidthHomeCopy || !usesFullWidthPageDescription || !usesFullWidthMapDescription) context.report({ node, messageId: 'useContentWidth' })
      },
    }
  },
}

const requireHeroDescriptionInheritedAlignment = {
  meta: {
    type: 'problem',
    docs: { description: 'inherit centered alignment for the home hero description' },
    schema: [],
    messages: {
      inheritParentAlignment: 'Remove text-align and text-align-last from .hero-description so it inherits centered alignment from .hero-content.',
    },
  },
  create(context) {
    const homeStylesheet = readFileSync(join(process.cwd(), 'src/styles/home.css'), 'utf8')
    const heroDescriptionRule = homeStylesheet.match(/\.hero-description\s*\{([^}]*)\}/)?.[1] ?? ''
    const overridesAlignment = /\btext-align(?:-last)?\s*:/.test(heroDescriptionRule)
    return {
      Program(node) {
        if (overridesAlignment) context.report({ node, messageId: 'inheritParentAlignment' })
      },
    }
  },
}

const starFarmPlugin = {
  rules: {
    'no-global-plot-popup-context': noGlobalPlotPopupContext,
    'no-scenario-name-in-seasonal-pie-tooltip': noScenarioNameInSeasonalPieTooltip,
    'no-source-comments': noSourceComments,
    'no-per-chart-tooltip-label-deduplication': noPerChartTooltipLabelDeduplication,
    'require-abbreviation-popup-right-and-below-cursor': requireAbbreviationPopupRightAndBelowCursor,
    'require-filtered-seasonal-chart-data': requireFilteredSeasonalChartData,
    'require-fitting-seasonal-overview-tables': requireFittingSeasonalOverviewTables,
    'require-sticky-economic-group-headings': requireStickyEconomicGroupHeadings,
    'require-full-width-justified-copy': requireFullWidthJustifiedCopy,
    'require-hero-description-inherited-alignment': requireHeroDescriptionInheritedAlignment,
  },
}

export default defineConfig([
  globalIgnores(['dist', 'coverage', '.cache', '.vercel', 'test-results']),
  {
    files: ['**/*.{ts,tsx,js,mjs}'],
    plugins: { 'star-farm': starFarmPlugin },
    rules: {
      'star-farm/no-source-comments': 'error',
      'star-farm/no-per-chart-tooltip-label-deduplication': 'error',
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    files: ['src/components/ScenarioAbbreviations.tsx'],
    rules: { 'star-farm/require-abbreviation-popup-right-and-below-cursor': 'error' },
  },
  {
    files: ['src/features/map/PlotMapPopup.tsx'],
    rules: { 'star-farm/no-global-plot-popup-context': 'error' },
  },
  {
    files: ['src/features/economics/SeasonalPieChart.tsx'],
    rules: { 'star-farm/no-scenario-name-in-seasonal-pie-tooltip': 'error' },
  },
  {
    files: ['src/features/economics/SeasonalComparison.tsx'],
    rules: { 'star-farm/require-filtered-seasonal-chart-data': 'error' },
  },
  {
    files: ['src/features/economics/SeasonalOverview.tsx'],
    rules: {
      'star-farm/require-fitting-seasonal-overview-tables': 'error',
      'star-farm/require-sticky-economic-group-headings': 'error',
    },
  },
  {
    files: ['src/features/economics/EconomicOverviewPage.tsx'],
    rules: { 'star-farm/require-sticky-economic-group-headings': 'error' },
  },
  {
    files: ['src/features/home/HomePage.tsx'],
    rules: {
      'star-farm/require-full-width-justified-copy': 'error',
      'star-farm/require-hero-description-inherited-alignment': 'error',
    },
  },
  {
    files: ['src/components/PageDescription.tsx'],
    rules: { 'star-farm/require-full-width-justified-copy': 'error' },
  },
  {
    files: ['src/features/map/MapPage.tsx', 'src/features/map/SoilMapShell.tsx'],
    rules: { 'star-farm/require-full-width-justified-copy': 'error' },
  },
  {
    files: ['tests/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
])
