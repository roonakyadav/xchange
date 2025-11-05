"use client";
import NavDesktop from './NavDesktop';
import NavMobile from './NavMobile';

export default function AppClient({ children }: { children: React.ReactNode }) {
    return (
        <>
            <NavMobile />
            <NavDesktop />
            {children}
        </>
    );
}
