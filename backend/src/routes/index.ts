import { Router } from 'express';
import { validate } from '../middleware/validate';
import { requireAuth, requireAuthAnyStatus, requireActiveMember, requireAdmin, optionalAuth } from '../middleware/auth';
import { loginLimiter } from '../middleware/rateLimit';
import * as auth from '../controllers/authController';
import * as app from '../controllers/applicationController';
import * as products from '../controllers/productController';
import * as cart from '../controllers/cartController';
import * as orders from '../controllers/orderController';
import * as payments from '../controllers/paymentController';
import * as member from '../controllers/memberController';
import * as downloads from '../controllers/downloadController';
import * as adminDash from '../controllers/adminDashboardController';
import * as adminMembers from '../controllers/adminMemberController';
import * as adminCatalog from '../controllers/adminCatalogController';
import * as adminOrders from '../controllers/adminOrderController';
import * as adminSystem from '../controllers/adminSystemController';
import * as dealers from '../controllers/dealerLocationController';
import publicRoutes from './public.routes';
import {
  loginSchema,
  registerAccountSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
} from '../validators/auth.schema';
import { applicationSchema, resubmitApplicationSchema } from '../validators/application.schema';
import { dealerLocationSchema } from '../validators/dealerLocation.schema';
import {
  addToCartSchema,
  updateCartItemSchema,
  checkoutSchema,
  guestCheckoutSchema,
  choosePaymentSchema,
  addressSchema,
  installationSchema,
} from '../validators/order.schema';
import { docUpload, imageUpload, uploadSub } from '../middleware/upload';

const router = Router();

router.use('/', publicRoutes);

// --- Auth -------------------------------------------------------------------
router.post('/auth/login', loginLimiter, validate(loginSchema), auth.login);
router.post('/auth/refresh', auth.refresh);
router.post('/auth/logout', requireAuthAnyStatus, auth.logout);
router.get('/auth/me', requireAuthAnyStatus, auth.me);
router.post('/auth/forgot-password', validate(forgotPasswordSchema), auth.forgotPassword);
router.post('/auth/reset-password', validate(resetPasswordSchema), auth.resetPassword);
router.post('/auth/change-password', requireAuthAnyStatus, validate(changePasswordSchema), auth.changePassword);

// --- Registration / applications ---------------------------------------------
router.post('/applications', validate(applicationSchema), app.submitApplication);
router.post('/applications/resubmit', requireAuthAnyStatus, validate(resubmitApplicationSchema), app.resubmit);
router.get('/applications/me', requireAuthAnyStatus, app.myApplication);
router.post('/applications/me/licence-file', requireAuthAnyStatus, uploadSub('licences'), docUpload.single('file'), app.uploadLicenceFile);
router.get('/applications/me/licence', requireAuthAnyStatus, app.myLicence);

// --- Products (public catalogue; own-tier price injected server-side) -------
router.get('/products', optionalAuth, products.listProducts);
router.get('/products/categories', optionalAuth, products.listCategories);
router.get('/products/:id', optionalAuth, products.getProduct);

// --- Member area (ACTIVE members only) --------------------------------------
router.get('/cart', requireActiveMember, cart.getCart);
router.post('/cart', requireActiveMember, validate(addToCartSchema), cart.addToCart);
router.put('/cart/:itemId', requireActiveMember, validate(updateCartItemSchema), cart.updateCartItem);
router.delete('/cart/:itemId', requireActiveMember, cart.removeCartItem);
router.delete('/cart', requireActiveMember, cart.clearCart);

router.get('/shipping-methods', orders.shippingMethods);
router.post('/orders', requireActiveMember, validate(checkoutSchema), orders.checkout);
router.post('/guest-checkout', optionalAuth, validate(guestCheckoutSchema), orders.guestCheckout);
router.get('/orders', requireActiveMember, orders.myOrders);
router.get('/orders/:id', requireActiveMember, orders.orderDetail);
router.post('/orders/:id/cancel', requireActiveMember, orders.cancelMyOrder);

router.get('/orders/:id/payment-options', requireActiveMember, payments.paymentOptions);
router.post('/orders/:id/pay', requireActiveMember, validate(choosePaymentSchema), payments.choosePayment);
router.post('/orders/:id/bank-receipt', requireActiveMember, uploadSub('receipts'), docUpload.single('file'), payments.uploadBankReceipt);
router.get('/guest-orders/:id/:token/payment-options', payments.guestPaymentOptions);
router.post('/guest-orders/:id/:token/pay', validate(choosePaymentSchema), payments.guestChoosePayment);
router.get('/payments/paypal/return/:id', payments.paypalReturn);
router.post('/payments/stripe/webhook', payments.stripeWebhookAdapter());

router.get('/performance', requireActiveMember, member.myPerformance);
router.get('/referrals', requireActiveMember, member.myReferrals);
router.post('/installations', requireActiveMember, validate(installationSchema), member.registerInstallation);
router.get('/installations', requireActiveMember, member.myInstallations);

router.get('/profile', requireActiveMember, member.myProfile);
router.put('/profile', requireActiveMember, member.updateProfile);
router.get('/addresses', requireActiveMember, member.listAddresses);
router.post('/addresses', requireActiveMember, validate(addressSchema), member.createAddress);
router.delete('/addresses/:id', requireActiveMember, member.deleteAddress);

