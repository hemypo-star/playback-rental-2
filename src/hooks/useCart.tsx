import { useState, useEffect, useMemo, useCallback } from 'react';
import { Product } from '@/types/product';
import { useToast } from '@/hooks/use-toast';
import { calculateRentalPrice } from '@/utils/pricingUtils';
import { getAvailableQuantity, isQuantityAvailable } from '@/utils/availabilityUtils';
import { getProductById } from '@/services/apiService';
import { getProductBookings } from '@/services/bookingService';
import { useQueryClient } from '@tanstack/react-query';
import { useBookingDates } from '@/contexts/BookingDatesContext';
import React, { createContext, useContext } from 'react';

export interface CartItem {
  id: string;
  productId: string;
  title: string;
  price: number;
  imageUrl: string;
  // Даты теперь опциональны, так как могут сбрасываться при новой сессии
  startDate?: Date; 
  endDate?: Date;
  quantity: number;
}

export const useCart = () => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { startDate: globalStartDate, endDate: globalEndDate } = useBookingDates();

  // Загружаем товары из localStorage. Даты не читаем здесь напрямую -
  // они синхронизируются отдельным эффектом ниже с активной сессией.
  useEffect(() => {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      try {
        const parsedCart = JSON.parse(savedCart);
        const hydratedCart = parsedCart.map((item: any) => ({
          ...item,
          startDate: undefined,
          endDate: undefined
        }));
        setCartItems(hydratedCart);
      } catch (error) {
        console.error('Failed to parse cart from localStorage:', error);
        localStorage.removeItem('cart');
      }
    }
  }, []);

  // Строго синхронизируем даты товаров в корзине с глобально выбранными датами,
  // где бы они ни менялись на сайте (поиск, страница товара, редактор в корзине).
  // Если сессия пуста (новая вкладка), даты обнулятся, но товары останутся.
  useEffect(() => {
    setCartItems(prevItems => {
      if (prevItems.length === 0) return prevItems;
      const alreadyInSync = prevItems.every(item =>
        item.startDate?.getTime() === globalStartDate?.getTime() &&
        item.endDate?.getTime() === globalEndDate?.getTime()
      );
      if (alreadyInSync) return prevItems;
      return prevItems.map(item => ({
        ...item,
        startDate: globalStartDate,
        endDate: globalEndDate
      }));
    });
  }, [globalStartDate, globalEndDate]);

  // Сохраняем товары обратно в localStorage для долговечности
  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cartItems));
  }, [cartItems]);

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

  const isProductInCart = useCallback((productId: string) => {
    return cartItems.some(item => item.productId === productId);
  }, [cartItems]);

  const addToCart = useCallback(async (product: Product, startDate?: Date, endDate?: Date, quantity: number = 1) => {
    if (!startDate || !endDate) {
      toast({
        title: "Сначала выберите даты",
        description: "Пожалуйста, выберите даты аренды перед добавлением в корзину",
        variant: "destructive",
      });
      return false;
    }

    const existingItemIndex = cartItems.findIndex(item => 
      item.productId === product.id &&
      item.startDate?.getTime() === startDate.getTime() &&
      item.endDate?.getTime() === endDate.getTime()
    );

    let totalRequestedQuantity = quantity;
    if (existingItemIndex >= 0) {
      totalRequestedQuantity += cartItems[existingItemIndex].quantity;
    }

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
      const cartItemId = `${product.id}_${Date.now()}`;

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

    await queryClient.invalidateQueries({ queryKey: ['product-bookings', product.id] });
    await queryClient.invalidateQueries({ queryKey: ['cart-products'] });

    return true;
  }, [toast, checkProductAvailability, queryClient, cartItems]);

  const removeFromCart = useCallback(async (itemId: string) => {
    const item = cartItems.find(cartItem => cartItem.id === itemId);
    
    setCartItems(prevItems => prevItems.filter(item => item.id !== itemId));

    if (item) {
      await queryClient.invalidateQueries({ queryKey: ['product-bookings', item.productId] });
      await queryClient.invalidateQueries({ queryKey: ['cart-products'] });
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

    const item = cartItems.find(cartItem => cartItem.id === itemId);
    if (!item) return;

    // Проверяем доступность только если даты уже выбраны
    if (item.startDate && item.endDate) {
      const availability = await checkProductAvailability(item.productId, item.startDate, item.endDate, newQuantity);
      
      if (!availability.available) {
        toast({
          title: "Недостаточно товара",
          description: `Доступно только ${availability.maxQuantity} шт. на выбранные даты. Количество установлено на максимум.`,
          variant: "destructive",
        });
        
        const maxQuantity = Math.max(1, availability.maxQuantity);
        setCartItems(prevItems => 
          prevItems.map(cartItem => 
            cartItem.id === itemId 
              ? { ...cartItem, quantity: maxQuantity }
              : cartItem
          )
        );
        
        await queryClient.invalidateQueries({ queryKey: ['product-bookings', item.productId] });
        await queryClient.invalidateQueries({ queryKey: ['cart-products'] });
        return;
      }
    }

    setCartItems(prevItems => 
      prevItems.map(cartItem => 
        cartItem.id === itemId 
          ? { ...cartItem, quantity: newQuantity }
          : cartItem
      )
    );

    await queryClient.invalidateQueries({ queryKey: ['product-bookings', item.productId] });
    await queryClient.invalidateQueries({ queryKey: ['cart-products'] });

    toast({
      title: "Количество обновлено",
      description: "Количество товара в корзине обновлено.",
    });
  }, [cartItems, removeFromCart, toast, checkProductAvailability, queryClient]);

  const clearCart = useCallback(async () => {
    const productIds = [...new Set(cartItems.map(item => item.productId))];
    
    setCartItems([]);
    localStorage.removeItem('cart'); // Очищаем из local
    
    for (const productId of productIds) {
      await queryClient.invalidateQueries({ queryKey: ['product-bookings', productId] });
    }
    await queryClient.invalidateQueries({ queryKey: ['cart-products'] });
  }, [cartItems, queryClient]);

  const updateCartDates = useCallback((startDate: Date, endDate: Date) => {
    if (!startDate || !endDate) {
      return false;
    }

    const wouldChange = cartItems.some(item => 
      !item.startDate || !item.endDate ||
      item.startDate.getTime() !== startDate.getTime() || 
      item.endDate.getTime() !== endDate.getTime()
    );

    if (!wouldChange) {
      return false; 
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
      // Если даты сброшены, стоимость товара не учитывается (или равна 0)
      if (!item.startDate || !item.endDate) return total; 
      
      const itemTotal = calculateRentalPrice(item.price, item.startDate, item.endDate);
      return total + (itemTotal * item.quantity);
    }, 0);
    
    return Math.round(total);
  }, [cartItems]);

  const cartCount = useMemo(() => cartItems.reduce((count, item) => count + item.quantity, 0), [cartItems]);

  return useMemo(() => ({
    cartItems,
    addToCart,
    removeFromCart,
    updateItemQuantity,
    clearCart,
    updateCartDates,
    getCartTotal,
    cartCount,
    isProductInCart
  }), [cartItems, addToCart, removeFromCart, updateItemQuantity, clearCart, updateCartDates, getCartTotal, cartCount, isProductInCart]);
};

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