"use client";
import { useEffect } from "react";
import { registerPush } from "@/app/utils/resgisterSW";

export function PushInitProvider() {
  useEffect(() => {
    registerPush();
  }, []);

  return null;
}
