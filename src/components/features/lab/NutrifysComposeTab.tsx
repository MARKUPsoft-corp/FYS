import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  Loader2,
  Send,
  Sparkles,
  MessageSquare,
  History,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription, SheetClose } from '@/components/ui/sheet';
import { CocktailProposalCard } from '@/components/features/lab/CocktailProposalCard';
import { HighlightedText, type HighlightTerm } from '@/components/features/lab/HighlightedText';
import type { CocktailProposal } from '@/data/nutrifys-chat';
import { chatCocktail } from '@/services/ai';
import { useAuthStore } from '@/stores/auth';
import { getProfile } from '@/services/profile';
import { getFruits } from '@/services/fruit';
import { createSession, getSessions, getSessionMessages, saveChatMessageToSession, deleteSession, deleteAllSessions, renameSession } from '@/services/chat';
import { useQuery } from '@tanstack/react-query';
import { Timestamp } from 'firebase/firestore';
import type { Fruit, HealthProfile, ChatMessageEntity, ChatRole, ChatSession } from '@/entities';
import { MAX_LAB_MAIN_FRUITS, MAX_LAB_SUPPLEMENTS } from '@/entities';
import { cn } from '@/lib/utils';





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
  "Appliquez la recette ou lancez l'analyse complète.",
];

type Props = {
  onAnalyzeProposal: (proposal: CocktailProposal) => void;
};

const WELCOME_MESSAGE =
  'Bonjour ! Je suis NutriFYS, votre assistant nutritionnel. Décrivez ce que vous recherchez — énergie, digestion, immunité, récupération — et je composerai un cocktail adapté à votre profil de santé.';

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function createTextMessage(role: ChatRole, content: string): ChatMessageEntity {
  return { id: createId(), role, type: 'text', content, timestamp: Timestamp.now() };
}

function createProposalMessage(content: string, proposal: CocktailProposal): ChatMessageEntity {
  return {
    id: createId(),
    role: 'assistant',
    type: 'proposal',
    content,
    proposal,
    timestamp: Timestamp.now(),
  };
}

