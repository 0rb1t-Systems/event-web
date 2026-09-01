# Participant product — overrides Master

Auth, My Tickets, registration detail, event rooms, and settings share house chrome. Event detail registration (`/events/:id`) is **not** this spec.

## Shared

- Wrapper: `.house-page`. Slim `PublicSiteHeader`. `SiteFooter` on dashboard shell.
- Light-locked. Theme toggle in Settings still exists for organizer; house pages ignore dark tokens.

## Auth (`/auth`)

Centered white card, light inputs, Login / Sign up tabs. Same Laravel flows. No ink card.

## My Tickets (`/dashboard/home`)

Wallet of `PurchasedTicketStub` light passes. QR only when the ticket is valid. Empty state CTA: **Browse events**.

## Registration detail (`/registrations/:id`)

When the ticket is valid: confirmation heading, event summary, light stub + QR, **Download Tickets (PDF)** primary, Add to calendar / Share as outline actions. Invitation canvas drawing is unchanged; page chrome around it is house.

Pending or failed payment: `ParticipantWaafiPayment` stays the complete-purchase panel (shared with event-detail Register — do not restyle that component globally).

Validity rules unchanged: no QR when waitlisted, cancelled, or unpaid.

## Event rooms

`/dashboard/rooms` is a list of light row cards. `/registrations/:id/room` restyles the shell (header, hero card, empty/error) only. Room features (announcements, discussions, feedback) stay.

## Settings

House form cards. Do not redesign as an organizer console.
