"use client";

import { useState, useEffect } from "react";

type TabBaseProps = {
  keyTab?: string;
  label: string | React.ReactNode;
  component: React.ReactNode;
  destroyInactive?: boolean; // Nếu true: Hủy component khi không active (Render lại khi bấm vào)
  preload?: boolean; // Nếu true: Render ngay từ đầu (Tải trước)
};

interface TabsProps {
  tabs: TabBaseProps[];
  className?: string;
  activeTab?: number;
  activeTabKey?: string;
  onChange?: (tabIndex: number) => void;
  onChangeKey?: (keyTab: string) => void;
  classNameBtn?: string;
  defaultDestroyInactive?: boolean; // Mặc định cho tất cả các tab nếu không set riêng
}

export default function TabBase({
  tabs,
  className,
  activeTab,
  activeTabKey,
  onChange,
  onChangeKey,
  classNameBtn,
  defaultDestroyInactive = false,
}: TabsProps) {
  const [internalIndex, setInternalIndex] = useState(0);
  const [internalKey, setInternalKey] = useState<string | undefined>(undefined);

  // Ưu tiên active theo key, nếu không có thì dùng index
  const activeIndex =
    activeTabKey !== undefined
      ? tabs.findIndex((t) => t.keyTab === activeTabKey)
      : activeTab !== undefined
        ? activeTab - 1
        : internalKey
          ? tabs.findIndex((t) => t.keyTab === internalKey)
          : internalIndex;

  // State theo dõi các tab đã từng active (cho tính năng Lazy Load - Keep Alive)
  const [visitedIndices, setVisitedIndices] = useState<Set<number>>(() => {
    const initial = new Set<number>();
    if (activeIndex !== -1) initial.add(activeIndex); // Thêm tab hiện tại vào active luôn
    tabs.forEach((tab, index) => {
      if (tab.preload) initial.add(index);
    });
    return initial;
  });

  // Cập nhật danh sách đã visit khi activeIndex thay đổi
  useEffect(() => {
    if (activeIndex !== -1) {
      setVisitedIndices((prev) => {
        if (prev.has(activeIndex)) return prev;
        const next = new Set(prev);
        next.add(activeIndex);
        return next;
      });
    }
  }, [activeIndex]);

  const handleTab = (index: number) => {
    const selectedKey = tabs[index]?.keyTab;

    if (selectedKey) {
      onChangeKey?.(selectedKey);
      if (activeTabKey === undefined) setInternalKey(selectedKey);
    } else {
      onChange?.(index + 1);
      if (activeTab === undefined) setInternalIndex(index);
    }
  };

  return (
    <div className={`w-full ${className ?? ""}`}>
      <div className="flex px-1 border-0 border-b border-gray-200 relative">
        {tabs.map((tab, index) => {
          const isActive = index === activeIndex;
          return (
            <button
              type="button"
              key={tab.keyTab ?? index}
              className={`py-2 px-4 text-sm font-medium ${isActive
                ? `text-black bg-white border-0 border-b-2 border-green-600 focus:outline-none ${classNameBtn}`
                : "text-black focus:outline-none"
                }`}
              onClick={() => handleTab(index)}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="transition-all duration-300 ease-in-out">
        {tabs.map((tab, index) => {
          const isActive = index === activeIndex;

          // Xác định xem tab này có nên được render không
          // 1. Nếu đang active -> Luôn render
          // 2. Nếu không active:
          //    a. Nếu destroyInactive (riêng hoặc mặc định) -> Không render (null)
          //    b. Nếu không destroyInactive (Keep Alive) -> Render nếu đã từng visited (Lazy) hoặc preload

          const willDestroy = tab.destroyInactive ?? defaultDestroyInactive;
          const isVisited = visitedIndices.has(index);

          const shouldRender = isActive || (!willDestroy && isVisited);

          if (!shouldRender) return null;

          return (
            <div
              key={tab.keyTab ?? index}
              style={{ display: isActive ? "block" : "none" }}
            >
              {tab.component}
            </div>
          );
        })}
      </div>
    </div>
  );
}
