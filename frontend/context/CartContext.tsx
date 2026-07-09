"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

type CartItem = {
  code: string;
  name: string;
  price: number;
  qty: number;
};

type CartContextType = {
  cart: CartItem[];
  addToCart: (item: CartItem) => void;
  increaseQty: (code: string) => void;
  decreaseQty: (code: string) => void;
  removeItem: (code: string) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartContextType>({
  cart: [],
  addToCart: () => {},
  increaseQty: () => {},
  decreaseQty: () => {},
  removeItem: () => {},
  clearCart: () => {},
});

export function CartProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [cart, setCart] = useState<CartItem[]>([]);

  // Sayfa açılırken LocalStorage'dan yükle
  useEffect(() => {
    const saved = localStorage.getItem("etken-cart");

    if (saved) {
      setCart(JSON.parse(saved));
    }
  }, []);

  // Her değişiklikte kaydet
  useEffect(() => {
    localStorage.setItem("etken-cart", JSON.stringify(cart));
  }, [cart]);

  function addToCart(item: CartItem) {
    setCart((old) => {
      const existing = old.find((x) => x.code === item.code);

      if (existing) {
        return old.map((x) =>
          x.code === item.code
            ? { ...x, qty: x.qty + 1 }
            : x
        );
      }

      return [...old, item];
    });
  }

  function increaseQty(code: string) {
    setCart((old) =>
      old.map((x) =>
        x.code === code
          ? { ...x, qty: x.qty + 1 }
          : x
      )
    );
  }

  function decreaseQty(code: string) {
    setCart((old) =>
      old
        .map((x) =>
          x.code === code
            ? { ...x, qty: x.qty - 1 }
            : x
        )
        .filter((x) => x.qty > 0)
    );
  }

  function removeItem(code: string) {
    setCart((old) =>
      old.filter((x) => x.code !== code)
    );
  }

  function clearCart() {
    setCart([]);
  }

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        increaseQty,
        decreaseQty,
        removeItem,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}