import {
  collection, doc, query, orderBy, getDocs, setDoc,
  updateDoc, Timestamp, writeBatch,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/entities';
import type { ChatMessageEntity, ChatSession } from '@/entities';

// ── Collection paths ────────────────────────────────────────────────────────
// users/{uid}/conversations/{sessionId}               → ChatSession metadata
// users/{uid}/conversations/{sessionId}/messages/{id} → ChatMessageEntity

function conversationsRef(uid: string) {
  return collection(db, COLLECTIONS.USERS, uid, COLLECTIONS.CONVERSATIONS);
}
function messagesRef(uid: string, sessionId: string) {
  return collection(db, COLLECTIONS.USERS, uid, COLLECTIONS.CONVERSATIONS, sessionId, 'messages');
}

// ── Session operations ──────────────────────────────────────────────────────

/** Creates a new conversation session. Title is derived from the first user message. */
export async function createSession(uid: string, firstUserMessage: string): Promise<ChatSession> {
  const title = firstUserMessage.length > 50
    ? firstUserMessage.slice(0, 47) + '…'
    : firstUserMessage;

  const now = Timestamp.now();
  const docRef = doc(conversationsRef(uid));
  const session: ChatSession = {
    id: docRef.id,
    title,
    createdAt: now,
    updatedAt: now,
    messageCount: 0,
  };
  await setDoc(docRef, session);
  return session;
}

/** Fetches all conversation sessions for a user, most recent first. */
export async function getSessions(uid: string): Promise<ChatSession[]> {
  const q = query(conversationsRef(uid), orderBy('updatedAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data() as ChatSession);
}

/** Fetches all messages for a specific conversation session. */
export async function getSessionMessages(uid: string, sessionId: string): Promise<ChatMessageEntity[]> {
  const q = query(messagesRef(uid, sessionId), orderBy('timestamp', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data() as ChatMessageEntity);
}

/** Saves a message to a session and updates session metadata. */
export async function saveChatMessageToSession(
  uid: string,
  sessionId: string,
  message: ChatMessageEntity,
): Promise<void> {
  const msgRef = doc(messagesRef(uid, sessionId), message.id);
  await setDoc(msgRef, message);

  // Update session metadata (title set on creation; just bump updatedAt + count)
  const sessionDocRef = doc(conversationsRef(uid), sessionId);
  await updateDoc(sessionDocRef, {
    updatedAt: Timestamp.now(),
    messageCount: (await getDocs(messagesRef(uid, sessionId))).size,
  });
}

// ── Legacy shim (still exported for back-compat) ───────────────────────────
/** @deprecated – Use session-based functions instead */
export async function saveChatMessage(uid: string, message: ChatMessageEntity) {
  const collectionRef = collection(db, COLLECTIONS.USERS, uid, COLLECTIONS.CHATS);
  const docRef = doc(collectionRef, message.id);
  await setDoc(docRef, message);
}

/** Renames a conversation session title. */
export async function renameSession(uid: string, sessionId: string, newTitle: string): Promise<void> {
  const sessionDocRef = doc(conversationsRef(uid), sessionId);
  await updateDoc(sessionDocRef, { title: newTitle.trim() });
}

/** Deletes a conversation session and all its messages. */
export async function deleteSession(uid: string, sessionId: string): Promise<void> {
  // Delete all messages first
  const msgs = await getDocs(messagesRef(uid, sessionId));
  const batch = writeBatch(db);
  msgs.forEach((m) => batch.delete(m.ref));
  // Then delete the session document
  batch.delete(doc(conversationsRef(uid), sessionId));
  await batch.commit();
}

/** Deletes ALL conversation sessions and messages for a user. */
export async function deleteAllSessions(uid: string): Promise<void> {
  const sessions = await getDocs(conversationsRef(uid));
  const batch = writeBatch(db);
  for (const sessionDoc of sessions.docs) {
    const msgs = await getDocs(messagesRef(uid, sessionDoc.id));
    msgs.forEach((m) => batch.delete(m.ref));
    batch.delete(sessionDoc.ref);
  }
  await batch.commit();
}
