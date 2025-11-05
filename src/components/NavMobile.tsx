'use client'

import Link from 'next/link'

export default function NavMobile() {
    return (
        <div className="md:hidden sticky top-0 z-40 flex items-center justify-center h-12 bg-black/80 backdrop-blur border-b border-white/10">
            <Link
                href="/feed"
                className="text-white text-lg font-bold tracking-wide hover:text-red-500 transition-colors"
                aria-label="Feed"
            >
                Xchange
            </Link>
        </div>
    )
}
