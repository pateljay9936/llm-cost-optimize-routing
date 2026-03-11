"use client";

import { useEffect } from "react";

export function useAppReady() {
  useEffect(() => {
    const loader = document.getElementById("app-loader");
    if (loader) {
      loader.style.opacity = "0";
      setTimeout(() => loader.remove(), 300);
    }
  }, []);
}
