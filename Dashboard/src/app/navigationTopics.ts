export const navigationTopics = [
  { id: 'economics', label: 'topicEconomics', description: 'economicsCtaDescription' },
  { id: 'resources', label: 'topicResources', description: 'resourcesCtaDescription' },
  { id: 'sustainability', label: 'topicSustainability', description: 'sustainabilityCtaDescription' },
] as const

export type Topic = typeof navigationTopics[number]['id']
