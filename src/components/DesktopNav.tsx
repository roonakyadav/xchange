'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function DesktopNav() {
    const pathname = usePathname()

    const navItems = [
        { href: '/feed', label: 'Feed' },
        { href: '/post/new', label: 'New Post' },
        { href: '/chats', label: 'Chats' },
        { href: '/profile', label: 'Profile' },
    ]

    return (
        <nav className="hidden md:flex fixed top-0 left-0 right-0 bg-black/80 backdrop-blur-sm border-b border-gray-800 z-50">
            <div className="max-w-6xl mx-auto px-4">
                <div className="flex items-center justify-between h-16">
                    <Link href="/feed" className="text-2xl font-bold text-white">
                        Xchange
                    </Link>

                    <div className="flex items-center space-x-8">
                        {navItems.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${pathname === item.href
                                        ? 'text-red-500 bg-red-500/10'
                                        : 'text-gray-300 hover:text-white hover:bg-gray-800'
                                    }`}
                            >
                                {item.label}
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
        </nav>
    )
}
