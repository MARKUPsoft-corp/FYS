import React, { useEffect, useState } from 'react';
import { Outlet, LayoutComponent, useNavigate, useLocation } from 'rasengan';
import { useAuthStore } from '@/stores/auth';
import { useProfileStore, isProfileComplete } from '@/stores/profile';
import { UserRole } from '@/entities/user';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { OnboardingModal } from '@/components/features/onboarding/OnboardingModal';

const AppLayout: LayoutComponent = () => {
  const { user, loading } = useAuthStore();
  const { profile, loading: profileLoading, fetch: fetchProfile, save: saveProfile } = useProfileStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [modalDismissed, setModalDismissed] = useState(false);

  const isAuthRoute = location.pathname.startsWith('/auth');
  const isCustomer = user?.role === UserRole.CUSTOMER;

  useEffect(() => {
    console.log({loading, user, isAuthRoute})
    if (!loading && !user && !isAuthRoute) {
      navigate('/auth/login', { replace: true });
    }
  }, [user, loading, isAuthRoute]);

  useEffect(() => {
    if (user && isCustomer) {
      fetchProfile(user.uid);
    }
  }, [user?.uid]);

  const showOnboarding =
    !isAuthRoute && isCustomer && !profileLoading && !isProfileComplete(profile) && !modalDismissed;

  async function handleOnboardingComplete(data: {
    healthConditions: string[];
    allergies: string[];
    goals: string[];
  }) {
    if (!user) return;
    await saveProfile(user.uid, data);
    setModalDismissed(true);
  }

  if (loading) {
    return (
      <div className="min-h-dvh bg-background flex flex-col md:flex-row">
        {/* Mobile topbar skeleton */}
        <div className="md:hidden h-16 border-b border-border/40 flex items-center justify-between px-6 shrink-0">
          <div className="size-8 rounded-xl bg-muted animate-pulse" />
          <div className="w-24 h-6 rounded-full bg-muted animate-pulse" />
          <div className="size-8 rounded-full bg-muted animate-pulse" />
        </div>
        
        {/* Sidebar skeleton */}
        <div className="hidden w-[116px] md:flex flex-col items-center border-r border-border/40 py-8 gap-8 shrink-0">
          <div className="size-12 rounded-full bg-muted animate-pulse" />
          <div className="flex flex-col gap-4 mt-8">
            {[1, 2, 3, 4].map(i => <div key={i} className="size-12 rounded-2xl bg-muted/60 animate-pulse" />)}
          </div>
        </div>
        
        {/* Content skeleton */}
        <div className="flex-1 flex flex-col pt-6 md:pt-14 px-6 md:px-12 overflow-hidden">
          <div className="flex justify-between items-center mb-8 shrink-0">
            <div className="w-48 h-8 rounded-full bg-muted animate-pulse" />
            <div className="size-10 rounded-full bg-muted hidden md:block animate-pulse" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-[220px] rounded-[1.75rem] border border-border/60 bg-muted/30 animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (isAuthRoute) {
    return (
      <React.Fragment>
        <Outlet />
      </React.Fragment>
    );
  }

  return (
    <DashboardShell>
      <Outlet />
      <OnboardingModal
        open={showOnboarding}
        onSkip={() => setModalDismissed(true)}
        onComplete={handleOnboardingComplete}
      />
    </DashboardShell>
  );
};

export default AppLayout;
