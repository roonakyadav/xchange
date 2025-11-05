'use client'

import { Toaster } from 'react-hot-toast'

export default function ClientProviders({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <>
            {children}
            <Toaster
                position="top-center"
                toastOptions={{
                    style: {
                        background: '#000',
                        color: '#fff',
                        border: '1px solid #333',
                    },
                }}
            />
        </>
    )
}
