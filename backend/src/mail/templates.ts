// Email templates — plain text + simple branded HTML.

const BRAND = 'AURIUS';
const BRAND_COLOR = '#0DA19E';

function layout(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>${title}</title></head>
<body style="margin:0;padding:0;background:#f5f5f4;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f4;padding:24px 0;">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;">
<tr><td style="background:${BRAND_COLOR};padding:20px 32px;">
<span style="color:#ffffff;font-size:22px;font-weight:bold;letter-spacing:2px;">${BRAND}</span>
</td></tr>
<tr><td style="padding:32px;">
<h2 style="margin:0 0 16px;color:#1c1917;font-size:18px;">${title}</h2>
${bodyHtml}
</td></tr>
<tr><td style="background:#fafaf9;padding:16px 32px;border-top:1px solid #e7e5e4;">
<p style="margin:0;color:#78716c;font-size:12px;">
${BRAND} — SMART TOILET | WHOLE HOUSE WATER FILTRATION<br>
"Australia Quality" brings you the finest premium experience!
</p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}

function p(text: string): string {
  return `<p style="margin:0 0 14px;color:#44403c;font-size:14px;line-height:1.6;">${text}</p>`;
}

function kv(label: string, value: string): string {
  return `<p style="margin:0 0 8px;color:#44403c;font-size:14px;"><strong>${label}:</strong> ${value}</p>`;
}

export interface MailTemplateData {
  [key: string]: string | number | undefined;
}

type TemplateFn = (data: MailTemplateData) => { subject: string; text: string; html: string };

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]!));
}

function enquiryTemplate(title: string, fields: [string, string][]): TemplateFn {
  return (data) => ({
    subject: `${title} — AURIUS Website`,
    text: fields.map(([label, key]) => `${label}: ${data[key] || 'Not provided'}`).join('\n\n'),
    html: layout(title, fields.map(([label, key]) => kv(label, escapeHtml(String(data[key] || 'Not provided')).replace(/\n/g, '<br>'))).join('')),
  });
}

const money = (v: unknown): string =>
  typeof v === 'number' ? `AUD ${v.toFixed(2)}` : String(v ?? '-');

