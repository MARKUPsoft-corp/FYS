import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { BellRing, X } from 'lucide-react';
import { useAuthStore } from '@/stores/auth';
import { subscribeToPush } from '@/services/push';
import { isPageTourCompleted, TOUR_COMPLETED_EVENT } from '@/lib/client-tour-storage';

export function PushNotificationPrompt() {
  const { user } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    
    // Check if the browser supports push notifications
    if (!('serviceWorker' in navigator) || !('Notification' in window)) return;

    // Only show if the user hasn't made a choice yet and we haven't asked them recently
    if (Notification.permission !== 'default') return;
    if (localStorage.getItem('fys_push_prompt_ignored')) return;

    const checkAndShow = () => {
      const tourIsCompleted = isPageTourCompleted(user.uid, 'app');

      // Si c'est un client et qu'il n'a pas fini (ou sauté) le tour, on bloque la modale.
      // Elle se déclenchera UNIQUEMENT grâce à l'événement de fin du tour.
      if (user.role !== 'admin' && !tourIsCompleted) {
        return false;
      }

      // Dès que le tour est fini, ou si c'est l'admin (pas de tour), on peut afficher.
      if (user.role === 'admin' || tourIsCompleted) {
        setOpen(true);
        return true;
      }
      return false;
    };

    // If we can show it immediately, wait 1.5s then show
    if (checkAndShow()) {
      const timer = setTimeout(() => setOpen(true), 1500);
      return () => clearTimeout(timer);
    }

    // Otherwise, this is a new user who hasn't finished the onboarding tour. Wait for the event!
    const handleTourCompleted = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.pageId === 'app') {
        setTimeout(() => setOpen(true), 1000);
      }
    };
    
    window.addEventListener(TOUR_COMPLETED_EVENT, handleTourCompleted);
    return () => window.removeEventListener(TOUR_COMPLETED_EVENT, handleTourCompleted);
  }, [user]);

  const handleSubscribe = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const result = await subscribeToPush(user.uid);
      if (result === 'granted') {
        setOpen(false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      // Even if they denied, we mark it so we don't bother them again next time
      localStorage.setItem('fys_push_prompt_ignored', 'true');
      setOpen(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem('fys_push_prompt_ignored', 'true');
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) handleDismiss(); }}>
      <DialogContent className="sm:max-w-md bg-card/60 backdrop-blur-3xl border-white/20">
        <DialogHeader>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/20 mb-4">
            <BellRing className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center text-xl">Activer les notifications</DialogTitle>
          <DialogDescription className="text-center pt-2">
            Ne manquez aucune mise à jour de vos commandes ! Autorisez FYS à vous envoyer des notifications poussées.
          </DialogDescription>
        </DialogHeader>
        
        <DialogFooter className="flex-col sm:flex-row gap-2 mt-4">
          <Button variant="outline" onClick={handleDismiss} disabled={loading} className="w-full">
            Plus tard
          </Button>
          <Button onClick={handleSubscribe} disabled={loading} className="w-full">
            {loading ? 'Activation...' : 'Accepter'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
