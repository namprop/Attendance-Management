"use client";

import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { MenuProps } from "antd";
import { ConfigProvider, Menu } from "antd";
import Image from "next/image";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { CONFIG } from "@/app/utils/config";
import IconPrice from "@public/icons/prices/price.svg";
import IconListPrice from "@public/icons/prices/list-price.svg";
import IconCalculator from "@public/icons/prices/calculator.svg";
import IconProgress from "@public/icons/menu/flow-line.svg";
import IconCreate from "@public/icons/menu/create.svg";
import IconCustomer from "@public/icons/menu/customer.svg";
import { ItemType, MenuContext } from "./menuContext";
import { allStatusList } from "@/app/data/dataStatus";
import IconDebt from "@public/icons/menu/debt.svg"
import { hasPermission } from "@/app/service/permissions/permissions";
import { usePermissionLoaded } from "@/app/service/permissions/PermissionProvider";
import { User } from "@/app/data/dataUser";
import { getCachedRoles } from "@/app/service/permissions/permissions";
import { cookieBase } from "@/app/utils/cookie";
import { optionStatusProduction, QuoteItem } from "@/app/data/dataOrder";
import dayjs from "dayjs";
import { optionPrintMold } from "@/app/data/dataMold";
import { DropdownBase } from "../base/dropdown";
import { DateRangePicker } from "../base/date-range-picker";
import useStore from "@/app/lib/zustand/useStoreQuote";

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

const filterBG = allStatusList.filter((item) => item.type === 1);
const filterSX = allStatusList.filter((item) => item.type === 2);
const filterTK = allStatusList.filter((item) => item.type === 3);

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

