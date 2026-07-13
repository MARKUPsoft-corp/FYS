import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import {
  Loader2,
  Send,
  Sparkles,
  Zap,
  Leaf,
  Moon,
  MessageSquare,
  Shield,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CocktailProposalCard } from '@/components/features/lab/CocktailProposalCard';
import { HighlightedText, type HighlightTerm } from '@/components/features/lab/HighlightedText';
import {
  getNutriFYSReply,
  type CocktailProposal,
} from '@/data/nutrifys-chat';
import { cn } from '@/lib/utils';

type ChatRole = 'assistant' | 'user';

type ChatMessage =
  | {
      id: string;
      role: ChatRole;
      type: 'text';
      content: string;
      timestamp: Date;
    }
  | {
      id: string;
      role: 'assistant';
      type: 'proposal';
      content: string;
      proposal: CocktailProposal;
      timestamp: Date;
    };

type Suggestion = {
  id: string;
  label: string;
  message: string;
  icon: typeof Zap;
};

type Props = {
  onApplyProposal: (proposal: CocktailProposal) => void;
  onAnalyzeProposal: (proposal: CocktailProposal) => void;
};

const SUGGESTIONS: Suggestion[] = [
  {
    id: 'energy',
    label: 'Boost énergie',
    message: 'Je cherche un cocktail énergisant pour bien démarrer la matinée.',
    icon: Zap,
  },
  {
    id: 'immunity',
    label: 'Immunité',
    message: 'Je veux un cocktail pour renforcer mes défenses naturelles.',
    icon: Shield,
  },
  {
    id: 'digestion',
    label: 'Digestion',
    message: 'Propose-moi un mélange léger et digeste pour après le repas.',
    icon: Leaf,
  },
  {
    id: 'sleep',
    label: 'Détente',
    message: "J'aimerais une boisson apaisante pour le soir, sans exciter.",
    icon: Moon,
  },
];

const EXAMPLE_PROMPTS = [
  'Un cocktail riche en vitamine C',
  'Quel mix pour un sportif ?',
  'Fruits adaptés si je suis diabétique ?',
  'Composition légère avant le coucher',
];

const HOW_IT_WORKS = [
  'Décrivez votre objectif ou votre ressenti du moment.',
  'NutriFYS compose une recette visuelle adaptée à votre profil.',
  'Vous recevez un verdict clair avec explications et précautions.',
  'Appliquez la recette ou lancez l\'analyse complète.',
];

const WELCOME_MESSAGE =
  'Bonjour ! Je suis NutriFYS, votre assistant nutritionnel. Décrivez ce que vous recherchez — énergie, digestion, immunité, récupération — et je composerai un cocktail adapté à votre profil de santé.';

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function createTextMessage(role: ChatRole, content: string): ChatMessage {
  return { id: createId(), role, type: 'text', content, timestamp: new Date() };
}

function createProposalMessage(content: string, proposal: CocktailProposal): ChatMessage {
  return {
    id: createId(),
    role: 'assistant',
    type: 'proposal',
    content,
    proposal,
    timestamp: new Date(),
  };
}