function formatTime(t: Timestamp | Date) {
  const d = t instanceof Date ? t : t.toDate?.() || new Date();
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
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
  onAnalyze,
  fruitsCatalog,
}: {
  message: Extract<ChatMessageEntity, { type: 'proposal' }>;
  onAnalyze: (proposal: CocktailProposal) => void;
  fruitsCatalog: Fruit[];
}) {
  const [fruitIds, setFruitIds] = useState(message.proposal.fruitIds.slice(0, MAX_LAB_MAIN_FRUITS));
  const [supplementIds, setSupplementIds] = useState(message.proposal.supplementIds.slice(0, MAX_LAB_SUPPLEMENTS));
  const [pulseId, setPulseId] = useState<string | null>(null);

  function toggleFruit(id: string) {
    setFruitIds((prev) => {
      if (prev.includes(id)) return prev.filter((f) => f !== id);
      if (prev.length >= MAX_LAB_MAIN_FRUITS) return prev;
      return [...prev, id];
    });
    setPulseId(id);
    setTimeout(() => setPulseId(null), 600);
  }

  function toggleSupplement(id: string) {
    setSupplementIds((prev) => {
      if (prev.includes(id)) return prev.filter((s) => s !== id);
      if (prev.length >= MAX_LAB_SUPPLEMENTS) return prev;
      return [...prev, id];
    });
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
            fruitsCatalog={fruitsCatalog}
            onTermClick={handleTermClick}
          />
        </p>
        <CocktailProposalCard
          proposal={message.proposal}
          fruitIds={fruitIds}
          supplementIds={supplementIds}
          onToggleFruit={toggleFruit}
          onToggleSupplement={toggleSupplement}
          onAnalyze={onAnalyze}
          pulseId={pulseId}
          onTermClick={handleTermClick}
          fruitsCatalog={fruitsCatalog}
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
  onAnalyze,
  fruitsCatalog,
}: {
  message: ChatMessageEntity;
  onAnalyze: (proposal: CocktailProposal) => void;
  fruitsCatalog: Fruit[];
}) {
  if (message.type === 'proposal') {
    return (
      <ProposalMessageBubble
        message={message as Extract<ChatMessageEntity, { type: 'proposal' }>}
        onAnalyze={onAnalyze}
        fruitsCatalog={fruitsCatalog}
      />
    );
  }

  const isAssistant = message.role === 'assistant';

  if (isAssistant) {
    return (
      <div className="flex flex-col w-full">
        <NutriFYSAuthorRow />
        <div className="rounded-2xl bg-card border border-border/60 text-foreground shadow-sm px-4 py-3.5 text-[15px] lg:text-base leading-relaxed font-medium w-full">
          <HighlightedText text={message.content} fruitsCatalog={fruitsCatalog} />
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

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
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

export function NutrifysComposeTab({ onAnalyzeProposal }: Props) {
  const [messages, setMessages] = useState<ChatMessageEntity[]>([
    createTextMessage('assistant', WELCOME_MESSAGE),
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [profile, setProfile] = useState<HealthProfile | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [loadingSession, setLoadingSession] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const user = useAuthStore((s) => s.user);
  
  const { data: fruits = [] } = useQuery({
    queryKey: ['fruits'],
    queryFn: getFruits,
  });

  // Load profile + session list on mount
  useEffect(() => {
    if (!user) return;
    getProfile(user.uid)
      .then((p: HealthProfile | null) => setProfile(p ?? null))
      .catch(() => setProfile(null));
    getSessions(user.uid).then(setSessions).catch(console.error);
  }, [user]);

  useEffect(() => {
    if (window.innerWidth < 1024) {
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    } else {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, isTyping]);

  /** Start a fresh conversation (resets state, no Firestore session yet) */
  function startNewConversation() {
    setCurrentSessionId(null);
    setMessages([createTextMessage('assistant', WELCOME_MESSAGE)]);
    setIsHistoryOpen(false);
  }

  /** Load an existing session from history */
  async function openSession(sessionId: string) {
    if (!user || loadingSession || editingSessionId === sessionId) return;
    setLoadingSession(sessionId);
    try {
      const msgs = await getSessionMessages(user.uid, sessionId);
      if (msgs.length > 0) {
        setMessages(msgs);
        setCurrentSessionId(sessionId);
      }
      setIsHistoryOpen(false);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingSession(null);
    }
  }

  async function handleDeleteSession(sessionId: string) {
    if (!user) return;
    await deleteSession(user.uid, sessionId);
    setSessions((prev) => prev.filter(s => s.id !== sessionId));
    if (currentSessionId === sessionId) startNewConversation();
  }

  async function handleDeleteAllSessions() {
    if (!user) return;
    await deleteAllSessions(user.uid);
    setSessions([]);
    startNewConversation();
  }

  async function handleRenameSubmit(sessionId: string) {
    if (!user || !editTitle.trim()) return;
    await renameSession(user.uid, sessionId, editTitle);
    setSessions((prev) => prev.map(s => s.id === sessionId ? { ...s, title: editTitle.trim() } : s));
    setEditingSessionId(null);
  }

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isTyping) return;

    const userMsg = createTextMessage('user', trimmed);
    setInput('');
    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    // If first user message, create a session now
    let sessionId = currentSessionId;
    if (!sessionId && user) {
      try {
        const session = await createSession(user.uid, trimmed);
        sessionId = session.id;
        setCurrentSessionId(sessionId);
        setSessions((prev) => [session, ...prev]);
      } catch (e) { console.error(e); }
    }

    try {
      const historyForAI = [...messages, userMsg]
        .filter((m) => !(m.role === 'assistant' && m.content === WELCOME_MESSAGE))
        .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

      const aiReply = await chatCocktail(historyForAI, profile, fruits);

      const replyMsg = aiReply.proposal
        ? createProposalMessage(aiReply.text, aiReply.proposal as CocktailProposal)
        : createTextMessage('assistant', aiReply.text);

      setMessages((prev) => [...prev, replyMsg]);

      if (user && sessionId) {
        saveChatMessageToSession(user.uid, sessionId, userMsg).catch(console.error);
        saveChatMessageToSession(user.uid, sessionId, replyMsg).catch(console.error);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        createTextMessage('assistant', 'Je rencontre un problème de connexion. Réessayez dans un instant.'),
      ]);
    } finally {
      setIsTyping(false);
    }
  }

  function handleSubmit(e?: FormEvent) {
    e?.preventDefault();
    sendMessage(input);
  }



  return (
    <div className="relative z-20 mt-1 lg:mt-3">
      <div className="flex flex-col lg:flex-row gap-5 items-start">

        <div className="flex-1 min-w-0 w-full flex flex-col h-auto lg:h-[calc(100vh-200px)]">
          <div className="bg-card rounded-2xl lg:rounded-3xl border border-border/60 shadow-lg flex flex-col h-auto min-h-[70vh] lg:h-full lg:max-h-[760px] lg:overflow-hidden relative mb-24 lg:mb-0">

            <div className="bg-emerald-900/40 backdrop-blur-md px-3 lg:px-4 py-4 flex items-center justify-between shrink-0 rounded-t-2xl lg:rounded-t-3xl border-b border-border/40 sticky top-0 lg:static z-40">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-full bg-primary/30 flex items-center justify-center border border-accent/30">
                  <Sparkles className="size-4 text-[#E0982E]" />
                </div>
                <div>
                  <p className="text-[#E0982E] text-[10px] font-bold uppercase tracking-widest">NutriFYS</p>
                  <p className="text-white text-sm font-semibold">Assistant conversationnel</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={startNewConversation}
                  className="px-3 text-white/70 hover:text-white hover:bg-white/10 rounded-xl gap-1.5 font-semibold text-xs transition-colors border border-transparent hover:border-white/10"
                >
                  <Plus className="size-3.5" />
                  <span className="hidden lg:inline">Nouvelle</span>
                </Button>

                <Sheet open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
                  <SheetTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="px-3 text-white/70 hover:text-white hover:bg-white/10 rounded-xl gap-1.5 font-semibold text-xs transition-colors border border-transparent hover:border-white/10"
                    >
                      <History className="size-4" />
                      <span className="hidden lg:inline">Historique</span>
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="right" showCloseButton={false} className="w-full sm:max-w-[420px] p-0 flex flex-col bg-card border-l border-border/40">
                    <SheetHeader className="px-5 py-4 border-b border-border/40 bg-muted/20 shrink-0">
                      <div className="flex flex-row items-start justify-between gap-2">
                        <div className="text-left">
                          <SheetTitle className="font-display flex items-center gap-2">
                            <History className="size-4 text-primary" />
                            Mes conversations
                          </SheetTitle>
                          <SheetDescription className="text-[11px] mt-1">
                            Cliquez sur une conversation pour la rouvrir.
                          </SheetDescription>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {sessions.length > 0 && (
                            <button
                              type="button"
                              onClick={handleDeleteAllSessions}
                              className="text-[11px] font-semibold text-destructive hover:underline flex items-center gap-1 bg-destructive/10 px-2 py-1.5 rounded-md transition-colors hover:bg-destructive/20"
                            >
                              <Trash2 className="size-3" /> Vider
                            </button>
                          )}
                          
                          {sessions.length > 0 && <div className="w-px h-4 bg-border mx-1" />}
                          
                          <SheetClose asChild>
                            <button
                              type="button"
                              className="text-[11px] font-semibold text-foreground/70 hover:text-foreground hover:bg-muted/60 transition-colors flex items-center gap-1 px-2 py-1.5 rounded-md"
                            >
                              <X className="size-3" />
                              Fermer
                            </button>
                          </SheetClose>
                        </div>
                      </div>
                    </SheetHeader>

                    <div className="flex-1 overflow-y-auto py-3">
                      {sessions.length === 0 ? (
                        <div className="text-center py-12 text-sm text-muted-foreground flex flex-col items-center gap-3">
                          <History className="size-8 opacity-20" />
                          Aucune conversation enregistrée.
                        </div>
                      ) : (
                        sessions.map((session) => (
                          <div
                            key={session.id}
                            className={cn(
                              'w-full flex items-center gap-2 pl-4 pr-2 py-2 border-b border-border/30 last:border-none group',
                              currentSessionId === session.id && 'bg-primary/5 border-l-2 border-l-primary',
                              editingSessionId === session.id ? 'bg-muted/30' : 'hover:bg-muted/50 cursor-pointer'
                            )}
                            onClick={() => {
                              if (editingSessionId !== session.id) openSession(session.id);
                            }}
                          >
                            <MessageSquare className="size-4 text-primary/60 shrink-0" />

                            <div className="flex-1 min-w-0 pr-2">
                              {editingSessionId === session.id ? (
                                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                  <input
                                    value={editTitle}
                                    onChange={(e) => setEditTitle(e.target.value)}
                                    autoFocus
                                    className="w-full text-sm font-semibold bg-background border border-primary/40 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-primary/50"
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') handleRenameSubmit(session.id);
                                      if (e.key === 'Escape') setEditingSessionId(null);
                                    }}
                                  />
                                  <button onClick={() => handleRenameSubmit(session.id)} className="p-1.5 bg-primary rounded text-white shadow-sm hover:opacity-90">
                                    <Check className="size-3.5" />
                                  </button>
                                  <button onClick={() => setEditingSessionId(null)} className="p-1.5 bg-muted rounded hover:bg-muted/80">
                                    <X className="size-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <p className="text-sm font-semibold text-foreground truncate">{session.title}</p>
                                  <p className="text-[11px] text-muted-foreground mt-0.5">
                                    {formatTime(session.updatedAt)} • {session.messageCount} msgs
                                  </p>
                                </>
                              )}
                            </div>

                            {editingSessionId !== session.id && (
                              <div className="flex items-center shrink-0">
                                {loadingSession === session.id ? (
                                  <Loader2 className="size-4 animate-spin text-muted-foreground mr-3" />
                                ) : (
                                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setEditTitle(session.title);
                                        setEditingSessionId(session.id);
                                      }}
                                      className="size-7 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                                      title="Renommer la conversation"
                                    >
                                      <Edit2 className="size-3.5" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteSession(session.id);
                                      }}
                                      className="size-7 text-destructive/70 hover:bg-destructive/10 hover:text-destructive transition-colors"
                                      title="Supprimer la conversation"
                                    >
                                      <Trash2 className="size-3.5" />
                                    </Button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
            </div>

            <div ref={scrollRef} className="flex-1 flex flex-col lg:overflow-y-auto px-2 lg:px-4 py-5 space-y-5">
              {messages.map((msg) => (
                <ChatBubble
                  key={msg.id}
                  message={msg}
                  onAnalyze={onAnalyzeProposal}
                  fruitsCatalog={fruits}
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

            {/* Input bar - desktop only */}
            <div className="hidden lg:block z-30 shrink-0 w-full bg-background/50 backdrop-blur-md border-t border-border/40 px-4 pb-4 pt-2">
              <form onSubmit={handleSubmit} className="w-full">
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

      {/* Input bar - mobile */}
      <div className="lg:hidden fixed bottom-0 left-0 w-full bg-background/95 backdrop-blur-md border-t border-border/50 p-3 pb-safe-5 z-50 shadow-t-xl">
        <form onSubmit={handleSubmit} className="max-w-lg mx-auto">
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
