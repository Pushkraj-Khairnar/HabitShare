
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
  status: 'pending' | 'active' | 'completed' | 'declined' | 'cancelled';
  senderProgress: number;
  receiverProgress: number;
  createdAt: string;
};

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
  updateProgress: (challengeId: string, progress: number) => Promise<void>;
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
      
      // Fix: Use simpler queries without composite indexes
      // Query sent challenges without ordering
      const sentChallengesQuery = query(
        collection(db, 'challenges'),
        where('senderId', '==', currentUser.uid)
      );
      
      // Query received challenges without ordering
      const receivedChallengesQuery = query(
        collection(db, 'challenges'),
        where('receiverId', '==', currentUser.uid)
      );
      
      const [sentSnapshot, receivedSnapshot] = await Promise.all([
        getDocs(sentChallengesQuery),
        getDocs(receivedChallengesQuery)
      ]);
      
      const sent: Challenge[] = [];
      const received: Challenge[] = [];
      const active: Challenge[] = [];
      const completed: Challenge[] = [];
      
      const updatePromises: Promise<void>[] = [];
      
      // Process sent challenges
      sentSnapshot.forEach(doc => {
        const challenge = {
          id: doc.id,
          ...doc.data()
        } as Challenge;
        
        // Check if challenge has ended
        const endDate = new Date(challenge.endDate);
        const today = new Date();
        
        if (endDate < today && challenge.status === 'active') {
          // Update to completed status
          const updatePromise = updateDoc(doc.ref, { 
            status: 'completed' as const 
          });
          updatePromises.push(updatePromise);
          challenge.status = 'completed';
        }
        
        // Categorize the challenge
        if (challenge.status === 'pending') {
          sent.push(challenge);
        } else if (challenge.status === 'active') {
          active.push(challenge);
        } else if (challenge.status === 'completed') {
          completed.push(challenge);
        }
      });
      
      // Process received challenges
      receivedSnapshot.forEach(doc => {
        const challenge = {
          id: doc.id,
          ...doc.data()
        } as Challenge;
        
        // Check if challenge has ended
        const endDate = new Date(challenge.endDate);
        const today = new Date();
        
        if (endDate < today && challenge.status === 'active') {
          // Update to completed status
          const updatePromise = updateDoc(doc.ref, { 
            status: 'completed' as const 
          });
          updatePromises.push(updatePromise);
          challenge.status = 'completed';
        }
        
        // Categorize the challenge
        if (challenge.status === 'pending') {
          received.push(challenge);
        } else if (challenge.status === 'active') {
          active.push(challenge);
        } else if (challenge.status === 'completed') {
          completed.push(challenge);
        }
      });
      
      // Wait for all status updates to complete
      if (updatePromises.length > 0) {
        await Promise.all(updatePromises);
      }
      
      // Sort challenges by createdAt date (newest first) after fetching
      const sortByDate = (a: Challenge, b: Challenge) => {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      };
      
      setSentChallenges(sent.sort(sortByDate));
      setReceivedChallenges(received.sort(sortByDate));
      setActiveChallenges(active.sort(sortByDate));
      setCompletedChallenges(completed.sort(sortByDate));
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
      createdAt: new Date().toISOString()
    };
    
    const challengeRef = await addDoc(collection(db, 'challenges'), challengeData);
    
    const newChallenge = {
      id: challengeRef.id,
      ...challengeData
    };
    
    // Update the sent challenges state
    setSentChallenges(prev => [newChallenge, ...prev]);
    
    return newChallenge;
  };

  const acceptChallenge = async (challengeId: string) => {
    const challengeRef = doc(db, 'challenges', challengeId);
    
    await updateDoc(challengeRef, {
      status: 'active' as const,
      updatedAt: new Date().toISOString()
    });
    
    // Refresh all challenges to get updated data
    await fetchChallenges();
  };

  const declineChallenge = async (challengeId: string) => {
    const challengeRef = doc(db, 'challenges', challengeId);
    
    await updateDoc(challengeRef, {
      status: 'declined' as const,
      updatedAt: new Date().toISOString()
    });
    
    // Refresh all challenges to get updated data
    await fetchChallenges();
  };

  const cancelChallenge = async (challengeId: string) => {
    const challengeRef = doc(db, 'challenges', challengeId);
    
    await updateDoc(challengeRef, {
      status: 'cancelled' as const,
      updatedAt: new Date().toISOString()
    });
    
    // Refresh all challenges to get updated data
    await fetchChallenges();
  };

  const updateProgress = async (challengeId: string, progress: number) => {
    if (!currentUser) throw new Error('User must be logged in');
    
    const challengeRef = doc(db, 'challenges', challengeId);
    const challenge = await getDoc(challengeRef);
    
    if (!challenge.exists()) {
      throw new Error('Challenge not found');
    }
    
    const challengeData = challenge.data() as Challenge;
    
    // Update the progress for the current user
    if (challengeData.senderId === currentUser.uid) {
      await updateDoc(challengeRef, {
        senderProgress: progress,
        updatedAt: new Date().toISOString()
      });
    } else {
      await updateDoc(challengeRef, {
        receiverProgress: progress,
        updatedAt: new Date().toISOString()
      });
    }
    
    // Refresh challenges to reflect the updated progress
    await fetchChallenges();
  };

  const getChallengeUsers = async (challenge: Challenge) => {
    const [senderDoc, receiverDoc] = await Promise.all([
      getDoc(doc(db, 'users', challenge.senderId)),
      getDoc(doc(db, 'users', challenge.receiverId))
    ]);
    
    // Count wins from completed challenges
    const wins = await getChallengeWins();
    
    // Return user data with progress
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

  // Get total number of challenge wins for all users
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
      
      // Determine the winner (or tie)
      if (challenge.senderProgress > challenge.receiverProgress) {
        wins[challenge.senderId] = (wins[challenge.senderId] || 0) + 1;
      } else if (challenge.receiverProgress > challenge.senderProgress) {
        wins[challenge.receiverId] = (wins[challenge.receiverId] || 0) + 1;
      } else {
        // Tie - both get half a point
        wins[challenge.senderId] = (wins[challenge.senderId] || 0) + 0.5;
        wins[challenge.receiverId] = (wins[challenge.receiverId] || 0) + 0.5;
      }
    });
    
    return wins;
  };

  const refreshChallenges = async () => {
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
