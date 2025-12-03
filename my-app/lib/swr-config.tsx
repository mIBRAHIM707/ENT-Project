"use client";

import { SWRConfig } from "swr";
import { ReactNode } from "react";

// Default fetcher for SWR
export const fetcher = async <T,>(url: string): Promise<T> => {
  const res = await fetch(url);
  if (!res.ok) {
    const error = new Error("An error occurred while fetching the data.");
    throw error;
  }
  return res.json();
};

interface SWRProviderProps {
  children: ReactNode;
}

export function SWRProvider({ children }: SWRProviderProps) {
  return (
    <SWRConfig
      value={{
        fetcher,
        // Revalidate data on focus (when user comes back to the tab)
        revalidateOnFocus: true,
        // Revalidate on reconnect (when internet comes back)
        revalidateOnReconnect: true,
        // Don't retry on error automatically (avoids spam)
        shouldRetryOnError: false,
        // Dedupe requests within 2 seconds
        dedupingInterval: 2000,
        // Keep previous data while revalidating
        keepPreviousData: true,
        // Error retry count
        errorRetryCount: 2,
      }}
    >
      {children}
    </SWRConfig>
  );
}
