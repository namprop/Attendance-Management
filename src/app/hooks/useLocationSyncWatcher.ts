"use client";
import { useEffect, useRef } from "react";
import { cookieBase } from "../utils/cookie";

const LOCATION_SYNC_COOKIE_KEY = "location-sync-ts";
const POLL_INTERVAL_MS = 2000;

export function useLocationSyncWatcher() {
    const baselineRef = useRef<number | null>(null);

    useEffect(() => {
        const initial = cookieBase.get<number>(LOCATION_SYNC_COOKIE_KEY);
        baselineRef.current = initial ?? null;

        const interval = setInterval(() => {
            const current = cookieBase.get<number>(LOCATION_SYNC_COOKIE_KEY);

            if (baselineRef.current === null) {
                if (current !== null) baselineRef.current = current;
                return;
            }

            if (current !== null && current !== baselineRef.current) {
                window.location.reload();
            }
        }, POLL_INTERVAL_MS);

        return () => clearInterval(interval);
    }, []);
}
