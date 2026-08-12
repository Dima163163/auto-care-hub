# AutoCare Hub footer route contract

Date: 2026-08-03

This contract turns footer entries into meaningful public destinations. It
captures design and content scope only; visual implementation requires the
final confirmation 3 of 3.

## Existing public route inventory

| Footer entry | Route | Page job |
| --- | --- | --- |
| Cabinets | `/cabinets` | Find spaces and continue the booking task. |
| Services | `/cabinets?search=consultation` | Start with a prefilled category search. |
| How it works | `/features` | Explain client booking in a short, actionable sequence. |
| Prices | `/pricing` | Explain customer and owner pricing without hidden conditions. |
| For owners | `/for-owners` | Explain listing, availability, bookings, and owner onboarding. |
| About | `/about` | Explain the service, trust model, and company responsibility. |
| Blog | `/blog` | Offer practical guides, not generic promotional posts. |
| Partners | `/partners` | Explain partnership types and provide a contact path. |
| Contacts | `/contacts` | Give support, business, and safety-contact paths with expected response guidance. |
| Help center | `/help` | Searchable help routes for guest, client, and owner tasks. |
| Service rules | `/rules` | State booking, cancellation, reviews, and owner rules in readable sections. |
| Privacy policy | `/privacy` | Explain data use, rights, retention, and privacy contact details. |

## Content rules

- Each page starts with a concrete answer to the visitor's question, not a
  generic company statement.
- Help, rules, and privacy link to scoped sections using stable fragment IDs,
  print-friendly reading order, and a last-updated date.
- Contact details distinguish normal support, security/privacy requests, and
  business partnerships. No fake real-time availability is claimed.
- Legal text is supplied and reviewed by the organization before publication;
  the interface must not invent legal guarantees.
- Public pages keep global header/footer, language, and light/dark theme.
  Footer links use real internal routes, never `#` placeholders.

## Template groups

1. Guidance: How it works and For owners.
2. Help: Help center, FAQ articles, contact support.
3. Trust and legal: Rules and Privacy policy.
4. Company: About, Partners, Contacts.
5. Editorial: Blog index and article template.

## Acceptance criteria

- Every footer route resolves, has a descriptive document title, and preserves
  focus after navigation.
- Each page has a clear primary task and links back to the relevant booking,
  owner, or support flow.
- Long legal and help content provides a keyboard-accessible table of contents,
  semantic headings, in-page search where relevant, print-friendly layout, and
  mobile/tablet reading width.
- All outbound social or contact links use real approved destinations or are
  omitted until supplied; placeholder anchors are prohibited.
