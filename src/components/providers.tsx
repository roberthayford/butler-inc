"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/context/AuthContext";
import { useState, useEffect } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  // #region agent log
  useEffect(() => { fetch('http://127.0.0.1:7450/ingest/48482303-bc64-49d0-befd-540c5d92fed5',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'2d54f4'},body:JSON.stringify({sessionId:'2d54f4',location:'providers.tsx:useEffect',message:'Providers mounted post-fix',data:{htmlClass:document.documentElement.className,htmlStyle:document.documentElement.getAttribute('style'),hasDarkClass:document.documentElement.classList.contains('dark'),classCount:document.documentElement.classList.length},timestamp:Date.now(),runId:'run3',hypothesisId:'H-E'})}).catch(()=>{}); }, []);
  // #endregion

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="dark" forcedTheme="dark" enableColorScheme={false} enableSystem={false}>
        <AuthProvider>
          <TooltipProvider>
            {children}
            <Toaster />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
