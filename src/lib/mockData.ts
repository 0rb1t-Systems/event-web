// src/lib/mockData.ts
// Temporary placeholder data. Every usage will be replaced with real Admin API calls in later prompts.

export type MockTicketType = {
  id: string
  name: string
  price: number
  quantity_limit: number | null
  quantity_sold: number
  sales_enabled: boolean
}

export type MockSpeaker = {
  id: string
  name: string
  title: string
  organization: string
  bio: string
  photo: string | null
}

export type MockSponsor = {
  id: string
  name: string
  tier: "platinum" | "gold" | "silver" | "partner"
  logo: string | null
}

export type MockSession = {
  id: string
  title: string
  starts_at: string
  room: string | null
  speaker_name: string | null
}

export type MockEvent = {
  id: string
  title: string
  slug: string
  description: string
  starts_at: string
  ends_at: string
  registration_deadline: string
  city: string
  address: string
  latitude: number | null
  longitude: number | null
  capacity: number | null
  status:
    | "draft"
    | "published"
    | "registration_open"
    | "sold_out"
    | "registration_closed"
    | "ongoing"
    | "completed"
    | "cancelled"
  banner_image: string | null
  organizer_name: string
  category: string
  featured: boolean
  monetized: boolean
  ticket_types: MockTicketType[]
  speakers: MockSpeaker[]
  sponsors: MockSponsor[]
  sessions: MockSession[]
}

export type MockParticipation = {
  id: string
  event: MockEvent
  ticket_type: MockTicketType | null
  status: "joined" | "waitlisted" | "paid" | "checked_in" | "cancelled"
  payment_status: "not_required" | "pending" | "paid" | "refunded" | "failed"
  qr_token: string | null
  registered_at: string
}

export const mockEvent: MockEvent = {
  id: "1",
  title: "Tech Summit 2026",
  slug: "tech-summit-2026",
  description:
    "The biggest technology conference in East Africa. Join 500+ tech leaders, founders, and innovators for a day of insights, networking, and inspiration.",
  starts_at: "2026-09-15T09:00:00Z",
  ends_at: "2026-09-15T18:00:00Z",
  registration_deadline: "2026-09-10T23:59:00Z",
  city: "Mogadishu",
  address: "Jubba Hotel, KM4, Mogadishu",
  latitude: 2.0469,
  longitude: 45.3182,
  capacity: 500,
  status: "registration_open",
  banner_image: null,
  organizer_name: "TechHub Somalia",
  category: "Technology",
  featured: true,
  monetized: true,
  ticket_types: [
    {
      id: "1",
      name: "Standard",
      price: 25.0,
      quantity_limit: 400,
      quantity_sold: 120,
      sales_enabled: true,
    },
    {
      id: "2",
      name: "VIP",
      price: 75.0,
      quantity_limit: 100,
      quantity_sold: 45,
      sales_enabled: true,
    },
  ],
  speakers: [
    {
      id: "1",
      name: "Ahmed Hassan",
      title: "CEO",
      organization: "TechHub Somalia",
      bio: "Pioneer in East African technology and entrepreneurship with 15 years of experience.",
      photo: null,
    },
    {
      id: "2",
      name: "Hodan Farah",
      title: "CTO",
      organization: "Hormuud",
      bio: "Leading telecommunications innovation across Somalia.",
      photo: null,
    },
  ],
  sponsors: [
    { id: "1", name: "Hormuud", tier: "platinum", logo: null },
    { id: "2", name: "Salaam Bank", tier: "gold", logo: null },
  ],
  sessions: [
    {
      id: "1",
      title: "Opening Keynote",
      starts_at: "2026-09-15T09:00:00Z",
      room: "Main Hall",
      speaker_name: "Ahmed Hassan",
    },
    {
      id: "2",
      title: "The Future of Fintech in Somalia",
      starts_at: "2026-09-15T10:30:00Z",
      room: "Main Hall",
      speaker_name: "Hodan Farah",
    },
    {
      id: "3",
      title: "Networking Lunch",
      starts_at: "2026-09-15T13:00:00Z",
      room: "Lobby",
      speaker_name: null,
    },
  ],
}

export const mockEvents: MockEvent[] = [
  mockEvent,
  {
    ...mockEvent,
    id: "2",
    title: "Startup Weekend Mogadishu",
    slug: "startup-weekend",
    status: "published",
    monetized: false,
    ticket_types: [],
    featured: false,
  },
  {
    ...mockEvent,
    id: "3",
    title: "Design Thinking Workshop",
    slug: "design-workshop",
    status: "registration_open",
    ticket_types: [
      {
        id: "3",
        name: "General",
        price: 15.0,
        quantity_limit: 50,
        quantity_sold: 23,
        sales_enabled: true,
      },
    ],
    featured: false,
  },
]

export const mockParticipation: MockParticipation = {
  id: "1",
  event: mockEvent,
  ticket_type: mockEvent.ticket_types[0],
  status: "paid",
  payment_status: "paid",
  qr_token: "EVH-MOCK-TOKEN-ABC123XYZ",
  registered_at: "2026-08-01T10:00:00Z",
}

export const mockParticipations: MockParticipation[] = [
  mockParticipation,
  {
    ...mockParticipation,
    id: "2",
    event: mockEvents[1],
    status: "joined",
    payment_status: "not_required",
    qr_token: "EVH-MOCK-TOKEN-DEF456",
  },
]

export const mockOrganizer = {
  id: "1",
  business_name: "TechHub Somalia",
  contact_name: "Ahmed Hassan",
  email: "ahmed@techhub.so",
  phone: "252612345678",
  status: "active",
  active_package: "Professional",
  events_count: 3,
}

