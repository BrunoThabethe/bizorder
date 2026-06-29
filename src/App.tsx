import { QueryClientProvider } from "@tanstack/react-query";
import { createQueryClient } from "@/lib/cache";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { ScrollToTop } from "@/components/ScrollToTop";
import { ComingSoonGate } from "@/components/coming-soon/coming-soon-gate";
import { ComingSoonPage } from "@/components/coming-soon/coming-soon-page";
import Index from "./pages/Index.tsx";
import HowItWorksPage from "./pages/HowItWorksPage.tsx";
import ForBusinessesPage from "./pages/ForBusinessesPage.tsx";
import ForCustomersPage from "./pages/ForCustomersPage.tsx";
import ContactPage from "./pages/ContactPage.tsx";
import LoginPage from "./pages/LoginPage.tsx";
import SignupPage from "./pages/SignupPage.tsx";
import ForgotPasswordPage from "./pages/ForgotPasswordPage.tsx";
import ResetPasswordPage from "./pages/ResetPasswordPage.tsx";
import PrivacyPage from "./pages/PrivacyPage.tsx";
import TermsPage from "./pages/TermsPage.tsx";
import RefundPage from "./pages/RefundPage.tsx";
import PlatformRulesPage from "./pages/PlatformRulesPage.tsx";
import NotFound from "./pages/NotFound.tsx";
import VerifyEmailPage from "./pages/VerifyEmailPage.tsx";
import AdminVerifyPage from "./pages/admin/AdminVerifyPage.tsx";
import { RoleGuard } from "@/components/customer/RoleGuard";
import { AdminOtpGate } from "@/components/admin/AdminOtpGate";
import CustomerDashboardPage from "./pages/customer/CustomerDashboardPage.tsx";
import BrowseBusinessesPage from "./pages/customer/BrowseBusinessesPage.tsx";
import BusinessProfilePage from "./pages/customer/BusinessProfilePage.tsx";
import CreateOrderPage from "./pages/customer/CreateOrderPage.tsx";
import OrderDetailPage from "./pages/customer/OrderDetailPage.tsx";

import OrdersPage from "./pages/customer/OrdersPage.tsx";
import MessagesPage from "./pages/customer/MessagesPage.tsx";
import AddressesPage from "./pages/customer/AddressesPage.tsx";
import NotificationsPage from "./pages/customer/NotificationsPage.tsx";
import ReviewsPage from "./pages/customer/ReviewsPage.tsx";
import SettingsPage from "./pages/customer/SettingsPage.tsx";
import BusinessDashboardPage from "./pages/business/BusinessDashboardPage.tsx";
import OrdersQueuePage from "./pages/business/OrdersQueuePage.tsx";
import BusinessOrderDetailPage from "./pages/business/BusinessOrderDetailPage.tsx";
import ServicesManagerPage from "./pages/business/ServicesManagerPage.tsx";
import BusinessSettingsPage from "./pages/business/BusinessSettingsPage.tsx";
import BusinessAvailabilityPage from "./pages/business/BusinessAvailabilityPage.tsx";
import BusinessReviewsPage from "./pages/business/BusinessReviewsPage.tsx";
import PayoutsPage from "./pages/business/PayoutsPage.tsx";
import BusinessNotificationsPage from "./pages/business/BusinessNotificationsPage.tsx";
import CrewManagementPage from "./pages/business/CrewManagementPage.tsx";
import BusinessMessagesPage from "./pages/business/BusinessMessagesPage.tsx";
import BusinessOnboardingPage from "./pages/business/BusinessOnboardingPage.tsx";
import CrewDashboardPage from "./pages/crew/CrewDashboardPage.tsx";
import CrewTasksPage from "./pages/crew/CrewTasksPage.tsx";
import CrewTaskDetailPage from "./pages/crew/CrewTaskDetailPage.tsx";
import CrewNotificationsPage from "./pages/crew/CrewNotificationsPage.tsx";
import CrewProfilePage from "./pages/crew/CrewProfilePage.tsx";
import AdminDashboardPage from "./pages/admin/AdminDashboardPage.tsx";
import AdminOrdersPage from "./pages/admin/AdminOrdersPage.tsx";
import AdminOrderDetailPage from "./pages/admin/AdminOrderDetailPage.tsx";
import AdminUsersPage from "./pages/admin/AdminUsersPage.tsx";
import AdminBusinessesPage from "./pages/admin/AdminBusinessesPage.tsx";
import AdminVerificationPage from "./pages/admin/AdminVerificationPage.tsx";
import AdminDisputesPage from "./pages/admin/AdminDisputesPage.tsx";
import AdminPayoutsPage from "./pages/admin/AdminPayoutsPage.tsx";
import AdminUploadsPage from "./pages/admin/AdminUploadsPage.tsx";
import AdminAnalyticsPage from "./pages/admin/AdminAnalyticsPage.tsx";
import AdminAiAssistantPage from "./pages/admin/AdminAiAssistantPage.tsx";

