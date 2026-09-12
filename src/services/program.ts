import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
  limit,
  onSnapshot,
  serverTimestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  COLLECTIONS,
  DEFAULT_PROGRAMS,
  DEFAULT_PROGRAMS_PAGE_SETTINGS,
  type Program,
  type ProgramsPageSettings,
  type UserProgram,
  type UserProgramCheckin,
} from '@/entities';

/**
 * Fetch all available programs.
 * Returns Firestore programs if available, or falls back to DEFAULT_PROGRAMS.
 */
export async function getPrograms(): Promise<Program[]> {
  try {
    const q = query(
      collection(db, COLLECTIONS.PROGRAMS),
      where('isActive', '==', true)
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      const programs: Program[] = [];
      snap.forEach((d) => {
        programs.push({ id: d.id, ...d.data() } as Program);
      });
      return programs;
    }
  } catch (err) {
    console.warn('[ProgramService] Could not fetch programs from Firestore, using default curated programs:', err);
  }

  // Fallback to curated defaults
  return DEFAULT_PROGRAMS;
}

/**
 * Fetch a single program by its ID.
 */
export async function getProgramById(programId: string): Promise<Program | null> {
  try {
    const docRef = doc(db, COLLECTIONS.PROGRAMS, programId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() } as Program;
    }
  } catch (err) {
    console.warn('[ProgramService] getProgramById error, falling back to defaults:', err);
  }

  const defaultFound = DEFAULT_PROGRAMS.find((p) => p.id === programId);
  return defaultFound || null;
}

/**
 * Subscribe to the active program of a user.
 */
export function subscribeToUserActiveProgram(
  userId: string,
  callback: (userProgram: UserProgram | null) => void
): Unsubscribe {
  const q = query(
    collection(db, COLLECTIONS.USER_PROGRAMS),
    where('userId', '==', userId),
    where('status', '==', 'active'),
    limit(1)
  );

  return onSnapshot(
    q,
    (snap) => {
      if (snap.empty) {
        callback(null);
        return;
      }
      const docSnap = snap.docs[0];
      const data = docSnap.data();
      callback({
        id: docSnap.id,
        ...data,
      } as UserProgram);
    },
    (err) => {
      console.error('[ProgramService] Error listening to user active program:', err);
      callback(null);
    }
  );
}

/**
 * Recursively strip undefined values from an object before sending to Firestore.
 * Firestore strictly forbids `undefined` in document fields.
 */
function sanitizeFirestore<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return null as unknown as T;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeFirestore(item)) as unknown as T;
  }
  if (typeof obj === 'object' && !(obj instanceof Date)) {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = sanitizeFirestore(value);
      }
    }
    return cleaned as T;
  }
  return obj;
}

/**
 * Enroll a user in a program.
 */
export async function enrollUserInProgram(
  userId: string,
  user: { name: string; email: string; phone?: string },
  program: Program,
  startingToday: boolean = true
): Promise<string> {
  const now = new Date();
  const startDate = startingToday ? now : new Date(now.getTime() + 86400000);
  const endDate = new Date(startDate.getTime() + (program.durationDays - 1) * 86400000);

  const newDocRef = doc(collection(db, COLLECTIONS.USER_PROGRAMS));
  const newProgramData: Omit<UserProgram, 'id'> = {
    userId,
    userName: user.name || 'Client',
    userEmail: user.email || '',
    userPhone: user.phone || null,
    programId: program.id,
    programTitle: program.title,
    programSlug: program.slug,
    programGoal: program.goal,
    durationDays: program.durationDays,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    currentDay: 1,
    status: 'active',
    checkins: [],
    programSnapshot: sanitizeFirestore(program),
    createdAt: new Date().toISOString(),
  };

  await setDoc(newDocRef, {
    ...sanitizeFirestore(newProgramData),
    _serverTimestamp: serverTimestamp(),
  });

  return newDocRef.id;
}

/**
 * Save a custom generated program for a user without activating it immediately.
 */
