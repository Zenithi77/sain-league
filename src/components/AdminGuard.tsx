'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface AdminGuardProps {
  children: React.ReactNode;
}

export default function AdminGuard({ children }: AdminGuardProps) {
  const { user, userData, loading } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !loading) {
      if (!user) {
        router.push('/login');
      } else if (userData && userData.role !== 'admin') {
        router.push('/');
      }
    }
  }, [user, userData, loading, router, mounted]);

  // Always show loading during SSR and initial mount
  if (!mounted || loading) {
    return (
      <div className="admin-loading">
        <div className="loading-spinner"></div>
        <p>Ачаалж байна...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="admin-access-denied">
        <div className="access-denied-card">
          <i className="fas fa-lock"></i>
          <h2>Нэвтрэх шаардлагатай</h2>
          <p>Админ хуудас руу орохын тулд нэвтрэнэ үү</p>
          <a href="/login" className="btn-primary">Нэвтрэх</a>
        </div>
      </div>
    );
  }

  if (userData && userData.role !== 'admin') {
    return (
      <div className="admin-access-denied">
        <div className="access-denied-card">
          <i className="fas fa-ban"></i>
          <h2>Хандах эрхгүй</h2>
          <p>Танд админ эрх байхгүй байна</p>
          <a href="/" className="btn-primary">Нүүр хуудас руу буцах</a>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
