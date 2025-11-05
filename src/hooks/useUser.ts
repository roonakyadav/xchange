'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getUser } from '@/lib/db'
import type { User } from '@/types'

export function useUser() {
    const [user, setUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)
    const router = useRouter()

    useEffect(() => {
        const initializeUser = async () => {
            const username = localStorage.getItem('x_user')

            if (!username) {
                setLoading(false)
                return
            }

            try {
                // Verify user exists in database
                const userData = await getUser(username)
                if (!userData) {
                    // User doesn't exist, clear localStorage and redirect
                    localStorage.removeItem('x_user')
                    localStorage.removeItem('x_seen_welcome')
                    setLoading(false)
                    return
                }

                setUser(userData)
            } catch (error) {
                console.error('Error verifying user:', error)
                // On error, clear localStorage to be safe
                localStorage.removeItem('x_user')
                localStorage.removeItem('x_seen_welcome')
            } finally {
                setLoading(false)
            }
        }

        initializeUser()
    }, [])

    const login = (username: string) => {
        localStorage.setItem('x_user', username)
        // Note: We don't set user state here as the useEffect will handle verification
    }

    const logout = () => {
        localStorage.removeItem('x_user')
        localStorage.removeItem('x_seen_welcome')
        setUser(null)
        router.push('/auth')
    }

    return {
        user,
        loading,
        login,
        logout,
        isAuthenticated: !!user
    }
}