export async function saveUserCustomProgram(
  userId: string,
  user: { name: string; email: string; phone?: string },
  program: Program
): Promise<string> {
  const newDocRef = doc(collection(db, COLLECTIONS.USER_PROGRAMS));
  const newProgramData: Omit<UserProgram, 'id'> = {
    userId,
    userName: user.name || 'Client',
    userEmail: user.email || '',
    userPhone: user.phone || null,
    programId: program.id,
    programTitle: program.title,
    programSlug: program.slug,
    programGoal: program.goal,
    durationDays: program.durationDays,
    startDate: new Date().toISOString(),
    endDate: new Date().toISOString(),
    currentDay: 1,
    status: 'saved',
    checkins: [],
    programSnapshot: sanitizeFirestore(program),
    createdAt: new Date().toISOString(),
  };

  await setDoc(newDocRef, {
    ...sanitizeFirestore(newProgramData),
    _serverTimestamp: serverTimestamp(),
  });

  return newDocRef.id;
}

/**
 * Subscribe to all saved programs of a user.
 */
export function subscribeToUserSavedPrograms(
  userId: string,
  callback: (savedPrograms: UserProgram[]) => void
): Unsubscribe {
  const q = query(
    collection(db, COLLECTIONS.USER_PROGRAMS),
    where('userId', '==', userId),
    where('status', '==', 'saved')
  );

  return onSnapshot(
    q,
    (snap) => {
      const list: UserProgram[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as UserProgram);
      });
      list.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      callback(list);
    },
    (err) => {
      console.error('[ProgramService] Error listening to user saved programs:', err);
      callback([]);
    }
  );
}

/**
 * Subscribe to all completed or past programs of a user.
 */
export function subscribeToUserPastPrograms(
  userId: string,
  callback: (pastPrograms: UserProgram[]) => void
): Unsubscribe {
  const q = query(
    collection(db, COLLECTIONS.USER_PROGRAMS),
    where('userId', '==', userId),
    where('status', 'in', ['completed', 'cancelled', 'paused'])
  );

  return onSnapshot(
    q,
    (snap) => {
      const list: UserProgram[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as UserProgram);
      });
      list.sort(
        (a, b) => new Date(b.endDate || b.createdAt).getTime() - new Date(a.endDate || a.createdAt).getTime()
      );
      callback(list);
    },
    (err) => {
      console.error('[ProgramService] Error listening to user past programs:', err);
      callback([]);
    }
  );
}

/**
 * Activate a saved program for a user. Pauses any currently active program.
 */
export async function activateUserSavedProgram(
  userProgramId: string,
  userId: string,
  startingToday: boolean = true
): Promise<void> {
  // 1. Pause any currently active program for this user
  const activeQ = query(
    collection(db, COLLECTIONS.USER_PROGRAMS),
    where('userId', '==', userId),
    where('status', '==', 'active')
  );
  const activeSnap = await getDocs(activeQ);
  for (const activeDoc of activeSnap.docs) {
    if (activeDoc.id !== userProgramId) {
      await updateDoc(doc(db, COLLECTIONS.USER_PROGRAMS, activeDoc.id), {
        status: 'paused',
      });
    }
  }

  // 2. Activate this program with fresh start date
  const now = new Date();
  const targetDoc = doc(db, COLLECTIONS.USER_PROGRAMS, userProgramId);
  const snap = await getDoc(targetDoc);
  if (!snap.exists()) return;
  const data = snap.data() as UserProgram;
  const duration = data.durationDays || 3;
  const startDate = startingToday ? now : new Date(now.getTime() + 86400000);
  const endDate = new Date(startDate.getTime() + (duration - 1) * 86400000);

  await updateDoc(targetDoc, {
    status: 'active',
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    currentDay: 1,
    checkins: [],
    lastCheckinDate: null,
  });
}

/**
 * Delete a user program document.
 */
export async function deleteUserProgram(userProgramId: string): Promise<void> {
  const ref = doc(db, COLLECTIONS.USER_PROGRAMS, userProgramId);
  await deleteDoc(ref);
}

/**
 * Daily check-in for a program.
 */
