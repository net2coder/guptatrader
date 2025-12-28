import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface CartItem {
  productId: string;
  quantity: number;
  product?: {
    id: string;
    name: string;
    slug: string;
    price: number;
    compare_at_price?: number | null;
    stock_quantity: number;
    images: { image_url: string }[];
    category?: { name: string } | null;
    material?: string | null;
  };
}

interface CartContextType {
  items: CartItem[];
  isLoading: boolean;
  addToCart: (productId: string, quantity?: number) => Promise<void>;
  removeFromCart: (productId: string) => Promise<void>;
  updateQuantity: (productId: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  getCartTotal: () => number;
  getCartCount: () => number;
  getCartItems: () => CartItem[];
  isInCart: (productId: string) => boolean;
  refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'gupta_traders_cart';

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load cart from localStorage for guests
  const loadGuestCart = useCallback((): CartItem[] => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  }, []);

  // Save cart to localStorage for guests
  const saveGuestCart = useCallback((cartItems: CartItem[]) => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
  }, []);

  // Fetch cart from database for logged-in users
  const fetchDatabaseCart = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('cart_items')
        .select(`
          id,
          product_id,
          quantity,
          product:products(
            id,
            name,
            slug,
            price,
            compare_at_price,
            stock_quantity,
            material,
            category:categories(name),
            images:product_images(image_url, is_primary, sort_order)
          )
        `)
        .eq('user_id', user.id);

      if (error) throw error;

      const cartItems: CartItem[] = (data || [])
        .filter((item: any) => item.product) // Filter out items with deleted products
        .map((item: any) => ({
          productId: item.product_id,
          quantity: Math.min(item.quantity, item.product.stock_quantity), // Adjust to available stock
          product: {
            id: item.product.id,
            name: item.product.name,
            slug: item.product.slug,
            price: Number(item.product.price),
            compare_at_price: item.product.compare_at_price ? Number(item.product.compare_at_price) : null,
            stock_quantity: item.product.stock_quantity,
            material: item.product.material,
            category: item.product.category,
            images: (item.product.images || []).sort((a: any, b: any) => {
              if (a.is_primary && !b.is_primary) return -1;
              if (!a.is_primary && b.is_primary) return 1;
              return (a.sort_order || 0) - (b.sort_order || 0);
            }),
          },
        }));

      setItems(cartItems);
    } catch (error) {
      console.error('Error fetching cart:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Initialize cart
  useEffect(() => {
    if (user) {
      // Migrate guest cart to database if needed
      const guestCart = loadGuestCart();
      if (guestCart.length > 0) {
        migrateGuestCartToDatabase(guestCart).then(() => {
          localStorage.removeItem(CART_STORAGE_KEY);
          fetchDatabaseCart();
        });
      } else {
        fetchDatabaseCart();
      }
    } else {
      // Load guest cart
      const guestCart = loadGuestCart();
      setItems(guestCart);
    }
  }, [user, loadGuestCart, fetchDatabaseCart]);

  // Migrate guest cart to database
  const migrateGuestCartToDatabase = async (guestCart: CartItem[]) => {
    if (!user || guestCart.length === 0) return;

    try {
      for (const item of guestCart) {
        // Check if item already exists
        const { data: existing } = await supabase
          .from('cart_items')
          .select('id, quantity')
          .eq('user_id', user.id)
          .eq('product_id', item.productId)
          .maybeSingle();

        if (existing) {
          // Merge quantities
          await supabase
            .from('cart_items')
            .update({ quantity: existing.quantity + item.quantity })
            .eq('id', existing.id);
        } else {
          // Insert new item
          await supabase
            .from('cart_items')
            .insert({
              user_id: user.id,
              product_id: item.productId,
              quantity: item.quantity,
            });
        }
      }
    } catch (error) {
      console.error('Error migrating cart:', error);
    }
  };

  // Add to cart
  const addToCart = async (productId: string, quantity = 1) => {
    if (user) {
      try {
        // Check current stock
        const { data: product } = await supabase
          .from('products')
          .select('stock_quantity, name')
          .eq('id', productId)
          .single();

        if (!product || product.stock_quantity < quantity) {
          toast({
            title: 'Out of stock',
            description: 'This product is not available in the requested quantity.',
            variant: 'destructive',
          });
          return;
        }

        // Check if already in cart
        const { data: existing } = await supabase
          .from('cart_items')
          .select('id, quantity')
          .eq('user_id', user.id)
          .eq('product_id', productId)
          .maybeSingle();

        const newQuantity = existing ? existing.quantity + quantity : quantity;

        if (newQuantity > product.stock_quantity) {
          toast({
            title: 'Stock limit reached',
            description: `Only ${product.stock_quantity} items available.`,
            variant: 'destructive',
          });
          return;
        }

        if (existing) {
          await supabase
            .from('cart_items')
            .update({ quantity: newQuantity })
            .eq('id', existing.id);
        } else {
          await supabase
            .from('cart_items')
            .insert({
              user_id: user.id,
              product_id: productId,
              quantity,
            });
        }

        await fetchDatabaseCart();
        toast({ title: 'Added to cart' });
      } catch (error) {
        console.error('Error adding to cart:', error);
        toast({
          title: 'Error',
          description: 'Failed to add item to cart.',
          variant: 'destructive',
        });
      }
    } else {
      // Guest cart
      setItems(prev => {
        const existing = prev.find(item => item.productId === productId);
        let newItems: CartItem[];
        
        if (existing) {
          newItems = prev.map(item =>
            item.productId === productId
              ? { ...item, quantity: item.quantity + quantity }
              : item
          );
        } else {
          newItems = [...prev, { productId, quantity }];
        }
        
        saveGuestCart(newItems);
        return newItems;
      });
      toast({ title: 'Added to cart' });
    }
  };

  // Remove from cart
  const removeFromCart = async (productId: string) => {
    if (user) {
      try {
        await supabase
          .from('cart_items')
          .delete()
          .eq('user_id', user.id)
          .eq('product_id', productId);

        await fetchDatabaseCart();
      } catch (error) {
        console.error('Error removing from cart:', error);
      }
    } else {
      setItems(prev => {
        const newItems = prev.filter(item => item.productId !== productId);
        saveGuestCart(newItems);
        return newItems;
      });
    }
  };

  // Update quantity
  const updateQuantity = async (productId: string, quantity: number) => {
    if (quantity <= 0) {
      await removeFromCart(productId);
      return;
    }

    if (user) {
      try {
        // Check stock
        const { data: product } = await supabase
          .from('products')
          .select('stock_quantity')
          .eq('id', productId)
          .single();

        if (!product || quantity > product.stock_quantity) {
          toast({
            title: 'Stock limit',
            description: `Only ${product?.stock_quantity || 0} items available.`,
            variant: 'destructive',
          });
          return;
        }

        await supabase
          .from('cart_items')
          .update({ quantity })
          .eq('user_id', user.id)
          .eq('product_id', productId);

        await fetchDatabaseCart();
      } catch (error) {
        console.error('Error updating quantity:', error);
      }
    } else {
      setItems(prev => {
        const newItems = prev.map(item =>
          item.productId === productId ? { ...item, quantity } : item
        );
        saveGuestCart(newItems);
        return newItems;
      });
    }
  };

  // Clear cart
  const clearCart = async () => {
    if (user) {
      try {
        await supabase
          .from('cart_items')
          .delete()
          .eq('user_id', user.id);

        setItems([]);
      } catch (error) {
        console.error('Error clearing cart:', error);
      }
    } else {
      setItems([]);
      localStorage.removeItem(CART_STORAGE_KEY);
    }
  };

  // Get cart total
  const getCartTotal = useCallback(() => {
    return items.reduce((total, item) => {
      const price = item.product?.price || 0;
      return total + price * item.quantity;
    }, 0);
  }, [items]);

  // Get cart count
  const getCartCount = useCallback(() => {
    return items.reduce((count, item) => count + item.quantity, 0);
  }, [items]);

  // Get cart items with product info
  const getCartItems = useCallback(() => {
    return items.filter(item => item.product);
  }, [items]);

  // Check if product is in cart
  const isInCart = useCallback((productId: string) => {
    return items.some(item => item.productId === productId);
  }, [items]);

  // Refresh cart
  const refreshCart = async () => {
    if (user) {
      await fetchDatabaseCart();
    }
  };

  return (
    <CartContext.Provider
      value={{
        items,
        isLoading,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        getCartTotal,
        getCartCount,
        getCartItems,
        isInCart,
        refreshCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
