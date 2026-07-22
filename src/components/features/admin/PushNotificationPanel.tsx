import { useState, useEffect } from 'react';
import { Bell, BellOff, Send, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

const API_URL = '/api/send-notification';

export function AdminPushPanel() {
  const [title, setTitle] = useState('FYS — Nouvelle info 🌿');
  const [body, setBody] = useState('');
  const [url, setUrl] = useState('/');
  const [targetUid, setTargetUid] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'ok' | 'error'>('idle');
  const [result, setResult] = useState<{ sent: number; failed: number } | null>(null);

  const secret = import.meta.env.VITE_NOTIFY_SECRET as string;

  async function send() {
    if (!body.trim()) return;
    setStatus('sending');
    setResult(null);
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secret,
          title: title.trim(),
          body: body.trim(),
          url: url.trim() || '/',
          targetUid: targetUid.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data);
      setStatus('ok');
    } catch (err) {
      console.error(err);
      setStatus('error');
    }
  }

  return (
    <div className="bg-card border border-border/60 rounded-2xl p-5 space-y-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="size-9 rounded-xl bg-primary/10 flex items-center justify-center">
          <Bell className="size-4 text-primary" />
        </div>
        <div>
          <h3 className="font-display font-bold text-base text-foreground">Envoyer une notification</h3>
          <p className="text-[11px] text-muted-foreground">Push système — reçu même si l'app est fermée</p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold">Titre</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Titre de la notification"
            className="h-9 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold">Message *</Label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Votre cocktail est prêt à être récupéré !"
            rows={3}
            className="w-full resize-none text-sm bg-muted/40 border border-border/60 rounded-xl px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">URL destination</Label>
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="/"
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">UID ciblé (opt.)</Label>
            <Input
              value={targetUid}
              onChange={(e) => setTargetUid(e.target.value)}
              placeholder="Vide = tous les abonnés"
              className="h-9 text-sm"
            />
          </div>
        </div>
      </div>

      <Button
        onClick={send}
        disabled={!body.trim() || status === 'sending'}
        className="w-full h-10 flex items-center gap-2 bg-primary hover:bg-primary/90 text-white font-semibold rounded-xl shadow-[0_4px_14px_rgba(63,109,78,0.25)]"
      >
        {status === 'sending' ? (
          <><Loader2 className="size-4 animate-spin" /> Envoi en cours…</>
        ) : (
          <><Send className="size-4" /> {targetUid ? 'Envoyer à cet utilisateur' : 'Envoyer à tous'}</>
        )}
      </Button>

      {status === 'ok' && result && (
        <div className="flex items-center gap-2 p-3 rounded-xl text-sm font-medium bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">
          <CheckCircle className="size-4 shrink-0" />
          {result.sent} notification{result.sent !== 1 ? 's' : ''} envoyée{result.sent !== 1 ? 's' : ''}
          {result.failed > 0 && ` · ${result.failed} échouée${result.failed > 1 ? 's' : ''}`}
        </div>
      )}
      {status === 'error' && (
        <div className="flex items-center gap-2 p-3 rounded-xl text-sm font-medium bg-destructive/10 text-destructive border border-destructive/20">
          <AlertTriangle className="size-4 shrink-0" />
          Échec de l'envoi. Vérifiez VITE_NOTIFY_SECRET et que l'API Vercel est déployée.
        </div>
      )}
    </div>
  );
}

/**
 * Small button for user profile pages to opt in/out of push notifications.
 */
export function PushOptInButton({ uid }: { uid: string }) {
  const [state, setState] = useState<'idle' | 'loading'>('idle');
  const [subscribed, setSubscribed] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');

  useEffect(() => {
    if (!('Notification' in window)) { setPermission('unsupported'); return; }
    setPermission(Notification.permission);
    if (Notification.permission === 'granted') {
      import('@/services/push').then((mod) => {
        mod.isPushSubscribed(uid).then(setSubscribed);
      });
    }
  }, [uid]);

  async function toggle() {
    setState('loading');
    const { subscribeToPush, unsubscribeFromPush } = await import('@/services/push');
    if (subscribed) {
      await unsubscribeFromPush(uid);
      setSubscribed(false);
      setPermission('default');
    } else {
      const res = await subscribeToPush(uid);
      if (res === 'granted') { setSubscribed(true); setPermission('granted'); }
      if (res === 'denied') setPermission('denied');
    }
    setState('idle');
  }

  if (permission === 'unsupported') return null;

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggle}
      disabled={state === 'loading' || permission === 'denied'}
      className={cn(
        'gap-2 rounded-xl font-semibold text-xs border-border/60',
        subscribed && 'border-primary/30 text-primary',
        permission === 'denied' && 'opacity-50 cursor-not-allowed',
      )}
    >
      {state === 'loading' ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : subscribed ? (
        <BellOff className="size-3.5" />
      ) : (
        <Bell className="size-3.5" />
      )}
      {permission === 'denied'
        ? 'Notifications bloquées (à activer manuellement)'
        : subscribed
        ? 'Désactiver les notifications'
        : 'Activer les notifications push'}
    </Button>
  );
}
