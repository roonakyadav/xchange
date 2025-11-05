"use client";
import ClientProvider from "@/components/client-providers";
import DesktopNav from "@/components/DesktopNav";

export default function ClientRoot({ children }: { children: React.ReactNode }) {
    return (
        <ClientProvider>
            <DesktopNav />
            {children}
        </ClientProvider>
    );
}
