# Checkout (`/events/:id` in-page) — overrides Master

In-page checkout on the same route as public event detail. No separate `/checkout` URL.

## Context and goals

After **Register** on event detail, the attendee selects one ticket (if any), accepts privacy consent, joins via Laravel, then pays with WaafiPay (EVC Plus) when required. Success lands on `/registrations/:id` with a confirmation layout.

## Flow

1. **Event detail** — hero + black facts bar unchanged; two-column body; sticky Register rail.
2. **Selection** — single-select ticket cards (or free confirm when no ticket types), optional discount code, privacy consent, **Complete purchase** / **Confirm registration** (creates participation in one step).
3. **Payment** — WaafiPay only, after join when `payment_status=pending`. No separate attendee-details step.
4. **Confirmation** — `/registrations/:id` when ticket is valid (`paid` / `not_required`).

## Design tokens

- Same Pulse teal `#2ECFC2` as event detail (`pulseTheme.ts`).
- Checkout shell: `#F8FAFC` canvas, white cards, hairline `border-slate-200`.
- Stepper: teal = active, green check = done, slate = upcoming.
- House `PublicSiteHeader` + `SiteFooter` on checkout and confirmation.

## Component rules

### CheckoutLayout

- Breadcrumb: Home / Event / Checkout.
- Title **Checkout** + event name subtitle.
- `CheckoutStepper` on the right (wraps on mobile).

### TicketSelectStep

- Stacked bordered cards; one selection (radio behavior).
- Sold-out tickets faded and disabled.
- VIP: orange star from `is_vip` only — no “Most popular” or feature grids.
- No quantity stepper (Laravel = 1 seat per join).
- Promo code quoted before join via `POST /participant/events/{id}/discount-codes/validate`.
- Bottom bar: selected ticket + total + consent + **Complete purchase** (joins immediately).

### WaafiPayStep

- Shown only after `createParticipation` when payment is pending.
- Left: WaafiPay phone + charge UI (`ParticipantWaafiPayment` embedded).
- Right: order summary — banner, 1× ticket, discount line, Laravel `final_amount` only. **No invented service fees.**
- No attendee-details form, no credit-card or e-wallet tabs.

### Confirmation (`RegistrationDetail`)

- All three stepper steps complete.
- “Registration confirmed” + order serial + email.
- `ConfirmationEventCard` + `PurchasedTicketStub` + Download / Add to calendar / Share event.
- Pending/failed: no fake confirmation stepper; Waafi resume stays functional.

## Skip

- FAQ, Save, Follow, attendee name/email form fields, ticket quantity, card/bank transfer UI, invented fees.

## QA checklist

- [ ] Register opens in-page checkout (same URL)
- [ ] Free / no tickets skip selection step
- [ ] Paid: select + consent → join → Waafi-only step → `/registrations/:id`
- [ ] Discount quoted before join; total matches Laravel `final_amount`
- [ ] Cancel during Waafi → toast + resume on registration detail
- [ ] Mobile 375: stepper wraps; sticky CTAs not covering content
