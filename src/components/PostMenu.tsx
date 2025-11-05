'use client'

import { useState, useRef, useEffect } from 'react'
import toast from 'react-hot-toast'
import { deletePostAndImage } from '@/lib/db'

interface PostMenuProps {
    postId: string
    imageUrl: string
    username: string
    currentUser?: string | null
    onPostDeleted?: () => void
}

export default function PostMenu({ postId, imageUrl, username, currentUser, onPostDeleted }: PostMenuProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [showReportModal, setShowReportModal] = useState(false)
    const [showDeleteModal, setShowDeleteModal] = useState(false)
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

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation()
        setIsOpen(false)
        setShowDeleteModal(true)
    }

    const confirmDelete = async () => {
        try {
            await deletePostAndImage(postId, imageUrl)
            toast.success('Post deleted')
            onPostDeleted?.()
        } catch (error) {
            console.error('Error deleting post:', error)
            toast.error('Failed to delete post')
        }
        setShowDeleteModal(false)
    }

    const handleShare = async (e: React.MouseEvent) => {
        e.stopPropagation()
        const url = `${window.location.origin}/post/${postId}`
        try {
            await navigator.clipboard.writeText(url)
            toast.success('Link copied')
        } catch (error) {
            console.error('Failed to copy link:', error)
            toast.error('Failed to copy link')
        }
        setIsOpen(false)
    }

    const handleReport = (e: React.MouseEvent) => {
        e.stopPropagation()
        setIsOpen(false)
        setShowReportModal(true)
    }

    const confirmReport = () => {
        const subject = 'Post Report for Review'
        const body = `Please review this reported post:\nPost URL: ${window.location.origin}/post/${postId}\nReported by: ${currentUser || 'Anonymous'}`
        const mailtoLink = `mailto:ronakyadav1609@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
        window.location.href = mailtoLink
        setShowReportModal(false)
    }

    const isOwner = currentUser === username

    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={(e) => {
                    e.stopPropagation()
                    setIsOpen(!isOpen)
                }}
                className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors"
                aria-label="Post options"
            >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="1"></circle>
                    <circle cx="12" cy="5" r="1"></circle>
                    <circle cx="12" cy="19" r="1"></circle>
                </svg>
            </button>

            {isOpen && (
                <div className="absolute top-12 right-2 bg-gray-900 border border-gray-700 rounded-lg shadow-lg z-10 min-w-[160px]">
                    <div className="py-1">
                        {isOwner && (
                            <button
                                onClick={handleDelete}
                                className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-gray-800 transition-colors"
                            >
                                Delete post
                            </button>
                        )}
                        <button
                            onClick={handleShare}
                            className="w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-800 transition-colors"
                        >
                            Share post
                        </button>
                        <button
                            onClick={handleReport}
                            className="w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-800 transition-colors"
                        >
                            Report post
                        </button>
                    </div>
                </div>
            )}

            {/* Report Confirmation Modal */}
            {showReportModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-md">
                        <h3 className="text-xl font-bold mb-4 text-center">Report Post</h3>
                        <p className="text-gray-400 mb-6 text-center">
                            Authority will review this post. Send report?
                        </p>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowReportModal(false)}
                                className="flex-1 px-4 py-3 border border-gray-600 rounded-2xl hover:bg-gray-800 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmReport}
                                className="flex-1 bg-red-500 hover:bg-red-600 text-white py-3 rounded-2xl font-medium transition-colors"
                            >
                                Send Report
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-md">
                        <h3 className="text-xl font-bold mb-4 text-center">Delete Post</h3>
                        <p className="text-gray-400 mb-6 text-center">
                            Are you sure you want to delete this post? This action cannot be undone.
                        </p>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowDeleteModal(false)}
                                className="flex-1 px-4 py-3 border border-gray-600 rounded-2xl hover:bg-gray-800 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-2xl font-medium transition-colors"
                            >
                                Delete Post
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
