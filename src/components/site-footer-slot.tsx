"use client";

import { usePathname } from "next/navigation";
import SiteFooter from "./site-footer";

export default function SiteFooterSlot() {
  if (usePathname() === "/create") return null;
  return <SiteFooter />;
}