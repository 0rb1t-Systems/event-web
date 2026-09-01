export const queryKeys = {
  public: {
    events: {
      all: ["public", "events"] as const,
      list: (filters: Record<string, unknown>) => ["public", "events", "list", filters] as const,
      detail: (id: number) => ["public", "events", "detail", id] as const,
    },
    categories: ["public", "categories"] as const,
    branding: ["public", "branding"] as const,
  },
  participant: {
    participations: {
      all: ["participant", "participations"] as const,
      list: (filters?: Record<string, unknown>) =>
        ["participant", "participations", "list", filters ?? {}] as const,
      detail: (id: number) => ["participant", "participations", "detail", id] as const,
    },
  },
  organizer: {
    dashboard: ["organizer", "dashboard"] as const,
    events: {
      all: ["organizer", "events"] as const,
      list: (filters?: Record<string, unknown>) => ["organizer", "events", "list", filters ?? {}] as const,
      detail: (id: number) => ["organizer", "events", "detail", id] as const,
    },
    studio: {
      analytics: (id: number) => ["organizer", "studio", "analytics", id] as const,
    },
    categories: ["organizer", "categories"] as const,
  },
} as const;