export const templates: Record<string, TemplateFn> = {
  CONTACT_ENQUIRY: enquiryTemplate('New Customer Enquiry', [
    ['Reference', 'reference'], ['Full Name', 'name'], ['Company Name', 'companyName'], ['Email Address', 'email'],
    ['Phone Number', 'phone'], ['State / Territory', 'state'], ['Enquiry Type', 'enquiryType'], ['Message', 'message'],
  ]),
  PARTNERSHIP_ENQUIRY: enquiryTemplate('New Partnership Enquiry', [
    ['Reference', 'reference'], ['Company Name', 'companyName'], ['Company ABN', 'abn'], ['Years in Business', 'yearsInBusiness'],
    ['Existing Sales Network', 'existingSalesNetwork'], ['Preferred Partnership Type', 'partnershipType'],
    ['Current Annual Sales Volume', 'currentAnnualSales'], ['State / Territory', 'state'], ['City', 'city'],
    ['Current Product Categories & Business Overview', 'businessOverview'], ['Products of Interest', 'interestedProducts'],
    ['Preferred Trading Territory', 'intendedTerritory'], ['Estimated Annual Sales Volume', 'expectedAnnualSales'],
    ['Contact Name', 'contactName'], ['Mobile Number', 'phone'], ['Company Website', 'website'], ['Company Email', 'email'],
  ]),
  SUPPORT_ENQUIRY: enquiryTemplate('New After-Sales Request', [
    ['Reference', 'reference'], ['Customer Name', 'name'], ['Email', 'email'], ['Phone', 'phone'],
    ['Product Model', 'productModel'], ['Purchase Date', 'purchaseDate'], ['Order Number', 'orderNumber'], ['Fault Description', 'message'],
  ]),
  ENQUIRY_CONFIRMATION: (data) => {
    const title = data.kind === 'SUPPORT' ? 'Your AURIUS Support Request' : data.kind === 'PARTNERSHIP' ? 'Your AURIUS Partnership Enquiry' : 'Thank You for Contacting AURIUS';
    const message = 'Your enquiry has been received. Our team will review your message and respond as soon as possible.';
    const approval = data.kind === 'PARTNERSHIP' ? 'Submission of an enquiry does not constitute appointment as an authorised AURIUS partner. All partnerships are subject to review and formal approval.' : '';
    return { subject: title, text: `${message}\nReference: ${data.reference}\n${approval}`,
      html: layout(title, p(message) + kv('Reference', escapeHtml(String(data.reference))) + (approval ? p(approval) : '')) };
  },
  REGISTRATION_SUBMITTED: (d) => ({
    subject: 'Your AURIUS application has been received',
    text: `Hi ${d.firstName},\n\nThank you for submitting your ${d.channel} application to AURIUS (${d.applicationNo}).\nOur team will review your qualifications shortly.\n\nYou can track the status in your account.\n\nAURIUS Team`,
    html: layout('Application Received', [
      p(`Hi ${d.firstName},`),
      p(`Thank you for submitting your <strong>${d.channel}</strong> application to AURIUS.`),
      kv('Application Number', String(d.applicationNo)),
      p('Our team will review your qualifications and documentation shortly. You can track the review status in your member account at any time.'),
    ].join('')),
  }),

  APPLICATION_APPROVED: (d) => ({
    subject: 'Welcome to AURIUS — your application has been approved',
    text: `Congratulations ${d.firstName}!\n\nYour application has been approved.\nMember ID: ${d.aurId}\nRole: ${d.roleName}\n\nYou can now log in to view trade pricing, place orders and access the download centre.\n\nAURIUS Team`,
    html: layout('Application Approved', [
      p(`Congratulations ${d.firstName},`),
      p('Your application has been approved. Welcome to the AURIUS trade program!'),
      kv('AURIUS Member ID', String(d.aurId)),
      kv('Member Role', String(d.roleName)),
      kv('Login', String(d.loginUrl)),
      p('You can now log in to view your exclusive trade pricing, place orders online and access technical downloads.'),
    ].join('')),
  }),

  APPLICATION_REJECTED: (d) => ({
    subject: 'Update on your AURIUS application',
    text: `Hi ${d.firstName},\n\nWe were unable to approve your application at this time.\n\nReason: ${d.reason}\n\nYou may update your details and re-submit for review from your account.\n\nAURIUS Team`,
    html: layout('Application Update', [
      p(`Hi ${d.firstName},`),
      p('We were unable to approve your application at this time.'),
      kv('Reason', String(d.reason)),
      p('You may correct your details and re-submit your application for review from your account at any time.'),
    ].join('')),
  }),

  MORE_INFORMATION_REQUIRED: (d) => ({
    subject: 'Action required — additional information needed for your AURIUS application',
    text: `Hi ${d.firstName},\n\nWe need more information to complete the review of your application.\n\n${d.requestedInfo}\n\nPlease log in and update your application.\n\nAURIUS Team`,
    html: layout('More Information Required', [
      p(`Hi ${d.firstName},`),
      p('Our team needs additional information to complete the review of your application:'),
      p(`<em>${String(d.requestedInfo)}</em>`),
      p('Please log in to your account and update your application.'),
    ].join('')),
  }),

  ORDER_SUBMITTED: (d) => ({
    subject: `Order confirmation — ${d.orderNumber}`,
    text: `Thank you for your order!\n\nOrder Number: ${d.orderNumber}\nMember ID: ${d.memberId}\nTotal: ${money(d.total)}\nPayment Method: ${d.paymentMethod}\n\nAURIUS Team`,
    html: layout('Order Confirmation', [
      p('Thank you for your order.'),
      kv('Order Number', String(d.orderNumber)),
      kv('Member ID', String(d.memberId)),
      kv('Total', money(d.total)),
      kv('Payment Method', String(d.paymentMethod)),
      kv('Order Time', String(d.orderTime)),
      kv('Shipping Address', String(d.shippingAddress)),
    ].join('')),
  }),

  PAYMENT_CONFIRMED: (d) => ({
    subject: `Payment confirmed — ${d.orderNumber}`,
    text: `Good news!\n\nPayment for order ${d.orderNumber} has been confirmed.\nAmount: ${money(d.amount)}\nTransaction: ${d.transactionId}\n\nAURIUS Team`,
    html: layout('Payment Confirmed', [
      p('Good news — your payment has been confirmed.'),
      kv('Order Number', String(d.orderNumber)),
      kv('Member ID', String(d.memberId)),
      kv('Amount', money(d.amount)),
      kv('Payment Time', String(d.paymentTime)),
      kv('Transaction ID', String(d.transactionId)),
      kv('Payment Method', String(d.paymentMethod)),
      kv('Order Status', String(d.orderStatus)),
    ].join('')),
  }),

  ORDER_SHIPPED: (d) => ({
    subject: `Your order is on its way — ${d.orderNumber}`,
    text: `Great news!\n\nOrder ${d.orderNumber} has been shipped.\nCarrier: ${d.carrier}\nTracking: ${d.trackingNumber}\nTrack here: ${d.trackingUrl}\n\nAURIUS Team`,
    html: layout('Order Shipped', [
      p('Great news — your order has been shipped!'),
      kv('Order Number', String(d.orderNumber)),
      kv('Carrier', String(d.carrier)),
      kv('Tracking Number', String(d.trackingNumber)),
      ...(d.trackingUrl ? [kv('Track your parcel', String(d.trackingUrl))] : []),
      ...(d.eta ? [kv('Estimated Delivery', String(d.eta))] : []),
    ].join('')),
  }),

  ORDER_DELIVERED: (d) => ({
    subject: `Your order has been delivered — ${d.orderNumber}`,
    text: `Your order ${d.orderNumber} has been delivered.\n\nThank you for choosing AURIUS. If you need any after-sales support, please contact us.\n\nAURIUS Team`,
    html: layout('Order Delivered', [
      p(`Your order <strong>${d.orderNumber}</strong> has been delivered.`),
      p('Thank you for choosing AURIUS.'),
      p('If you need any after-sales support, visit your member account or contact our support team.'),
    ].join('')),
  }),

  PASSWORD_RESET: (d) => ({
    subject: 'Reset your AURIUS password',
    text: `Hi,\n\nWe received a request to reset your password.\nClick the link below to set a new password:\n${d.resetUrl}\n\nThis link expires in 60 minutes. If you did not request this, you can safely ignore this email.\n\nAURIUS Team`,
    html: layout('Password Reset', [
      p('We received a request to reset your password.'),
      p(`<a href="${String(d.resetUrl)}" style="color:${BRAND_COLOR};font-weight:bold;">Set a new password</a>`),
      p('This link expires in 60 minutes. If you did not request this, you can safely ignore this email.'),
    ].join('')),
  }),

  SECURITY_ALERT: (d) => ({
    subject: 'Security alert — AURIUS account',
    text: `We detected unusual activity related to your AURIUS account.\n\n${d.details}\n\nIf this was you, no action is needed. Otherwise, please reset your password immediately and contact support.\n\nAURIUS Team`,
    html: layout('Security Alert', [
      p('We detected unusual activity related to your AURIUS account:'),
      p(`<strong>${String(d.details)}</strong>`),
      p('If this was you, no action is needed. Otherwise, please reset your password immediately and contact support.'),
    ].join('')),
  }),

  ROLE_CHANGED: (d) => ({
    subject: 'Your AURIUS membership permissions have been updated',
    text: `Hi ${d.firstName},\n\nYour membership role or pricing permissions have been updated.\nNew role: ${d.roleName}\nMember ID: ${d.aurId}\n\nIf you believe this is a mistake, please contact us.\n\nAURIUS Team`,
    html: layout('Membership Updated', [
      p(`Hi ${d.firstName},`),
      p('Your membership role or pricing permissions have been updated.'),
      kv('Member ID', String(d.aurId)),
      kv('New Role', String(d.roleName)),
      p('If you believe this is a mistake, please contact our team.'),
    ].join('')),
  }),

  ORDER_RECEIPT_UPLOADED: (d) => ({
    subject: `Bank transfer receipt received — ${d.orderNumber}`,
    text: `We have received your bank transfer receipt for order ${d.orderNumber}.\nOur finance team will verify the payment and confirm your order shortly.\n\nAURIUS Team`,
    html: layout('Receipt Received', [
      p('We have received your bank transfer receipt.'),
      kv('Order Number', String(d.orderNumber)),
      p('Our finance team will verify the payment and confirm your order shortly.'),
    ].join('')),
  }),

  PAYMENT_RECEIPT_VERIFIED: (d) => ({
    subject: `Payment verified — ${d.orderNumber}`,
    text: `Good news!\n\nOur finance team has verified your bank transfer for order ${d.orderNumber}. Your order is now being processed.\n\nAURIUS Team`,
    html: layout('Payment Verified', [
      p('Good news — our finance team has verified your bank transfer.'),
      kv('Order Number', String(d.orderNumber)),
      p('Your order is now being processed.'),
    ].join('')),
  }),

  ANNUAL_REMINDER: (d) => ({
    subject: `AURIUS reminder for ${d.orderNumber}`,
    text: `Hi ${d.firstName ?? 'there'},\n\nIt has been 12 months since your AURIUS purchase.\nIf you need replacement filters, servicing support or an updated product recommendation, please reply to this email or visit the AURIUS website.\n\nAURIUS Team`,
    html: layout('Annual AURIUS Reminder', [
      p(`Hi ${d.firstName ?? 'there'},`),
      p('It has been 12 months since your AURIUS purchase.'),
      p('If you need replacement filters, servicing support or an updated product recommendation, please reply to this email or visit the AURIUS website.'),
      kv('Order Number', String(d.orderNumber)),
      ...(d.productName ? [kv('Product', String(d.productName))] : []),
    ].join('')),
  }),

  NEW_PRODUCT_PROMOTION: (d) => ({
    subject: String(d.subject ?? 'New AURIUS product available'),
    text: `Hi ${d.firstName ?? 'there'},\n\n${d.message ?? 'A new AURIUS product is now available.'}\n\nView: ${d.link ?? ''}\n\nAURIUS Team`,
    html: layout(String(d.subject ?? 'New Product'), [
      p(`Hi ${d.firstName ?? 'there'},`),
      p(String(d.message ?? 'A new AURIUS product is now available.')),
      ...(d.link ? [p(`<a href="${String(d.link)}" style="color:${BRAND_COLOR};font-weight:bold;">View product</a>`)] : []),
    ].join('')),
  }),
};
