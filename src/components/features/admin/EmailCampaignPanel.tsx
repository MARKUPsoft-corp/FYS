import { useState, useEffect, useRef } from 'react';
import {
  Mail, Send, QrCode, CheckCircle2, AlertCircle, Loader2,
  Users, Smartphone, Sparkles, RefreshCw, Eye, Paperclip,
  Trash2, UploadCloud, FileText, File, Plus, HelpCircle, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

function getApiUrl(path: string) {
  if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    return `https://www.fys-app.com${path}`;
  }
  return path;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} Mo`;
}

interface AttachedFile {
  filename: string;
  content: string; // base64
  contentType: string;
  size: number;
}

export function EmailCampaignPanel() {
  const [activeTab, setActiveTab] = useState<'whatsapp' | 'custom'>('whatsapp');

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

  // ── État Onglet 1 : Campagne WhatsApp (Drainage) ──────────────────────────
  const [testEmail, setTestEmail] = useState('');
  const [testStatus, setTestStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [testMsg, setTestMsg] = useState('');

  const [campaignStatus, setCampaignStatus] = useState<'idle' | 'confirm' | 'sending' | 'success' | 'error'>('idle');
  const [campaignResult, setCampaignResult] = useState<{ sentCount: number; failedCount: number } | null>(null);
  const [campaignError, setCampaignError] = useState('');
  const [campaignProgress, setCampaignProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });

  const [showPreviewModal, setShowPreviewModal] = useState(false);

  // ── État Onglet 2 : Message Personnalisé & Pièces Jointes ──────────────────
  const [customSubject, setCustomSubject] = useState('Des nouvelles fraîches de votre atelier FYS');
  const [customHeadline, setCustomHeadline] = useState('Votre bien-être au quotidien avec FYS');
  const [customMessage, setCustomMessage] = useState(
    'Bonjour {{name}},\n\nToute l\'équipe FYS — For YourSelf espère que vous passez une excellente journée !\n\nNous vous écrivons pour vous partager nos dernières créations, nos conseils vitalité et nos offres exclusives de la semaine.\n\nPrenez soin de vous naturellement avec nos jus et cocktails fraîchement pressés.'
  );
  const [ctaText, setCtaText] = useState('Découvrir le FYS Lab');
  const [ctaUrl, setCtaUrl] = useState('https://www.fys-app.com/lab');

  const [attachments, setAttachments] = useState<AttachedFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [customTestEmail, setCustomTestEmail] = useState('');
  const [customTestStatus, setCustomTestStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [customTestMsg, setCustomTestMsg] = useState('');

  const [customCampaignStatus, setCustomCampaignStatus] = useState<'idle' | 'confirm' | 'sending' | 'success' | 'error'>('idle');
  const [customCampaignResult, setCustomCampaignResult] = useState<{ sentCount: number; failedCount: number } | null>(null);
  const [customCampaignError, setCustomCampaignError] = useState('');
  const [customCampaignProgress, setCustomCampaignProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });

  const [showCustomPreviewModal, setShowCustomPreviewModal] = useState(false);
  const [customPreviewHtml, setCustomPreviewHtml] = useState<string>('');
  const [loadingCustomPreview, setLoadingCustomPreview] = useState(false);

  // ── Chargement des statistiques globales ──────────────────────────────────
  async function fetchStats() {
    setLoadingStats(true);
    try {
      const res = await fetch(getApiUrl('/api/send-email-campaign?action=preview'));
      const text = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(text);
      } catch (parseErr) {
        throw new Error(`Réponse non-JSON (${res.status}): ${text.slice(0, 80)}`);
      }
      if (res.ok) {
        setStats(data);
      } else {
        console.warn('API error:', data.error);
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

  // ── Actions Onglet 1 : WhatsApp ───────────────────────────────────────────
  async function handleSendTest() {
    if (!testEmail || !testEmail.includes('@')) {
      setTestMsg('Veuillez entrer une adresse email valide');
      setTestStatus('error');
      return;
    }

    setTestStatus('sending');
    setTestMsg('');
    try {
      const res = await fetch(getApiUrl('/api/send-email-campaign'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_test',
          testEmail: testEmail.trim(),
        }),
      });
      const text = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(text);
      } catch (parseErr) {
        throw new Error(`Erreur serveur (${res.status}): ${text.slice(0, 80)}`);
      }
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
    const totalCount = stats?.eligibleEmailCount ?? 92;
    setCampaignProgress({ current: 0, total: totalCount });

    let currentOffset: number | null = 0;
    const batchSize = 8;
    let totalSent = 0;
    let totalFailed = 0;
    let hasMore = true;

    try {
      while (hasMore && currentOffset !== null) {
        const res = await fetch(getApiUrl('/api/send-email-campaign'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'send_campaign',
            offset: currentOffset,
            limit: batchSize,
          }),
        });
        const text = await res.text();
        let data: any = {};
        try {
          data = JSON.parse(text);
        } catch (parseErr) {
          throw new Error(`Erreur serveur (${res.status}): ${text.slice(0, 80)}`);
        }
        if (!res.ok) {
          throw new Error(data.error || 'Erreur lors de la campagne');
        }

        totalSent += data.sentCount || 0;
        totalFailed += data.failedCount || 0;
        hasMore = Boolean(data.hasMore);
        currentOffset = data.nextOffset;

        setCampaignProgress({
          current: Math.min(currentOffset ?? (data.totalRecipients || totalCount), data.totalRecipients || totalCount),
          total: data.totalRecipients || totalCount,
        });
      }

      setCampaignStatus('success');
      setCampaignResult({
        sentCount: totalSent,
        failedCount: totalFailed,
      });
    } catch (err: any) {
      setCampaignStatus('error');
      setCampaignError(err.message || 'Échec de l\'envoi');
    }
  }

  // ── Actions Onglet 2 : Gestion des fichiers et envoi personnalisé ──────────
  function handleFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      // Limite par fichier : 3.5 Mo
      if (file.size > 3.5 * 1024 * 1024) {
        alert(`Le fichier "${file.name}" dépasse 3.5 Mo et risque d'être bloqué par le serveur.`);
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64Index = result.indexOf(';base64,');
        const base64Content = base64Index !== -1 ? result.substring(base64Index + 8) : result;

        setAttachments((prev) => [
          ...prev,
          {
            filename: file.name,
            content: base64Content,
            contentType: file.type || 'application/octet-stream',
            size: file.size,
          },
        ]);
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  function handleRemoveAttachment(index: number) {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  }

  const totalAttachmentsSize = attachments.reduce((acc, curr) => acc + curr.size, 0);
  const isAttachmentsTooLarge = totalAttachmentsSize > 3.5 * 1024 * 1024;

  async function handleOpenCustomPreview() {
    setLoadingCustomPreview(true);
    setShowCustomPreviewModal(true);
    try {
      const res = await fetch(getApiUrl('/api/send-email-campaign'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'preview_custom',
          customHeadline,
          customMessage,
          ctaText,
          ctaUrl,
          attachments: attachments.map((a) => ({ filename: a.filename })),
        }),
      });
      const data = await res.json();
      if (res.ok && data.previewHtml) {
        setCustomPreviewHtml(data.previewHtml);
      }
    } catch (e) {
      console.warn('Failed to load custom preview:', e);
    } finally {
      setLoadingCustomPreview(false);
    }
  }

  async function handleSendCustomTest() {
    if (!customTestEmail || !customTestEmail.includes('@')) {
      setCustomTestMsg('Veuillez entrer une adresse email valide pour le test');
      setCustomTestStatus('error');
      return;
    }
    if (!customMessage.trim()) {
      setCustomTestMsg('Le message ne peut pas être vide');
      setCustomTestStatus('error');
      return;
    }

    setCustomTestStatus('sending');
    setCustomTestMsg('');
    try {
      const res = await fetch(getApiUrl('/api/send-email-campaign'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_custom_test',
          testEmail: customTestEmail.trim(),
          customSubject,
          customHeadline,
          customMessage,
          ctaText,
          ctaUrl,
          attachments,
        }),
      });
      const text = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(text);
      } catch (parseErr) {
        throw new Error(`Erreur serveur (${res.status}): ${text.slice(0, 80)}`);
      }
      if (!res.ok) {
        throw new Error(data.error || 'Erreur lors de l\'envoi du test personnalisé');
      }
      setCustomTestStatus('success');
      setCustomTestMsg(data.message || `Test personnalisé envoyé avec succès à ${customTestEmail}`);
    } catch (err: any) {
      setCustomTestStatus('error');
      setCustomTestMsg(err.message || 'Échec de l\'envoi du test');
    }
  }

  async function handleLaunchCustomCampaign() {
    if (!customMessage.trim()) {
      setCustomCampaignError('Le message ne peut pas être vide');
      setCustomCampaignStatus('error');
      return;
    }

    setCustomCampaignStatus('sending');
    setCustomCampaignError('');
    const totalCount = stats?.eligibleEmailCount ?? 92;
    setCustomCampaignProgress({ current: 0, total: totalCount });

    let currentOffset: number | null = 0;
    const batchSize = 8;
    let totalSent = 0;
    let totalFailed = 0;
    let hasMore = true;

    try {
      while (hasMore && currentOffset !== null) {
        const res = await fetch(getApiUrl('/api/send-email-campaign'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'send_custom_campaign',
            customSubject,
            customHeadline,
            customMessage,
            ctaText,
            ctaUrl,
            attachments,
            offset: currentOffset,
            limit: batchSize,
          }),
        });
        const text = await res.text();
        let data: any = {};
        try {
          data = JSON.parse(text);
        } catch (parseErr) {
          throw new Error(`Erreur serveur (${res.status}): ${text.slice(0, 80)}`);
        }
        if (!res.ok) {
          throw new Error(data.error || 'Erreur lors de la diffusion personnalisée');
        }

        totalSent += data.sentCount || 0;
        totalFailed += data.failedCount || 0;
        hasMore = Boolean(data.hasMore);
        currentOffset = data.nextOffset;

        setCustomCampaignProgress({
          current: Math.min(currentOffset ?? (data.totalRecipients || totalCount), data.totalRecipients || totalCount),
          total: data.totalRecipients || totalCount,
        });
      }

      setCustomCampaignStatus('success');
      setCustomCampaignResult({
        sentCount: totalSent,
        failedCount: totalFailed,
      });
    } catch (err: any) {
      setCustomCampaignStatus('error');
      setCustomCampaignError(err.message || 'Échec de l\'envoi');
    }
  }

  return (
    <div className="bg-card border border-border/40 rounded-[2.5rem] p-6 md:p-8 space-y-6 shadow-sm overflow-hidden relative">
      {/* ── En-tête Principal & Sélecteur d'Onglets ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="size-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0 text-emerald-600 dark:text-emerald-400">
            <Mail className="size-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display font-bold text-xl text-foreground">
                Centre de Messagerie &amp; Campagnes Email
              </h3>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-primary/10 text-primary border border-primary/20">
                <Sparkles className="size-3" />
                FYS · For YourSelf
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              Gérez vos communications collectives, drainage vers WhatsApp et diffusions d'annonces personnalisées avec pièces jointes.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
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

      {/* ── Navigation par Onglets ── */}
      <div className="flex flex-wrap gap-2 border-b border-border/40 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('whatsapp')}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer",
            activeTab === 'whatsapp'
              ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          )}
        >
          <Smartphone className="size-4" />
          <span>Campagne WhatsApp (Drainage)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('custom')}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer",
            activeTab === 'custom'
              ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          )}
        >
          <Paperclip className="size-4" />
          <span>Message Personnalisé &amp; Pièces Jointes</span>
          {attachments.length > 0 && (
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-white text-emerald-800 font-extrabold">
              {attachments.length}
            </span>
          )}
        </button>
      </div>

      {/* ── Cartes d'indicateurs globales ── */}
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
            {activeTab === 'whatsapp' ? <Smartphone className="size-5" /> : <Paperclip className="size-5" />}
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Mode Actif</p>
            <p className="text-sm font-bold text-foreground">
              {activeTab === 'whatsapp' ? 'Bouton 650 437 427 + QR Code' : 'Diffusion Libre avec Fichiers'}
            </p>
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
              {stats?.activeProvider === 'resend' ? 'Resend API (3 000/mois gratuit)' : (stats?.activeProvider === 'smtp' ? 'SMTP / Gmail' : 'Configuré')}
            </p>
          </div>
        </div>
      </div>

      {/* ── Bannière Conseils Délivrabilité & Anti-Spam ── */}
      <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-3.5 flex items-start gap-3">
        <Sparkles className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
        <div className="text-xs text-muted-foreground leading-relaxed">
          <strong className="text-foreground">Optimisation Anti-Spam activée :</strong> En-têtes conformes Google &amp; Yahoo (désinscription en 1 clic), version texte alternatif RFC 2046 et QR Code embarqué en interne (CID). Les envois collectifs sont désormais automatiquement espacés de 1 seconde par client pour éviter le classement en indésirables.
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ── ONGLET 1 : CAMPAGNE WHATSAPP (DRAINAGE) ─────────────────────────── */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'whatsapp' && (
        <div className="space-y-6 animate-in fade-in-50 duration-200">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Modèle optimisé invitant chaque client vers le WhatsApp officiel NutriFYS (<strong>650 437 427</strong>) avec logo FYS centré et QR Code dynamique.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowPreviewModal(true)}
              className="rounded-full border-border/60 hover:bg-muted font-semibold text-xs gap-1.5 shrink-0"
            >
              <Eye className="size-3.5" />
              Aperçu du modèle
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                  Envoie l'invitation personnalisée avec QR Code aux <strong>{stats?.eligibleEmailCount ?? 0} clients</strong> enregistrés dans votre base de données.
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
                    Lancer la campagne aux {stats?.eligibleEmailCount ?? 0} clients
                  </Button>
                )}

                {campaignStatus === 'confirm' && (
                  <div className="bg-background border border-amber-500/40 rounded-xl p-3 space-y-2.5">
                    <p className="text-xs font-semibold text-foreground">
                      ⚠️ Confirmer l'envoi de la campagne aux {stats?.eligibleEmailCount ?? 0} clients ?
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
                  <div className="space-y-2 py-3 px-4 text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 rounded-xl">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="flex items-center gap-2">
                        <Loader2 className="size-4 animate-spin" />
                        Envoi progressif anti-spam...
                      </span>
                      <span>
                        {campaignProgress.current} / {campaignProgress.total} ({campaignProgress.total > 0 ? Math.round((campaignProgress.current / campaignProgress.total) * 100) : 0}%)
                      </span>
                    </div>
                    <div className="w-full bg-emerald-200/50 dark:bg-emerald-950/50 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-emerald-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${campaignProgress.total > 0 ? Math.round((campaignProgress.current / campaignProgress.total) * 100) : 5}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground text-center">
                      Chaque email est espacé de 1 sec pour garantir la délivrabilité et éviter les filtres spam.
                    </p>
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
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ── ONGLET 2 : MESSAGE PERSONNALISÉ & PIÈCES JOINTES ────────────────── */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'custom' && (
        <div className="space-y-6 animate-in fade-in-50 duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              Rédigez un message personnalisé aux couleurs de FYS · For YourSelf, joignez vos fichiers (catalogues PDF, menus, photos) et diffusez-le en un clic.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleOpenCustomPreview}
              className="rounded-full border-border/60 hover:bg-muted font-semibold text-xs gap-1.5 shrink-0 self-start sm:self-auto"
            >
              <Eye className="size-3.5" />
              Aperçu en direct
            </Button>
          </div>

          {/* Formulaire de Composition */}
          <div className="bg-muted/20 border border-border/40 rounded-2xl p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Objet du mail */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">
                  Objet de l'email <span className="text-rose-500">*</span>
                </Label>
                <Input
                  type="text"
                  placeholder="Ex: 🌿 Vos offres bien-être et carte de la semaine"
                  value={customSubject}
                  onChange={(e) => setCustomSubject(e.target.value)}
                  className="h-10 text-xs rounded-xl bg-background"
                />
              </div>

              {/* Titre d'en-tête */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">
                  Titre en grand dans l'en-tête (Optionnel)
                </Label>
                <Input
                  type="text"
                  placeholder="Ex: Votre bien-être au quotidien avec FYS"
                  value={customHeadline}
                  onChange={(e) => setCustomHeadline(e.target.value)}
                  className="h-10 text-xs rounded-xl bg-background"
                />
              </div>
            </div>

            {/* Corps du message */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-foreground">
                  Corps du message <span className="text-rose-500">*</span>
                </Label>
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span>Variables dynamiques :</span>
                  <button
                    type="button"
                    onClick={() => setCustomMessage((prev) => prev + ' {{name}}')}
                    className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-mono text-[10px] hover:bg-emerald-500/20 transition-colors"
                    title="Insérer le prénom du destinataire"
                  >
                    {"{{name}}"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomMessage((prev) => prev + ' {{email}}')}
                    className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-mono text-[10px] hover:bg-emerald-500/20 transition-colors"
                    title="Insérer l'email du destinataire"
                  >
                    {"{{email}}"}
                  </button>
                </div>
              </div>
              <textarea
                rows={6}
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder="Rédigez ici votre message... Utilisez les sauts de ligne pour créer des paragraphes."
                className="w-full text-xs p-3 rounded-xl border border-input bg-background text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 leading-relaxed font-sans"
              />
              <p className="text-[11px] text-muted-foreground">
                Astuce : Les sauts de ligne formeront des paragraphes nets et propres dans le template email.
              </p>
            </div>

            {/* Bouton d'action CTA optionnel */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">
                  Bouton d'action : Libellé (Optionnel)
                </Label>
                <Input
                  type="text"
                  placeholder="Ex: Découvrir la nouvelle carte"
                  value={ctaText}
                  onChange={(e) => setCtaText(e.target.value)}
                  className="h-10 text-xs rounded-xl bg-background"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">
                  Bouton d'action : Lien URL de redirection
                </Label>
                <Input
                  type="text"
                  placeholder="https://www.fys-app.com/lab"
                  value={ctaUrl}
                  onChange={(e) => setCtaUrl(e.target.value)}
                  className="h-10 text-xs rounded-xl bg-background"
                />
              </div>
            </div>

            {/* ── Section Pièces Jointes ── */}
            <div className="border-t border-border/30 pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Paperclip className="size-4 text-emerald-600 dark:text-emerald-400" />
                  <Label className="text-xs font-bold text-foreground">
                    Pièces Jointes &amp; Documents
                  </Label>
                  <span className="text-[11px] text-muted-foreground">
                    ({attachments.length} fichier{attachments.length > 1 ? 's' : ''} · total {formatFileSize(totalAttachmentsSize)})
                  </span>
                </div>

                <input
                  type="file"
                  multiple
                  ref={fileInputRef}
                  onChange={handleFilesSelected}
                  className="hidden"
                  accept=".pdf,image/*,.doc,.docx,.xls,.xlsx"
                />

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-xl border-dashed border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10 text-xs font-semibold gap-1.5 h-8"
                >
                  <UploadCloud className="size-3.5" />
                  Ajouter des fichiers
                </Button>
              </div>

              {isAttachmentsTooLarge && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-2.5 text-xs text-amber-700 dark:text-amber-300 flex items-center gap-2">
                  <AlertCircle className="size-4 shrink-0" />
                  <span>
                    Attention : Le poids total ({formatFileSize(totalAttachmentsSize)}) dépasse 3.5 Mo. Certains serveurs emails ou Vercel peuvent limiter l'envoi.
                  </span>
                </div>
              )}

              {attachments.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1">
                  {attachments.map((att, idx) => (
                    <div
                      key={idx}
                      className="bg-background border border-border/60 rounded-xl p-2.5 flex items-center justify-between gap-2 shadow-xs"
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        <div className="size-7 rounded-lg bg-emerald-500/15 flex items-center justify-center shrink-0 text-emerald-600">
                          {att.contentType.includes('image') ? (
                            <File className="size-4" />
                          ) : (
                            <FileText className="size-4" />
                          )}
                        </div>
                        <div className="overflow-hidden">
                          <p className="text-xs font-medium text-foreground truncate" title={att.filename}>
                            {att.filename}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {formatFileSize(att.size)}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveAttachment(idx)}
                        className="text-muted-foreground hover:text-rose-500 p-1 rounded-md transition-colors shrink-0"
                        title="Supprimer la pièce jointe"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic bg-muted/30 rounded-xl p-3 text-center">
                  Aucune pièce jointe ajoutée. Cliquez sur « Ajouter des fichiers » pour joindre un PDF, une image ou une brochure.
                </p>
              )}
            </div>
          </div>

          {/* Actions : Test individuel et Diffusion collective */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Test Individuel */}
            <div className="bg-muted/20 border border-border/40 rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Send className="size-4 text-primary" />
                <h4 className="font-bold text-sm text-foreground">1. Tester ce message personnalisé</h4>
              </div>
              <p className="text-xs text-muted-foreground">
                Envoyez-vous un exemplaire de ce message avec les pièces jointes attachées pour valider avant la diffusion.
              </p>

              <div className="space-y-2">
                <Label className="text-xs font-semibold text-foreground">Adresse email de test</Label>
                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="votre-email@gmail.com"
                    value={customTestEmail}
                    onChange={(e) => setCustomTestEmail(e.target.value)}
                    className="h-10 text-xs rounded-xl bg-background"
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleSendCustomTest}
                    disabled={customTestStatus === 'sending'}
                    className="rounded-xl px-4 font-bold text-xs shrink-0"
                  >
                    {customTestStatus === 'sending' ? (
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
                {customTestMsg && (
                  <p className={cn(
                    "text-xs font-medium pt-1",
                    customTestStatus === 'success' ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500"
                  )}>
                    {customTestMsg}
                  </p>
                )}
              </div>
            </div>

            {/* Diffusion Collective */}
            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-5 space-y-4 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Users className="size-4 text-emerald-600 dark:text-emerald-400" />
                  <h4 className="font-bold text-sm text-foreground">2. Diffuser à tous les clients</h4>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Envoie ce message personnalisé et ses <strong>{attachments.length} pièce(s) jointe(s)</strong> aux <strong>{stats?.eligibleEmailCount ?? 0} clients</strong> enregistrés.
                </p>
              </div>

              <div className="pt-2">
                {customCampaignStatus === 'idle' && (
                  <Button
                    type="button"
                    onClick={() => setCustomCampaignStatus('confirm')}
                    className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition-all gap-2"
                  >
                    <Mail className="size-4" />
                    Diffuser aux {stats?.eligibleEmailCount ?? 0} clients
                  </Button>
                )}

                {customCampaignStatus === 'confirm' && (
                  <div className="bg-background border border-amber-500/40 rounded-xl p-3 space-y-2.5">
                    <p className="text-xs font-semibold text-foreground">
                      ⚠️ Confirmer l'envoi de ce message personnalisé aux {stats?.eligibleEmailCount ?? 0} clients ?
                    </p>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleLaunchCustomCampaign}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg"
                      >
                        Oui, diffuser maintenant
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setCustomCampaignStatus('idle')}
                        className="flex-1 font-semibold text-xs rounded-lg"
                      >
                        Annuler
                      </Button>
                    </div>
                  </div>
                )}

                {customCampaignStatus === 'sending' && (
                  <div className="space-y-2 py-3 px-4 text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 rounded-xl">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="flex items-center gap-2">
                        <Loader2 className="size-4 animate-spin" />
                        Diffusion progressive anti-spam...
                      </span>
                      <span>
                        {customCampaignProgress.current} / {customCampaignProgress.total} ({customCampaignProgress.total > 0 ? Math.round((customCampaignProgress.current / customCampaignProgress.total) * 100) : 0}%)
                      </span>
                    </div>
                    <div className="w-full bg-emerald-200/50 dark:bg-emerald-950/50 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-emerald-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${customCampaignProgress.total > 0 ? Math.round((customCampaignProgress.current / customCampaignProgress.total) * 100) : 5}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground text-center">
                      Chaque email est espacé de 1 sec pour garantir la délivrabilité et éviter les filtres spam.
                    </p>
                  </div>
                )}

                {customCampaignStatus === 'success' && customCampaignResult && (
                  <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 space-y-1">
                    <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="size-4" />
                      Diffusion terminée avec succès !
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {customCampaignResult.sentCount} emails livrés ({customCampaignResult.failedCount} échecs).
                    </p>
                  </div>
                )}

                {customCampaignStatus === 'error' && (
                  <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 space-y-1">
                    <p className="text-xs font-bold text-rose-600 flex items-center gap-1.5">
                      <AlertCircle className="size-4" />
                      Erreur lors de la diffusion
                    </p>
                    <p className="text-[11px] text-muted-foreground">{customCampaignError}</p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setCustomCampaignStatus('idle')}
                      className="mt-2 h-7 text-xs font-semibold"
                    >
                      Réessayer
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal d'Aperçu Drainage WhatsApp ── */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-background border border-border rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in-0 zoom-in-95">
            <div className="p-4 md:p-5 border-b border-border flex items-center justify-between bg-muted/30">
              <div className="flex items-center gap-2">
                <QrCode className="size-5 text-primary" />
                <h4 className="font-bold text-base text-foreground">Aperçu du modèle d'email FYS · WhatsApp</h4>
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

      {/* ── Modal d'Aperçu Message Personnalisé ── */}
      {showCustomPreviewModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-background border border-border rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in-0 zoom-in-95">
            <div className="p-4 md:p-5 border-b border-border flex items-center justify-between bg-muted/30">
              <div className="flex items-center gap-2">
                <FileText className="size-5 text-primary" />
                <h4 className="font-bold text-base text-foreground">Aperçu de votre Message Personnalisé</h4>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowCustomPreviewModal(false)}
                className="rounded-full text-xs font-bold"
              >
                Fermer ✕
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-[#F4F6F4]">
              {loadingCustomPreview ? (
                <div className="flex items-center justify-center py-16 text-muted-foreground">
                  <Loader2 className="size-6 animate-spin mr-2" />
                  Génération de l'aperçu personnalisé...
                </div>
              ) : customPreviewHtml ? (
                <div
                  className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden"
                  dangerouslySetInnerHTML={{ __html: customPreviewHtml }}
                />
              ) : (
                <div className="text-center py-12 text-sm text-muted-foreground">
                  Impossible de charger l'aperçu.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