function formatTime(date: Date) {
  return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function NutriFYSAuthorRow() {
  return (
    <div className="flex items-center gap-2 mb-2">
      <div className="size-8 rounded-full bg-[#28422F] flex items-center justify-center shrink-0 border border-primary/30">
        <Sparkles className="size-3.5 text-[#E0982E]" />
      </div>
      <span className="text-[11px] font-bold uppercase tracking-widest text-[#E0982E]">NutriFYS</span>
    </div>
  );
}

function ProposalMessageBubble({
  message,
  applied,
  onApply,
  onAnalyze,
}: {
  message: Extract<ChatMessage, { type: 'proposal' }>;
  applied: boolean;
  onApply: (proposal: CocktailProposal) => void;
  onAnalyze: (proposal: CocktailProposal) => void;
}) {
  const [fruitIds, setFruitIds] = useState(message.proposal.fruitIds);
  const [supplementIds, setSupplementIds] = useState(message.proposal.supplementIds);
  const [pulseId, setPulseId] = useState<string | null>(null);

  function toggleFruit(id: string) {
    setFruitIds((prev) => (prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]));
    setPulseId(id);
    setTimeout(() => setPulseId(null), 600);
  }

  function toggleSupplement(id: string) {
    setSupplementIds((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
    setPulseId(id);
    setTimeout(() => setPulseId(null), 600);
  }

  function handleTermClick(term: HighlightTerm) {
    if (term.type === 'fruit' && term.id) toggleFruit(term.id);
    if (term.type === 'supplement' && term.id) toggleSupplement(term.id);
  }

  return (
    <div className="flex flex-col w-full">
      <NutriFYSAuthorRow />
      <div className="rounded-2xl bg-card border border-border/60 text-foreground shadow-sm px-4 py-3 w-full">
        <p className="text-[15px] lg:text-base leading-relaxed font-medium mb-0">
          <HighlightedText
            text={message.content}
            proposal={message.proposal}
            onTermClick={handleTermClick}
          />
        </p>
        <CocktailProposalCard
          proposal={message.proposal}
          fruitIds={fruitIds}
          supplementIds={supplementIds}
          onToggleFruit={toggleFruit}
          onToggleSupplement={toggleSupplement}
          onApply={onApply}
          onAnalyze={onAnalyze}
          applied={applied}
          pulseId={pulseId}
          onTermClick={handleTermClick}
        />
      </div>
      <span className="text-[10px] text-muted-foreground mt-1 ml-1">
        {formatTime(message.timestamp)}
      </span>
    </div>
  );
}

function ChatBubble({
  message,
  applied,
  onApply,
  onAnalyze,
}: {
  message: ChatMessage;
  applied: boolean;
  onApply: (proposal: CocktailProposal) => void;
  onAnalyze: (proposal: CocktailProposal) => void;
}) {
  if (message.type === 'proposal') {
    return (
      <ProposalMessageBubble
        message={message}
        applied={applied}
        onApply={onApply}
        onAnalyze={onAnalyze}
      />
    );
  }

  const isAssistant = message.role === 'assistant';

  if (isAssistant) {
    return (
      <div className="flex flex-col w-full">
        <NutriFYSAuthorRow />
        <div className="rounded-2xl bg-card border border-border/60 text-foreground shadow-sm px-4 py-3.5 text-[15px] lg:text-base leading-relaxed font-medium w-full">
          <HighlightedText text={message.content} />
        </div>
        <span className="text-[10px] text-muted-foreground mt-1 ml-1">
          {formatTime(message.timestamp)}
        </span>
      </div>
    );
  }

  return (
    <div className="flex w-full justify-end">
      <div className="flex flex-col max-w-[78%] items-end">
        <div className="rounded-2xl rounded-tr-md bg-primary text-primary-foreground shadow-sm px-4 py-3.5 text-[15px] lg:text-base leading-relaxed font-medium">
          {message.content}
        </div>
        <span className="text-[10px] text-muted-foreground mt-1 mr-1">
          {formatTime(message.timestamp)}
        </span>
      </div>
    </div>
  );
}

function ChatComposer({
  value,
  onChange,
  onSubmit,
  disabled,
  isTyping,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  isTyping?: boolean;
  className?: string;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [value]);

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  }

  return (
    <div className={cn('bg-card border border-border/60 rounded-2xl shadow-lg px-3 py-2', className)}>
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Décrivez votre besoin…"
          disabled={disabled}
          rows={1}
          className="flex-1 resize-none bg-transparent text-[15px] lg:text-base font-medium text-foreground placeholder:text-muted-foreground focus:outline-none min-h-[36px] max-h-[120px] py-1.5 px-1 leading-snug"
        />
        <Button
          type="button"
          size="icon"
          disabled={disabled || !value.trim()}
          onClick={onSubmit}
          className="size-10 shrink-0 rounded-xl bg-primary hover:bg-primary/90 text-white shadow-[0_4px_14px_rgba(63,109,78,0.3)] disabled:opacity-40"
        >
          {isTyping ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        </Button>
      </div>
      <p className="text-[10px] text-muted-foreground mt-1.5 px-1 hidden lg:block">
        Entrée pour envoyer · Maj+Entrée pour un retour à la ligne
      </p>
    </div>
  );
}

function InfoSidebar() {
  return (
    <aside className="space-y-4">
      <div className="bg-card rounded-2xl border border-border/60 shadow-sm p-5">
        <h3 className="font-display font-bold text-base text-foreground mb-4 flex items-center gap-2">
          <MessageSquare className="size-4 text-primary" />
          Comment ça marche
        </h3>
        <ol className="space-y-3">
          {HOW_IT_WORKS.map((step, i) => (
            <li key={step} className="flex gap-3 text-sm">
              <span className="size-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                {i + 1}
              </span>
              <span className="text-muted-foreground font-medium leading-relaxed pt-0.5">{step}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="bg-card rounded-2xl border border-border/60 shadow-sm p-5">
        <h3 className="font-display font-bold text-base text-foreground mb-3">Essayez de demander</h3>
        <ul className="space-y-2">
          {EXAMPLE_PROMPTS.map((prompt) => (
            <li
              key={prompt}
              className="text-sm text-muted-foreground font-medium px-3 py-2 rounded-xl bg-muted/40 border border-border/30"
            >
              « {prompt} »
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}

export function NutrifysComposeTab({ onApplyProposal, onAnalyzeProposal }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    createTextMessage('assistant', WELCOME_MESSAGE),
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [appliedMessageId, setAppliedMessageId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const showSuggestions = messages.length <= 1;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isTyping]);

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isTyping) return;

    setInput('');
    setMessages((prev) => [...prev, createTextMessage('user', trimmed)]);
    setIsTyping(true);

    await new Promise((r) => setTimeout(r, 900));

    const reply = getNutriFYSReply(trimmed);
    setMessages((prev) => [
      ...prev,
      reply.proposal
        ? createProposalMessage(reply.text, reply.proposal)
        : createTextMessage('assistant', reply.text),
    ]);
    setIsTyping(false);
  }

  function handleApply(proposal: CocktailProposal, messageId: string) {
    onApplyProposal(proposal);
    setAppliedMessageId(messageId);
  }

  function handleSubmit(e?: FormEvent) {
    e?.preventDefault();
    sendMessage(input);
  }

  function handleSuggestion(suggestion: Suggestion) {
    sendMessage(suggestion.message);
  }

  const mobileSuggestions = SUGGESTIONS.slice(0, 3);

  function renderSuggestions(className?: string) {
    const items = showSuggestions ? SUGGESTIONS : mobileSuggestions;

    return (
      <div className={cn('shrink-0 border-t border-border/40 bg-background/50 px-3 lg:px-4 pt-3 pb-0', className)}>
        {showSuggestions && (
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">
            Suggestions rapides
          </p>
        )}
        <div className={cn('flex gap-2', showSuggestions ? 'flex-wrap' : 'overflow-x-auto')} style={{ scrollbarWidth: 'none' }}>
          {items.map((s) => {
            const Icon = s.icon;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => handleSuggestion(s)}
                disabled={isTyping}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-primary/5 border border-primary/15 font-bold text-primary hover:bg-primary/10 hover:border-primary/30 transition-colors disabled:opacity-50',
                  showSuggestions ? 'text-xs' : 'text-[11px] shrink-0 whitespace-nowrap',
                )}
              >
                <Icon className="size-3.5" />
                {s.label}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="relative z-20 mt-1 lg:mt-3">
      <div className="flex flex-col lg:flex-row gap-5 items-start">

        <div className="flex-1 min-w-0 w-full flex flex-col min-h-0">
          <div className="bg-card rounded-2xl lg:rounded-3xl border border-border/60 shadow-lg overflow-hidden flex flex-col min-h-[calc(100dvh-220px)] max-h-[calc(100dvh-220px)] lg:min-h-[calc(100vh-200px)] lg:max-h-[760px] lg:h-[calc(100vh-200px)]">

            <div className="bg-[#28422F] px-3 lg:px-4 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-full bg-primary/30 flex items-center justify-center border border-accent/30">
                  <Sparkles className="size-4 text-[#E0982E]" />
                </div>
                <div>
                  <p className="text-[#E0982E] text-[10px] font-bold uppercase tracking-widest">NutriFYS</p>
                  <p className="text-white text-sm font-semibold">Assistant conversationnel</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/20 border border-accent/20">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-60" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-accent" />
                </span>
                <span className="text-[10px] font-bold text-white/90 uppercase tracking-wider">En ligne</span>
              </div>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto px-2 lg:px-4 py-5 space-y-5">
              {messages.map((msg) => (
                <ChatBubble
                  key={msg.id}
                  message={msg}
                  applied={appliedMessageId === msg.id}
                  onApply={(p) => handleApply(p, msg.id)}
                  onAnalyze={onAnalyzeProposal}
                />
              ))}

              {isTyping && (
                <div className="flex flex-col w-full">
                  <NutriFYSAuthorRow />
                  <div className="rounded-2xl bg-card border border-border/60 px-4 py-3 flex items-center gap-1.5 w-full">
                    <span className="size-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:0ms]" />
                    <span className="size-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:150ms]" />
                    <span className="size-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:300ms]" />
                  </div>
                </div>
              )}
            </div>

            {showSuggestions && (
              <div className="hidden lg:block px-3 lg:px-4 pb-3 shrink-0">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">
                  Suggestions rapides
                </p>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTIONS.map((s) => {
                    const Icon = s.icon;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => handleSuggestion(s)}
                        disabled={isTyping}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-primary/5 border border-primary/15 text-xs font-bold text-primary hover:bg-primary/10 hover:border-primary/30 transition-colors disabled:opacity-50"
                      >
                        <Icon className="size-3.5" />
                        {s.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="hidden lg:block px-3 lg:px-4 pb-4 pt-2 shrink-0 border-t border-border/40 bg-background/50">
              <form onSubmit={handleSubmit}>
                <ChatComposer
                  value={input}
                  onChange={setInput}
                  onSubmit={() => handleSubmit()}
                  disabled={isTyping}
                  isTyping={isTyping}
                />
              </form>
            </div>
          </div>
        </div>

        <div className="hidden lg:block w-[260px] xl:w-[280px] shrink-0 sticky top-24">
          <InfoSidebar />
        </div>
      </div>

      <div className="lg:hidden fixed bottom-0 left-0 w-full bg-background/95 backdrop-blur-md border-t border-border/50 p-3 pb-5 z-50">
        <form onSubmit={handleSubmit} className="max-w-lg mx-auto space-y-2">
          {showSuggestions ? (
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">
                Suggestions rapides
              </p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.slice(0, 3).map((s) => {
                  const Icon = s.icon;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => handleSuggestion(s)}
                      disabled={isTyping}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-primary/5 border border-primary/15 text-[11px] font-bold text-primary whitespace-nowrap disabled:opacity-50"
                    >
                      <Icon className="size-3.5" />
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex gap-2 overflow-x-auto pb-0.5" style={{ scrollbarWidth: 'none' }}>
              {SUGGESTIONS.slice(0, 3).map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => handleSuggestion(s)}
                  disabled={isTyping}
                  className="shrink-0 px-3 py-1.5 rounded-full bg-primary/5 border border-primary/15 text-[11px] font-bold text-primary whitespace-nowrap disabled:opacity-50"
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}
          <ChatComposer
            value={input}
            onChange={setInput}
            onSubmit={() => handleSubmit()}
            disabled={isTyping}
            isTyping={isTyping}
          />
        </form>
      </div>
    </div>
  );
}
