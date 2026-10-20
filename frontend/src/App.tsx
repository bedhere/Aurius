import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import PublicLayout from './layouts/PublicLayout';
import MemberLayout from './layouts/MemberLayout';
import AdminLayout from './layouts/AdminLayout';
import { PageLoading } from './components/ui';

const Home = lazy(() => import('./pages/public/Home'));
const Vision = lazy(() => import('./pages/public/Vision'));
const Products = lazy(() => import('./pages/public/Products'));
const ProductDetail = lazy(() => import('./pages/public/ProductDetail'));
const GuestCheckout = lazy(() => import('./pages/public/GuestCheckout'));
const Stockists = lazy(() => import('./pages/public/Stockists'));
const Support = lazy(() => import('./pages/public/Support'));
const Contact = lazy(() => import('./pages/public/Contact'));
const PrivacyPolicy = lazy(() => import('./pages/public/PrivacyPolicy'));
const Terms = lazy(() => import('./pages/public/Terms'));
const DealerAgreement = lazy(() => import('./pages/public/DealerAgreement'));

const Portal = lazy(() => import('./pages/auth/Portal'));
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/auth/ResetPassword'));
const AdminLogin = lazy(() => import('./pages/auth/AdminLogin'));

const MemberDashboard = lazy(() => import('./pages/member/Dashboard'));
const MemberProfile = lazy(() => import('./pages/member/Profile'));
const MemberOrders = lazy(() => import('./pages/member/Orders'));
const MemberOrderDetail = lazy(() => import('./pages/member/OrderDetail'));
const MemberPerformance = lazy(() => import('./pages/member/Performance'));
const MemberDownloads = lazy(() => import('./pages/member/Downloads'));
const MemberAddresses = lazy(() => import('./pages/member/Addresses'));
const MemberSecurity = lazy(() => import('./pages/member/Security'));
const Cart = lazy(() => import('./pages/member/Cart'));
const Checkout = lazy(() => import('./pages/member/Checkout'));

const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));
const AdminApplications = lazy(() => import('./pages/admin/Applications'));
const AdminMembers = lazy(() => import('./pages/admin/Members'));
const AdminProducts = lazy(() => import('./pages/admin/Products'));
const AdminPriceRules = lazy(() => import('./pages/admin/PriceRules'));
const AdminOrders = lazy(() => import('./pages/admin/Orders'));
const AdminOrderDetail = lazy(() => import('./pages/admin/OrderDetail'));
const AdminPayments = lazy(() => import('./pages/admin/Payments'));
const AdminPerformance = lazy(() => import('./pages/admin/Performance'));
const AdminInstallations = lazy(() => import('./pages/admin/Installations'));
const AdminReferrals = lazy(() => import('./pages/admin/Referrals'));
const AdminDownloads = lazy(() => import('./pages/admin/Downloads'));
const AdminEmailLogs = lazy(() => import('./pages/admin/EmailLogs'));
const AdminAuditLogs = lazy(() => import('./pages/admin/AuditLogs'));
const AdminSecurityLogs = lazy(() => import('./pages/admin/SecurityLogs'));
const AdminDealerLocations = lazy(() => import('./pages/admin/DealerLocations'));
const AdminSettings = lazy(() => import('./pages/admin/Settings'));

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoading />}>
        <Routes>
          <Route element={<PublicLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/vision" element={<Vision />} />
            <Route path="/products" element={<Products />} />
            <Route path="/products/:id" element={<ProductDetail />} />
            <Route path="/guest-checkout" element={<GuestCheckout />} />
            <Route path="/stockists" element={<Stockists />} />
            <Route path="/stockists/:state" element={<Stockists />} />
            <Route path="/support" element={<Support />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/dealer-agreement" element={<DealerAgreement />} />
            <Route path="/vip" element={<Portal channel="VIP" />} />
            <Route path="/trade" element={<Portal channel="TRADE" />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/admin-login" element={<AdminLogin />} />
          </Route>

          <Route path="/member" element={<MemberLayout />}>
            <Route index element={<MemberDashboard />} />
            <Route path="profile" element={<MemberProfile />} />
            <Route path="orders" element={<MemberOrders />} />
            <Route path="orders/:id" element={<MemberOrderDetail />} />
            <Route path="performance" element={<MemberPerformance />} />
            <Route path="downloads" element={<MemberDownloads />} />
            <Route path="addresses" element={<MemberAddresses />} />
            <Route path="security" element={<MemberSecurity />} />
            <Route path="cart" element={<Cart />} />
            <Route path="checkout" element={<Checkout />} />
          </Route>

          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="applications" element={<AdminApplications />} />
            <Route path="members" element={<AdminMembers />} />
            <Route path="products" element={<AdminProducts />} />
            <Route path="price-rules" element={<AdminPriceRules />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="orders/:id" element={<AdminOrderDetail />} />
            <Route path="payments" element={<AdminPayments />} />
            <Route path="performance" element={<AdminPerformance />} />
            <Route path="installations" element={<AdminInstallations />} />
            <Route path="referrals" element={<AdminReferrals />} />
            <Route path="downloads" element={<AdminDownloads />} />
            <Route path="email-logs" element={<AdminEmailLogs />} />
            <Route path="audit-logs" element={<AdminAuditLogs />} />
            <Route path="security-logs" element={<AdminSecurityLogs />} />
            <Route path="dealers" element={<AdminDealerLocations />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
