import { PageComponent } from 'rasengan';
import { Sparkles } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { LabHeader, type LabTab } from '@/components/features/lab/LabHeader';
import { ComposeTab } from '@/components/features/lab/ComposeTab';
import {
  SupplementsTab,
  getSupplementsSummaryItems,
} from '@/components/features/lab/SupplementsTab';
import { NutrifysComposeTab } from '@/components/features/lab/NutrifysComposeTab';
import { LAB_FRUITS } from '@/data/lab-items';
import type { CocktailProposal } from '@/data/nutrifys-chat';

const FysLab: PageComponent = () => {
  const [activeTab, setActiveTab] = useState<LabTab>('compose');
  const [selectedFruits, setSelectedFruits] = useState<string[]>(['ananas', 'mangue', 'citron']);
  const [selectedSupplements, setSelectedSupplements] = useState<string[]>(['gingembre']);

  const toggleFruit = (id: string) => {
    setSelectedFruits((prev) =>
      prev.includes(id)
        ? prev.filter((f) => f !== id)
        : prev.length < 5
          ? [...prev, id]
          : prev,
    );
  };

  const toggleSupplement = (id: string) => {
    setSelectedSupplements((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  };

  const selectedFruitItems = LAB_FRUITS.filter((f) => selectedFruits.includes(f.id));
  const summaryItems =
    activeTab === 'supplements'
      ? getSupplementsSummaryItems(selectedFruitItems, selectedSupplements)
      : selectedFruitItems;

  const summaryCountLabel =
    activeTab === 'supplements'
      ? `${summaryItems.length} élément${summaryItems.length > 1 ? 's' : ''}`
      : `${selectedFruits.length} fruit${selectedFruits.length > 1 ? 's' : ''}`;

  const canAnalyze = summaryItems.length > 0;

  function handleAnalyze() {
    // Placeholder until Cloud Functions NutriFYS is connected
    console.info('Analyser avec NutriFYS', {
      fruits: selectedFruits,
      supplements: selectedSupplements,
    });
  }

  function handleAnalyzeFromProposal(proposal: CocktailProposal) {
    setSelectedFruits(proposal.fruitIds);
    setSelectedSupplements(proposal.supplementIds);
    console.info('Analyser avec NutriFYS', {
      fruits: proposal.fruitIds,
      supplements: proposal.supplementIds,
      name: proposal.name,
      score: proposal.score,
    });
  }

  function handleApplyProposal(proposal: CocktailProposal) {
    setSelectedFruits(proposal.fruitIds);
    setSelectedSupplements(proposal.supplementIds);
    setActiveTab('supplements');
  }

  return (
    <div className="min-h-screen bg-background">
      <LabHeader
        activeTab={activeTab}
        onTabChange={setActiveTab}
        compact={activeTab === 'nutrifys'}
      />

      <div
        className={cn(
          'mx-auto',
          activeTab === 'nutrifys' ? 'max-w-[1480px] px-2 lg:px-5 pb-52 lg:pb-12' : 'max-w-6xl px-4 lg:px-16 pb-36 lg:pb-12',
        )}
      >
        {activeTab === 'compose' && (
          <ComposeTab
            fruits={LAB_FRUITS}
            selectedFruits={selectedFruits}
            onToggleFruit={toggleFruit}
            onAnalyze={handleAnalyze}
          />
        )}

        {activeTab === 'supplements' && (
          <SupplementsTab
            selectedFruits={selectedFruitItems}
            selectedSupplements={selectedSupplements}
            onToggleSupplement={toggleSupplement}
            onAnalyze={handleAnalyze}
          />
        )}

        {activeTab === 'nutrifys' && (
          <NutrifysComposeTab
            onApplyProposal={handleApplyProposal}
            onAnalyzeProposal={handleAnalyzeFromProposal}
          />
        )}
      </div>

      {/* Sticky bottom bar — mobile & tablet */}
      {activeTab !== 'nutrifys' && (
        <div className="fixed bottom-0 left-0 w-full bg-background/95 backdrop-blur-md border-t border-border/50 p-4 pb-6 z-50 rounded-t-3xl lg:hidden">
          <div className="max-w-lg mx-auto space-y-3">
            <div
              className="flex items-center gap-2 overflow-x-auto pb-1"
              style={{ scrollbarWidth: 'none' }}
            >
              {summaryItems.map((item) => (
                <div
                  key={`sel-${item.id}`}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 rounded-full border border-primary/20 text-xs font-bold text-primary whitespace-nowrap"
                >
                  <span>{item.emoji}</span> {item.name}
                </div>
              ))}
              {summaryItems.length > 0 && (
                <span className="ml-auto text-xs font-bold text-muted-foreground whitespace-nowrap pl-2">
                  {summaryCountLabel}
                </span>
              )}
              {summaryItems.length === 0 && (
                <span className="text-xs font-medium text-muted-foreground">
                  {activeTab === 'supplements'
                    ? 'Aucun élément sélectionné'
                    : 'Aucun fruit sélectionné'}
                </span>
              )}
            </div>

            <Button
              size="lg"
              className="w-full h-14 rounded-full bg-primary hover:bg-primary/90 text-white font-bold text-[17px] shadow-[0_8px_25px_rgba(63,109,78,0.3)] active:scale-95 transition-all gap-3"
              disabled={!canAnalyze}
              onClick={handleAnalyze}
            >
              <Sparkles className="size-5" /> Analyser avec NutriFYS
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

FysLab.metadata = {
  title: 'FYS Lab — Créateur de Cocktail',
  description: 'Créez et validez votre cocktail santé avec NutriFYS',
};

export default FysLab;
