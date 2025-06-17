
import React from 'react'
import { Routes, Route } from 'react-router-dom'
import { ToasterProvider } from '@/hooks/Toaster'
import { CartProvider } from '@/hooks/useCart'
import { AuthProvider } from '@/contexts/AuthContext'
import RequireAuth from '@/components/RequireAuth'

// Page imports
import Home from '@/pages/Home'
import Catalog from '@/pages/Catalog'
import ProductDetail from '@/pages/ProductDetail'
import Checkout from '@/pages/Checkout'
import HowItWorks from '@/pages/HowItWorks'
import Contact from '@/pages/Contact'
import PrivacyPolicy from '@/pages/PrivacyPolicy'
import Login from '@/pages/Login'
import Admin from '@/pages/Admin'
import NotFound from '@/pages/NotFound'

function App() {
  return (
    <AuthProvider>
      <ToasterProvider>
        <CartProvider>
          <div className="min-h-screen bg-background">
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<Home />} />
              <Route path="/catalog" element={<Catalog />} />
              <Route path="/product/:id" element={<ProductDetail />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/how-it-works" element={<HowItWorks />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/privacy-policy" element={<PrivacyPolicy />} />
              <Route path="/login" element={<Login />} />
              
              {/* Protected admin routes */}
              <Route 
                path="/admin/*" 
                element={
                  <RequireAuth>
                    <Admin />
                  </RequireAuth>
                } 
              />
              
              {/* 404 fallback */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
        </CartProvider>
      </ToasterProvider>
    </AuthProvider>
  )
}

export default App
