'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { isUserBlocked } from '@/lib/db'
import { useUser } from '@/hooks/useUser'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

interface ChatMenuProps {
    chatId: string
    otherUser: string
}

export default function ChatMenu({ chatId, otherUser }: ChatMenuProps) {
    const router = useRouter()
    const { user } = useUser()
    const [isBlocked, setIsBlocked] = useState(false)
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        const fetchBlock = async () => {
            if (!user) return
            const blocked = await isUserBlocked(user.username, otherUser)
            setIsBlocked(blocked)
        }
        fetchBlock()
    }, [user?.username, otherUser])

    const handleBlockToggle = async () => {
        if (!user) return

        setLoading(true)
        try {
            if (isBlocked) {
                await supabase.from('blocked_users')
                    .delete()
                    .eq('blocker_id', user.username)
                    .eq('blocked_id', otherUser)
                toast.success('User unblocked')
            } else {
                await supabase.from('blocked_users')
                    .insert([{ blocker_id: user.username, blocked_id: otherUser }])
                toast.success('User blocked')
            }
            setIsBlocked(!isBlocked)
            router.push('/chats')
        } catch (error) {
            console.error('Failed to toggle block status:', error)
            toast.error(`Failed to ${isBlocked ? 'unblock' : 'block'} user`)
        } finally {
            setLoading(false)
        }
    }

    return (
        <button
            onClick={handleBlockToggle}
            className={`text-sm font-semibold rounded-full px-4 py-2 ${isBlocked ? "bg-gray-600 text-white" : "bg-red-500 text-white"
                }`}
            disabled={loading}
        >
            {loading ? "..." : isBlocked ? "Unblock User" : "Block User"}
        </button>
    )
}
