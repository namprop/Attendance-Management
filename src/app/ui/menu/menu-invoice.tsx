"use client";

import React, { useContext, useEffect } from "react";
import type { MenuProps } from "antd";
import { ConfigProvider, Menu } from "antd";
import Image from "next/image";
import { usePathname } from "next/navigation";
import Link from "next/link";
import IconCalculator from "@public/icons/prices/calculator.svg";
import { ItemType, MenuContext } from "./menuContext";
import { hasPermission } from "@/app/service/permissions/permissions";
import { usePermissionLoaded } from "@/app/service/permissions/PermissionProvider";
import { User } from "@/app/data/dataUser";
import { getCachedRoles } from "@/app/service/permissions/permissions";
import { cookieBase } from "@/app/utils/cookie";

type MenuItem = Required<MenuProps>["items"][number];

function getItem(
  label: React.ReactNode,
  key: React.Key,
  icon?: React.ReactNode,
  children?: MenuItem[]
): MenuItem {
  return {
    key,
    icon,
    children,
    label,
  } as MenuItem;
}

function findItemByKey(items: ItemType[], key: string): ItemType | undefined {
  for (const item of items) {
    if (item.key === key) return item;
    if (item.children) {
      const child = findItemByKey(item.children, key);
      if (child) return child;
    }
  }
  return undefined;
}

export default function MenuInvoice() {
  usePermissionLoaded();
  const pathname = usePathname();
  const { collapsed, setItemMenu } = useContext(MenuContext);
  const user_info = cookieBase.get<User>("info_user");

  const items: MenuItem[] = [
    getItem(
      "Quản lý Tài khoản",
      "/accounttable-management",
      <Image src={IconCalculator} width={20} height={20} alt="" />,
      [
        getItem(
          <Link href="/accounttable">Danh sách tài khoản</Link>,
          "/accounttable",
          <Image src={IconCalculator} width={20} height={20} alt="" />
        ),
        getItem(
          <Link href="/cashtable">Danh sách người thu chi</Link>,
          "/cashtable",
          <Image src={IconCalculator} width={20} height={20} alt="" />
        ),
        getItem(
          <Link href="/receivetransfertable">Danh sách lịch sử thu CK</Link>,
          "/receivetransfertable",
          <Image src={IconCalculator} width={20} height={20} alt="" />
        ),
        getItem(
          <Link href="/spenttransfertable">Danh sách lịch sử chi CK</Link>,
          "/spenttransfertable",
          <Image src={IconCalculator} width={20} height={20} alt="" />
        )
      ]
    ),
    getItem(
      <Link href="/invoice/create">Tạo hóa đơn</Link>,
      "/invoice/create",
      <Image src={IconCalculator} width={20} height={20} alt="" />
    ),
  ];

  useEffect(() => {
    const found = findItemByKey(items as ItemType[], pathname);
    if (found && setItemMenu) setItemMenu(found);
  }, [pathname]);

  const role = getCachedRoles().find(r => r.id === Number(user_info?.role));
  return (
    <ConfigProvider
      theme={{
        components: {
          Menu: {
            darkItemColor: "#000000",
            darkItemBg: "#FFFFFF",
            darkGroupTitleColor: "#FFFFFF",
            darkPopupBg: "#000000",
            darkSubMenuItemBg: "#FFFFFF",
            darkItemHoverColor: "#000000",
            groupTitleColor: "#000000",
            itemActiveBg: "#FFFFFF",
            itemBg: "#000000",
            subMenuItemBg: "#FFFFFF",
            darkItemSelectedColor: "#2a2b2c",
            darkItemSelectedBg: "#a5bdf8",
          },
        },
      }}
    >
      <Menu
        theme="dark"
        selectedKeys={[pathname]}
        mode="inline"
        items={role?.permissions.join("") === "*"
          ? items // toàn quyền: giữ nguyên menu
          : items.filter((item) => hasPermission(Number(user_info?.role), String(item?.key)))}
        inlineCollapsed={collapsed}
        onClick={({ key }) => {
          const found = findItemByKey(items as ItemType[], key);
          if (found && setItemMenu) {
            setItemMenu(found);
          }
        }}
        defaultOpenKeys={["plan-order-paper", "order-paper", "progress-order-paper", "receive-order-paper"]} // mở mặc định menu cha
        className=""
      />
    </ConfigProvider>
  );
}
