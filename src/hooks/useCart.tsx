
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Product } from '@/types/product';
import { useToast } from '@/hooks/use-toast';
import { calculateRentalPrice } from '@/utils/pricingUtils';

export interface CartItem {
  id: string;
  productId: string;
  title: string;
  price: number;
  imageUrl: string;
  startDate: Date;
  endDate: Date;
  quantity: number;
}

export const useCart = () => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const { toast } = useToast();

  // Load cart from localStorage on initial render
  useEffect(() => {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      try {
        const parsedCart = JSON.parse(savedCart);
        const hydratedCart = parsedCart.map((item: any) => ({
          ...item,
          startDate: new Date(item.startDate),
          endDate: new Date(item.endDate)
        }));
        setCartItems(hydratedCart);
      } catch (error) {
        console.error('Failed to parse cart from localStorage:', error);
        localStorage.removeItem('cart');
      }
    }
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cartItems));
  }, [cartItems]);

  const addToCart = useCallback((product: Product, startDate?: Date, endDate?: Date) => {
    // Check if required dates are provided
    if (!startDate || !endDate) {
      toast({
        title: "Сначала выберите даты",
        description: "Пожалуйста, выберите даты аренды перед добавлением в корзину",
        variant: "destructive",
      });
      return false;
    }

    // Generate a unique cart item ID
    const cartItemId = `${product.id}_${Date.now()}`;

    // Add the item to the cart
    setCartItems(prevItems => [
      ...prevItems,
      {
        id: cartItemId,
        productId: product.id,
        title: product.title,
        price: product.price,
        imageUrl: product.imageUrl,
        startDate,
        endDate,
        quantity: 1
      }
    ]);

    toast({
      title: "Добавлено в корзину",
      description: `${product.title} добавлен в корзину.`,
    });

    return true;
  }, [toast]);

  const removeFromCart = useCallback((itemId: string) => {
    setCartItems(prevItems => prevItems.filter(item => item.id !== itemId));

    toast({
      title: "Удалено из корзины",
      description: "Товар удален из корзины.",
    });
  }, [toast]);

  const clearCart = useCallback(() => {
    setCartItems([]);
    localStorage.removeItem('cart');
  }, []);

  // Update cart dates for all items - prevent duplicate updates
  const updateCartDates = useCallback((startDate: Date, endDate: Date) => {
    if (!startDate || !endDate) {
      return false;
    }

    // Check if any items would actually change
    const wouldChange = cartItems.some(item => 
      item.startDate.getTime() !== startDate.getTime() || 
      item.endDate.getTime() !== endDate.getTime()
    );

    if (!wouldChange) {
      return false; // No need to update if dates haven't changed
    }

    setCartItems(prevItems => 
      prevItems.map(item => ({
        ...item,
        startDate,
        endDate
      }))
    );

    toast({
      title: "Даты обновлены",
      description: "Даты аренды и стоимость обновлены для всех товаров.",
    });

    return true;
  }, [cartItems, toast]);

  const getCartTotal = useCallback(() => {
    const total = cartItems.reduce((total, item) => {
      const itemTotal = calculateRentalPrice(item.price, item.startDate, item.endDate);
      return total + (itemTotal * item.quantity);
    }, 0);
    
    // Ensure the final total is properly rounded
    return Math.round(total);
  }, [cartItems]);

  const cartCount = useMemo(() => cartItems.length, [cartItems]);

  // Memoize the return value to prevent unnecessary re-renders
  return useMemo(() => ({
    cartItems,
    addToCart,
    removeFromCart,
    clearCart,
    updateCartDates,
    getCartTotal,
    cartCount
  }), [cartItems, addToCart, removeFromCart, clearCart, updateCartDates, getCartTotal, cartCount]);
};

// Create a CartProvider for global state management
import React, { createContext, useContext } from 'react';

type CartContextType = ReturnType<typeof useCart>;

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const cartValue = useCart();
  
  return (
    <CartContext.Provider value={cartValue}>
      {children}
    </CartContext.Provider>
  );
};

export const useCartContext = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCartContext must be used within a CartProvider');
  }
  return context;
};
