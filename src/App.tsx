import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { ScrollToTop } from "@/components/ScrollToTop";
import Index from "./pages/Index.tsx";
import HowItWorksPage from "./pages/HowItWorksPage.tsx";
import ForBusinessesPage from "./pages/ForBusinessesPage.tsx";
import ForCustomersPage from "./pages/ForCustomersPage.tsx";
import PricingPage from "./pages/PricingPage.tsx";
import ContactPage from "./pages/ContactPage.tsx";
import LoginPage from "./pages/LoginPage.tsx";
import SignupPage from "./pages/SignupPage.tsx";
import PrivacyPage from "./pages/PrivacyPage.tsx";
import TermsPage from "./pages/TermsPage.tsx";
import RefundPage from "./pages/RefundPage.tsx";
import PlatformRulesPage from "./pages/PlatformRulesPage.tsx";
import NotFound from "./pages/NotFound.tsx";
import { RoleGuard } from "@/components/customer/RoleGuard";
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

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ScrollToTop />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/how-it-works" element={<HowItWorksPage />} />
            <Route path="/for-businesses" element={<ForBusinessesPage />} />
            <Route path="/for-customers" element={<ForCustomersPage />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/refunds" element={<RefundPage />} />
            <Route path="/rules" element={<PlatformRulesPage />} />

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

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
