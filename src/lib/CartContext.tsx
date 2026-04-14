"use client";

import { createContext, useContext, useState } from "react";
import type { Material } from "@/types/material";

type CartItem = {
  material: Material;
};

type CartContextType = {
  items:   CartItem[];
  add:     (m: Material) => void;
  remove:  (id: string)  => void;
  clear:   ()            => void;
  buyNow:  (m: Material) => void;
  total:   number;
  count:   number;
  has:     (id: string)  => boolean;
};

const CartContext = createContext<CartContextType>({
  items:   [],
  add:     () => {},
  remove:  () => {},
  clear:   () => {},
  buyNow:  () => {},
  total:   0,
  count:   0,
  has:     () => false,
});

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  function add(m: Material) {
    setItems(prev =>
      prev.find(i => i.material.id === m.id) ? prev : [...prev, { material: m }]
    );
  }

  function remove(id: string) {
    setItems(prev => prev.filter(i => i.material.id !== id));
  }

  function clear() {
    setItems([]);
  }

  function buyNow(m: Material) {
    setItems([{ material: m }]);
  }

  const total = items.reduce((sum, i) => sum + (i.material.price ?? 0), 0);
  const count = items.length;
  const has   = (id: string) => items.some(i => i.material.id === id);

  return (
    <CartContext.Provider value={{ items, add, remove, clear, buyNow, total, count, has }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);