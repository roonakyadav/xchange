'use client'

import { useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useUser } from '@/hooks/useUser'
import ChatThread from '@/components/ChatThread'
import BottomNav from '@/components/BottomNav'

export default function Chat() {
    const router = useRouter()
    const params = useParams()
    const { user, loading } = useUser()

    useEffect(() => {
        if (!loading && !user) {
            router.push('/auth')
        }
    }, [loading, user, router])

    if (loading) return null
    if (!user) return null

    const chatId = params.id as string

    return (
        <div className="min-h-screen bg-black flex flex-col lg:pb-20">
            <div className="flex-1">
                <ChatThread chatId={chatId} />
            </div>
            <BottomNav />
        </div>
    )
}
