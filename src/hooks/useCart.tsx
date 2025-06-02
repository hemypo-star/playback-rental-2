
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Product } from '@/types/product';
import { useToast } from '@/hooks/use-toast';
import { calculateRentalPrice } from '@/utils/pricingUtils';
import { getAvailableQuantity, isQuantityAvailable } from '@/utils/availabilityUtils';
import { getProductById } from '@/services/apiService';
import { getProductBookings } from '@/services/bookingService';
import { useQueryClient } from '@tanstack/react-query';

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
  const queryClient = useQueryClient();

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

  // Helper function to check availability for a product
  const checkProductAvailability = useCallback(async (productId: string, startDate: Date, endDate: Date, requestedQuantity: number) => {
    try {
      const [product, bookings] = await Promise.all([
        getProductById(productId),
        getProductBookings(productId)
      ]);

      if (!product) {
        return { available: false, maxQuantity: 0 };
      }

      const availableQuantity = getAvailableQuantity(product, bookings, startDate, endDate);
      const isAvailable = isQuantityAvailable(product, bookings, requestedQuantity, startDate, endDate);

      return { available: isAvailable, maxQuantity: availableQuantity };
    } catch (error) {
      console.error('Error checking product availability:', error);
      return { available: false, maxQuantity: 0 };
    }
  }, []);

  const addToCart = useCallback(async (product: Product, startDate?: Date, endDate?: Date, quantity: number = 1) => {
    // Check if required dates are provided
    if (!startDate || !endDate) {
      toast({
        title: "Сначала выберите даты",
        description: "Пожалуйста, выберите даты аренды перед добавлением в корзину",
        variant: "destructive",
      });
      return false;
    }

    // Check if this product with the same dates already exists in cart
    const existingItemIndex = cartItems.findIndex(item => 
      item.productId === product.id &&
      item.startDate.getTime() === startDate.getTime() &&
      item.endDate.getTime() === endDate.getTime()
    );

    let totalRequestedQuantity = quantity;
    if (existingItemIndex >= 0) {
      totalRequestedQuantity += cartItems[existingItemIndex].quantity;
    }

    // Check availability for the total requested quantity
    const availability = await checkProductAvailability(product.id, startDate, endDate, totalRequestedQuantity);
    
    if (!availability.available) {
      toast({
        title: "Недостаточно товара",
        description: `Доступно только ${availability.maxQuantity} шт. на выбранные даты`,
        variant: "destructive",
      });
      return false;
    }

    if (existingItemIndex >= 0) {
      // Update existing item quantity
      setCartItems(prevItems => 
        prevItems.map((item, index) => 
          index === existingItemIndex 
            ? { ...item, quantity: item.quantity + quantity }
            : item
        )
      );

      toast({
        title: "Количество обновлено",
        description: `Количество ${product.title} увеличено на ${quantity} шт.`,
      });
    } else {
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
          quantity
        }
      ]);

      toast({
        title: "Добавлено в корзину",
        description: `${product.title} ${quantity > 1 ? `(${quantity} шт.)` : ''} добавлен в корзину.`,
      });
    }

    // Invalidate product data to refresh availability
    await queryClient.invalidateQueries({ 
      queryKey: ['product-bookings', product.id] 
    });
    await queryClient.invalidateQueries({ 
      queryKey: ['cart-products'] 
    });

    return true;
  }, [toast, checkProductAvailability, queryClient, cartItems]);

  const removeFromCart = useCallback(async (itemId: string) => {
    const item = cartItems.find(cartItem => cartItem.id === itemId);
    
    setCartItems(prevItems => prevItems.filter(item => item.id !== itemId));

    // Invalidate related caches if we have the product info
    if (item) {
      await queryClient.invalidateQueries({ 
        queryKey: ['product-bookings', item.productId] 
      });
      await queryClient.invalidateQueries({ 
        queryKey: ['cart-products'] 
      });
    }

    toast({
      title: "Удалено из корзины",
      description: "Товар удален из корзины.",
    });
  }, [toast, cartItems, queryClient]);

  const updateItemQuantity = useCallback(async (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(itemId);
      return;
    }

    // Find the item to get product details
    const item = cartItems.find(cartItem => cartItem.id === itemId);
    if (!item) return;

    // Check availability for the new quantity
    const availability = await checkProductAvailability(item.productId, item.startDate, item.endDate, newQuantity);
    
    if (!availability.available) {
      toast({
        title: "Недостаточно товара",
        description: `Доступно только ${availability.maxQuantity} шт. на выбранные даты. Количество установлено на максимум.`,
        variant: "destructive",
      });
      
      // Set quantity to maximum available
      const maxQuantity = Math.max(1, availability.maxQuantity);
      setCartItems(prevItems => 
        prevItems.map(cartItem => 
          cartItem.id === itemId 
            ? { ...cartItem, quantity: maxQuantity }
            : cartItem
        )
      );
      
      // Invalidate caches
      await queryClient.invalidateQueries({ 
        queryKey: ['product-bookings', item.productId] 
      });
      await queryClient.invalidateQueries({ 
        queryKey: ['cart-products'] 
      });
      return;
    }

    setCartItems(prevItems => 
      prevItems.map(cartItem => 
        cartItem.id === itemId 
          ? { ...cartItem, quantity: newQuantity }
          : cartItem
      )
    );

    // Invalidate caches
    await queryClient.invalidateQueries({ 
      queryKey: ['product-bookings', item.productId] 
    });
    await queryClient.invalidateQueries({ 
      queryKey: ['cart-products'] 
    });

    toast({
      title: "Количество обновлено",
      description: "Количество товара в корзине обновлено.",
    });
  }, [cartItems, removeFromCart, toast, checkProductAvailability, queryClient]);

  const clearCart = useCallback(async () => {
    const productIds = [...new Set(cartItems.map(item => item.productId))];
    
    setCartItems([]);
    localStorage.removeItem('cart');
    
    // Invalidate caches for all products that were in the cart
    for (const productId of productIds) {
      await queryClient.invalidateQueries({ 
        queryKey: ['product-bookings', productId] 
      });
    }
    await queryClient.invalidateQueries({ 
      queryKey: ['cart-products'] 
    });
  }, [cartItems, queryClient]);

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

  const cartCount = useMemo(() => cartItems.reduce((count, item) => count + item.quantity, 0), [cartItems]);

  // Memoize the return value to prevent unnecessary re-renders
  return useMemo(() => ({
    cartItems,
    addToCart,
    removeFromCart,
    updateItemQuantity,
    clearCart,
    updateCartDates,
    getCartTotal,
    cartCount
  }), [cartItems, addToCart, removeFromCart, updateItemQuantity, clearCart, updateCartDates, getCartTotal, cartCount]);
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
