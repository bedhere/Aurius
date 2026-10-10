import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../src/', import.meta.url);

async function source(path) {
  return readFile(new URL(path, root), 'utf8');
}

test('the application provides a persisted language context with English and Chinese support', async () => {
  const context = await source('i18n/LanguageContext.tsx');

  assert.match(context, /export type AppLanguage = 'en' \| 'zh-CN'/);
  assert.match(context, /localStorage\.getItem\(LANGUAGE_STORAGE_KEY\)/);
  assert.match(context, /document\.documentElement\.lang = language/);
  assert.match(context, /export function useI18n/);
});

test('API requests send the currently selected language to Spring Boot', async () => {
  const client = await source('api/client.ts');

  assert.match(client, /getPreferredLanguage/);
  assert.match(client, /headers\['Accept-Language'\] = getPreferredLanguage\(\)/);
});

test('the public header exposes a language toggle wired to the global i18n hook', async () => {
  const header = await source('components/Header.tsx');

  assert.match(header, /useI18n/);
  assert.match(header, /setLanguage\(language === 'en' \? 'zh-CN' : 'en'\)/);
  assert.match(header, /aria-label=\{t\('language\.toggle'\)\}/);
});

test('the products page keeps API failures visible instead of replacing preserved data with an empty catalog', async () => {
  const products = await source('pages/public/Products.tsx');

  assert.match(products, /setError/);
  assert.match(products, /Retry/);
  assert.doesNotMatch(products, /setData\(\{ items: \[\], total: 0/);
});

test('public shared copy has real Chinese translations rather than mojibake', async () => {
  const context = await source('i18n/LanguageContext.tsx');

  assert.match(context, /智能马桶/);
  assert.match(context, /切换为英文/);
  assert.doesNotMatch(context, /鏅鸿兘|鑿滃崟|鍒囨崲/);
});
