"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { B2B_CONSTANTS } from "@/modules/b2b/constants/b2b.constants";

export type CartItem = {
  productId: number;
  code: string;
  name: string;
  unitPrice: number;
  vatRate: number;
  availableStock: number;
  qty: number;
};

type AddToCartInput =
  Omit<CartItem, "qty"> & {
    qty?: number;
  };

type CartContextType = {
  cart: CartItem[];
  isHydrated: boolean;
  addToCart: (
    item: AddToCartInput
  ) => void;
  increaseQty: (
    code: string
  ) => void;
  decreaseQty: (
    code: string
  ) => void;
  setQty: (
    code: string,
    quantity: number
  ) => void;
  removeItem: (
    code: string
  ) => void;
  clearCart: () => void;
};

const CartContext =
  createContext<CartContextType | null>(
    null
  );

function normalizeCartItem(
  value: unknown
): CartItem | null {
  if (
    !value ||
    typeof value !== "object"
  ) {
    return null;
  }

  const item =
    value as Partial<CartItem>;

  if (
    !Number.isInteger(
      Number(item.productId)
    ) ||
    Number(item.productId) <= 0 ||
    typeof item.code !==
      "string" ||
    !item.code.trim() ||
    typeof item.name !==
      "string" ||
    !item.name.trim() ||
    typeof item.unitPrice !==
      "number" ||
    item.unitPrice < 0 ||
    !Number.isInteger(
      Number(item.vatRate)
    ) ||
    Number(item.vatRate) < 0 ||
    !Number.isInteger(
      Number(
        item.availableStock
      )
    ) ||
    Number(
      item.availableStock
    ) < 0 ||
    !Number.isInteger(
      Number(item.qty)
    ) ||
    Number(item.qty) <= 0
  ) {
    return null;
  }

  const availableStock =
    Number(item.availableStock);

  if (availableStock <= 0) {
    return null;
  }

  return {
    productId:
      Number(item.productId),
    code:
      item.code.trim(),
    name:
      item.name.trim(),
    unitPrice:
      Number(item.unitPrice),
    vatRate:
      Number(item.vatRate),
    availableStock,
    qty:
      Math.min(
        Number(item.qty),
        availableStock
      ),
  };
}

export function CartProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [
    cart,
    setCart,
  ] = useState<CartItem[]>([]);

  const [
    isHydrated,
    setIsHydrated,
  ] = useState(false);

  useEffect(() => {
    try {
      const saved =
        localStorage.getItem(
          B2B_CONSTANTS
            .CART_STORAGE_KEY
        );

      if (saved) {
        const parsed: unknown =
          JSON.parse(saved);

        if (
          Array.isArray(parsed)
        ) {
          setCart(
            parsed
              .map(
                normalizeCartItem
              )
              .filter(
                (
                  item
                ): item is CartItem =>
                  item !== null
              )
          );
        }
      }
    } catch (error) {
      console.error(
        "Sepet verisi okunamadı:",
        error
      );
    } finally {
      setIsHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    localStorage.setItem(
      B2B_CONSTANTS
        .CART_STORAGE_KEY,
      JSON.stringify(cart)
    );
  }, [cart, isHydrated]);

  function addToCart(
    input: AddToCartInput
  ) {
    const requestedQuantity =
      Math.max(
        1,
        Math.floor(
          input.qty ?? 1
        )
      );

    if (
      input.availableStock <= 0
    ) {
      return;
    }

    setCart((current) => {
      const existing =
        current.find(
          (item) =>
            item.code ===
            input.code
        );

      if (existing) {
        return current.map(
          (item) =>
            item.code ===
            input.code
              ? {
                  ...item,
                  name:
                    input.name,
                  unitPrice:
                    input.unitPrice,
                  vatRate:
                    input.vatRate,
                  availableStock:
                    input.availableStock,
                  qty: Math.min(
                    item.qty +
                      requestedQuantity,
                    input.availableStock
                  ),
                }
              : item
        );
      }

      return [
        ...current,
        {
          ...input,
          qty: Math.min(
            requestedQuantity,
            input.availableStock
          ),
        },
      ];
    });
  }

  function setQty(
    code: string,
    quantity: number
  ) {
    setCart((current) =>
      current
        .map((item) => {
          if (
            item.code !== code
          ) {
            return item;
          }

          const normalized =
            Math.floor(quantity);

          if (normalized <= 0) {
            return {
              ...item,
              qty: 0,
            };
          }

          return {
            ...item,
            qty: Math.min(
              normalized,
              item.availableStock
            ),
          };
        })
        .filter(
          (item) =>
            item.qty > 0
        )
    );
  }

  function increaseQty(
    code: string
  ) {
    setCart((current) =>
      current.map((item) =>
        item.code === code
          ? {
              ...item,
              qty: Math.min(
                item.qty + 1,
                item.availableStock
              ),
            }
          : item
      )
    );
  }

  function decreaseQty(
    code: string
  ) {
    setCart((current) =>
      current
        .map((item) =>
          item.code === code
            ? {
                ...item,
                qty:
                  item.qty - 1,
              }
            : item
        )
        .filter(
          (item) =>
            item.qty > 0
        )
    );
  }

  function removeItem(
    code: string
  ) {
    setCart((current) =>
      current.filter(
        (item) =>
          item.code !== code
      )
    );
  }

  function clearCart() {
    setCart([]);
  }

  const value = useMemo(
    () => ({
      cart,
      isHydrated,
      addToCart,
      increaseQty,
      decreaseQty,
      setQty,
      removeItem,
      clearCart,
    }),
    [cart, isHydrated]
  );

  return (
    <CartContext.Provider
      value={value}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context =
    useContext(CartContext);

  if (!context) {
    throw new Error(
      "useCart yalnızca CartProvider içinde kullanılabilir."
    );
  }

  return context;
}
