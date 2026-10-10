# AURIUS Completion Design

## Goal

Complete the existing AURIUS official site and B2B platform without replacing
its React, Express, Prisma, or SQLite architecture. The completed product must
present the three supplied catalogue directions as usable product experiences
while preserving the existing member, price, order, payment, audit, and admin
workflows.

## Current Baseline

The repository already contains a functional React/Vite frontend, an
Express/Prisma backend, a SQLite development database, role-derived pricing,
application review, orders, payments, performance accounting, and admin pages.
The CorelDRAW files are design sources, not database schemas. The current seed
data generates text-only SVG product imagery and simple document samples, which
does not meet the supplied visual brief.

## Product Catalogue

The public catalogue will have three product families:

1. Whole-house water filtration, including systems and filter cartridges.
2. Smart toilets and toilet lids.
3. Engineering-custom floor drains, with selectable dimensions and colours.

Products will expose structured sizes, colours, features, and optional gallery
images. A product detail page will use those fields to render selectable
variants and an information-rich detail view. The selected variant will be
validated and retained in cart and order snapshots so it remains traceable.

## Visual Direction

The public experience will retain the project's restrained teal, charcoal, and
white brand palette. It will replace seeded typographic SVGs with locally owned
bitmap product imagery and make the homepage a product-led entry point. The
three supplied sketches map to water filtration, toilet/lid, and floor-drain
catalogue sections respectively. Every "More" action routes to a usable
category or product detail view.

## Business and Security Constraints

The existing server-derived role/price model remains authoritative. Guests and
pending applicants cannot receive B2B prices or create carts. Only active
members may order. Product variants must not introduce a client-controlled
price path; the backend calculates the price from the authenticated role and
validated product/variant data. Orders and carts store the selected variant as
a snapshot for later audit.

## Admin and Data

The Prisma schema will add product variant records without modifying existing
business identifiers. The admin product surface will manage variants alongside
base product data. Seed data will create representative, real catalogued
products and product images for the three families. Existing tables and routes
remain compatible with current pages.

## Verification

Backend tests will cover variant validation, cart and order snapshots, and
price isolation. The full backend suite and workspace build must pass. The
frontend will be exercised in a local browser at desktop and mobile sizes to
confirm that public navigation, product details, options, and authenticated
cart paths render without overflow or broken assets.
