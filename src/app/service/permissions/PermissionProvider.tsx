"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { loadAllFromDB } from "./permissions";

interface PermissionContextValue {
    loaded: boolean;
}

const PermissionContext = createContext<PermissionContextValue>({ loaded: false });

const PERMISSIONS_REFRESH_INTERVAL = 60_000; // 60 giây

/**
 * PermissionProvider - Wrap vào layout để pre-load roles, departments, permissions từ MongoDB.
 */
export function PermissionProvider({ children }: { children: React.ReactNode }) {
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        loadAllFromDB().then(() => setLoaded(true));

        const interval = setInterval(() => {
            loadAllFromDB();
        }, PERMISSIONS_REFRESH_INTERVAL);

        const handleFocus = () => loadAllFromDB();
        window.addEventListener("focus", handleFocus);

        return () => {
            clearInterval(interval);
            window.removeEventListener("focus", handleFocus);
        };
    }, []);

    return (
        <PermissionContext.Provider value={{ loaded }}>
            {children}
        </PermissionContext.Provider>
    );
}

export function usePermissionLoaded(): boolean {
    const ctx = useContext(PermissionContext);
    return ctx.loaded;
}