export default function MenuBase() {
  usePermissionLoaded();
  const pathname = usePathname();
  const { collapsed, setItemMenu } = useContext(MenuContext);
  const user_info = cookieBase.get<User>("info_user");
  const accessToken = cookieBase.get("token") || "";
  const [quotes, setQuotes] = useState<QuoteItem[]>([]);

  // Đếm số lượng báo giá theo status
  const countByStatus = quotes.reduce((acc, cur) => {
    acc[Number(cur.status)] = (acc[Number(cur.status)] || 0) + 1;
    return acc;
  }, {} as Record<number, number>);

  const [createdAt, setCreatedAt] = useState<Date | {
    $gte?: Date;
    $lte?: Date;
  } | null | string>(null)

  const notApprove = quotes.filter((item) => item.isApprove === false).length;

  const items: MenuItem[] = useMemo(() => {
    const checkViewListQuote = hasPermission(Number(user_info?.role), "list_quote") ? [
      getItem(
        <Link href="/quote">Danh sách báo giá</Link>,
        "/quote",
        <Image src={IconListPrice} width={20} height={20} alt="" />),
    ] : [];
    const checkViewListQuotePending = hasPermission(Number(user_info?.role), "list_quote_pending") ? [
      getItem(
        <Link href="/quote/pending" className="text-yellow-500!">
          BG chờ phê duyệt{notApprove ? ` (${notApprove})` : ""}</Link>,
        "/quote/pending",
        <Image src={IconProgress} width={20} height={20} alt="" />
      ),
    ] : [];

    // Quyền hiển thị danh sách chốt đơn cho quản lý thiết kế
    const checkViewListQuoteDone = hasPermission(Number(user_info?.role), "view_list_done_quote") ? [
      getItem(
        <Link href="/quote/done">Danh sách chốt chạy</Link>,
        "/quote/done",
        <Image src={IconProgress} width={20} height={20} alt="" />
      ),
    ] : [];

    return [
      // getItem(
      //   <Link href="/dashboard">Tổng quan</Link>,
      //   "/dashboard",
      //   <Image src={IconHome} width={20} height={20} alt="" />
      // ),
      getItem(
        "Báo giá",
        "quote",
        <Image src={IconPrice} width={20} height={20} alt="" />,
        [
          getItem(
            <Link href="/quote/create">Tạo báo giá</Link>,
            "/quote/create",
            <Image src={IconCreate} width={20} height={20} alt="" />
          ),
          ...checkViewListQuote,
          ...checkViewListQuotePending,
          ...filterBG.map((item) =>
            getItem(
              <Link href={`/status/${item.id}`}>
                {item.name}
                <span className="font-bold text-sm text-red-500">
                  {countByStatus[Number(item.id)] ? ` (${countByStatus[Number(item.id)]})` : ""}
                </span>
              </Link>,
              `/status/${item.id}`,
              <Image src={IconProgress} width={20} height={20} alt="" />
            )
          ),
          getItem(
            <Link href="/quote/chotchay">Chốt chạy</Link>,
            "/quote/chotchay",
            <Image src={IconProgress} width={20} height={20} alt="" />
          ),
        ]
      ),
      getItem(
        "Thiết kế",
        "market",
        <Image src={IconPrice} width={20} height={20} alt="" />,
        [
          ...checkViewListQuoteDone,
          ...filterTK.map((item) =>
            getItem(
              <Link href={`/status/${item.id}`}>
                {item.name}
                <span className="font-bold text-sm text-red-500">{countByStatus[Number(item.id)] ? ` (${countByStatus[Number(item.id)]})` : ""}</span>
              </Link>,
              `/status/${item.id}`,
              <Image src={IconProgress} width={20} height={20} alt="" />
            )
          ),
          getItem(
            <Link href={`/quote/maket-done`}>DS Đã chốt maket</Link>,
            `/quote/maket-done`,
            <Image src={IconProgress} width={20} height={20} alt="" />
          )
        ]
      ),
      getItem(
        "Kế toán Tính giá",
        "price",
        <Image src={IconCalculator} width={20} height={20} alt="" />,
        [
          getItem(
            <Link href="/price-list/pending" className="text-yellow-500!">DS bài tính chờ duyệt</Link>,
            "/price-list/pending",
            <Image src={IconPrice} width={20} height={20} alt="" />
          ),
          getItem(
            <Link href="/price-list">Danh sách tính giá</Link>,
            "/price-list",
            <Image src={IconListPrice} width={20} height={20} alt="" />
          ),
        ]
      ),
      getItem(
        "Quản lý sản xuất",
        "production",
        <Image src={IconListPrice} width={20} height={20} alt="" />,
        optionStatusProduction.filter(it => it.value !== "NOT_PRODUCTION").map((item) =>
          getItem(
            <Link href={`/quote/production/${item.value}`}>
              {item.label}
            </Link>,
            `/quote/production/${item.value}`,
            <Image src={IconProgress} width={20} height={20} alt="" />
          )
        )
      ),
      // getItem(
      //   "Sản xuất",
      //   "production",
      //   <Image src={IconListPrice} width={20} height={20} alt="" />,
      //   filterSX.map((item) =>
      //     getItem(
      //       <Link href={`/status/${item.id}`}>
      //         {item.name}
      //         <span className="font-bold text-sm text-red-500">{countByStatus[Number(item.id)] ? ` (${countByStatus[Number(item.id)]})` : ""}</span>
      //       </Link>,
      //       `/status/${item.id}`,
      //       <Image src={IconProgress} width={20} height={20} alt="" />
      //     )
      //   )
      // ),
      getItem(
        <Link href={`${CONFIG.CRM_URL}/customer?token=${accessToken}`}>Khách hàng</Link>,
        "/customer",
        <Image src={IconCustomer} width={20} height={20} alt="" />
      ),
      getItem(
        "Quản lý khuôn bế",
        "mold",
        <Image src={IconCustomer} width={20} height={20} alt="" />,
        [getItem(
          <Link href="/mold">Danh sách khuôn bế</Link>,
          "/mold",
          <Image src={IconListPrice} width={20} height={20} alt="" />
        ),
        ...optionPrintMold.map((item) =>
          getItem(
            <Link href={`/mold/typesx/${item.value}`}>
              {item.label}
            </Link>,
            `/mold/typesx/${item.value}`,
            <Image src={IconProgress} width={20} height={20} alt="" />
          ),
        )
        ]

      ),
      getItem(
        <Link href="/supplier">Quản lý NCC</Link>,
        "/supplier",
        <Image src={IconDebt} width={20} height={20} alt="" />,

      ),
      getItem(
        <Link href="/debt">Quản lý công nợ</Link>,
        "/debt",
        <Image src={IconDebt} width={20} height={20} alt="" />,
      ),
      getItem(
        <Link href="/file">Quản lý bản ghi</Link>,
        "/files",
        <Image src={IconDebt} width={20} height={20} alt="" />,
      ),
    ];
  }, [user_info, notApprove, countByStatus, accessToken]);
  // Lấy dữ liệu
  const getLists = useCallback(async (createdAt: Date | { $gte?: Date; $lte?: Date; } | null | string = null) => {
    try {
      const filterRole = hasPermission(Number(user_info?.role), "view_list_quote") ?
        {} :
        {
          createdBy: Number(user_info?.id)
        };
      const res = await fetch("/api/quotes", {
        method: "POST",
        body: JSON.stringify({
          action: "read",
          skip: 0,
          limit: 0,
          filters: {
            ...filterRole,
            // createdAt: {
            //   $gte: dayjs().startOf("D"),
            //   $lte: dayjs().endOf("D"),
            // },
            updatedAt: {
              $gte: dayjs().startOf("D"),
              $lte: dayjs().endOf("D"),
            },
          }, //lọc theo nhiều trường
        }),
      });
      const orders = await res.json();
      if (orders) {
        setQuotes(orders.data);
      } else {
      }
    } catch (error) {
      console.log('error', error);
    } finally { }
  }, [])

  // Lấy danh sách báo giá từ API
  useEffect(() => {
    getLists();
  }, [pathname, getLists]);

  useEffect(() => {
    const found = findItemByKey(items as ItemType[], pathname);
    if (found && setItemMenu) {
      setItemMenu(found);
    }
  }, [pathname, setItemMenu, items]);

   const onRangeChanges = (dates: [dayjs.Dayjs, dayjs.Dayjs] | null) => {
      if (dates) {
        setCreatedAt({ $gte: dates[0].toDate(), $lte: dates[1].toDate() });
        getLists({ $gte: dates[0].toDate(), $lte: dates[1].toDate() });
      }
    }
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
        defaultOpenKeys={["quote", "market", "price", "production"]} // mở mặc định menu cha
        className=""
      />
      <div className="absolute bottom-0 right-2">
        <DropdownBase
          classNameBtn="border border-gray-200 rounded-sm p-1 text-white"
          iconBtn={<Image src={'/icons/arrow-down-up.svg'} width={15} height={15} alt="filters" />}
          classNameContent="w-50! border-0!"
          redirect={["bottom-[103%]", "right-0"]}
        >
          <DateRangePicker
            onRangeChanges={onRangeChanges}
            className={`py-[6px]! px-3! font-normal! flex! gap-2 cusror-pointer rounded-full! border`}
          />
        </DropdownBase>
      </div>
    </ConfigProvider>
  );
}
