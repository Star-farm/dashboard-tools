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

const starFarmPlugin = {
  rules: {
    'no-global-plot-popup-context': noGlobalPlotPopupContext,
    'no-scenario-name-in-seasonal-pie-tooltip': noScenarioNameInSeasonalPieTooltip,
    'no-source-comments': noSourceComments,
  },
}

export default defineConfig([
  globalIgnores(['dist', 'coverage']),
  {
    files: ['**/*.{ts,tsx,js,mjs}'],
    plugins: { 'star-farm': starFarmPlugin },
    rules: { 'star-farm/no-source-comments': 'error' },
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
    files: ['src/features/map/PlotMapPopup.tsx'],
    plugins: { 'star-farm': starFarmPlugin },
    rules: { 'star-farm/no-global-plot-popup-context': 'error' },
  },
  {
    files: ['src/features/economics/SeasonalPieChart.tsx'],
    plugins: { 'star-farm': starFarmPlugin },
    rules: { 'star-farm/no-scenario-name-in-seasonal-pie-tooltip': 'error' },
  },
  {
    files: ['tests/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
])