router.get('/downloads', requireActiveMember, downloads.listDownloads);
router.get('/downloads/:id/file', requireActiveMember, downloads.downloadFile);

// --- Admin -------------------------------------------------------------------
router.get('/admin/dashboard', requireAuth, requireAdmin, adminDash.dashboard);

router.get('/admin/applications', requireAuth, requireAdmin, adminMembers.listApplications);
router.get('/admin/applications/:id', requireAuth, requireAdmin, adminMembers.applicationDetail);
router.post('/admin/applications/:id/review', requireAuth, requireAdmin, adminMembers.reviewApplication);
router.post('/admin/applications/:id/abn-check', requireAuth, requireAdmin, adminMembers.abnCheck);

router.get('/admin/members', requireAuth, requireAdmin, adminMembers.listMembers);
router.get('/admin/members/export', requireAuth, requireAdmin, adminMembers.exportMembers);
router.get('/admin/members/:id', requireAuth, requireAdmin, adminMembers.memberDetail);
router.post('/admin/members/:id/status', requireAuth, requireAdmin, adminMembers.setMemberStatus);
router.post('/admin/members/:id/role', requireAuth, requireAdmin, adminMembers.changeMemberRole);

router.get('/admin/products', requireAuth, requireAdmin, adminCatalog.adminListProducts);
router.post('/admin/products', requireAuth, requireAdmin, adminCatalog.adminCreateProduct);
router.get('/admin/products/:id', requireAuth, requireAdmin, adminCatalog.adminGetProduct);
router.put('/admin/products/:id', requireAuth, requireAdmin, adminCatalog.adminUpdateProduct);
router.post('/admin/products/images', requireAuth, requireAdmin, uploadSub('products'), imageUpload.single('file'), adminCatalog.uploadProductImage);

router.get('/admin/price-rules', requireAuth, requireAdmin, adminCatalog.listPriceRules);
router.post('/admin/price-rules', requireAuth, requireAdmin, adminCatalog.createPriceRule);
router.put('/admin/price-rules/:id', requireAuth, requireAdmin, adminCatalog.updatePriceRule);
router.delete('/admin/price-rules/:id', requireAuth, requireAdmin, adminCatalog.deletePriceRule);

router.get('/admin/downloads', requireAuth, requireAdmin, adminCatalog.adminListDownloads);
router.post('/admin/downloads', requireAuth, requireAdmin, uploadSub('downloads'), docUpload.single('file'), adminCatalog.adminUploadDownload);
router.put('/admin/downloads/:id', requireAuth, requireAdmin, adminCatalog.adminUpdateDownload);
router.delete('/admin/downloads/:id', requireAuth, requireAdmin, adminCatalog.adminDeleteDownload);

router.get('/admin/orders', requireAuth, requireAdmin, adminOrders.adminListOrders);
router.get('/admin/orders/export', requireAuth, requireAdmin, adminOrders.adminExportOrders);
router.get('/admin/orders/:id', requireAuth, requireAdmin, adminOrders.adminOrderDetail);
router.post('/admin/orders/:id/ship', requireAuth, requireAdmin, adminOrders.adminShipOrder);
router.post('/admin/orders/:id/deliver', requireAuth, requireAdmin, adminOrders.adminDeliverOrder);
router.post('/admin/orders/:id/refund', requireAuth, requireAdmin, adminOrders.adminRefundOrder);

router.get('/admin/payments', requireAuth, requireAdmin, adminOrders.adminListPayments);
router.post('/admin/receipts/:receiptId/verify', requireAuth, requireAdmin, adminOrders.adminVerifyReceipt);

router.get('/admin/performance', requireAuth, requireAdmin, adminSystem.performanceStats);
router.get('/admin/performance/export', requireAuth, requireAdmin, adminSystem.exportPerformance);
router.get('/admin/installations', requireAuth, requireAdmin, adminSystem.adminInstallations);
router.post('/admin/installations/:id/confirm', requireAuth, requireAdmin, adminSystem.adminConfirmInstallation);
router.get('/admin/referrals', requireAuth, requireAdmin, adminSystem.adminReferrals);

router.get('/admin/email-logs', requireAuth, requireAdmin, adminSystem.emailLogs);
router.get('/admin/audit-logs', requireAuth, requireAdmin, adminSystem.auditLogs);
router.get('/admin/security-logs', requireAuth, requireAdmin, adminSystem.securityLogs);
router.get('/admin/settings', requireAuth, requireAdmin, adminSystem.getSettings);
router.put('/admin/settings', requireAuth, requireAdmin, adminSystem.updateSettings);

router.get('/admin/dealers', requireAuth, requireAdmin, dealers.listAdminDealerLocations);
router.post('/admin/dealers', requireAuth, requireAdmin, validate(dealerLocationSchema), dealers.createDealerLocation);
router.put('/admin/dealers/:id', requireAuth, requireAdmin, validate(dealerLocationSchema), dealers.updateDealerLocation);
router.delete('/admin/dealers/:id', requireAuth, requireAdmin, dealers.deleteDealerLocation);

export default router;
