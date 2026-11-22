"use client";

import { createContext, useContext } from "react";
import type { Platform } from "../mock-platform";

// Stands in for the gateway at /api/{service}/v1. Each component takes only its own service's
// client from here, the way each packages/ui-<service> will call only its own API (MVP1-E0-07 AC6).
const PlatformContext = createContext<Platform | null>(null);

export const PlatformProvider = PlatformContext.Provider;

export function useService<K extends keyof Platform>(service: K): Platform[K] {
  const platform = useContext(PlatformContext);
  if (!platform) throw new Error("Service components need a PlatformProvider.");
  return platform[service];
}

/** A plain-language message for a failed request; never a stack trace. */
export function messageFor(error: unknown): string {
  if (error && typeof error === "object" && "problem" in error) {
    const p = (error as { problem: { detail: string; code: string } }).problem;
    if (p.code === "dependency_unavailable") return "Something went wrong. Try again in a moment.";
    return p.detail;
  }
  return "Something went wrong. Try again in a moment.";
}
