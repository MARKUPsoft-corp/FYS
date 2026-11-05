import { useState, useEffect } from 'react';
import {
  Mail, Send, QrCode, CheckCircle2, AlertCircle, Loader2,
  Users, Smartphone, Laptop, Sparkles, ExternalLink, RefreshCw, Eye
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export function EmailCampaignPanel() {
  const [loadingStats, setLoadingStats] = useState(true);
  const [stats, setStats] = useState<{
    totalUsers: number;
    eligibleEmailCount: number;
    providerConfigured: boolean;
    activeProvider: string;
    previewHtml: string;
    sampleWaUrl: string;
    sampleQrCodeUrl: string;
  } | null>(null);

  const [testEmail, setTestEmail] = useState('');
  const [testStatus, setTestStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [testMsg, setTestMsg] = useState('');

  const [campaignStatus, setCampaignStatus] = useState<'idle' | 'confirm' | 'sending' | 'success' | 'error'>('idle');
  const [campaignResult, setCampaignResult] = useState<{ sentCount: number; failedCount: number } | null>(null);
  const [campaignError, setCampaignError] = useState('');

  const [showPreviewModal, setShowPreviewModal] = useState(false);

  async function fetchStats() {
    setLoadingStats(true);
    try {
      const res = await fetch('/api/send-email-campaign?action=preview');
      const data = await res.json();
      if (res.ok) {
        setStats(data);
      }
    } catch (e) {
      console.warn('Failed to load email campaign stats:', e);
    } finally {
      setLoadingStats(false);
    }
  }

  useEffect(() => {
    fetchStats();
  }, []);

  async function handleSendTest() {
    if (!testEmail || !testEmail.includes('@')) {
      setTestMsg('Veuillez entrer une adresse email valide');
      setTestStatus('error');
      return;
    }

    setTestStatus('sending');
    setTestMsg('');
    try {
      const res = await fetch('/api/send-email-campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_test',
          testEmail: testEmail.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erreur lors de l\'envoi du test');
      }
      setTestStatus('success');
      setTestMsg(data.message || `Email de test envoyé avec succès à ${testEmail}`);
    } catch (err: any) {
      setTestStatus('error');
      setTestMsg(err.message || 'Échec de l\'envoi');
    }
  }

  async function handleLaunchCampaign() {
    setCampaignStatus('sending');
    setCampaignError('');
    try {
      const res = await fetch('/api/send-email-campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_campaign',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erreur lors du lancement de la campagne');
      }
      setCampaignStatus('success');
      setCampaignResult({
        sentCount: data.sentCount || 0,
        failedCount: data.failedCount || 0,
      });
    } catch (err: any) {
      setCampaignStatus('error');
      setCampaignError(err.message || 'Échec de l\'envoi');
    }
  }

  return (
    <div className="bg-card border border-border/40 rounded-[2.5rem] p-6 md:p-8 space-y-6 shadow-sm overflow-hidden relative">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="size-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0 text-emerald-600 dark:text-emerald-400">
            <Mail className="size-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display font-bold text-xl text-foreground">
                Campagne Email · Drainage WhatsApp
              </h3>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-primary/10 text-primary border border-primary/20">
                <Sparkles className="size-3" />
                NutriFYS
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              Invitez vos clients web vers NutriFYS sur WhatsApp avec un message pré-rempli et un QR Code.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowPreviewModal(true)}
            className="rounded-full border-border/60 hover:bg-muted font-semibold text-xs gap-1.5"
          >
            <Eye className="size-3.5" />
            Aperçu de l'email
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={fetchStats}
            disabled={loadingStats}
            className="rounded-full size-8"
            title="Rafraîchir les statistiques"
          >
            <RefreshCw className={cn("size-3.5", loadingStats && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* Cartes d'indicateurs (Stats) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-muted/30 border border-border/40 rounded-2xl p-4 flex items-center gap-3">
          <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <Users className="size-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Clients Éligibles</p>
            <p className="text-xl font-bold text-foreground">
              {loadingStats ? '—' : `${stats?.eligibleEmailCount ?? 0} adresses`}
            </p>
          </div>
        </div>

        <div className="bg-muted/30 border border-border/40 rounded-2xl p-4 flex items-center gap-3">
          <div className="size-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
            <Smartphone className="size-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Passerelle</p>
            <p className="text-sm font-bold text-foreground">Bouton WhatsApp + QR Code</p>
          </div>
        </div>

        <div className="bg-muted/30 border border-border/40 rounded-2xl p-4 flex items-center gap-3">
          <div className={cn(
            "size-10 rounded-xl flex items-center justify-center shrink-0",
            stats?.providerConfigured
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
          )}>
            {stats?.providerConfigured ? <CheckCircle2 className="size-5" /> : <AlertCircle className="size-5" />}
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Fournisseur Email</p>
            <p className="text-sm font-bold text-foreground">
              {stats?.activeProvider === 'resend' ? 'Resend API (3 000/mois gratuit)' : (stats?.activeProvider === 'smtp' ? 'SMTP / Gmail' : 'Prêt (Clé Resend)')}
            </p>
          </div>
        </div>
      </div>

      {/* Zone Actions & Formulaires */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
        {/* Colonne 1 : Test d'envoi individuel */}
        <div className="bg-muted/20 border border-border/40 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Send className="size-4 text-primary" />
            <h4 className="font-bold text-sm text-foreground">1. Envoyer un email de test d'abord</h4>
          </div>
          <p className="text-xs text-muted-foreground">
            Recevez l'email exactement comme vos clients pour vérifier la mise en page, le QR Code et le bouton WhatsApp.
          </p>

          <div className="space-y-2">
            <Label className="text-xs font-semibold text-foreground">Votre adresse email de test</Label>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="votre-email@gmail.com"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                className="h-10 text-xs rounded-xl bg-background"
              />
              <Button
                type="button"
                size="sm"
                onClick={handleSendTest}
                disabled={testStatus === 'sending'}
                className="rounded-xl px-4 font-bold text-xs shrink-0"
              >
                {testStatus === 'sending' ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin mr-1.5" />
                    Envoi...
                  </>
                ) : (
                  <>
                    <Send className="size-3.5 mr-1.5" />
                    Tester
                  </>
                )}
              </Button>
            </div>
            {testMsg && (
              <p className={cn(
                "text-xs font-medium pt-1",
                testStatus === 'success' ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500"
              )}>
                {testMsg}
              </p>
            )}
          </div>
        </div>

        {/* Colonne 2 : Envoi collectif à tous les clients */}
        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Users className="size-4 text-emerald-600 dark:text-emerald-400" />
              <h4 className="font-bold text-sm text-foreground">2. Lancer la campagne collective</h4>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Envoie l'invitation personnalisée avec QR Code aux <strong>{stats?.eligibleEmailCount ?? 92} clients</strong> enregistrés dans votre base de données.
            </p>
          </div>

          <div className="pt-2">
            {campaignStatus === 'idle' && (
              <Button
                type="button"
                onClick={() => setCampaignStatus('confirm')}
                className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition-all gap-2"
              >
                <Mail className="size-4" />
                Lancer la campagne aux {stats?.eligibleEmailCount ?? 92} clients
              </Button>
            )}

            {campaignStatus === 'confirm' && (
              <div className="bg-background border border-amber-500/40 rounded-xl p-3 space-y-2.5">
                <p className="text-xs font-semibold text-foreground">
                  ⚠️ Confirmer l'envoi de la campagne aux {stats?.eligibleEmailCount ?? 92} clients ?
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleLaunchCampaign}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg"
                  >
                    Oui, envoyer maintenant
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setCampaignStatus('idle')}
                    className="flex-1 font-semibold text-xs rounded-lg"
                  >
                    Annuler
                  </Button>
                </div>
              </div>
            )}

            {campaignStatus === 'sending' && (
              <div className="flex items-center justify-center gap-2.5 py-3 text-sm font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 rounded-xl">
                <Loader2 className="size-4 animate-spin" />
                Envoi des emails en cours... Veuillez patienter.
              </div>
            )}

            {campaignStatus === 'success' && campaignResult && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 space-y-1">
                <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="size-4" />
                  Campagne envoyée avec succès !
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {campaignResult.sentCount} emails livrés ({campaignResult.failedCount} échecs).
                </p>
              </div>
            )}

            {campaignStatus === 'error' && (
              <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 space-y-1">
                <p className="text-xs font-bold text-rose-600 flex items-center gap-1.5">
                  <AlertCircle className="size-4" />
                  Erreur lors de l'envoi
                </p>
                <p className="text-[11px] text-muted-foreground">{campaignError}</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCampaignStatus('idle')}
                  className="mt-2 h-7 text-xs font-semibold"
                >
                  Réessayer
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal d'Aperçu Haute Définition */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-background border border-border rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in-0 zoom-in-95">
            <div className="p-4 md:p-5 border-b border-border flex items-center justify-between bg-muted/30">
              <div className="flex items-center gap-2">
                <QrCode className="size-5 text-primary" />
                <h4 className="font-bold text-base text-foreground">Aperçu du modèle d'email FYS</h4>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowPreviewModal(false)}
                className="rounded-full text-xs font-bold"
              >
                Fermer ✕
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-[#F4F6F4]">
              {stats?.previewHtml ? (
                <div
                  className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden"
                  dangerouslySetInnerHTML={{ __html: stats.previewHtml }}
                />
              ) : (
                <div className="flex items-center justify-center py-16 text-muted-foreground">
                  <Loader2 className="size-6 animate-spin mr-2" />
                  Chargement de l'aperçu...
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
