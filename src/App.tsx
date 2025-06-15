import { ToasterProvider } from "@/hooks/Toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense, useEffect, useMemo } from "react";
import { seedDatabase } from "./utils/seedDatabase";
import { CartProvider } from "./hooks/useCart";
import { Navbar } from "./components/Navbar";
import RequireAuth from "./components/RequireAuth";
import { AuthProvider } from "./contexts/AuthContext";

// Pages
import Index from "./pages/Index";
// Direct import for Catalog instead of lazy loading
import Catalog from "./pages/Catalog";
// Keep lazy loading for other pages
const ProductDetail = lazy(() => import("./pages/ProductDetail"));
const Checkout = lazy(() => import("./pages/Checkout"));
const Admin = lazy(() => import("./pages/Admin"));
const Login = lazy(() => import("./pages/Login"));
const HowItWorks = lazy(() => import("./pages/HowItWorks"));
const Contact = lazy(() => import("./pages/Contact"));
import NotFound from "./pages/NotFound";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import { Footer } from "./components/Footer";

const Loading = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
  </div>
);

// Memoize the QueryClient to prevent recreation on every render
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes default stale time
    },
  },
});

const App = () => {
  useEffect(() => {
    // Initialize the database with seed data
    seedDatabase().catch(console.error);
    
    // Initialize storage buckets by calling the API endpoint instead of service directly
    fetch("/api/storage/reset-permissions", {
      method: "POST"
    })
      .then((res) => res.json())
      .then((data) => {
        if (!data.success) {
          console.error("Error initializing storage buckets (API returned error):", data);
        }
      })
      .catch(error => {
        console.error("Error initializing storage buckets:", error);
      });
  }, []);

  // Memoize the main app structure to prevent unnecessary re-renders
  const appContent = useMemo(() => (
    <div className="flex flex-col min-h-screen main-content">
      <Navbar />
      <main className="flex-1 ios-scroll">
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/catalog" element={<Catalog />} />
            <Route path="/product/:id" element={<ProductDetail />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/how-it-works" element={<HowItWorks />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/login" element={<Login />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            
            <Route path="/admin" element={
              <RequireAuth>
                <Admin />
              </RequireAuth>
            } />
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>
      <Footer />
    </div>
  ), []);

  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <ToasterProvider>
            <AuthProvider>
              <CartProvider>
                {appContent}
              </CartProvider>
            </AuthProvider>
          </ToasterProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </BrowserRouter>
  );
};

export default App;