import AdminNewsletterPage from "./pages/admin/AdminNewsletterPage.tsx";
import AdminSettingsPage from "./pages/admin/AdminSettingsPage.tsx";
import AdminAuditPage from "./pages/admin/AdminAuditPage.tsx";
import AdminProfileChangeRequestsPage from "./pages/admin/AdminProfileChangeRequestsPage.tsx";
import BusinessQuotesPage from "./pages/business/BusinessQuotesPage.tsx";
import CustomerQuotesPage from "./pages/customer/CustomerQuotesPage.tsx";
import PaymentSuccessPage from "./pages/PaymentSuccessPage.tsx";
import PaymentErrorPage from "./pages/PaymentErrorPage.tsx";


const queryClient = createQueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ScrollToTop />
          <ComingSoonGate>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/coming-soon" element={<ComingSoonPage />} />
            <Route path="/how-it-works" element={<HowItWorksPage />} />
            <Route path="/for-businesses" element={<ForBusinessesPage />} />
            <Route path="/for-customers" element={<ForCustomersPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/refunds" element={<RefundPage />} />
            <Route path="/rules" element={<PlatformRulesPage />} />


            {/* Customer portal */}
            <Route path="/verify-email" element={<VerifyEmailPage />} />
            <Route path="/admin/verify" element={<AdminVerifyPage />} />

            {/* Customer portal */}
            <Route path="/customer" element={<RoleGuard allow={["customer"]}><CustomerDashboardPage /></RoleGuard>} />
            <Route path="/customer/browse" element={<RoleGuard allow={["customer"]}><BrowseBusinessesPage /></RoleGuard>} />
            <Route path="/customer/business/:slug" element={<RoleGuard allow={["customer"]}><BusinessProfilePage /></RoleGuard>} />
            <Route path="/customer/order/new" element={<RoleGuard allow={["customer"]}><CreateOrderPage /></RoleGuard>} />
            <Route path="/customer/orders" element={<RoleGuard allow={["customer"]}><OrdersPage /></RoleGuard>} />
            <Route path="/customer/orders/:orderId" element={<RoleGuard allow={["customer"]}><OrderDetailPage /></RoleGuard>} />
            
            <Route path="/customer/messages" element={<RoleGuard allow={["customer"]}><MessagesPage /></RoleGuard>} />
            <Route path="/customer/addresses" element={<RoleGuard allow={["customer"]}><AddressesPage /></RoleGuard>} />
            <Route path="/customer/notifications" element={<RoleGuard allow={["customer"]}><NotificationsPage /></RoleGuard>} />
            <Route path="/customer/reviews" element={<RoleGuard allow={["customer"]}><ReviewsPage /></RoleGuard>} />
            <Route path="/customer/settings" element={<RoleGuard allow={["customer"]}><SettingsPage /></RoleGuard>} />

            {/* Provider portal */}
            <Route path="/business" element={<RoleGuard allow={["business"]}><BusinessDashboardPage /></RoleGuard>} />
            <Route path="/business/orders" element={<RoleGuard allow={["business"]}><OrdersQueuePage /></RoleGuard>} />
            <Route path="/business/orders/:orderId" element={<RoleGuard allow={["business"]}><BusinessOrderDetailPage /></RoleGuard>} />
            <Route path="/business/services" element={<RoleGuard allow={["business"]}><ServicesManagerPage /></RoleGuard>} />
            <Route path="/business/settings" element={<RoleGuard allow={["business"]}><BusinessSettingsPage /></RoleGuard>} />
            <Route path="/business/availability" element={<RoleGuard allow={["business"]}><BusinessAvailabilityPage /></RoleGuard>} />
            <Route path="/business/reviews" element={<RoleGuard allow={["business"]}><BusinessReviewsPage /></RoleGuard>} />
            <Route path="/business/payouts" element={<RoleGuard allow={["business"]}><PayoutsPage /></RoleGuard>} />
            <Route path="/business/notifications" element={<RoleGuard allow={["business"]}><BusinessNotificationsPage /></RoleGuard>} />
            <Route path="/business/crew" element={<RoleGuard allow={["business"]}><CrewManagementPage /></RoleGuard>} />
            <Route path="/business/messages" element={<RoleGuard allow={["business"]}><BusinessMessagesPage /></RoleGuard>} />
            <Route path="/business/onboarding" element={<RoleGuard allow={["business"]}><BusinessOnboardingPage /></RoleGuard>} />

            {/* Crew sub-portal */}
            <Route path="/crew" element={<RoleGuard allow={["crew"]}><CrewDashboardPage /></RoleGuard>} />
            <Route path="/crew/tasks" element={<RoleGuard allow={["crew"]}><CrewTasksPage /></RoleGuard>} />
            <Route path="/crew/tasks/:taskId" element={<RoleGuard allow={["crew"]}><CrewTaskDetailPage /></RoleGuard>} />
            <Route path="/crew/notifications" element={<RoleGuard allow={["crew"]}><CrewNotificationsPage /></RoleGuard>} />
            <Route path="/crew/profile" element={<RoleGuard allow={["crew"]}><CrewProfilePage /></RoleGuard>} />

            {/* Admin portal */}
            <Route path="/admin" element={<RoleGuard allow={["admin"]}><AdminOtpGate><AdminDashboardPage /></AdminOtpGate></RoleGuard>} />
            <Route path="/admin/orders" element={<RoleGuard allow={["admin"]}><AdminOtpGate><AdminOrdersPage /></AdminOtpGate></RoleGuard>} />
            <Route path="/admin/orders/:orderId" element={<RoleGuard allow={["admin"]}><AdminOtpGate><AdminOrderDetailPage /></AdminOtpGate></RoleGuard>} />
            <Route path="/admin/users" element={<RoleGuard allow={["admin"]}><AdminOtpGate><AdminUsersPage /></AdminOtpGate></RoleGuard>} />
            <Route path="/admin/businesses" element={<RoleGuard allow={["admin"]}><AdminOtpGate><AdminBusinessesPage /></AdminOtpGate></RoleGuard>} />
            <Route path="/admin/verification" element={<RoleGuard allow={["admin"]}><AdminOtpGate><AdminVerificationPage /></AdminOtpGate></RoleGuard>} />
            <Route path="/admin/change-requests" element={<RoleGuard allow={["admin"]}><AdminOtpGate><AdminProfileChangeRequestsPage /></AdminOtpGate></RoleGuard>} />
            <Route path="/admin/disputes" element={<RoleGuard allow={["admin"]}><AdminOtpGate><AdminDisputesPage /></AdminOtpGate></RoleGuard>} />
            <Route path="/admin/payouts" element={<RoleGuard allow={["admin"]}><AdminOtpGate><AdminPayoutsPage /></AdminOtpGate></RoleGuard>} />
            <Route path="/admin/uploads" element={<RoleGuard allow={["admin"]}><AdminOtpGate><AdminUploadsPage /></AdminOtpGate></RoleGuard>} />
            <Route path="/admin/analytics" element={<RoleGuard allow={["admin"]}><AdminOtpGate><AdminAnalyticsPage /></AdminOtpGate></RoleGuard>} />
            <Route path="/admin/ai-assistant" element={<RoleGuard allow={["admin"]}><AdminOtpGate><AdminAiAssistantPage /></AdminOtpGate></RoleGuard>} />
            
            <Route path="/admin/newsletter" element={<RoleGuard allow={["admin"]}><AdminOtpGate><AdminNewsletterPage /></AdminOtpGate></RoleGuard>} />
            <Route path="/admin/settings" element={<RoleGuard allow={["admin"]}><AdminOtpGate><AdminSettingsPage /></AdminOtpGate></RoleGuard>} />
            <Route path="/admin/audit" element={<RoleGuard allow={["admin"]}><AdminOtpGate><AdminAuditPage /></AdminOtpGate></RoleGuard>} />

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          </ComingSoonGate>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
