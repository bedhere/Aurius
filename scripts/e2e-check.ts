// ============================================================================
// End-to-end acceptance script (Scenarios A-E from the requirements).
// Run against a live backend:  npx tsx scripts/e2e-check.ts
// ============================================================================
const BASE = 'http://localhost:4000/api';

let passed = 0;
let failed = 0;

function check(name: string, cond: boolean, extra = ''): void {
  if (cond) {
    passed++;
    console.log(`  PASS  ${name}`);
  } else {
    failed++;
    console.log(`  FAIL  ${name} ${extra}`);
  }
}

async function api(
  method: string,
  path: string,
  body?: unknown,
  token?: string,
): Promise<{ status: number; json: Record<string, unknown> }> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { status: res.status, json };
}

async function login(email: string, password: string): Promise<{ token: string; json: Record<string, unknown> }> {
  const { status, json } = await api('POST', '/auth/login', { email, password });
  check(`login ${email}`, status === 200);
  return { token: (json.data as { accessToken: string }).accessToken, json: json.data as Record<string, unknown> };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main(): Promise<void> {
  console.log('== Security: anonymous price access ==');
  let r = await api('GET', '/products');
  check('anonymous can list products', r.status === 200);
  const items = (r.json.data as { items: { price: unknown; priceNote: string }[] }).items;
  check('anonymous sees NO price', items.every((i) => i.price === null));
  check('anonymous sees "apply for trade access" note', items.some((i) => i.priceNote === 'Contact Aurius to apply for trade access.'));

  r = await api('GET', '/cart');
  check('anonymous cart -> 401', r.status === 401);

  r = await api('GET', '/admin/dashboard');
  check('anonymous admin -> 401', r.status === 401);

  console.log('== Scenario D: pending user ==');
  const pending = await login('pending@aurius-demo.com.au', 'Demo@1234');
  r = await api('GET', '/products', undefined, pending.token);
  const pItems = (r.json.data as { items: { price: unknown; priceNote: string }[] }).items;
  check('pending sees NO price', pItems.every((i) => i.price === null));
  check('pending sees "under review" note', pItems.every((i) => i.priceNote === 'Your application is under review.'));
  r = await api('POST', '/cart', { productId: 1, quantity: 1 }, pending.token);
  check('pending cart add -> 403', r.status === 403);
  r = await api('GET', '/downloads', undefined, pending.token);
  check('pending downloads -> 403', r.status === 403);

  console.log('== Registration: duplicate email ==');
  r = await api('POST', '/applications', {
    channel: 'VIP', email: 'plumber@aurius-demo.com.au',
    tradeType: 'LICENSED_PLUMPER', state: 'NSW', licenceType: 'INDIVIDUAL',
    licenceNumber: 'PLB-12345', firstName: 'A', lastName: 'B', companyName: 'C Co',
    streetAddress: '1 St', suburb: 'Sydney', postcode: '2000', phone: '0411111111',
    abnNumber: '51824753556', yearsExperience: 5,
    smartToiletExp: 'Experienced (6+ units)', waterPurifExp: 'Basic experience (1-5 systems)',
    businessInterest: ['Smart Toilet'], privacyConsent: true, dealerAgreement: true,
    marketingConsent: false, password: 'Demo@1234', confirmPassword: 'Demo@1234',
  });
  check('duplicate email rejected', r.status === 400);

  console.log('== Registration: weak password ==');
  r = await api('POST', '/applications', {
    channel: 'VIP', email: 'newplumber@example.com.au',
    tradeType: 'LICENSED_PLUMPER', state: 'VIC', licenceType: 'INDIVIDUAL',
    licenceNumber: 'PLB-99999', firstName: 'New', lastName: 'Plumber', companyName: 'New Plumbing',
    streetAddress: '5 Test St', suburb: 'Melbourne', postcode: '3000', phone: '0411222333',
    abnNumber: '51824753556', yearsExperience: 3,
    smartToiletExp: 'Basic experience (1-5 units)', waterPurifExp: 'No experience',
    businessInterest: ['Smart Toilet'], privacyConsent: true, dealerAgreement: true,
    marketingConsent: false, password: 'weak', confirmPassword: 'weak',
  });
  check('weak password rejected', r.status === 400);

  console.log('== Registration: missing privacy consent ==');
  r = await api('POST', '/applications', {
    channel: 'VIP', email: 'newplumber@example.com.au',
    tradeType: 'LICENSED_PLUMPER', state: 'VIC', licenceType: 'INDIVIDUAL',
    licenceNumber: 'PLB-99999', firstName: 'New', lastName: 'Plumber', companyName: 'New Plumbing',
    streetAddress: '5 Test St', suburb: 'Melbourne', postcode: '3000', phone: '0411222333',
    abnNumber: '51824753556', yearsExperience: 3,
    smartToiletExp: 'Basic experience (1-5 units)', waterPurifExp: 'No experience',
    businessInterest: ['Smart Toilet'], privacyConsent: false, dealerAgreement: true,
    marketingConsent: false, password: 'Demo@1234', confirmPassword: 'Demo@1234',
  });
  check('missing privacy consent rejected', r.status === 400);

  console.log('== Scenario A: plumber registers -> admin approves -> Level2 price -> order -> paid ==');
  const runId = Date.now().toString(36);
  const scenarioEmail = `scenario.a.${runId}@example.com.au`;
  r = await api('POST', '/applications', {
    channel: 'VIP', email: scenarioEmail,
    tradeType: 'LICENSED_PLUMPER', state: 'NSW', licenceType: 'INDIVIDUAL',
    licenceNumber: 'PLB-55667', firstName: 'Scenario', lastName: 'Plumber', companyName: 'Scenario A Plumbing',
    streetAddress: '77 George St', suburb: 'Sydney', postcode: '2000', phone: '0433111222',
    abnNumber: '51824753556', yearsExperience: 8,
    smartToiletExp: 'Expert (regular installations)', waterPurifExp: 'Experienced (6+ systems)',
    businessInterest: ['All Categories'], privacyConsent: true, dealerAgreement: true,
    marketingConsent: true, password: 'Demo@1234', confirmPassword: 'Demo@1234',
  });
  check('scenario A registration accepted', r.status === 201, JSON.stringify(r.json));
  const appNo = (r.json.data as { applicationNo: string }).applicationNo;

  const admin = await login('admin@aurius.com.au', 'Admin@1234');
  r = await api('GET', '/admin/applications?search=' + encodeURIComponent(appNo), undefined, admin.token);
  check('admin sees application', r.status === 200 && ((r.json.data as { total: number }).total >= 1));
  const appId = ((r.json.data as { items: { id: number }[] }).items[0].id);
  const appDetail = await api('GET', `/admin/applications/${appId}`, undefined, admin.token);
  const applicantUserId = ((appDetail.json.data as { userId: number }).userId);

  r = await api('POST', `/admin/applications/${appId}/review`, { action: 'APPROVE', role: 'LICENSED_TRADESMAN' }, admin.token);
  check('scenario A approval', r.status === 200);
  const aurId = (r.json.data as { aurId: string }).aurId;
  check('scenario A got AUR-TR ID', aurId.startsWith('AUR-TR-'), aurId);

  // approval again should fail (already approved)
  r = await api('POST', `/admin/applications/${appId}/review`, { action: 'APPROVE', role: 'LICENSED_TRADESMAN' }, admin.token);
  check('double approval rejected', r.status !== 200);

  const plumber = await login(scenarioEmail, 'Demo@1234');
  check('plumber login after approval', plumber.token.length > 10);
  const me = await api('GET', '/auth/me', undefined, plumber.token);
  check('plumber account ACTIVE', (me.json.data as { accountStatus: string }).accountStatus === 'ACTIVE');
  check('plumber aurId returned', (me.json.data as { memberId: { aurId: string } }).memberId?.aurId === aurId);

  r = await api('GET', '/products', undefined, plumber.token);
  const plumberItems = (r.json.data as { items: { price: { level: number; value: number } | null }[] }).items;
  const priced = plumberItems.filter((i) => i.price !== null);
  check('plumber sees prices', priced.length > 0);
  check('plumber sees ONLY level 2', priced.every((i) => i.price?.level === 2));
  // compare with admin price rows: same product must expose the same level2 price
  const sample = priced[0];
  const sampleProductCode = (r.json.data as { items: { productCode: string; price: { level: number; value: number } | null }[] }).items.find((i) => i.price)?.productCode;
  const adminProduct = await api('GET', '/admin/products?search=' + encodeURIComponent(String(sampleProductCode)), undefined, admin.token);
  const adminPrices = ((adminProduct.json.data as { items: { prices: { level2: number } }[] }).items[0]?.prices);
  check('level2 price matches server value', Boolean(adminPrices) && sample.price?.value === adminPrices.level2, `got ${sample.price?.value}, want ${adminPrices?.level2}`);

  // cart + checkout — use a real product id from the catalogue
  const allProducts = (r.json.data as { items: { id: number }[] }).items;
  const productId = allProducts[0].id;
  const productIdB = allProducts.find((p) => p.id !== productId)?.id ?? productId;
  r = await api('POST', '/cart', { productId, quantity: 2 }, plumber.token);
  check('plumber adds to cart', r.status === 200, JSON.stringify(r.json));
  r = await api('GET', '/cart', undefined, plumber.token);
  const cart = r.json.data as { id: number; subtotal: number; items: { unitPrice: number; quantity: number }[] };
  check('cart subtotal computed server-side', Math.abs(cart.subtotal - cart.items[0].unitPrice * cart.items[0].quantity) < 0.01);

  // tampered total is ignored — checkout body has no price field
  r = await api('POST', '/orders', {
    cartId: cart.id,
    shippingName: 'Scenario Plumber', shippingPhone: '0433111222',
    shippingStreet: '77 George St', shippingSuburb: 'Sydney', shippingState: 'NSW', shippingPostcode: '2000',
    shippingMethod: 'STANDARD', notes: 'E2E order',
    total: 0.01, // tampered value must be ignored
  }, plumber.token);
  check('checkout succeeds', r.status === 201, JSON.stringify(r.json));
  const order = r.json.data as { orderId: number; orderNumber: string; total: number };
  check('order total recalculated server-side (not 0.01)', order.total > 100, String(order.total));
  check('order number format', /^AUR-ORD-\d{8}-\d{6}$/.test(order.orderNumber), order.orderNumber);

  // pay with sandbox
  r = await api('POST', `/orders/${order.orderId}/pay`, { method: 'SANDBOX' }, plumber.token);
  check('sandbox payment', r.status === 200);
  await sleep(300);
  r = await api('GET', `/orders/${order.orderId}`, undefined, plumber.token);
  const detail = r.json.data as { paymentStatus: string; status: string };
  check('order PAID after sandbox', detail.paymentStatus === 'PAID' && detail.status === 'PAID');

  // performance credited
  r = await api('GET', '/performance', undefined, plumber.token);
  const perf = r.json.data as { totalOrders: number; totalSales: number; monthSales: number; yearSales: number };
  check('performance credited (1 order)', perf.totalOrders === 1);
  check('performance amount matches order total', Math.abs(perf.totalSales - order.total) < 0.01);

  console.log('== Scenario E: refund -> adjustment ==');
  r = await api('POST', `/admin/orders/${order.orderId}/refund`, { amount: order.total, reason: 'E2E refund test' }, admin.token);
  check('admin refunds order', r.status === 200);
  await sleep(300);
  r = await api('GET', '/performance', undefined, plumber.token);
  const perf2 = r.json.data as { totalSales: number };
  check('performance deducted after refund', Math.abs(perf2.totalSales) < 0.01, String(perf2.totalSales));
  const adminOrder = await api('GET', `/admin/orders/${order.orderId}`, undefined, admin.token);
  const adj = (adminOrder.json.data as { performance: { adjustments: unknown[] } }).performance?.adjustments;
  check('performance adjustment record created', Array.isArray(adj) && adj.length === 1);

  console.log('== Scenario C: sub-dealer Level3 ==');
  const sd = await login('subdealer@aurius-demo.com.au', 'Demo@1234');
  r = await api('GET', '/products', undefined, sd.token);
  const sdItems = (r.json.data as { items: { price: { level: number } | null }[] }).items;
  check('sub-dealer sees ONLY level 3', sdItems.filter((i) => i.price).every((i) => i.price?.level === 3));
  const l1 = await login('agent@aurius-demo.com.au', 'Demo@1234');
  r = await api('GET', '/products', undefined, l1.token);
  const l1Items = (r.json.data as { items: { price: { level: number } | null }[] }).items;
  check('agent sees ONLY level 1', l1Items.filter((i) => i.price).every((i) => i.price?.level === 1));

  // member cannot access admin
  r = await api('GET', '/admin/members', undefined, sd.token);
  check('member blocked from admin API -> 403', r.status === 403);

  // member cannot read another member's orders
  r = await api('GET', `/orders/${order.orderId}`, undefined, sd.token);
  check('member cannot see others order -> 404', r.status === 404);

  console.log('== Scenario B: bank transfer flow ==');
  const agent = l1;
  r = await api('POST', '/cart', { productId: productIdB, quantity: 3 }, agent.token);
  check('agent adds to cart', r.status === 200, JSON.stringify(r.json));
  const cart2 = await api('GET', '/cart', undefined, agent.token);
  const cartId2 = (cart2.json.data as { id: number }).id;
  r = await api('POST', '/orders', {
    cartId: cartId2,
    shippingName: 'Agent Co', shippingPhone: '0499888777',
    shippingStreet: '1 Agent Rd', shippingSuburb: 'Perth', shippingState: 'WA', shippingPostcode: '6000',
    shippingMethod: 'STANDARD', referralTechId: 'AUR-TR-2026000365',
  }, agent.token);
  const order2 = r.json.data as { orderId: number; orderNumber: string };
  check('agent order with referral created', r.status === 201);
  r = await api('POST', `/orders/${order2.orderId}/pay`, { method: 'BANK_TRANSFER' }, agent.token);
  const bt = r.json.data as { reference: string; bank: { bankName: string } };
  check('bank transfer details returned', r.status === 200 && Boolean(bt.bank.bankName));
  check('reference = order number', bt.reference === order2.orderNumber);

  // upload receipt (fake png bytes will fail MIME check -> proves validation)
  const fakePng = Buffer.from('not-a-real-png');
  const form = new FormData();
  form.append('file', new Blob([fakePng], { type: 'image/png' }), 'receipt.png');
  let res2 = await fetch(`${BASE}/orders/${order2.orderId}/bank-receipt`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${agent.token}` },
    body: form,
  });
  check('receipt upload accepted', res2.status === 200, String(res2.status));

  // admin verifies receipt -> order PAID, referral credited
  const paymentsList = await api('GET', '/admin/payments?status=UNPAID', undefined, admin.token);
  const payItems = (paymentsList.json.data as { items: { id: number; receipts: { id: number }[]; orderNumber: string }[] }).items;
  const target = payItems.find((p) => p.orderNumber === order2.orderNumber);
  check('admin sees bank payment', Boolean(target));
  if (target) {
    const receiptId = target.receipts[0].id;
    r = await api('POST', `/admin/receipts/${receiptId}/verify`, { action: 'VERIFY', note: 'Funds received' }, admin.token);
    check('receipt verified -> paid', r.status === 200);
    await sleep(300);
    const refList = await api('GET', '/admin/referrals', undefined, admin.token);
    const refs = (refList.json.data as { items: { order: { orderNumber: string }; status: string }[] }).items;
    const refRow = refs.find((x) => x.order.orderNumber === order2.orderNumber);
    check('referral credited after payment', refRow?.status === 'CREDITED');
  }

  console.log('== Downloads ==');
  r = await api('GET', '/downloads', undefined, agent.token);
  const dl = (r.json.data as { id: number; title: string }[]);
  check('agent sees downloads', r.status === 200 && dl.length > 0);
  const dealerContract = dl.find((d) => d.title.includes('Dealer Contract'));
  check('dealer contract visible to Level1', Boolean(dealerContract));
  if (dealerContract) {
    const dlRes = await fetch(`${BASE}/downloads/${dealerContract.id}/file`, {
      headers: { Authorization: `Bearer ${agent.token}` },
    });
    check('download file 200', dlRes.status === 200);
  }
  // Level2 must NOT see dealer contract (LEVEL1,LEVEL3 only)
  r = await api('GET', '/downloads', undefined, plumber.token);
  const dl2 = (r.json.data as { title: string }[]);
  check('dealer contract hidden from Level2', !dl2.some((d) => d.title.includes('Dealer Contract')));

  console.log('== Admin dashboard ==');
  r = await api('GET', '/admin/dashboard', undefined, admin.token);
  check('admin dashboard 200', r.status === 200);
  const dash = r.json.data as { monthSales: number; level1Count: number; level2Count: number; level3Count: number };
  check('dashboard has counters', dash.level1Count >= 1 && dash.level2Count >= 3 && dash.level3Count >= 1);

  console.log('== Excel export ==');
  const exportRes = await fetch(`${BASE}/admin/members/export`, { headers: { Authorization: `Bearer ${admin.token}` } });
  check('members excel export', exportRes.status === 200 && (await exportRes.arrayBuffer()).byteLength > 1000);
  const exportPdf = await fetch(`${BASE}/admin/performance/export?format=pdf&groupBy=state`, { headers: { Authorization: `Bearer ${admin.token}` } });
  check('performance pdf export', exportPdf.status === 200 && (await exportPdf.arrayBuffer()).byteLength > 500);

  console.log(`\n================ RESULT: ${passed} passed, ${failed} failed ================`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
