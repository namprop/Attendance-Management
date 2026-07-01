"use client";
import React from "react";
import { useLocationSyncWatcher } from "@/app/hooks/useLocationSyncWatcher";

export function LocationSyncProvider({ children }: { children: React.ReactNode }) {
    useLocationSyncWatcher();
    return <>{children}</>;
}
