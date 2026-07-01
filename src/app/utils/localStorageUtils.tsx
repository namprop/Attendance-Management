"use client";

import { useState } from "react";

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [valueStorage, setValue] = useState<T>(() => {
    if (typeof window === "undefined") return initialValue;
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (err) {
      console.error("Lỗi khi đọc localStorage:", err);
      return initialValue;
    }
  });

  const saveStorage = (newValue: T) => {
    try {
      setValue(newValue);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(key, JSON.stringify(newValue));
      }
    } catch (err) {
      console.error("Lỗi khi lưu localStorage:", err);
    }
  };

  const removeStorage = () => {
    try {
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(key);
      }
      setValue(initialValue);
    } catch (err) {
      console.error("Lỗi khi xóa localStorage:", err);
    }
  };

  return { valueStorage, saveStorage, removeStorage };
}
