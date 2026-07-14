import { Timestamp } from 'firebase/firestore';
import type { CocktailProposal } from '@/data/nutrifys-chat';

export type ChatRole = 'assistant' | 'user';

export type ChatMessageEntityBase = {
  id: string;
  role: ChatRole;
  content: string;
  timestamp: Timestamp;
};

export type ChatMessageEntity =
  | (ChatMessageEntityBase & { type: 'text' })
  | (ChatMessageEntityBase & { type: 'proposal'; proposal: CocktailProposal });

/** Represents a conversation session (e.g. "Cocktail énergie du matin") */
export type ChatSession = {
  id: string;
  title: string;          // Auto-derived from first user message
  createdAt: Timestamp;
  updatedAt: Timestamp;
  messageCount: number;
};
