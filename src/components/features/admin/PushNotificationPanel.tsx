import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Bell, BellOff, Send, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

const API_URL = '/api/send-notification';

export function AdminPushPanel() {
  const { t } = useTranslation();
  const [audience, setAudience] = useState<'all' | 'admins' | 'user'>('all');
  const [title, setTitle] = useState('FYS — Nouvelle info 🌿');
  const [body, setBody] = useState('');
  const [url, setUrl] = useState('/');
  const [targetUid, setTargetUid] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'ok' | 'error'>('idle');
  const [result, setResult] = useState<{ sent: number; failed: number; inAppSaved?: number; message?: string } | null>(null);

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
          audience,
          targetUid: audience === 'user' ? targetUid.trim() || undefined : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur lors de l\'envoi');
      setResult(data);
      setStatus('ok');
    } catch (err) {
      console.error(err);
      setStatus('error');
    }
  }

  return (
    <div className="bg-card border border-border/40 rounded-[2rem] p-5 md:p-6 space-y-4 shadow-sm h-full flex flex-col justify-between">
      <div>
        <div className="flex items-center gap-3.5 mb-4">
          <div className="size-12 rounded-[1.2rem] bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
            <Bell className="size-6 text-primary" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-foreground leading-snug">{t('pushNotifications.sendTitle')}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{t('pushNotifications.sendSubtitle')}</p>
          </div>
        </div>

      <div className="space-y-3.5">
        {/* Sélecteur de Destinataires (Audience) */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-foreground">{t('pushNotifications.audienceLabel', 'Destinataires')}</Label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setAudience('all')}
              className={cn(
                'px-2.5 py-2 rounded-xl text-xs font-semibold border transition-all text-center cursor-pointer',
                audience === 'all'
                  ? 'bg-primary text-white border-primary shadow-xs'
                  : 'bg-muted/40 border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/70'
              )}
            >
              {t('pushNotifications.audienceAll', 'Tous')}
            </button>
            <button
              type="button"
              onClick={() => setAudience('admins')}
              className={cn(
                'px-2.5 py-2 rounded-xl text-xs font-semibold border transition-all text-center cursor-pointer',
                audience === 'admins'
                  ? 'bg-primary text-white border-primary shadow-xs'
                  : 'bg-muted/40 border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/70'
              )}
            >
              {t('pushNotifications.audienceAdmins', 'Admins')}
            </button>
            <button
              type="button"
              onClick={() => setAudience('user')}
              className={cn(
                'px-2.5 py-2 rounded-xl text-xs font-semibold border transition-all text-center cursor-pointer',
                audience === 'user'
                  ? 'bg-primary text-white border-primary shadow-xs'
                  : 'bg-muted/40 border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/70'
              )}
            >
              {t('pushNotifications.audienceUser', 'Utilisateur')}
            </button>
          </div>
        </div>

        {/* Champ UID si utilisateur spécifique */}
        {audience === 'user' && (
          <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
            <Label className="text-xs font-semibold">{t('pushNotifications.uidLabel')}</Label>
            <Input
              value={targetUid}
              onChange={(e) => setTargetUid(e.target.value)}
              placeholder={t('pushNotifications.uidPlaceholder')}
              className="h-9 text-sm"
              required
            />
          </div>
        )}

        {/* Titre */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold">{t('pushNotifications.titleLabel')}</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('pushNotifications.titlePlaceholder')}
            className="h-9 text-sm"
          />
        </div>

        {/* Message */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold">{t('pushNotifications.messageLabel')}</Label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={t('pushNotifications.messagePlaceholder')}
            rows={3}
            className="w-full resize-none text-sm bg-muted/40 border border-border/60 rounded-xl px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        {/* URL destination */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold">{t('pushNotifications.urlLabel')}</Label>
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={t('pushNotifications.urlPlaceholder')}
            className="h-9 text-sm"
          />
        </div>
      </div>
    </div>

      <Button
        onClick={send}
        disabled={!body.trim() || (audience === 'user' && !targetUid.trim()) || status === 'sending'}
        className="w-full h-10 flex items-center gap-2 bg-primary hover:bg-primary/90 text-white font-semibold rounded-xl shadow-[0_4px_14px_rgba(63,109,78,0.25)] cursor-pointer"
      >
        {status === 'sending' ? (
          <><Loader2 className="size-4 animate-spin" /> {t('pushNotifications.sending')}</>
        ) : (
          <><Send className="size-4" /> {
            audience === 'user'
              ? t('pushNotifications.sendToUser')
              : audience === 'admins'
              ? t('pushNotifications.sendToAdmins')
              : t('pushNotifications.sendToAll')
          }</>
        )}
      </Button>

      {status === 'ok' && result && (
        <div className="flex flex-col gap-1.5 p-3 rounded-xl text-xs font-medium bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">
          <div className="flex items-center gap-2">
            <CheckCircle className="size-4 shrink-0 text-emerald-600" />
            <span className="font-bold">
              {result.sent} {t('pushNotifications.sent', { count: result.sent })}
              {result.failed > 0 && ` · ${result.failed} ${t('pushNotifications.failed', { count: result.failed })}`}
            </span>
          </div>
          {typeof result.inAppSaved === 'number' && (
            <span className="text-[11px] text-emerald-600/90 pl-6">
              ✓ {result.inAppSaved} {t('pushNotifications.inAppSaved', 'enregistrée(s) dans la barre/volet')}
            </span>
          )}
          {result.message && (
            <span className="text-[11px] text-muted-foreground pl-6 mt-0.5">
              ℹ {result.message}
            </span>
          )}
        </div>
      )}
      {status === 'error' && (
        <div className="flex items-center gap-2 p-3 rounded-xl text-xs font-medium bg-destructive/10 text-destructive border border-destructive/20">
          <AlertTriangle className="size-4 shrink-0" />
          {t('pushNotifications.errorTitle')}
        </div>
      )}
    </div>
  );
}

/**
 * Small button for user profile pages to opt in/out of push notifications.
 */
export function PushOptInButton({ uid }: { uid: string }) {
  const { t } = useTranslation();
  const [state, setState] = useState<'idle' | 'loading'>('idle');
  const [subscribed, setSubscribed] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');

  useEffect(() => {
    if (!('Notification' in window)) { setPermission('unsupported'); return; }
    setPermission(Notification.permission);
    if (Notification.permission === 'granted') {
      import('@/services/push').then(async (mod) => {
        const isSub = await mod.isPushSubscribed(uid);
        if (isSub) {
          setSubscribed(true);
        } else {
          // Auto-synchronisation : si la permission a été accordée à l'ouverture,
          // on enregistre le token automatiquement pour que l'utilisateur n'ait pas à recliquer manuellement !
          const res = await mod.subscribeToPush(uid);
          if (res === 'granted') {
            setSubscribed(true);
          }
        }
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
        ? t('pushNotifications.blocked')
        : subscribed
        ? t('pushNotifications.disable')
        : t('pushNotifications.enable')}
    </Button>
  );
}
