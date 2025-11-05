'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { MoreHorizontal, Trash2, UserX } from 'lucide-react'
import { deleteChat, blockUser } from '@/lib/db'
import { useUser } from '@/hooks/useUser'
import toast from 'react-hot-toast'

interface ChatMenuProps {
    chatId: string
    otherUser: string
}

export default function ChatMenu({ chatId, otherUser }: ChatMenuProps) {
    const router = useRouter()
    const { user } = useUser()
    const [isOpen, setIsOpen] = useState(false)
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [showBlockModal, setShowBlockModal] = useState(false)
    const [loading, setLoading] = useState(false)
    const menuRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handleDeleteChat = async () => {
        if (!user) return

        setLoading(true)
        try {
            await deleteChat(chatId)

            // Emit custom event to notify ChatList to update
            window.dispatchEvent(new CustomEvent('chat-deleted', { detail: { chatId } }))

            toast.success('Chat deleted')
            router.push('/chats')
        } catch (error) {
            console.error('Failed to delete chat:', error)
            toast.error('Failed to delete chat')
        } finally {
            setLoading(false)
            setShowDeleteModal(false)
            setIsOpen(false)
        }
    }

    const handleBlockUser = async () => {
        if (!user) return

        setLoading(true)
        try {
            await blockUser(user.username, otherUser)
            toast.success('User blocked')
            router.push('/chats')
        } catch (error) {
            console.error('Failed to block user:', error)
            toast.error('Failed to block user')
        } finally {
            setLoading(false)
            setShowBlockModal(false)
            setIsOpen(false)
        }
    }

    return (
        <>
            <div className="relative" ref={menuRef}>
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="p-2 text-gray-400 hover:text-white transition-colors"
                    aria-label="Chat options"
                >
                    <MoreHorizontal size={20} />
                </button>

                {isOpen && (
                    <div className="absolute top-12 right-0 bg-gray-900 border border-gray-700 rounded-lg shadow-lg z-10 min-w-[160px]">
                        <div className="py-1">
                            <button
                                onClick={() => {
                                    setIsOpen(false)
                                    setShowDeleteModal(true)
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-gray-800 transition-colors flex items-center space-x-2"
                            >
                                <Trash2 size={16} />
                                <span>Delete Chat</span>
                            </button>
                            <button
                                onClick={() => {
                                    setIsOpen(false)
                                    setShowBlockModal(true)
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-gray-800 transition-colors flex items-center space-x-2"
                            >
                                <UserX size={16} />
                                <span>Block User</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Delete Chat Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-md">
                        <h3 className="text-xl font-bold mb-4 text-center">Delete Chat</h3>
                        <p className="text-gray-400 mb-6 text-center">
                            Are you sure you want to delete this chat? This action cannot be undone.
                        </p>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowDeleteModal(false)}
                                className="flex-1 px-4 py-3 border border-gray-600 rounded-2xl hover:bg-gray-800 transition-colors"
                                disabled={loading}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteChat}
                                disabled={loading}
                                className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white py-3 rounded-2xl font-medium transition-colors"
                            >
                                {loading ? 'Deleting...' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Block User Modal */}
            {showBlockModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-md">
                        <h3 className="text-xl font-bold mb-4 text-center">Block User</h3>
                        <p className="text-gray-400 mb-6 text-center">
                            Block @{otherUser}? They won't be able to message you or see your posts.
                        </p>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowBlockModal(false)}
                                className="flex-1 px-4 py-3 border border-gray-600 rounded-2xl hover:bg-gray-800 transition-colors"
                                disabled={loading}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleBlockUser}
                                disabled={loading}
                                className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white py-3 rounded-2xl font-medium transition-colors"
                            >
                                {loading ? 'Blocking...' : 'Block'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
