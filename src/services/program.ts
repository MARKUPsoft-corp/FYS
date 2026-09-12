import {
  collection,
  doc,
  setDoc,
  updateDoc,
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
  type Program,
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
 * Enroll a user into a program.
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
    userName: user.name,
    userEmail: user.email,
    userPhone: user.phone,
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
    programSnapshot: program,
    createdAt: new Date().toISOString(),
  };

  await setDoc(newDocRef, {
    ...newProgramData,
    _serverTimestamp: serverTimestamp(),
  });

  return newDocRef.id;
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
  const existingCheckin = userProgram.checkins.find((c) => c.day === dayNumber);

  let newCheckins: UserProgramCheckin[];
  const todayIso = new Date().toISOString();

  if (existingCheckin) {
    newCheckins = userProgram.checkins.map((c) =>
      c.day === dayNumber
        ? { ...c, completedAt: todayIso, notes: notes ?? c.notes }
        : c
    );
  } else {
    newCheckins = [
      ...userProgram.checkins,
      {
        day: dayNumber,
        completedAt: todayIso,
        notes,
      },
    ];
  }

  // Calculate next currentDay or completion
  const isCompleted = newCheckins.length >= userProgram.durationDays;
  const nextDay = Math.min(userProgram.durationDays, Math.max(dayNumber + 1, userProgram.currentDay));

  await updateDoc(ref, {
    checkins: newCheckins,
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
