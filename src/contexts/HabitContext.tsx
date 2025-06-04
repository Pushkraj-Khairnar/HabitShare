import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  getDoc,
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  addDoc,
  Timestamp,
  orderBy
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from './AuthContext';

export type Habit = {
  id: string;
  title: string;
  description: string;
  frequency: 'daily' | 'weekly';
  startDate: string;
  userId: string;
  createdAt: string;
  currentStreak: number;
  bestStreak: number;
};

export type HabitLog = {
  id: string;
  habitId: string;
  date: string;
  status: 'completed' | 'missed' | 'pending';
};

type HabitContextType = {
  habits: Habit[];
  habitLogs: Record<string, HabitLog[]>;
  isLoading: boolean;
  createHabit: (habitData: Omit<Habit, 'id' | 'userId' | 'createdAt' | 'currentStreak' | 'bestStreak'>) => Promise<Habit>;
  updateHabit: (habitId: string, habitData: Partial<Habit>) => Promise<void>;
  deleteHabit: (habitId: string) => Promise<void>;
  logHabitCompletion: (habitId: string, date: string, status: 'completed' | 'missed') => Promise<void>;
  getHabitLogs: (habitId: string, startDate?: string, endDate?: string) => Promise<HabitLog[]>;
  refreshHabits: () => Promise<void>;
};

const HabitContext = createContext<HabitContextType | null>(null);

export function useHabits() {
  const context = useContext(HabitContext);
  if (!context) {
    throw new Error('useHabits must be used within a HabitProvider');
  }
  return context;
}

