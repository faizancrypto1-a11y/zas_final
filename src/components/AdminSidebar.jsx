'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  Layers, 
  ShoppingCart, 
  Users, 
  Ticket, 
  Image as ImageIcon, 
  MessageSquare, 
  FileText, 
  Settings as SettingsIcon, 
  BarChart2, 
  LogOut,
  ChevronLeft
} from 'lucide-react';
import { useStore } from 'src/context/StoreContext';

const AdminSidebar = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { logoutUser } = useStore();

  const menuItems = [
    { name: 'Dashboard', path: '/admin', icon: LayoutDashboard },
    { name: 'Products', path: '/admin/products', icon: ShoppingBag },
    { name: 'Categories', path: '/admin/categories', icon: Layers },
    { name: 'Orders', path: '/admin/orders', icon: ShoppingCart },
    { name: 'Customers', path: '/admin/customers', icon: Users },
    { name: 'Coupons', path: '/admin/coupons', icon: Ticket },
    { name: 'Banners', path: '/admin/banners', icon: ImageIcon },
    { name: 'Reviews', path: '/admin/reviews', icon: MessageSquare },
    { name: 'Pages / Policies', path: '/admin/pages', icon: FileText },
    { name: 'Store Settings', path: '/admin/settings', icon: SettingsIcon },
    { name: 'Reports', path: '/admin/reports', icon: BarChart2 }
  ];

  const handleLogout = async () => {
    await logoutUser();
    router.push('/admin/login');
  };

  return (
    <aside className="admin-sidebar">
      {/* Sidebar header */}
      <div className="admin-sidebar-header">
        <Link href="/admin" className="admin-logo">
          ZAS<span>ADMIN</span>
        </Link>
        <Link href="/" style={{ color: 'var(--text-light-muted)' }} title="Go to website">
          <ChevronLeft size={16} />
        </Link>
      </div>

      {/* Menu items list */}
      <ul className="admin-menu-list">
        {menuItems.map((item) => {
          const Icon = item.icon;
          // Exact path check for Dashboard, start check for others
          const isActive = item.path === '/admin' 
            ? pathname === '/admin' 
            : pathname.startsWith(item.path);

          return (
            <li 
              key={item.name} 
              className={`admin-menu-item ${isActive ? 'active' : ''}`}
            >
              <Link href={item.path}>
                <Icon />
                <span>{item.name}</span>
              </Link>
            </li>
          );
        })}
      </ul>

      {/* Sidebar footer logout button */}
      <div className="admin-sidebar-footer">
        <button 
          type="button" 
          onClick={handleLogout} 
          className="admin-logout-btn"
        >
          <LogOut size={18} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};

export default AdminSidebar;
