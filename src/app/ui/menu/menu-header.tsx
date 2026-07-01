"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { useState, useRef, useCallback } from "react";
import { User } from "@/app/data/dataUser";
import { cookieBase } from "@/app/utils/cookie";
import { hasPermission } from "@/app/service/permissions/permissions";
import { usePermissionLoaded } from "@/app/service/permissions/PermissionProvider";
import styles from "./menu.module.css";
import { CONFIG } from "@/app/utils/config";
import { useLocationStore } from "@/app/store/locationStore";

export type MenuItem = {
  href?: string;
  label: string;
  icon: string | React.ReactNode;
  badge?: number;
  target?: string;
  children?: {
    href?: string;
    label: string;
    icon: string | React.ReactNode;
    badge?: number;
    target?: string;
    children?: {
      href?: string;
      label: string;
      icon: string;
      target?: string;
    }[];
  }[];
};

// ─── Smooth Desktop Dropdown ──────────────────────────────────────────────────
function DesktopDropdownItem({
  item,
  pathname,
  hoverBg,
  renderIcon,
}: {
  item: MenuItem;
  pathname: string;
  hoverBg: string;
  renderIcon: (icon: string | React.ReactNode, w: number, h: number, cls?: string) => React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isActive = pathname === item.href || item.children?.some(c => pathname === c.href || c.children?.some(c2 => pathname === c2.href));

  const handleMouseEnter = useCallback(() => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    setIsOpen(true);
    // Tiny delay so CSS transition has a frame to start from
    requestAnimationFrame(() => setIsVisible(true));
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsVisible(false);
    closeTimerRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 220); // match transition duration
  }, []);

  return (
    <li
      className={`${styles.menuItem} ${isActive ? styles.active : ""}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {item.href ? (
        <Link href={item.href} target={item.target} className="flex items-center text-white font-medium">
          {renderIcon(item.icon, 18, 18, "mr-1.5")}
          <span>{item.label}</span>
          {item.badge !== undefined && (
            <span className="ml-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center animate-bounce">
              {item.badge > 99 ? "99+" : item.badge}
            </span>
          )}
        </Link>
      ) : (
        <div className="flex items-center text-white font-medium cursor-default select-none">
          {renderIcon(item.icon, 18, 18, "mr-1.5")}
          <span>{item.label}</span>
          {item.badge !== undefined && (
            <span className="ml-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center animate-bounce">
              {item.badge > 99 ? "99+" : item.badge}
            </span>
          )}
          {item.children && (
            <svg className="ml-1 w-3 h-3 opacity-60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="m6 9 6 6 6-6" />
            </svg>
          )}
        </div>
      )}

      {/* Dropdown */}
      {item.children && isOpen && (
        <ul
          className={styles.submenu1}
          style={{
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? "translateY(0) scale(1)" : "translateY(-8px) scale(0.97)",
            transition: "opacity 200ms ease, transform 200ms cubic-bezier(0.22, 1, 0.36, 1)",
            pointerEvents: isVisible ? "auto" : "none",
          }}
        >
          {item.children.map((child, cIndex) => (
            <li key={child.href || child.label || cIndex} className={styles.submenuItem}>
              {child.href ? (
                <Link
                  href={child.href}
                  target={child.target}
                  className={`flex items-center px-3 py-2 text-white rounded-md ${hoverBg} ${pathname === child.href ? "bg-white/20 font-bold" : ""}`}
                >
                  {renderIcon(child.icon, 16, 16, "mr-2 shrink-0")}
                  <span className="flex-1">{child.label}</span>
                  {child.badge !== undefined && (
                    <span className="ml-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                      {child.badge > 99 ? "99+" : child.badge}
                    </span>
                  )}
                </Link>
              ) : (
                <div className={`flex items-center px-3 py-2 text-white cursor-default rounded-md`}>
                  {renderIcon(child.icon, 16, 16, "mr-2 shrink-0")}
                  <span className="flex-1">{child.label}</span>
                  {child.badge !== undefined && (
                    <span className="ml-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                      {child.badge > 99 ? "99+" : child.badge}
                    </span>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

// ─── Desktop Nav Bar ──────────────────────────────────────────────────────────
function DesktopMenu({
  items,
  pathname,
  hoverBg,
  renderIcon,
}: {
  items: MenuItem[];
  pathname: string;
  hoverBg: string;
  renderIcon: (icon: string | React.ReactNode, w: number, h: number, cls?: string) => React.ReactNode;
}) {
  return (
    <div className="hidden md:flex md:justify-between md:items-center">
      <ul className="w-full relative flex flex-wrap">
        {items.map((item, index) => (
          <DesktopDropdownItem
            key={item.href || item.label || index}
            item={item}
            pathname={pathname}
            hoverBg={hoverBg}
            renderIcon={renderIcon}
          />
        ))}
      </ul>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function MenuHeaderComponent({ menuItems: propMenuItems }: { menuItems?: MenuItem[] }) {
  usePermissionLoaded();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [prevPathname, setPrevPathname] = useState(pathname);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const toggleExpand = (k: string) => setExpandedItems(p => { const n = new Set(p); n.has(k) ? n.delete(k) : n.add(k); return n; });
  const user_info = cookieBase.get<User>("info_user");
  const { location, branchId } = useLocationStore();

  const OTHER_DOMAIN = CONFIG.PAY_URL;
  const accessToken = cookieBase.get("token") || "";

  const checkInvoice = hasPermission(Number(user_info?.role), "/invoice")
    ? [
      {
        label: "Hóa đơn bán hàng",
        icon: "/icons/prices/price.svg",
        children: [
          { href: "/invoicetable", label: "Quản lý hóa đơn", icon: "/icons/prices/layout-paper.svg" },
          { href: "/invoicetable/ghtk", label: "Hóa đơn ghtk", icon: "/icons/prices/layout-paper.svg" },
          { href: "/invoicetable/reconciliation-ghtk", label: "Đối soát GHTK", icon: "/icons/prices/layout-paper.svg" },
          { href: "/invoicetable/canceled", label: "Quản lý hóa đơn hủy", icon: "/icons/prices/layout-paper.svg" },
          { href: "/invoicetable/reports", label: "Quản lý phiếu thanh toán ", icon: "/icons/prices/layout-paper.svg" },
          { href: "/invoicetable/kiot", label: "Hóa đơn Kiot", icon: "/icons/prices/layout-paper.svg" },
        ],
      },
    ] : [];

  const checkTransaction = hasPermission(Number(user_info?.role), "/transaction")
    ? [{ href: `${OTHER_DOMAIN}/?token=${accessToken}`, label: "Quản lý giao dịch", icon: "/icons/prices/price.svg" }] : [];

  const checkInvoiceBook = hasPermission(Number(user_info?.role), "invoice-lockbook")
    ? [{
      label: "Quản lý khóa sổ", icon: "/icons/prices/price.svg",
      children: [{ href: "/cashbook/table-cashbook", label: "Danh sách sổ khóa", icon: "/icons/prices/layout-paper.svg" }]
    }] : [];

  const checkTrash = hasPermission(Number(user_info?.role), "trash_invoice_ticket")
    ? [{
      label: "Thùng rác", icon: "/icons/prices/layout-paper.svg",
      children: [
        { href: "/invoicetable/reports/trashTicket", label: "Danh sách thùng rác phiếu TT", icon: "/icons/prices/layout-paper.svg" },
        { href: "/cashbook/trashBook", label: "Danh sách thùng rác sổ khóa", icon: "/icons/prices/layout-paper.svg" },
      ]
    }] : [];

  const checkProducts = hasPermission(Number(user_info?.role), "/products")
    ? [{
      label: "Sản phẩm",
      children: [{ href: `${CONFIG.QUOTE_URL}/products`, label: "Danh sách sản phẩm", icon: "/icons/menu/customer.svg" }],
      icon: "/icons/header/product.svg",
    }] : [];

  const checkUnLock = hasPermission(Number(user_info?.role), "check_unlock")
    ? [{ href: "/invoicetable/unlock", label: "Quản lý duyệt mở khóa sổ", icon: "/icons/prices/layout-paper.svg" }] : [];

  const checkApproveCancel = hasPermission(Number(user_info?.role), "approved_canncel")
    ? [{ href: "/invoicetable/cancel-approve", label: "Duyệt hủy đơn", icon: "/icons/prices/layout-paper.svg" }] : [];

  const checkApproveExchange = hasPermission(Number(user_info?.role), "Exchange_invoice")
    ? [{ href: "/invoicetable/exchange-approve", label: "Duyệt đổi trả hàng", icon: "/icons/prices/layout-paper.svg" }] : [];

  const BRANCH_SX_TAN_TRIEU_ID = "6985b957a2a33d600acd766c";
  const hasApprovedSalesManufacture = hasPermission(Number(user_info?.role), "approved_sales_manufacture");
  const showSalesMenu = branchId !== BRANCH_SX_TAN_TRIEU_ID || hasApprovedSalesManufacture;
  const salesMenu = showSalesMenu ? [{ href: "/invoice/create", label: "Bán hàng", icon: "/icons/prices/layout-paper.svg" }] : [];

  const checkManufacturing = hasPermission(Number(user_info?.role), "check_manufacturing")
    ? [{ href: "", label: "Quản lý hóa đơn sản xuất", icon: "/icons/prices/layout-paper.svg" }] : [];

  const menuItems: MenuItem[] = [
    {
      href: "/dashboard", label: "Tổng quan", icon: "/icons/home.svg",
      children: [{ href: "/bankaccount", label: "Quản lý tài khoản ngân hàng", icon: "/icons/prices/layout-paper.svg" }]
    },
    ...salesMenu,
    ...checkInvoice,
    ...checkManufacturing,
    { href: "/invoicetable/updated", label: "Quản lý hóa đơn cập nhật", icon: "/icons/prices/layout-paper.svg" },
    ...checkTransaction,
    ...checkProducts,
    ...checkInvoiceBook,
    ...checkTrash,
    ...checkUnLock,
    ...checkApproveCancel,
    ...checkApproveExchange,
    { href: "/invoicetable/delivery-date", label: "Hóa đơn hẹn giao", icon: "/icons/prices/layout-paper.svg" },
    { href: "/invoicetable/priority", label: "Danh sách hóa đơn ưu tiên", icon: "/icons/prices/layout-paper.svg" },
    { href: "/invoicetable/hold-money", label: "Hóa đơn Sale/Ship giữ tiền", icon: "/icons/prices/layout-paper.svg" },
    { href: "/report/staff-sales", label: "Báo cáo doanh số", icon: "/icons/prices/layout-paper.svg" },
  ];

  const navBg = location === "Saigon" ? "bg-[#F59E0B]" : "bg-[#0070F4]";
  const hoverBg = "hover:bg-white/20 transition-all duration-200";

  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setIsMobileMenuOpen(false);
  }

  const renderIcon = (icon: string | React.ReactNode, width: number, height: number, className: string = "") => {
    if (typeof icon === "string") {
      return <Image src={icon} alt="" width={width} height={height} className={className} />;
    }
    return <span className={`flex items-center justify-center shrink-0 opacity-90 ${className}`} style={{ width, height }}>{icon}</span>;
  };

  const itemsToRender = propMenuItems && propMenuItems.length > 0 ? propMenuItems : menuItems;

  return (
    <nav className={navBg} style={{ "--menu-hover-bg": location === "Saigon" ? "#D97706" : "#005ac3" } as React.CSSProperties}>
      <div className="relative">
        {/* Hamburger button — mobile only */}
        <div className="md:hidden flex justify-end px-4 py-1.5">
          <button type="button" onClick={() => setIsMobileMenuOpen(p => !p)}
            className="p-2 rounded-lg text-white hover:bg-white/20 active:bg-white/30 transition-colors"
            aria-label="Toggle menu">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
        </div>

        {/* Mobile drawer */}
        {isMobileMenuOpen && (
          <>
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[998] md:hidden" onClick={() => setIsMobileMenuOpen(false)} />
            <div className={`fixed top-0 left-0 bottom-0 w-[280px] z-[999] transform transition-transform duration-300 flex flex-col shadow-2xl lg:hidden ${navBg} ${styles.mobileSidebar}`}>
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/20 shrink-0">
                <span className="text-white font-bold text-sm uppercase tracking-wide">Menu</span>
                <button onClick={() => setIsMobileMenuOpen(false)} className="p-1.5 rounded-lg text-white hover:bg-white/20 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto py-2 px-2">
                {itemsToRender.map((item, i) => {
                  const mKey = String(item.href || item.label || i);
                  const isExp = expandedItems.has(mKey);
                  return (
                    <div key={mKey} className="mb-0.5">
                      {item.children ? (
                        <>
                          <button onClick={() => toggleExpand(mKey)} className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-white hover:bg-white/15 transition-colors">
                            <span className="flex items-center gap-2 min-w-0">
                              {renderIcon(item.icon, 16, 16, "shrink-0")}
                              <span className="text-sm font-medium truncate">{item.label}</span>
                              {item.badge !== undefined && <span className="ml-1 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">{item.badge > 99 ? "99+" : item.badge}</span>}
                            </span>
                            <svg className={`shrink-0 transition-transform duration-200 ${isExp ? "rotate-180" : ""}`} xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                          </button>
                          {isExp && (
                            <div className="ml-3 mt-0.5 mb-1 border-l-2 border-white/25 pl-3 space-y-0.5">
                              {item.children.map((ch, ci) => {
                                const chKey = `${mKey}-${ch.href || ch.label || ci}`;
                                const chExp = expandedItems.has(chKey);
                                return (
                                  <div key={chKey}>
                                    {ch.children ? (
                                      <>
                                        <button onClick={() => toggleExpand(chKey)} className="w-full flex items-center justify-between px-2 py-2 rounded-md text-white/90 hover:bg-white/10 transition-colors">
                                          <span className="flex items-center gap-2 min-w-0">
                                            {renderIcon(ch.icon, 13, 13, "shrink-0")}
                                            <span className="text-xs font-medium truncate">{ch.label}</span>
                                          </span>
                                          <svg className={`shrink-0 transition-transform duration-200 ${chExp ? "rotate-180" : ""}`} xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                                        </button>
                                        {chExp && (
                                          <div className="ml-3 mt-0.5 border-l border-white/20 pl-2 space-y-0.5">
                                            {ch.children.map((c2, ci2) => (
                                              <div key={`${chKey}-${c2.href || c2.label || ci2}`}>
                                                {c2.href ? <Link href={c2.href} className="flex items-center gap-2 px-2 py-1.5 rounded-md text-white/80 hover:bg-white/10 hover:text-white transition-colors">{renderIcon(c2.icon, 11, 11, "shrink-0")}<span className="text-xs truncate">{c2.label}</span></Link>
                                                  : <div className="flex items-center gap-2 px-2 py-1.5 text-white/50">{renderIcon(c2.icon, 11, 11, "shrink-0")}<span className="text-xs truncate">{c2.label}</span></div>}
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </>
                                    ) : (
                                      ch.href
                                        ? <Link href={ch.href} target={ch.target} className="flex items-center gap-2 px-2 py-2 rounded-md text-white/90 hover:bg-white/10 hover:text-white transition-colors">{renderIcon(ch.icon, 13, 13, "shrink-0")}<span className="text-xs font-medium truncate">{ch.label}</span>{ch.badge !== undefined && <span className="ml-auto bg-red-500 text-white text-[9px] font-bold px-1 py-0.5 rounded-full shrink-0">{ch.badge > 99 ? "99+" : ch.badge}</span>}</Link>
                                        : <div className="flex items-center gap-2 px-2 py-2 text-white/50">{renderIcon(ch.icon, 13, 13, "shrink-0")}<span className="text-xs font-medium truncate">{ch.label}</span></div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </>
                      ) : (
                        item.href
                          ? <Link href={item.href} target={item.target} className="flex items-center justify-between px-3 py-2.5 rounded-lg text-white hover:bg-white/15 transition-colors">
                            <span className="flex items-center gap-2 min-w-0">{renderIcon(item.icon, 16, 16, "shrink-0")}<span className="text-sm font-medium truncate">{item.label}</span></span>
                            {item.badge !== undefined && <span className="ml-2 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0">{item.badge > 99 ? "99+" : item.badge}</span>}
                          </Link>
                          : <div className="flex items-center px-3 py-2.5 rounded-lg text-white/60">{renderIcon(item.icon, 16, 16, "mr-2 shrink-0")}<span className="text-sm font-medium truncate">{item.label}</span></div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* Desktop Nav */}
        <DesktopMenu
          items={itemsToRender}
          pathname={pathname}
          hoverBg={hoverBg}
          renderIcon={renderIcon}
        />
      </div>
    </nav>
  );
}
