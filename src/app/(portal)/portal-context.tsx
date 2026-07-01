"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { cookieBase } from "@/app/utils/cookie";
import { CONFIG } from "@/app/utils/config";
import type { User } from "@/app/data/dataUser";
import type { Employee } from "@/app/interface/timekeeping";

interface PortalUserContextValue {
  authUser: User | null;
  employee: Employee | null;
  employeeCode: string;
  displayName: string;
  roleLabel: string;
  isLoading: boolean;
  refreshEmployee: () => Promise<void>;
  logout: () => void;
}

interface EmployeesApiResponse {
  data?: Employee[];
}

interface UsersApiResponse {
  data?: User[];
}

const PortalUserContext = createContext<PortalUserContextValue | null>(null);

const getText = (value: unknown) => {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  return "";
};

const getUserText = (user: User | null, key: string) => (
  user ? getText(user[key]) : ""
);

const hasFilterValue = (value: unknown) => (
  value !== undefined && value !== null && getText(value) !== ""
);

const getEmployeeLookup = (user: User | null) => ({
  employeeCode: getUserText(user, "employeeCode"),
  employeeId: getUserText(user, "employeeId"),
});

const getEmployeeLookupTerms = (user: User | null) => Array.from(new Set([
  getUserText(user, "employeeCode"),
  getUserText(user, "employeeId"),
  getUserText(user, "username"),
  getUserText(user, "name"),
].filter(Boolean)));

const getEmployeeCode = (employee: Employee | null, authUser: User | null) => (
  employee?.employeeCode
  || employee?.id
  || getEmployeeLookup(authUser).employeeCode
  || getEmployeeLookup(authUser).employeeId
);

const getRoleLabel = (employee: Employee | null, authUser: User | null) => {
  if (employee?.role) return employee.role;
  if (String(authUser?.role) === "3") return "Nhân viên";
  return "Nhân viên";
};

const fetchFirstEmployee = async (params: URLSearchParams) => {
  const response = await fetch(`/api/v1/employees?${params.toString()}`);
  const json = await response.json() as EmployeesApiResponse;
  const [employee] = Array.isArray(json.data) ? json.data : [];
  return employee || null;
};

const fetchFirstUser = async (filters: Record<string, unknown>) => {
  const response = await fetch("/api/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      action: "read",
      sheetTitle: "Users",
      filters,
      limit: 1,
    }),
  });

  if (!response.ok) return null;

  const json = await response.json() as UsersApiResponse;
  const [user] = Array.isArray(json.data) ? json.data : [];
  return user || null;
};

const fetchLatestAuthUser = async (user: User | null) => {
  if (!user) return null;

  const lookupFilters: Record<string, unknown>[] = [];
  if (hasFilterValue(user._id)) lookupFilters.push({ _id: user._id });
  if (hasFilterValue(user.id)) lookupFilters.push({ id: user.id });
  if (hasFilterValue(user.username)) lookupFilters.push({ username: user.username });

  for (const filters of lookupFilters) {
    const latestUser = await fetchFirstUser(filters);
    if (latestUser) return { ...user, ...latestUser };
  }

  return user;
};

export function PortalUserProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchEmployee = useCallback(async (user: User | null) => {
    const { employeeCode, employeeId } = getEmployeeLookup(user);
    const lookupTerms = getEmployeeLookupTerms(user);

    if (!employeeCode && !employeeId && lookupTerms.length === 0) {
      setEmployee(null);
      return null;
    }

    if (employeeId) {
      const byId = await fetchFirstEmployee(new URLSearchParams({
        page: "1",
        pageSize: "1",
        employeeIds: employeeId,
      }));
      if (byId) {
        setEmployee(byId);
        return byId;
      }
    }

    if (employeeCode) {
      const byCode = await fetchFirstEmployee(new URLSearchParams({
        page: "1",
        pageSize: "1",
        employeeCodes: employeeCode,
      }));
      if (byCode) {
        setEmployee(byCode);
        return byCode;
      }
    }

    for (const term of lookupTerms) {
      if (term === employeeCode || term === employeeId) continue;

      const byTermCode = await fetchFirstEmployee(new URLSearchParams({
        page: "1",
        pageSize: "1",
        employeeCodes: term,
      }));
      if (byTermCode) {
        setEmployee(byTermCode);
        return byTermCode;
      }
    }

    for (const term of lookupTerms) {
      const fallbackParams = new URLSearchParams({ page: "1", pageSize: "1", search: term });
      const fallbackEmployee = await fetchFirstEmployee(fallbackParams);
      if (fallbackEmployee) {
        setEmployee(fallbackEmployee);
        return fallbackEmployee;
      }
    }

    setEmployee(null);
    return null;
  }, []);

  const refreshEmployee = useCallback(async () => {
    const latestUser = await fetchLatestAuthUser(authUser);
    setAuthUser(latestUser);
    const latestEmployee = await fetchEmployee(latestUser);
    if (latestUser && latestEmployee) {
      cookieBase.set<User>("info_user", {
        ...latestUser,
        employeeCode: latestUser.employeeCode || latestEmployee.employeeCode,
        employeeId: latestUser.employeeId || latestEmployee.id,
      });
    }
  }, [authUser, fetchEmployee]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void Promise.resolve().then(async () => {
      const userObj = cookieBase.get<User>("info_user");
      if (!userObj) {
        setIsLoading(false);
        router.replace("/login");
        return;
      }

        const latestUser = await fetchLatestAuthUser(userObj);
        const latestEmployee = await fetchEmployee(latestUser);
        const mergedUser = latestUser && latestEmployee
          ? {
              ...latestUser,
              employeeCode: latestUser.employeeCode || latestEmployee.employeeCode,
              employeeId: latestUser.employeeId || latestEmployee.id,
            }
          : latestUser;

        if (mergedUser) {
          setAuthUser(mergedUser);
          cookieBase.set<User>("info_user", mergedUser);
        }
        return latestEmployee;
      })
        .catch((error: unknown) => {
          console.error("Failed to load portal employee", error);
          setEmployee(null);
        })
        .finally(() => setIsLoading(false));
    }, 0);

    return () => window.clearTimeout(timer);
  }, [fetchEmployee, router]);

  const logout = useCallback(() => {
    // 1. Xóa cookie cục bộ
    cookieBase.remove("info_user");
    cookieBase.remove("remember_login");

    // 2. Xóa SSO Cookies (accessToken) 
    document.cookie = "accessToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    if (CONFIG.COOKIE_DOMAIN) {
      document.cookie = `accessToken=; domain=${CONFIG.COOKIE_DOMAIN}; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    }

    // 3. chuyển hướng về trang đăng nhập
    window.location.href = `${CONFIG.AUTH_URL}/login`;
  }, []);

  const value = useMemo<PortalUserContextValue>(() => {
    const employeeCode = getEmployeeCode(employee, authUser);
    const displayName = employee?.fullName || employee?.name || authUser?.name || "Nhân viên";

    return {
      authUser,
      employee,
      employeeCode,
      displayName,
      roleLabel: getRoleLabel(employee, authUser),
      isLoading,
      refreshEmployee,
      logout,
    };
  }, [authUser, employee, isLoading, logout, refreshEmployee]);

  return (
    <PortalUserContext.Provider value={value}>
      {children}
    </PortalUserContext.Provider>
  );
}

export function usePortalUser() {
  const context = useContext(PortalUserContext);
  if (!context) {
    throw new Error("usePortalUser must be used inside PortalUserProvider");
  }
  return context;
}
