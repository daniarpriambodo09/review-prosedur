// components/layout/AdminLayout.tsx
'use client';
import { createContext, useContext, useState } from 'react';
import { AdminSidebar } from './AdminSidebar';
import { AdminHeader } from './AdminHeader';

// ── Context untuk berbagi state collapsed antara Layout ↔ Sidebar ────────────
// Ini solusi paling clean: tidak perlu prop drilling, tidak perlu global store.
interface SidebarContextValue {
  collapsed: boolean;
  setCollapsed: (v: boolean | ((prev: boolean) => boolean)) => void;
}

export const SidebarContext = createContext<SidebarContextValue>({
  collapsed:    false,
  setCollapsed: () => {},
});

export function useSidebar() {
  return useContext(SidebarContext);
}

// ── AdminLayout ───────────────────────────────────────────────────────────────
interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  // State collapsed diangkat ke sini agar AdminLayout bisa bereaksi
  const [collapsed, setCollapsed] = useState(false);

  // Lebar sidebar dalam pixel — digunakan untuk padding-left content area
  // transition-all pada content area memastikan animasi smooth sinkron dengan sidebar
  const contentPaddingLeft = collapsed ? 'md:pl-[72px]' : 'md:pl-[260px]';

  return (
    <SidebarContext.Provider value={{ collapsed, setCollapsed }}>
      <div className="min-h-screen bg-slate-50">
        {/* Sidebar — desktop fixed, menerima collapsed dari context */}
        <AdminSidebar />

        {/* Main content — padding-left berubah reaktif saat sidebar collapse/expand.
            transition-all + duration-300 memastikan pergeseran smooth selaras
            dengan animasi sidebar (juga 300ms). */}
        <div className={`${contentPaddingLeft} transition-all duration-300 ease-in-out flex flex-col min-h-screen`}>
          <AdminHeader />
          <main className="flex-1 p-4 md:p-6 lg:p-8">
            {children}
          </main>
        </div>
      </div>
    </SidebarContext.Provider>
  );
}