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
  or,
  orderBy
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from './AuthContext';

export type Challenge = {
  id: string;
  senderId: string;
  receiverId: string;
  habitName: string;
  description: string;
  frequency: 'daily' | 'weekly';
  duration: number; // in days
  startDate: string;
  endDate: string;
  status: 'pending' | 'active' | 'completed' | 'declined' | 'cancelled' | 'failed';
  senderProgress: number;
  receiverProgress: number;
  createdAt: string;
  senderDailyCompletions: string[]; // Array of dates when sender marked complete
  receiverDailyCompletions: string[]; // Array of dates when receiver marked complete
  senderDailyPhotos: Record<string, string>; // Date -> photo URL mapping
  receiverDailyPhotos: Record<string, string>; // Date -> photo URL mapping
  lastCheckedDate: string; // To track when we last checked streak
};

// Define the UserWithProgress type that was missing
export type UserWithProgress = {
  id: string;
  username: string;
  avatarUrl: string | null;
  progress: number;
  wins: number;
};

type ChallengeContextType = {
  sentChallenges: Challenge[];
  receivedChallenges: Challenge[];
  activeChallenges: Challenge[];
  completedChallenges: Challenge[];
  isLoading: boolean;
  createChallenge: (data: {
    receiverId: string;
    habitName: string;
    description: string;
    frequency: 'daily' | 'weekly';
    duration: number;
    startDate: string;
  }) => Promise<Challenge>;
  acceptChallenge: (challengeId: string) => Promise<void>;
  declineChallenge: (challengeId: string) => Promise<void>;
  cancelChallenge: (challengeId: string) => Promise<void>;
  updateProgress: (challengeId: string, progress: number, photoUrl?: string) => Promise<void>;
  getChallengeUsers: (challenge: Challenge) => Promise<{
    sender: UserWithProgress;
    receiver: UserWithProgress;
  }>;
  refreshChallenges: () => Promise<void>;
};

const ChallengeContext = createContext<ChallengeContextType | null>(null);

export function useChallenges() {
  const context = useContext(ChallengeContext);
  if (!context) {
    throw new Error('useChallenges must be used within a ChallengeProvider');
  }
  return context;
}

