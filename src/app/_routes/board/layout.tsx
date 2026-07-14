import React, { useEffect, useState } from 'react';
import { Outlet, LayoutComponent, useNavigate, useLocation } from 'rasengan';
import { Loader2 } from 'lucide-react';
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
    if (!loading && !user && !isAuthRoute) {
      navigate('/auth/login');
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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-primary" />
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
