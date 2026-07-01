"use client";

import Image from "next/image";
import { useState, useRef, useEffect } from "react";
import IconBell from '@public/icons/notification.svg';

export default function NotificationDropdown() {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const notifications = [
    {
      id: 1,
      type: "income",
      category: { name: "Phương Chi", _id: "001" },
      bank: { name: "Báo giá 20x20x10", _id: "001" },
      time: "2 phút trước",
    },
    {
      id: 2,
      type: "expense",
      category: { name: "Phương Chi", _id: "002" },
      bank: { name: "Báo giá 10x10x10", _id: "002" },
      time: "5 phút trước",
    },
    {
      id: 3,
      type: "expense",
      category: { name: "Thu Hương", _id: "003" },
      bank: { name: "báo giá 60x50x40", _id: "003" },
      time: "10 phút trước",
    },
    {
      id: 4,
      type: "expense",
      category: { name: "Thu Hương", _id: "004" },
      bank: { name: "báo giá 60x50x40", _id: "004" },
      time: "15 phút trước",
    },
    {
      id: 5,
      type: "income",
      category: { name: "Hạnh Lead", _id: "005" },
      bank: { name: "báo giá 50x20x10", _id: "005" },
      time: "30 phút trước",
    },
    {
      id: 6,
      type: "income",
      category: { name: "Giang Còi", _id: "006" },
      bank: { name: "Báo giá hộp nắp đối 40x30x30", _id: "006" },
      time: "1 giờ trước",
    },
    {
      id: 7,
      type: "income",
      category: { name: "Quang Pro", _id: "007" },
      bank: { name: "Báo giá 94x94x94", _id: "007" },
      time: "2 giờ trước",
    }
  ];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside); // 👈 dùng "mousedown" phản hồi sớm hơn "click"

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="relative md:inline-flex" ref={dropdownRef}>
      {/* Nút Thông báo */}
      <button
        onClick={() => setOpen(!open)}
        className="relative flex ms-2 me-2 items-center justify-center cursor-pointer"
      >
        <Image src={IconBell} width={20} height={20} alt="Thông báo" className="flex-none" />
        {notifications.length > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
            {notifications.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-7 w-80 bg-white rounded-sm shadow-lg overflow-hidden z-10">
          <div className="flex flex-row items-center p-3 font-semibold uppercase text-[18px] text-gray-700 bg-orange-100">
            <svg
              fill="#ca3500"
              width="20px"
              height="20px"
              viewBox="0 0 512 512"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M256,480a80.09,80.09,0,0,0,73.3-48H182.7A80.09,80.09,0,0,0,256,480Z" />
              <path d="M400,288V227.47C400,157,372.64,95.61,304,80l-8-48H216l-8,48c-68.88,15.61-96,76.76-96,147.47V288L64,352v48H448V352Z" />
            </svg>
            <span className={"ms-2 uppercase text-orange-700"}>Thông báo</span>
          </div>

          <div
            className="overflow-y-auto custom-scrollbar divide-gray-100 divide-y"
            style={{ maxHeight: "66vh" }}
          >
            {notifications.map((item) => (
              <div
                key={item.id}
                className="flex justify-between items-center px-4 py-3 hover:bg-gray-50 cursor-pointer"
              >
                <div className="text-right text-xs text-gray-500">
                  <div className={"flex flex-row items-center font-bold"}>
                    {item.bank["name"]}
                  </div>
                  <div className={"flex w-full flex-row items-center"}>
                    {item.time}
                  </div>
                </div>

                <div className="flex flex-row flex-wrap justify-end">
                  <div className="w-full flex flex-row flex-wraptext-gray-700 font-medium justify-end">
                    <span className={"line-clamp-1 text-gray-500 text-[14px]"}>
                      {item.category["name"]}
                    </span>
                  </div>
                </div>
              </div>
            ))}

            {notifications.length === 0 && (
              <div className="p-4 text-center text-gray-500">
                Chưa có thông báo...
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
