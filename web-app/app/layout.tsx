// app/layout.tsx
// TIDAK ADA PERUBAHAN — file ini dipertahankan persis seperti aslinya.
// Layout admin sekarang dihandle oleh AdminLayout di setiap page.

import React from "react"
import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'
import { AuthProvider } from "@/contexts/AuthContext"
import { DialogProvider } from "@/contexts/DialogContext"

const geistSans = Geist({ subsets: ["latin"], variable: "--font-geist-sans" })
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" })

export const metadata: Metadata = {
  title: 'Review Prosedur - Quality Management System',
  description: 'Platform manajemen review prosedur dan dokumentasi quality management system yang komprehensif',
  applicationName: 'Review Prosedur QMS',
  keywords: ['quality management', 'prosedur', 'dokumentasi', 'review', 'yazaki'],
  generator: 'v0.app',
  icons: {
    icon: [
      { url: '/review-prosedur/icon.svg', type: 'image/svg+xml' },
      { url: '/review-prosedur/icon.png', type: 'image/png', sizes: '64x64' },
      { url: '/review-prosedur/icon-light-32x32.png', sizes: '32x32', media: '(prefers-color-scheme: light)' },
      { url: '/review-prosedur/icon-dark-32x32.png',  sizes: '32x32', media: '(prefers-color-scheme: dark)'  },
      { url: '/review-prosedur/favicon.ico' },
    ],
    shortcut: '/review-prosedur/favicon.ico',
    apple: [
      { url: '/review-prosedur/apple-icon.png', sizes: '180x180' },
    ],
  },
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <head>
        <link
          rel="icon"
          type="image/svg+xml"
          href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64' width='64' height='64'%3E%3Cdefs%3E%3ClinearGradient id='docGrad' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0%25' stop-color='%232563EB'/%3E%3Cstop offset='50%25' stop-color='%231D4ED8'/%3E%3Cstop offset='100%25' stop-color='%231E40AF'/%3E%3C/linearGradient%3E%3ClinearGradient id='foldGrad' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0%25' stop-color='%2393C5FD'/%3E%3Cstop offset='100%25' stop-color='%233B82F6'/%3E%3C/linearGradient%3E%3ClinearGradient id='checkBadge' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0%25' stop-color='%2334D399'/%3E%3Cstop offset='50%25' stop-color='%2310B981'/%3E%3Cstop offset='100%25' stop-color='%23059669'/%3E%3C/linearGradient%3E%3C/defs%3E%3Cpath d='M14 6 C10.686 6 8 8.686 8 12 L8 52 C8 55.314 10.686 58 14 58 L50 58 C53.314 58 56 55.314 56 52 L56 22 L40 6 Z' fill='url(%23docGrad)'/%3E%3Cpath d='M40 6 L40 18 C40 20.2 41.8 22 44 22 L56 22 Z' fill='url(%23foldGrad)'/%3E%3Crect x='16' y='18' width='16' height='3' rx='1.5' fill='%23FFFFFF' opacity='0.9'/%3E%3Crect x='16' y='26' width='24' height='3' rx='1.5' fill='%23FFFFFF' opacity='0.8'/%3E%3Crect x='16' y='34' width='18' height='3' rx='1.5' fill='%23FFFFFF' opacity='0.8'/%3E%3Ccircle cx='44' cy='44' r='14' fill='url(%23checkBadge)' stroke='%23FFFFFF' stroke-width='2.8'/%3E%3Cpath d='M37.5 44 L42 48.5 L50.5 39.5' fill='none' stroke='%23FFFFFF' stroke-width='3.2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E"
        />
        <link rel="icon" type="image/svg+xml" href="/review-prosedur/icon.svg" />
        <link rel="icon" type="image/png" sizes="64x64" href="/review-prosedur/icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/review-prosedur/icon-light-32x32.png" />
        <link rel="shortcut icon" href="/review-prosedur/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/review-prosedur/apple-icon.png" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <AuthProvider>
          <DialogProvider>
            {children}
          </DialogProvider>
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  );
}