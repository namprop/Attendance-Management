"use client";

import React, { useState, useEffect } from "react";
import { ButtonBase } from "@/app/ui/base/button";

interface FileLinksSectionProps {
  defaultLinks?: string[];
  onChange?: (links: string[]) => void;
}

export default function FileLinksSection({
  defaultLinks = [""],
  onChange,
}: FileLinksSectionProps) {
  const [links, setLinks] = useState(defaultLinks);

  useEffect(() => {
    if (Array.isArray(defaultLinks)) {
      setLinks(defaultLinks);
    }
  }, [defaultLinks]);

  const handleChange = (index: number, value: string) => {
    const newLinks = [...links];
    newLinks[index] = value;
    setLinks(newLinks);
    onChange?.(newLinks);
  };

  const handleAddRow = () => {
    const newLinks = [...links, ""];
    setLinks(newLinks);
    onChange?.(newLinks);
  };

  const handleRemoveRow = (index: number) => {
    const newLinks = links.filter((_, idx) => idx !== index);
    const finalLinks = newLinks.length ? newLinks : [""];
    setLinks(finalLinks);
    onChange?.(finalLinks);
  };

  return (
    <div className="mt-4">
      <div className="flex flex-col gap-2">
        {links.map((link, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Link"
              value={link}
              onChange={(e) => handleChange(idx, e.target.value)}
              className="flex-1 border border-gray-300 rounded px-2 py-1"
            />
            <ButtonBase
              onClick={() => handleRemoveRow(idx)}
              className="!px-2 !py-1 text-white bg-red-400 hover:bg-red-500 rounded"
            >
              X
            </ButtonBase>
          </div>
        ))}

        <div className="flex justify-end mt-2">
          <ButtonBase
            onClick={handleAddRow}
            className="!px-3 !py-1 text-white bg-green-500 hover:bg-green-600 rounded"
          >
            +
          </ButtonBase>
        </div>
      </div>
    </div>
  );
}
