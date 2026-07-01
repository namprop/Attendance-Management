"use client";

import { useMemo } from "react";
import DOMPurify from "dompurify";

interface SafeHTMLProps {
  html: string;
  fallback?: string;
}

export function SafeHTML({ html, fallback = "Chưa có" }: SafeHTMLProps) {
  const hasRealContent = useMemo(() => {
    if (!html) return false;

    const div = document.createElement("div");
    div.innerHTML = html;
    const text = div.textContent?.replace(/\u00a0/g, " ").trim();
    return !!text;
  }, [html]);

  const clean = useMemo(() => DOMPurify.sanitize(html), [html]);

  return <div dangerouslySetInnerHTML={{ __html: hasRealContent ? clean : fallback }} />;
}