export async function checkinProgramDay(
  userProgram: UserProgram,
  dayNumber: number,
  notes?: string
): Promise<void> {
  const ref = doc(db, COLLECTIONS.USER_PROGRAMS, userProgram.id);
  const existingCheckin = userProgram.checkins.find(
    (c) => (c.dayNumber || c.day) === dayNumber
  );

  let newCheckins: UserProgramCheckin[];
  const todayIso = new Date().toISOString();

  if (existingCheckin) {
    newCheckins = userProgram.checkins.map((c) =>
      (c.dayNumber || c.day) === dayNumber
        ? {
            ...c,
            dayNumber,
            day: dayNumber,
            completedAt: todayIso,
            note: notes ?? c.note ?? c.notes ?? null,
            notes: notes ?? c.notes ?? c.note ?? null,
          }
        : c
    );
  } else {
    newCheckins = [
      ...userProgram.checkins,
      {
        dayNumber,
        day: dayNumber,
        completedAt: todayIso,
        note: notes ?? null,
        notes: notes ?? null,
      },
    ];
  }

  // Calculate next currentDay or completion
  const isCompleted = newCheckins.length >= userProgram.durationDays;
  const nextDay = Math.min(userProgram.durationDays, Math.max(dayNumber + 1, userProgram.currentDay));

  await updateDoc(ref, {
    checkins: sanitizeFirestore(newCheckins),
    currentDay: isCompleted ? userProgram.durationDays : nextDay,
    status: isCompleted ? 'completed' : 'active',
    lastCheckinDate: todayIso,
  });
}

/**
 * Cancel or pause a user's program.
 */
export async function cancelUserProgram(userProgramId: string): Promise<void> {
  const ref = doc(db, COLLECTIONS.USER_PROGRAMS, userProgramId);
  await updateDoc(ref, {
    status: 'cancelled',
    cancelledAt: new Date().toISOString(),
  });
}

/**
 * ── Settings FYS Program ───────────────────────────────────────────────────────
 */

export async function getProgramsSettings(): Promise<ProgramsPageSettings> {
  try {
    const docRef = doc(db, COLLECTIONS.SETTINGS, 'programs');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return {
        ...DEFAULT_PROGRAMS_PAGE_SETTINGS,
        ...snap.data(),
      } as ProgramsPageSettings;
    }
  } catch (err) {
    console.warn('[ProgramService] Could not fetch programs settings, using defaults:', err);
  }
  return DEFAULT_PROGRAMS_PAGE_SETTINGS;
}

export async function updateProgramsSettings(
  settings: Partial<ProgramsPageSettings>
): Promise<void> {
  const docRef = doc(db, COLLECTIONS.SETTINGS, 'programs');
  await setDoc(
    docRef,
    {
      ...settings,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

/**
 * ── Admin Cures CRUD ──────────────────────────────────────────────────────────
 */

export async function getAllPrograms(includeInactive = true): Promise<Program[]> {
  try {
    const colRef = collection(db, COLLECTIONS.PROGRAMS);
    const q = includeInactive ? query(colRef) : query(colRef, where('isActive', '==', true));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const progs: Program[] = [];
      snap.forEach((d) => {
        progs.push({ id: d.id, ...d.data() } as Program);
      });
      return progs;
    }
  } catch (err) {
    console.warn('[ProgramService] getAllPrograms error:', err);
  }

  return includeInactive
    ? DEFAULT_PROGRAMS
    : DEFAULT_PROGRAMS.filter((p) => p.isActive);
}

export async function createProgram(
  programData: Omit<Program, 'id'>,
  customId?: string
): Promise<string> {
  const id = customId || `program-${Date.now()}`;
  const docRef = doc(db, COLLECTIONS.PROGRAMS, id);
  await setDoc(docRef, {
    ...programData,
    id,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return id;
}

export async function updateProgram(
  id: string,
  updates: Partial<Program>
): Promise<void> {
  const docRef = doc(db, COLLECTIONS.PROGRAMS, id);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteProgram(id: string): Promise<void> {
  const docRef = doc(db, COLLECTIONS.PROGRAMS, id);
  await deleteDoc(docRef);
}

/**
 * Seed or re-seed default programs into Firestore.
 */
export async function seedDefaultPrograms(): Promise<number> {
  let count = 0;
  for (const prog of DEFAULT_PROGRAMS) {
    const docRef = doc(db, COLLECTIONS.PROGRAMS, prog.id);
    await setDoc(
      docRef,
      {
        ...prog,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    count++;
  }
  return count;
}

/**
 * Fetch all user programs across the platform for admin monitoring.
 */
export async function getAllUserPrograms(): Promise<UserProgram[]> {
  try {
    const q = query(collection(db, COLLECTIONS.USER_PROGRAMS), limit(100));
    const snap = await getDocs(q);
    const list: UserProgram[] = [];
    snap.forEach((d) => {
      list.push({ id: d.id, ...d.data() } as UserProgram);
    });
    // sort by start date descending
    list.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
    return list;
  } catch (err) {
    console.error('[ProgramService] getAllUserPrograms error:', err);
    return [];
  }
}

