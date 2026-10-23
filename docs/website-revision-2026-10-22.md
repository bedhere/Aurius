# AURIUS website revision — 22 October 2026

- Header navigation remains English in both language modes. `/plumbers-builders` replaces the public VIP label; `/vip` and existing registration query links remain compatible.
- Header and Vision partnership buttons both open `/become-a-partner`. This recruitment form emails `info@aurius.com.au` and does not create an account or grant purchasing permissions.
- The recruitment form collects the latest requested business, location, product, territory, estimated annual unit sales and contact information. Company website is optional. Contact name is included for follow-up.
- `/plumbers-builders/apply` and `/trade/apply` are separate account applications. Builder applications are supported. Administrators review and activate purchasing accounts manually; a live ABR integration is not required for manual approval. Territory remains an internal record.
- Current approved-account pricing is uniform: `TRADE_PRICING_MODE=uniform` (the default) uses each product's existing `level2Price` for all partner roles in catalogue, cart and checkout. Other role prices remain stored. `tiered` preserves the previous mode for future use.
- Contact enquiries and partnership enquiries use dedicated email templates, the existing SMTP transport, server validation, rate limiting and the applicant's email as Reply-To. SMTP failure returns an error. Development without SMTP logs emails to the existing `_devmail` directory; production without SMTP reports failure.
- Product overview cards reuse the existing warranty image: green for water equipment and gold for smart toilets and seats. Detail badges remain. Filter cartridges do not receive equipment warranty badges. Original product media and model data remain unchanged.
- Vision, product collection, support and contact copy follow the supplied brief. Certification and cartridge intervals are described by model without inventing product data. The legacy seed's example company contact details are hidden; configured business contacts remain available.
- Stockist page content and functionality are unchanged. Existing checkout/payment adapters remain; no payment provider credentials were added.

## Running and deployment

Run `npm run prisma:generate --workspace backend` after pulling, then `npm run build`. The added Builder value is a Prisma enum stored as text in the current SQLite schema, so existing SQLite records do not need a data migration. Do not rerun the destructive development seed against existing data.

The local environment has no SMTP or PayPal/Stripe credentials. Real email delivery and live payment processing must use the deployment's configured providers. No real mailbox messages or payments were sent during browser QA.

## Verification

Backend tests cover the existing tiered mode and the current uniform mode, manual approval, pending-account restrictions, enquiry validation and delivery failure. Browser QA covers the shared recruitment links, separate application routes, a full Builder application, enquiry validation/error/success states, warranty categories, detail badges, and 25 layouts across five viewport widths (320–1280px).

## Chinese interface completion

Public enquiry pages, account login/registration/password pages, guest checkout and customer account pages now use the shared language provider. Chinese copy includes labels, placeholders, category choices, approval notices, validation/delivery messages, busy/success states, pricing captions, order statuses and download categories. Public navigation remains English as requested; company names, product models and original catalogue data are retained.

Translation applies to displayed labels only. Enquiry types, product interests, state codes, country values and account types retain their canonical API values. Customer account pages include a language toggle. Browser QA verified 12 public/authentication routes, 10 member routes and 48 responsive layouts, including language switching with input preservation, enquiry error/retry/success and a complete Builder application. Submission tests were intercepted locally and sent no email. Frontend production build passes.
