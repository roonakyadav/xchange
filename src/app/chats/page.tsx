'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/hooks/useUser'
import ChatList from '@/components/ChatList'
import BottomNav from '@/components/BottomNav'

export default function Chats() {
    const router = useRouter()
    const { user, loading } = useUser()

    useEffect(() => {
        if (!loading && !user) {
            router.push('/auth')
        }
    }, [loading, user, router])

    if (loading) return null
    if (!user) return null

    return (
        <div className="min-h-screen bg-black flex flex-col pb-16 md:pb-0">
            <div className="flex-1">
                <ChatList />
            </div>
            <BottomNav />
        </div>
    )
}
