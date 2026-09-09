import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FileText,
  Printer,
  Download,
  Loader2,
  Sparkles,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import type { Order } from '@/entities/order';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  downloadVectorFacture,
  downloadThermalFacture,
  printThermalReceipt,
} from '@/lib/pdf';

interface InvoiceFormatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: Order | null;
  ingredientsStr?: string;
}

export function InvoiceFormatDialog({
  open,
  onOpenChange,
  order,
  ingredientsStr,
}: InvoiceFormatDialogProps) {
  const { t } = useTranslation();
  const [downloadingA4, setDownloadingA4] = useState(false);
  const [downloadingThermal, setDownloadingThermal] = useState(false);
  const [printingThermal, setPrintingThermal] = useState(false);

  if (!order) return null;

  const handleDownloadA4 = async () => {
    setDownloadingA4(true);
    try {
      await downloadVectorFacture(order, ingredientsStr);
    } finally {
      setDownloadingA4(false);
    }
  };

  const handleDownloadThermal = async () => {
    setDownloadingThermal(true);
    try {
      await downloadThermalFacture(order, ingredientsStr);
    } finally {
      setDownloadingThermal(false);
    }
  };

  const handlePrintThermal = () => {
    setPrintingThermal(true);
    try {
      printThermalReceipt(order, ingredientsStr);
    } finally {
      setTimeout(() => {
        setPrintingThermal(false);
      }, 800);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-[92vw] p-5 sm:p-6 rounded-3xl gap-5">
        <DialogHeader className="space-y-1 text-left">
          <div className="flex items-center justify-between gap-2">
            <DialogTitle className="text-lg font-bold text-foreground">
              Format de la Facture
            </DialogTitle>
            <Badge variant="outline" className="font-mono text-xs font-bold text-primary border-primary/30">
              #{order.id.slice(0, 8).toUpperCase()}
            </Badge>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Choisissez le format souhaité pour la commande de{' '}
            <strong className="text-foreground">{order.userNameSnapshot}</strong> ({order.totalPrice.toLocaleString()} XAF).
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3.5">
          {/* Option 1: Facture Standard A4 */}
          <div className="group border border-border/70 hover:border-primary/50 bg-card/60 hover:bg-card rounded-2xl p-4 transition-all duration-200 flex flex-col gap-3 shadow-xs">
            <div className="flex items-start gap-3">
              <div className="size-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                <FileText className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-sm font-bold text-foreground">Facture Normale (A4)</h4>
                  <Badge variant="secondary" className="text-[10px] font-semibold">
                    Document PDF
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Format pleine page standard officiel avec en-tête complet, idéal pour l'archivage, la comptabilité ou l'envoi client par WhatsApp / Email.
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="w-full h-10 rounded-xl font-bold gap-2 text-xs hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 dark:hover:bg-blue-950/40"
              disabled={downloadingA4}
              onClick={handleDownloadA4}
            >
              {downloadingA4 ? (
                <>
                  <Loader2 className="size-3.5 animate-spin text-blue-600" />
                  Génération du PDF...
                </>
              ) : (
                <>
                  <Download className="size-3.5 text-blue-600" />
                  Télécharger la Facture A4 (PDF)
                </>
              )}
            </Button>
          </div>

          {/* Option 2: Format Ticket Thermique (58mm) */}
          <div className="group border border-primary/40 bg-primary/[0.03] hover:bg-primary/[0.06] rounded-2xl p-4 transition-all duration-200 flex flex-col gap-3 shadow-xs">
            <div className="flex items-start gap-3">
              <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5 p-1">
                <img src="/logos/fys_logo.png" alt="FYS Logo" className="size-8 object-contain" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-sm font-bold text-foreground">Ticket Thermique (58mm)</h4>
                  <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px] font-bold">
                    Mini-Imprimante
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Ticket de caisse avec logo FYS, slogan <em>« Tu sais ce que tu bois »</em> et adresse <em>fys-app.com</em>, calibré pour rouleaux 57/58mm.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <Button
                variant="default"
                size="sm"
                className="w-full h-10 rounded-xl font-bold gap-2 text-xs shadow-xs"
                disabled={downloadingThermal}
                onClick={handleDownloadThermal}
              >
                {downloadingThermal ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    Génération...
                  </>
                ) : (
                  <>
                    <Download className="size-3.5" />
                    Télécharger Ticket (PDF)
                  </>
                )}
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="w-full h-10 rounded-xl font-bold gap-2 text-xs border-primary/40 text-primary hover:bg-primary/10"
                disabled={printingThermal}
                onClick={handlePrintThermal}
              >
                {printingThermal ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    Impression...
                  </>
                ) : (
                  <>
                    <Printer className="size-3.5" />
                    Imprimer Directement
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
