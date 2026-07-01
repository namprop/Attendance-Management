"use client";

import React from "react";
import { ConfigProvider, Layout } from "antd";
import HeaderBase from "../header/header";
// import { Footer } from "antd/es/layout/layout";
// import { APP_VERSION } from "@/version";

export default function LayoutBase({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  return (
    <ConfigProvider
      theme={{
        components: {
          Layout: {
            triggerColor: "#FFFFFF",
            siderBg: "#FFFFFF",
            triggerBg: "#1677ff",
          },
        },
      }}
    >
      <HeaderBase />
      <Layout style={{ minHeight: "100vh" }} className="relative">
        {children}
        {/* <Footer
          style={{
            position: "relative",
            bottom: 0,
            width: "100%",
            textAlign: "center",
            padding: "10px",
          }}
        >
          Hupuna Price v{APP_VERSION} ©{new Date().getFullYear()} Created by Hupuna Group
        </Footer> */}
      </Layout>
    </ConfigProvider>
  );
}