export function ChallengeProvider({ children }: { children: React.ReactNode }) {
  const [sentChallenges, setSentChallenges] = useState<Challenge[]>([]);
  const [receivedChallenges, setReceivedChallenges] = useState<Challenge[]>([]);
  const [activeChallenges, setActiveChallenges] = useState<Challenge[]>([]);
  const [completedChallenges, setCompletedChallenges] = useState<Challenge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { currentUser, userProfile } = useAuth();

  useEffect(() => {
    if (currentUser) {
      fetchChallenges();
    } else {
      setSentChallenges([]);
      setReceivedChallenges([]);
      setActiveChallenges([]);
      setCompletedChallenges([]);
      setIsLoading(false);
    }
  }, [currentUser]);

  const fetchChallenges = async () => {
    if (!currentUser) return;
    
    try {
      setIsLoading(true);
      console.log('Fetching challenges for user:', currentUser.uid);
      
      // IMPORTANT FIX: Removed the orderBy to avoid query limitations
      const userChallengesQuery = query(
        collection(db, 'challenges'),
        or(
          where('senderId', '==', currentUser.uid),
          where('receiverId', '==', currentUser.uid)
        )
      );
      
      const challengesSnapshot = await getDocs(userChallengesQuery);
      
      const sent: Challenge[] = [];
      const received: Challenge[] = [];
      const active: Challenge[] = [];
      const completed: Challenge[] = [];
      
      console.log('Found challenges:', challengesSnapshot.size);
      
      challengesSnapshot.forEach(doc => {
        const challenge = {
          id: doc.id,
          ...doc.data(),
          // Ensure arrays and objects are initialized
          senderDailyCompletions: doc.data().senderDailyCompletions || [],
          receiverDailyCompletions: doc.data().receiverDailyCompletions || [],
          senderDailyPhotos: doc.data().senderDailyPhotos || {},
          receiverDailyPhotos: doc.data().receiverDailyPhotos || {}
        } as Challenge;
        
        console.log('Challenge:', challenge.id, 'Status:', challenge.status, 'SenderId:', challenge.senderId, 'ReceiverId:', challenge.receiverId);
        
        const endDate = new Date(challenge.endDate);
        const today = new Date();
        
        // Update completed challenges
        if (endDate < today && challenge.status === 'active') {
          updateDoc(doc.ref, { 
            status: 'completed' as const 
          });
          challenge.status = 'completed';
        }
        
        // Make sure to properly categorize challenges
        if (challenge.status === 'pending') {
          if (challenge.senderId === currentUser.uid) {
            sent.push(challenge);
            console.log('Added to sent challenges');
          } else if (challenge.receiverId === currentUser.uid) {
            received.push(challenge);
            console.log('Added to received challenges');
          }
        } else if (challenge.status === 'active') {
          active.push(challenge);
          console.log('Added to active challenges');
        } else if (challenge.status === 'completed' || challenge.status === 'failed') {
          completed.push(challenge);
          console.log('Added to completed challenges');
        }
      });
      
      console.log('Final counts - Sent:', sent.length, 'Received:', received.length, 
                 'Active:', active.length, 'Completed:', completed.length);
      
      // Re-sort challenges by creation date
      const sortByDateDesc = (a: Challenge, b: Challenge) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      
      setSentChallenges(sent.sort(sortByDateDesc));
      setReceivedChallenges(received.sort(sortByDateDesc));
      setActiveChallenges(active.sort(sortByDateDesc));
      setCompletedChallenges(completed.sort(sortByDateDesc));
    } catch (error) {
      console.error('Error fetching challenges:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const createChallenge = async (data: {
    receiverId: string;
    habitName: string;
    description: string;
    frequency: 'daily' | 'weekly';
    duration: number;
    startDate: string;
  }): Promise<Challenge> => {
    if (!currentUser) throw new Error('User must be logged in');
    
    const startDate = new Date(data.startDate);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + data.duration);
    
    const challengeData = {
      senderId: currentUser.uid,
      receiverId: data.receiverId,
      habitName: data.habitName,
      description: data.description,
      frequency: data.frequency,
      duration: data.duration,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      status: 'pending' as const,
      senderProgress: 0,
      receiverProgress: 0,
      createdAt: new Date().toISOString(),
      senderDailyCompletions: [],
      receiverDailyCompletions: [],
      senderDailyPhotos: {},
      receiverDailyPhotos: {},
      lastCheckedDate: startDate.toISOString()
    };
    
    const challengeRef = await addDoc(collection(db, 'challenges'), challengeData);
    
    const newChallenge = {
      id: challengeRef.id,
      ...challengeData
    } as Challenge;
    
    setSentChallenges(prev => [newChallenge, ...prev]);
    
    return newChallenge;
  };

  const acceptChallenge = async (challengeId: string) => {
    const challengeRef = doc(db, 'challenges', challengeId);
    
    await updateDoc(challengeRef, {
      status: 'active' as const,
      updatedAt: new Date().toISOString()
    });
    
    setReceivedChallenges(prev =>
      prev.filter(c => c.id !== challengeId)
    );
    
    const challenge = receivedChallenges.find(c => c.id === challengeId);
    if (challenge) {
      const updatedChallenge: Challenge = { 
        ...challenge, 
        status: 'active'
      };
      setActiveChallenges(prev => [updatedChallenge, ...prev]);
    }
  };

  const declineChallenge = async (challengeId: string) => {
    const challengeRef = doc(db, 'challenges', challengeId);
    
    await updateDoc(challengeRef, {
      status: 'declined' as const,
      updatedAt: new Date().toISOString()
    });
    
    setReceivedChallenges(prev =>
      prev.filter(c => c.id !== challengeId)
    );
  };

  const cancelChallenge = async (challengeId: string) => {
    const challengeRef = doc(db, 'challenges', challengeId);
    
    await updateDoc(challengeRef, {
      status: 'cancelled' as const,
      updatedAt: new Date().toISOString()
    });
    
    setSentChallenges(prev =>
      prev.filter(c => c.id !== challengeId)
    );
    
    setActiveChallenges(prev =>
      prev.filter(c => c.id !== challengeId)
    );
  };

  const updateProgress = async (challengeId: string, progress: number, photoUrl?: string) => {
    if (!currentUser) throw new Error('User must be logged in');
    
    const challengeRef = doc(db, 'challenges', challengeId);
    const challenge = await getDoc(challengeRef);
    
    if (!challenge.exists()) {
      throw new Error('Challenge not found');
    }
    
    const challengeData = challenge.data() as Challenge;
    const today = new Date().toISOString().split('T')[0];
    
    if (challengeData.senderId === currentUser.uid) {
      const updatedCompletions = [...(challengeData.senderDailyCompletions || [])];
      const updatedPhotos = { ...(challengeData.senderDailyPhotos || {}) };
      
      if (!updatedCompletions.includes(today)) {
        updatedCompletions.push(today);
      }
      
      if (photoUrl) {
        updatedPhotos[today] = photoUrl;
      }
      
      await updateDoc(challengeRef, {
        senderProgress: progress,
        senderDailyCompletions: updatedCompletions,
        senderDailyPhotos: updatedPhotos,
        updatedAt: new Date().toISOString()
      });
      
      setActiveChallenges(prev =>
        prev.map(c =>
          c.id === challengeId ? { 
            ...c, 
            senderProgress: progress,
            senderDailyCompletions: updatedCompletions,
            senderDailyPhotos: updatedPhotos
          } : c
        )
      );
    } else {
      const updatedCompletions = [...(challengeData.receiverDailyCompletions || [])];
      const updatedPhotos = { ...(challengeData.receiverDailyPhotos || {}) };
      
      if (!updatedCompletions.includes(today)) {
        updatedCompletions.push(today);
      }
      
      if (photoUrl) {
        updatedPhotos[today] = photoUrl;
      }
      
      await updateDoc(challengeRef, {
        receiverProgress: progress,
        receiverDailyCompletions: updatedCompletions,
        receiverDailyPhotos: updatedPhotos,
        updatedAt: new Date().toISOString()
      });
      
      setActiveChallenges(prev =>
        prev.map(c =>
          c.id === challengeId ? { 
            ...c, 
            receiverProgress: progress,
            receiverDailyCompletions: updatedCompletions,
            receiverDailyPhotos: updatedPhotos
          } : c
        )
      );
    }
    
    await checkAndUpdateStreak(challengeRef, {
      ...challengeData,
      id: challengeId,
      senderDailyCompletions: challengeData.senderDailyCompletions || [],
      receiverDailyCompletions: challengeData.receiverDailyCompletions || [],
      senderDailyPhotos: challengeData.senderDailyPhotos || {},
      receiverDailyPhotos: challengeData.receiverDailyPhotos || {}
    });
  };

  const checkAndUpdateStreak = async (challengeRef: any, challenge: Challenge) => {
    const today = new Date();
    const startDate = new Date(challenge.startDate);
    const lastChecked = new Date(challenge.lastCheckedDate || challenge.startDate);
    
    if (lastChecked.toDateString() === today.toDateString()) {
      return;
    }
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    const bothCompletedYesterday = 
      challenge.senderDailyCompletions.includes(yesterdayStr) &&
      challenge.receiverDailyCompletions.includes(yesterdayStr);
    
    if (!bothCompletedYesterday && yesterday >= startDate) {
      await updateDoc(challengeRef, {
        status: 'failed',
        lastCheckedDate: today.toISOString()
      });
      return;
    }
    
    const endDate = new Date(challenge.endDate);
    if (today >= endDate) {
      await updateDoc(challengeRef, {
        status: 'completed',
        lastCheckedDate: today.toISOString()
      });
      return;
    }
    
    await updateDoc(challengeRef, {
      lastCheckedDate: today.toISOString()
    });
  };

  const getChallengeUsers = async (challenge: Challenge) => {
    const [senderDoc, receiverDoc] = await Promise.all([
      getDoc(doc(db, 'users', challenge.senderId)),
      getDoc(doc(db, 'users', challenge.receiverId))
    ]);
    
    const wins = await getChallengeWins();
    
    return {
      sender: {
        id: challenge.senderId,
        username: senderDoc.data()?.username,
        avatarUrl: senderDoc.data()?.avatarUrl || null,
        progress: challenge.senderProgress,
        wins: wins[challenge.senderId] || 0
      },
      receiver: {
        id: challenge.receiverId,
        username: receiverDoc.data()?.username,
        avatarUrl: receiverDoc.data()?.avatarUrl || null,
        progress: challenge.receiverProgress,
        wins: wins[challenge.receiverId] || 0
      }
    };
  };

  const getChallengeWins = async () => {
    if (!currentUser) return {};
    
    const completedQuery = query(
      collection(db, 'challenges'),
      where('status', '==', 'completed')
    );
    
    const completedSnapshot = await getDocs(completedQuery);
    
    const wins: Record<string, number> = {};
    
    completedSnapshot.forEach(doc => {
      const challenge = doc.data() as Challenge;
      
      if (challenge.senderProgress > challenge.receiverProgress) {
        wins[challenge.senderId] = (wins[challenge.senderId] || 0) + 1;
      } else if (challenge.receiverProgress > challenge.senderProgress) {
        wins[challenge.receiverId] = (wins[challenge.receiverId] || 0) + 1;
      } else {
        wins[challenge.senderId] = (wins[challenge.senderId] || 0) + 0.5;
        wins[challenge.receiverId] = (wins[challenge.receiverId] || 0) + 0.5;
      }
    });
    
    return wins;
  };

  const refreshChallenges = async () => {
    // Reset loading state and fetch challenges again
    setIsLoading(true);
    await fetchChallenges();
  };

  const value = {
    sentChallenges,
    receivedChallenges,
    activeChallenges,
    completedChallenges,
    isLoading,
    createChallenge,
    acceptChallenge,
    declineChallenge,
    cancelChallenge,
    updateProgress,
    getChallengeUsers,
    refreshChallenges
  };

  return (
    <ChallengeContext.Provider value={value}>
      {children}
    </ChallengeContext.Provider>
  );
}
