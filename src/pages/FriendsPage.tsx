
import { useState } from 'react';
import { useFriends, FriendProfile } from '@/contexts/FriendContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, UserPlus, Mail, Search } from 'lucide-react';

const FriendsPage = () => {
  const { friends, pendingRequests, sentRequests, isLoading, acceptFriendRequest, rejectFriendRequest, removeFriend, sendFriendRequest, searchUsers } = useFriends();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FriendProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const { toast } = useToast();
  
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (searchQuery.trim().length < 3) {
      toast({
        title: 'Search query too short',
        description: 'Please enter at least 3 characters to search',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      setIsSearching(true);
      const results = await searchUsers(searchQuery);
      setSearchResults(results);
      
      if (results.length === 0) {
        toast({
          title: 'No results found',
          description: 'No users found with that email address',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Search failed',
        description: error.message || 'Failed to search for users',
        variant: 'destructive',
      });
    } finally {
      setIsSearching(false);
    }
  };
  
  const handleSendRequest = async (email: string) => {
    try {
      await sendFriendRequest(email);
      
      toast({
        title: 'Friend request sent!',
        description: 'They\'ll need to accept your request to connect',
      });
      
      // Clear search
      setSearchQuery('');
      setSearchResults([]);
    } catch (error: any) {
      toast({
        title: 'Failed to send request',
        description: error.message || 'There was an error sending the friend request',
        variant: 'destructive',
      });
    }
  };

  const renderFriendCard = (friend: FriendProfile) => (
    <Card key={friend.id} className="mb-4">
      <CardHeader className="pb-2">
        <div className="flex items-center">
          <Avatar className="h-10 w-10 mr-3">
            <AvatarImage src={friend.avatarUrl || undefined} alt={friend.username} />
            <AvatarFallback>{friend.username.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <CardTitle className="text-base">{friend.username}</CardTitle>
            <CardDescription>{friend.email}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardFooter>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => removeFriend(friend.id)}
          className="text-muted-foreground"
        >
          Remove Friend
        </Button>
      </CardFooter>
    </Card>
  );

  return (
    <div className="space-y-6 pb-16">
      <h1 className="text-2xl font-bold">Friends</h1>
      
      <div className="space-y-4">
        <form onSubmit={handleSearch} className="flex space-x-2">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by email address"
            className="flex-1"
          />
          <Button type="submit" disabled={isSearching || searchQuery.trim().length < 3}>
            <Search className="h-4 w-4 mr-2" /> Search
          </Button>
        </form>
        
        {searchResults.length > 0 && (
          <div className="space-y-2 mt-4">
            <h3 className="text-sm font-medium">Search Results</h3>
            {searchResults.map(user => (
              <Card key={user.id} className="mb-3">
                <CardHeader className="pb-2">
                  <div className="flex items-center">
                    <Avatar className="h-10 w-10 mr-3">
                      <AvatarFallback>{user.username.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-base">{user.username}</CardTitle>
                      <CardDescription>{user.email}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardFooter>
                  <Button 
                    size="sm" 
                    onClick={() => handleSendRequest(user.email)}
                  >
                    <UserPlus className="h-4 w-4 mr-2" /> Add Friend
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
      
      {isLoading ? (
        <div className="flex justify-center py-8">
          <p className="text-muted-foreground">Loading friends...</p>
        </div>
      ) : (
        <Tabs defaultValue="friends" className="w-full">
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="friends">
              <Users className="h-4 w-4 mr-2" />
              Friends ({friends.length})
            </TabsTrigger>
            <TabsTrigger value="pending">
              <Mail className="h-4 w-4 mr-2" />
              Requests ({pendingRequests.length})
            </TabsTrigger>
            <TabsTrigger value="sent">
              <UserPlus className="h-4 w-4 mr-2" />
              Sent ({sentRequests.length})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="friends">
            {friends.length > 0 ? (
              <div>
                {friends.map(friend => renderFriendCard(friend))}
              </div>
            ) : (
              <div className="text-center py-10 border rounded-lg bg-white">
                <Users className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                <h3 className="text-lg font-medium mb-2">No friends yet</h3>
                <p className="text-muted-foreground mb-4">
                  Search for friends by email address to start connecting.
                </p>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="pending">
            {pendingRequests.length > 0 ? (
              <div>
                {pendingRequests.map(request => (
                  <Card key={request.id} className="mb-4">
                    <CardHeader className="pb-2">
                      <div className="flex items-center">
                        <Avatar className="h-10 w-10 mr-3">
                          <AvatarFallback>{request.username.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <CardTitle className="text-base">{request.username}</CardTitle>
                          <CardDescription>{request.email}</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardFooter className="flex space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => rejectFriendRequest(request.id)}
                      >
                        Decline
                      </Button>
                      <Button 
                        size="sm" 
                        onClick={() => acceptFriendRequest(request.id)}
                      >
                        Accept
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No pending friend requests</p>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="sent">
            {sentRequests.length > 0 ? (
              <div>
                {sentRequests.map(request => (
                  <Card key={request.id} className="mb-4">
                    <CardHeader className="pb-2">
                      <div className="flex items-center">
                        <Avatar className="h-10 w-10 mr-3">
                          <AvatarFallback>{request.username.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <CardTitle className="text-base">{request.username}</CardTitle>
                          <CardDescription>{request.email}</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pb-2">
                      <p className="text-sm text-muted-foreground">Request pending</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No sent friend requests</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default FriendsPage;