export function HabitProvider({ children }: { children: React.ReactNode }) {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [habitLogs, setHabitLogs] = useState<Record<string, HabitLog[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const { currentUser } = useAuth();

  // Fetch user's habits
  useEffect(() => {
    console.log('HabitContext useEffect triggered, currentUser:', currentUser?.uid);
    if (currentUser) {
      fetchHabits();
    } else {
      console.log('No current user, clearing habits');
      setHabits([]);
      setHabitLogs({});
      setIsLoading(false);
    }
  }, [currentUser]);

  // Fetch habits from Firestore
  const fetchHabits = async () => {
    try {
      console.log('Starting fetchHabits for user:', currentUser?.uid);
      setIsLoading(true);
      if (!currentUser) {
        console.log('No current user in fetchHabits');
        return;
      }

      console.log('Creating habits query...');
      const habitsQuery = query(
        collection(db, 'habits'),
        where('userId', '==', currentUser.uid)
      );

      console.log('Executing habits query...');
      const querySnapshot = await getDocs(habitsQuery);
      console.log('Query executed, found', querySnapshot.size, 'habits');
      
      const habitsData: Habit[] = [];
      const logsData: Record<string, HabitLog[]> = {};
      
      // Get all habits
      querySnapshot.forEach((doc) => {
        const habitData = doc.data();
        console.log('Processing habit:', doc.id, habitData);
        const habit = { id: doc.id, ...habitData } as Habit;
        habitsData.push(habit);
      });
      
      console.log('Processed habits data:', habitsData);
      
      // Get habit logs for each habit
      for (const habit of habitsData) {
        console.log('Fetching logs for habit:', habit.id);
        const logs = await getHabitLogs(habit.id);
        logsData[habit.id] = logs;
        console.log('Fetched logs for habit', habit.id, ':', logs.length, 'logs');
      }
      
      console.log('Setting habits and logs in state');
      setHabits(habitsData);
      setHabitLogs(logsData);
      console.log('Habits state updated, total habits:', habitsData.length);
    } catch (error) {
      console.error('Error fetching habits:', error);
      // Don't throw the error, just log it and continue
    } finally {
      setIsLoading(false);
      console.log('fetchHabits completed, isLoading set to false');
    }
  };

  // Refresh habits data
  const refreshHabits = async () => {
    console.log('Refreshing habits...');
    await fetchHabits();
  };

  // Create a new habit
  const createHabit = async (habitData: Omit<Habit, 'id' | 'userId' | 'createdAt' | 'currentStreak' | 'bestStreak'>) => {
    if (!currentUser) throw new Error('User must be logged in');
    
    console.log('Creating new habit:', habitData);
    const newHabit = {
      ...habitData,
      userId: currentUser.uid,
      createdAt: new Date().toISOString(),
      currentStreak: 0,
      bestStreak: 0
    };
    
    const habitRef = await addDoc(collection(db, 'habits'), newHabit);
    console.log('Habit created with ID:', habitRef.id);
    
    const createdHabit = {
      id: habitRef.id,
      ...newHabit
    } as Habit;
    
    setHabits(prevHabits => [createdHabit, ...prevHabits]);
    
    return createdHabit;
  };

  // Update an existing habit
  const updateHabit = async (habitId: string, habitData: Partial<Habit>) => {
    const habitRef = doc(db, 'habits', habitId);
    await updateDoc(habitRef, {
      ...habitData,
      updatedAt: new Date().toISOString()
    });
    
    setHabits(prevHabits =>
      prevHabits.map(habit =>
        habit.id === habitId ? { ...habit, ...habitData } : habit
      )
    );
  };

  // Delete a habit
  const deleteHabit = async (habitId: string) => {
    await deleteDoc(doc(db, 'habits', habitId));
    
    // Also delete associated logs
    const logsQuery = query(
      collection(db, 'habitLogs'),
      where('habitId', '==', habitId)
    );
    
    const logsSnapshot = await getDocs(logsQuery);
    
    const deletePromises = logsSnapshot.docs.map(doc => 
      deleteDoc(doc.ref)
    );
    
    await Promise.all(deletePromises);
    
    // Update local state
    setHabits(prevHabits => prevHabits.filter(habit => habit.id !== habitId));
    
    const newLogs = { ...habitLogs };
    delete newLogs[habitId];
    setHabitLogs(newLogs);
  };

  // Log habit completion
  const logHabitCompletion = async (habitId: string, date: string, status: 'completed' | 'missed') => {
    if (!currentUser) throw new Error('User must be logged in');

    // Check if a log already exists for this date
    const logsQuery = query(
      collection(db, 'habitLogs'),
      where('habitId', '==', habitId),
      where('date', '==', date)
    );
    
    const logsSnapshot = await getDocs(logsQuery);
    
    let logId: string;
    
    if (logsSnapshot.empty) {
      // Create new log
      const logRef = await addDoc(collection(db, 'habitLogs'), {
        habitId,
        date,
        status,
        userId: currentUser.uid,
        createdAt: new Date().toISOString()
      });
      logId = logRef.id;
    } else {
      // Update existing log
      const logDoc = logsSnapshot.docs[0];
      logId = logDoc.id;
      await updateDoc(logDoc.ref, {
        status,
        updatedAt: new Date().toISOString()
      });
    }
    
    // Update streaks
    await updateHabitStreaks(habitId);
    
    // Update local state
    const newLog: HabitLog = {
      id: logId,
      habitId,
      date,
      status
    };
    
    setHabitLogs(prevLogs => {
      const habitLog = [...(prevLogs[habitId] || [])];
      const existingIndex = habitLog.findIndex(log => log.date === date);
      
      if (existingIndex >= 0) {
        habitLog[existingIndex] = newLog;
      } else {
        habitLog.push(newLog);
      }
      
      return {
        ...prevLogs,
        [habitId]: habitLog
      };
    });
  };

  // Get habit logs for a specific habit
  const getHabitLogs = async (habitId: string, startDate?: string, endDate?: string): Promise<HabitLog[]> => {
    try {
      let logsQuery = query(
        collection(db, 'habitLogs'),
        where('habitId', '==', habitId)
      );
      
      if (startDate) {
        logsQuery = query(logsQuery, where('date', '>=', startDate));
      }
      
      if (endDate) {
        logsQuery = query(logsQuery, where('date', '<=', endDate));
      }
      
      const querySnapshot = await getDocs(logsQuery);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as HabitLog));
    } catch (error) {
      console.error('Error fetching habit logs:', error);
      return [];
    }
  };

  // Calculate and update habit streaks
  const updateHabitStreaks = async (habitId: string) => {
    const habitDoc = await getDoc(doc(db, 'habits', habitId));
    if (!habitDoc.exists()) return;
    
    const habit = { id: habitDoc.id, ...habitDoc.data() } as Habit;
    
    // Get all logs for this habit, sorted by date
    const logs = await getHabitLogs(habitId);
    logs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    // Calculate current streak
    let currentStreak = 0;
    const today = new Date();
    
    // Iterate from the most recent log backwards
    for (let i = logs.length - 1; i >= 0; i--) {
      const log = logs[i];
      const logDate = new Date(log.date);
      
      // Check if the log is for today or before
      if (logDate <= today) {
        if (log.status === 'completed') {
          currentStreak++;
        } else if (log.status === 'missed') {
          break; // Break the streak
        }
      }
    }
    
    // Update the habit's streaks
    const bestStreak = Math.max(habit.bestStreak || 0, currentStreak);
    
    await updateDoc(doc(db, 'habits', habitId), {
      currentStreak,
      bestStreak,
      updatedAt: new Date().toISOString()
    });
    
    // Update local state
    setHabits(prevHabits =>
      prevHabits.map(h =>
        h.id === habitId ? { ...h, currentStreak, bestStreak } : h
      )
    );
  };

  const value = {
    habits,
    habitLogs,
    isLoading,
    createHabit,
    updateHabit,
    deleteHabit,
    logHabitCompletion,
    getHabitLogs,
    refreshHabits
  };

  return (
    <HabitContext.Provider value={value}>
      {children}
    </HabitContext.Provider>
  );
}
