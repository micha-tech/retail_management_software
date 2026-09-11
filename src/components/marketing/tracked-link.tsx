"use client";
import Link from "next/link";
import type { ComponentProps } from "react";
import { trackMarketingEvent, type MarketingEvent } from "@/lib/marketing-analytics";

export function TrackedLink({ event, ...props }: ComponentProps<typeof Link> & { event: MarketingEvent }) {
  return <Link {...props} onClick={(e) => { trackMarketingEvent(event, { destination: String(props.href) }); props.onClick?.(e); }} />;
}
