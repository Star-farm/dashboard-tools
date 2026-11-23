import js from '@eslint/js'
import globals from 'globals'
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

const starFarmPlugin = {
  rules: {
    'no-global-plot-popup-context': noGlobalPlotPopupContext,
    'no-scenario-name-in-seasonal-pie-tooltip': noScenarioNameInSeasonalPieTooltip,
    'no-source-comments': noSourceComments,
    'no-per-chart-tooltip-label-deduplication': noPerChartTooltipLabelDeduplication,
    'require-abbreviation-popup-right-and-below-cursor': requireAbbreviationPopupRightAndBelowCursor,
    'require-filtered-seasonal-chart-data': requireFilteredSeasonalChartData,
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
    files: ['tests/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
])
