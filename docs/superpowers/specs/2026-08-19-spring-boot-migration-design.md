# Spring Boot Migration and Bilingual Internationalization Design

## Goal

Replace the Node.js/Express backend with a Spring Boot backend while preserving the existing `/api` contract, SQLite data, uploads directory, JWT and refresh-cookie behavior. Add Chinese and English switching across the React frontend and Spring Boot server responses, validation messages, and email templates.

## Constraints

- The local runtime is Java 8, so the Spring Boot module uses Spring Boot 2.7.x.
- Existing frontend routes, `/api` paths, `{ success, message, data, errors }` response shape, and the `aurius_refresh` cookie remain compatible.
- Existing SQLite database tables and `uploads` content remain in place. The migration does not delete, rename, or reset existing data.
- The Spring Boot server owns all replacement API behavior; the Node server remains untouched until compatibility verification is complete.
- Locale is selected from `Accept-Language`, with `en` and `zh-CN` supported. The React client persists the user selection and sends the matching header on every API request.

## Architecture

Create a Maven module at `server/` containing a modular Spring Boot REST application:

- `config`: application settings, Web MVC locale resolver, CORS, upload static-resource handling, security, and Jackson configuration.
- `i18n`: `MessageSource` backed by `messages.properties` and `messages_zh_CN.properties`; a small service resolves translated messages for controllers, validation, exceptions, and mail.
- `web`: envelope responses, exception mapping, request locale helpers, and API controllers grouped by existing route area.
- `domain`: JPA entities and repositories that map to the existing Prisma-created SQLite schema.
- `auth`: BCrypt passwords, access JWT, persisted hashed refresh tokens, cookie operations, and authorization annotations/filters.
- `service`: registration, catalog, cart/order, payment, member, administration, audit, export, file, ABR, and mail application services.

The frontend receives a `LanguageProvider` and `useI18n()` hook. It stores `en` or `zh-CN` in `localStorage`, sets `<html lang>`, exposes a language-toggle control in the global header, and adds `Accept-Language` to the API client.

## Data Migration

The first release maps the current SQLite file read/write in place through Hibernate. Before deployment, an export/backup step copies the SQLite file and uploads directory. A later production profile supports PostgreSQL with Flyway migrations, but it is not a prerequisite for local compatibility.

## API and Error Handling

Existing paths and status codes are preserved. All successful responses use `ApiEnvelope.success(data, message)`. All failures use `ApiEnvelope.failure(message, errors)`. Controllers and validation must resolve message keys at request time, so the same API action returns English for `Accept-Language: en` and Chinese for `Accept-Language: zh-CN`.

## Testing

- Spring Boot `MockMvc` tests cover the response envelope, locale selection, validation localization, authorization failures, and health endpoint.
- Service tests cover the existing security-sensitive behaviors: role-tier pricing, server-side checkout totals, stock checks, duplicate registration, and protected downloads.
- Contract tests replay the Node test suite’s request shapes against Spring Boot endpoints.
- Frontend unit tests cover persisted language selection, API header propagation, and global header toggle behavior.

## Delivery Sequence

1. Bootstrap Spring Boot, i18n infrastructure, response envelope, health endpoint, and frontend language context.
2. Migrate entities, repositories, security, validation, file storage, logging, and mail base services.
3. Migrate public/authentication/registration/catalog endpoints.
4. Migrate member, cart, order, payment, download, and administration endpoints.
5. Recreate exports, ABR adapter, PayPal/Stripe adapters, localized email templates, scripts, and deployment documentation.
6. Run full backend contract tests, frontend build/tests, and manual browser verification before Node retirement.
