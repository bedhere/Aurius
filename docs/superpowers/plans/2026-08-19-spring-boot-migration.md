# Spring Boot Migration and Bilingual Internationalization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Express backend with a Spring Boot backend that preserves the AURIUS REST contract and supports instant English/Chinese switching across client and server.

**Architecture:** Build a Java 8-compatible Spring Boot 2.7 Maven service in `server/`. Use JPA over the existing SQLite schema, a common response envelope, JWT/refresh cookie security, and Spring `MessageSource`; add a React language provider which sends the selected locale to the API.

**Tech Stack:** Java 8, Spring Boot 2.7, Spring MVC, Spring Data JPA, Spring Security, Hibernate SQLite dialect, Maven, React 18, TypeScript, Vite.

## Global Constraints

- Preserve existing `/api` paths and `{ success, message, data, errors }` JSON envelope.
- Preserve existing SQLite data and `uploads` directory without destructive migration.
- Support `en` and `zh-CN`; default to English when no supported language is supplied.
- Run every new behavioral test red before adding the implementation that makes it green.
- Do not modify or delete the Node backend during the compatibility period.

---

### Task 1: Bootstrap server and localization foundation

**Files:**
- Create: `server/pom.xml`
- Create: `server/src/main/java/com/aurius/AuriusApplication.java`
- Create: `server/src/main/java/com/aurius/config/LocaleConfiguration.java`
- Create: `server/src/main/java/com/aurius/web/ApiEnvelope.java`
- Create: `server/src/main/java/com/aurius/web/HealthController.java`
- Create: `server/src/main/resources/messages.properties`
- Create: `server/src/main/resources/messages_zh_CN.properties`
- Test: `server/src/test/java/com/aurius/web/HealthControllerTest.java`

- [ ] Write failing MockMvc tests for `/health` envelope and English/Chinese message resolution.
- [ ] Run `mvn -q -Dtest=HealthControllerTest test` and confirm the test fails because the application classes do not exist.
- [ ] Implement the minimum Spring Boot application, message source, locale resolver, envelope, and health controller.
- [ ] Re-run `mvn -q -Dtest=HealthControllerTest test` and confirm it passes.

### Task 2: Add global localized API errors and request validation

**Files:**
- Create: `server/src/main/java/com/aurius/web/ApiException.java`
- Create: `server/src/main/java/com/aurius/web/ApiExceptionHandler.java`
- Create: `server/src/main/java/com/aurius/i18n/MessageService.java`
- Test: `server/src/test/java/com/aurius/web/ApiExceptionHandlerTest.java`

- [ ] Write failing tests proving validation and not-found errors retain the response envelope and vary by `Accept-Language`.
- [ ] Run the focused test and confirm expected failure.
- [ ] Implement the localized exception handler and message service.
- [ ] Re-run focused tests and confirm they pass.

### Task 3: Migrate database configuration and JPA domain mappings

**Files:**
- Create: `server/src/main/resources/application.yml`
- Create: `server/src/main/java/com/aurius/domain/**`
- Create: `server/src/main/java/com/aurius/repository/**`
- Test: `server/src/test/java/com/aurius/repository/SchemaCompatibilityTest.java`

- [ ] Write a failing integration test that opens the existing SQLite database and reads `User`, `Product`, and `ProductPrice`.
- [ ] Run the focused test and confirm failure before mappings exist.
- [ ] Implement SQLite dialect/configuration and JPA mappings using current table/column names.
- [ ] Re-run the focused test and confirm reads work without schema replacement.

### Task 4: Migrate security and auth contract

**Files:**
- Create: `server/src/main/java/com/aurius/auth/**`
- Create: `server/src/main/java/com/aurius/web/AuthController.java`
- Test: `server/src/test/java/com/aurius/web/AuthControllerTest.java`

- [ ] Write failing contract tests for login, refresh, logout, current user, refresh cookie path, expired access handling, and localized failures.
- [ ] Implement BCrypt password verification, JWT issuance, persisted hashed refresh tokens, security filters, and auth endpoints.
- [ ] Re-run tests and ensure all authentication tests pass.

### Task 5: Migrate registration, files, catalog, and pricing

**Files:**
- Create: `server/src/main/java/com/aurius/application/**`
- Create: `server/src/main/java/com/aurius/catalog/**`
- Create: `server/src/main/java/com/aurius/files/**`
- Test: `server/src/test/java/com/aurius/web/RegistrationCatalogContractTest.java`

- [ ] Port existing registration and product contract tests before implementation.
- [ ] Implement registration lifecycle, file validation, protected/public uploads, role-tier pricing, variants, and price rules.
- [ ] Re-run focused contract tests.

### Task 6: Migrate carts, checkout, orders, payments, and performance

**Files:**
- Create: `server/src/main/java/com/aurius/order/**`
- Create: `server/src/main/java/com/aurius/payment/**`
- Create: `server/src/main/java/com/aurius/performance/**`
- Test: `server/src/test/java/com/aurius/web/OrderContractTest.java`

- [ ] Port server-side price, stock, cart, checkout, cancellation, refund, payment, and performance tests before implementations.
- [ ] Implement transactional cart/order behavior, stock protection, payment adapters, receipt upload, shipment, referrals, and performance adjustments.
- [ ] Re-run focused contract tests.

### Task 7: Migrate member, downloads, administration, mail, and exports

**Files:**
- Create: `server/src/main/java/com/aurius/member/**`
- Create: `server/src/main/java/com/aurius/admin/**`
- Create: `server/src/main/java/com/aurius/mail/**`
- Create: `server/src/main/java/com/aurius/export/**`
- Test: `server/src/test/java/com/aurius/web/AdminContractTest.java`

- [ ] Write/port contract tests for member profiles, addresses, installations, downloads, administration, exports, audit logs, and email templates.
- [ ] Implement endpoints and localized mail/export support.
- [ ] Re-run focused contract tests.

### Task 8: Complete React language switching

**Files:**
- Create: `frontend/src/i18n/LanguageContext.tsx`
- Create: `frontend/src/i18n/messages/en.ts`
- Create: `frontend/src/i18n/messages/zh-CN.ts`
- Modify: `frontend/src/main.tsx`
- Modify: `frontend/src/api/client.ts`
- Modify: `frontend/src/components/Header.tsx`
- Modify: `frontend/src/i18n/strings.ts`
- Test: `frontend/tests/i18n.test.mjs`

- [ ] Write failing tests for initial language selection, persistence, `<html lang>`, API `Accept-Language`, and toggle labels.
- [ ] Implement the context, typed translation function, header control, client header, and replace literal user-facing copy page by page.
- [ ] Run `npm run build --workspace frontend` and the frontend test suite.

### Task 9: Replace runtime scripts and verify parity

**Files:**
- Modify: `scripts/start.ps1`
- Modify: `scripts/stop.ps1`
- Modify: `README.md`
- Modify: `.env.example`
- Test: `scripts/e2e-check.ts`

- [ ] Update runtime scripts to start the Spring Boot server and Vite frontend.
- [ ] Configure all equivalent environment variables and document Java/Maven setup.
- [ ] Run Maven tests, frontend build/tests, and end-to-end API checks against Spring Boot.
- [ ] Preserve Node server as an explicit rollback option until all contract checks pass.
