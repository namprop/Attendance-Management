"use client";

import React, { useState } from "react";
import LayoutBase from "@/app/ui/layout/layout";
import MenuBase from "@/app/ui/menu/menu";
import { Layout } from "antd";
import Image from "next/image";
import { ItemType, MenuContext } from "@/app/ui/menu/menuContext";

const { Sider } = Layout;

export default function ComponentLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [collapsed, setCollapsed] = useState(false);
  const [itemMenu, setItemMenu] = useState<ItemType>({
    key: "1",
    label: "Báo giá chung",
    icon: <Image src={"/icons/prices/price.svg"} width={20} height={20} alt="" />,
  });

  return (
    <MenuContext.Provider
      value={{ itemMenu, setItemMenu, collapsed, setCollapsed }}
    >
      <LayoutBase>
        <main className="p-2 h-full">{children}</main>
      </LayoutBase>
    </MenuContext.Provider>
  );
}
