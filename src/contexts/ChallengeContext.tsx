
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
      
      // Query all challenges where current user is involved
      const userChallengesQuery = query(
        collection(db, 'challenges'),
        or(
          where('senderId', '==', currentUser.uid),
          where('receiverId', '==', currentUser.uid)
        ),
        orderBy('createdAt', 'desc')
      );
      
      const challengesSnapshot = await getDocs(userChallengesQuery);
      
      const sent: Challenge[] = [];
      const received: Challenge[] = [];
      const active: Challenge[] = [];
      const completed: Challenge[] = [];
      
      challengesSnapshot.forEach(doc => {
        const challenge = {
          id: doc.id,
          ...doc.data()
        } as Challenge;
        
        // Check if challenge has ended
        const endDate = new Date(challenge.endDate);
        const today = new Date();
        
        if (endDate < today && challenge.status === 'active') {
          // Challenge has ended, update status to completed
          updateDoc(doc.ref, { status: 'completed' });
          challenge.status = 'completed';
        }
        
        // Categorize the challenge
        if (challenge.senderId === currentUser.uid && challenge.status === 'pending') {
          sent.push(challenge);
        } else if (challenge.receiverId === currentUser.uid && challenge.status === 'pending') {
          received.push(challenge);
        } else if (challenge.status === 'active') {
          active.push(challenge);
        } else if (challenge.status === 'completed') {
          completed.push(challenge);
        }
      });
      
      setSentChallenges(sent);
      setReceivedChallenges(received);
      setActiveChallenges(active);
      setCompletedChallenges(completed);
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
      status: 'pending',
      senderProgress: 0,
      receiverProgress: 0,
      createdAt: new Date().toISOString()
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
      status: 'active',
      updatedAt: new Date().toISOString()
    });
    
    // Move challenge from received to active
    setReceivedChallenges(prev =>
      prev.filter(c => c.id !== challengeId)
    );
    
    const challenge = receivedChallenges.find(c => c.id === challengeId);
    if (challenge) {
      const updatedChallenge = { ...challenge, status: 'active' };
      setActiveChallenges(prev => [updatedChallenge, ...prev]);
    }
  };

  const declineChallenge = async (challengeId: string) => {
    const challengeRef = doc(db, 'challenges', challengeId);
    
    await updateDoc(challengeRef, {
      status: 'declined',
      updatedAt: new Date().toISOString()
    });
    
    // Remove from received challenges
    setReceivedChallenges(prev =>
      prev.filter(c => c.id !== challengeId)
    );
  };

  const cancelChallenge = async (challengeId: string) => {
    const challengeRef = doc(db, 'challenges', challengeId);
    
    await updateDoc(challengeRef, {
      status: 'cancelled',
      updatedAt: new Date().toISOString()
    });
    
    // Remove from sent or active challenges
    setSentChallenges(prev =>
      prev.filter(c => c.id !== challengeId)
    );
    
    setActiveChallenges(prev =>
      prev.filter(c => c.id !== challengeId)
    );
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
      
      // Update local state
      setActiveChallenges(prev =>
        prev.map(c =>
          c.id === challengeId ? { ...c, senderProgress: progress } : c
        )
      );
    } else {
      await updateDoc(challengeRef, {
        receiverProgress: progress,
        updatedAt: new Date().toISOString()
      });
      
      // Update local state
      setActiveChallenges(prev =>
        prev.map(c =>
          c.id === challengeId ? { ...c, receiverProgress: progress } : c
        )
      );
    }
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
