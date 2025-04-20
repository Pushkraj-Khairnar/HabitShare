
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
  or
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from './AuthContext';

export type Friend = {
  id: string;
  userId: string;
  friendId: string;
  status: 'pending' | 'accepted';
  createdAt: string;
};

export type FriendProfile = {
  id: string;
  username: string;
  email: string;
  avatarUrl: string | null;
};

type FriendContextType = {
  friends: FriendProfile[];
  pendingRequests: FriendProfile[];
  sentRequests: FriendProfile[];
  isLoading: boolean;
  sendFriendRequest: (email: string) => Promise<void>;
  acceptFriendRequest: (friendshipId: string) => Promise<void>;
  rejectFriendRequest: (friendshipId: string) => Promise<void>;
  removeFriend: (friendId: string) => Promise<void>;
  searchUsers: (query: string) => Promise<FriendProfile[]>;
  refreshFriends: () => Promise<void>;
};

const FriendContext = createContext<FriendContextType | null>(null);

export function useFriends() {
  const context = useContext(FriendContext);
  if (!context) {
    throw new Error('useFriends must be used within a FriendProvider');
  }
  return context;
}

export function FriendProvider({ children }: { children: React.ReactNode }) {
  const [friends, setFriends] = useState<FriendProfile[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FriendProfile[]>([]);
  const [sentRequests, setSentRequests] = useState<FriendProfile[]>([]);
  const [friendships, setFriendships] = useState<Friend[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { currentUser } = useAuth();

  useEffect(() => {
    if (currentUser) {
      fetchFriendData();
    } else {
      setFriends([]);
      setPendingRequests([]);
      setSentRequests([]);
      setFriendships([]);
      setIsLoading(false);
    }
  }, [currentUser]);

  const fetchFriendData = async () => {
    if (!currentUser) return;
    
    try {
      setIsLoading(true);
      
      // Query all friendships where current user is involved
      const userFriendshipsQuery = query(
        collection(db, 'friends'),
        or(
          where('userId', '==', currentUser.uid),
          where('friendId', '==', currentUser.uid)
        )
      );
      
      const friendshipsSnapshot = await getDocs(userFriendshipsQuery);
      const friendshipsList: Friend[] = [];
      
      friendshipsSnapshot.forEach(doc => {
        friendshipsList.push({
          id: doc.id,
          ...doc.data()
        } as Friend);
      });
      
      setFriendships(friendshipsList);
      
      // Process into the three lists: friends, pending requests, sent requests
      const acceptedFriends: FriendProfile[] = [];
      const pendingList: FriendProfile[] = [];
      const sentList: FriendProfile[] = [];
      
      await Promise.all(
        friendshipsList.map(async friendship => {
          let profileId: string;
          
          if (friendship.userId === currentUser.uid) {
            profileId = friendship.friendId;
          } else {
            profileId = friendship.userId;
          }
          
          const userDoc = await getDoc(doc(db, 'users', profileId));
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            const profile: FriendProfile = {
              id: profileId,
              username: userData.username,
              email: userData.email,
              avatarUrl: userData.avatarUrl || null
            };
            
            if (friendship.status === 'accepted') {
              acceptedFriends.push(profile);
            } else if (friendship.status === 'pending') {
              if (friendship.userId === currentUser.uid) {
                sentList.push(profile);
              } else {
                pendingList.push({
                  ...profile,
                  id: friendship.id // Use friendship ID for pending requests
                });
              }
            }
          }
        })
      );
      
      setFriends(acceptedFriends);
      setPendingRequests(pendingList);
      setSentRequests(sentList);
    } catch (error) {
      console.error('Error fetching friend data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const searchUsers = async (searchQuery: string): Promise<FriendProfile[]> => {
    if (!currentUser || !searchQuery || searchQuery.length < 3) {
      return [];
    }
    
    try {
      // Search by email
      const usersQuery = query(
        collection(db, 'users'),
        where('email', '==', searchQuery)
      );
      
      const querySnapshot = await getDocs(usersQuery);
      const results: FriendProfile[] = [];
      
      querySnapshot.forEach(doc => {
        // Don't include current user in search results
        if (doc.id !== currentUser.uid) {
          const userData = doc.data();
          results.push({
            id: doc.id,
            username: userData.username,
            email: userData.email,
            avatarUrl: userData.avatarUrl || null
          });
        }
      });
      
      return results;
    } catch (error) {
      console.error('Error searching users:', error);
      return [];
    }
  };

  const sendFriendRequest = async (email: string) => {
    if (!currentUser) throw new Error('User must be logged in');
    
    // Find user by email
    const usersQuery = query(
      collection(db, 'users'),
      where('email', '==', email)
    );
    
    const querySnapshot = await getDocs(usersQuery);
    
    if (querySnapshot.empty) {
      throw new Error('User not found');
    }
    
    const friendDoc = querySnapshot.docs[0];
    const friendId = friendDoc.id;
    
    // Don't allow sending friend request to self
    if (friendId === currentUser.uid) {
      throw new Error('Cannot send friend request to yourself');
    }
    
    // Check if friendship already exists
    const existingQuery = query(
      collection(db, 'friends'),
      or(
        where('userId', '==', currentUser.uid),
        where('friendId', '==', currentUser.uid)
      ),
      or(
        where('userId', '==', friendId),
        where('friendId', '==', friendId)
      )
    );
    
    const existingSnapshot = await getDocs(existingQuery);
    
    if (!existingSnapshot.empty) {
      throw new Error('Friend request already exists or you are already friends');
    }
    
    // Create the friend request
    const friendshipData = {
      userId: currentUser.uid,
      friendId,
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    
    await addDoc(collection(db, 'friends'), friendshipData);
    
    // Refresh friend data
    await fetchFriendData();
  };

  const acceptFriendRequest = async (friendshipId: string) => {
    if (!currentUser) throw new Error('User must be logged in');
    
    const friendshipRef = doc(db, 'friends', friendshipId);
    
    await updateDoc(friendshipRef, {
      status: 'accepted',
      updatedAt: new Date().toISOString()
    });
    
    // Refresh friend data
    await fetchFriendData();
  };

  const rejectFriendRequest = async (friendshipId: string) => {
    await deleteDoc(doc(db, 'friends', friendshipId));
    
    // Refresh friend data
    await fetchFriendData();
  };

  const removeFriend = async (friendId: string) => {
    if (!currentUser) throw new Error('User must be logged in');
    
    const friendship = friendships.find(f => 
      (f.userId === currentUser.uid && f.friendId === friendId) ||
      (f.userId === friendId && f.friendId === currentUser.uid)
    );
    
    if (friendship) {
      await deleteDoc(doc(db, 'friends', friendship.id));
    }
    
    // Refresh friend data
    await fetchFriendData();
  };

  const refreshFriends = async () => {
    await fetchFriendData();
  };

  const value = {
    friends,
    pendingRequests,
    sentRequests,
    isLoading,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    removeFriend,
    searchUsers,
    refreshFriends
  };

  return (
    <FriendContext.Provider value={value}>
      {children}
    </FriendContext.Provider>
  );
}
