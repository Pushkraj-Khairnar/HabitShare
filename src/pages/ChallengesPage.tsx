import React, { useState, useEffect } from 'react';
import { useChallenges, Challenge } from '@/contexts/ChallengeContext';
import { useFriends } from '@/contexts/FriendContext';
import { Button } from '@/components/ui/button';
import { 
  Dialog, DialogContent, DialogDescription, 
  DialogFooter, DialogHeader, DialogTitle, DialogTrigger 
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Calendar as CalendarIcon, Trophy, Plus, UserCheck, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

const ChallengesPage = () => {
  const { 
    receivedChallenges, 
    sentChallenges, 
    activeChallenges, 
    completedChallenges, 
    createChallenge,
    acceptChallenge,
    declineChallenge,
    updateProgress,
    getChallengeUsers,
    refreshChallenges,
    isLoading 
  } = useChallenges();
  const { friends } = useFriends();
  const { toast } = useToast();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedFriendId, setSelectedFriendId] = useState<string>('');
  const [habitName, setHabitName] = useState('');
  const [description, setDescription] = useState('');
  const [frequency, setFrequency] = useState<'daily' | 'weekly'>('daily');
  const [duration, setDuration] = useState<number>(7);
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  
  const [challengeUsers, setChallengeUsers] = useState<Record<string, { sender: any, receiver: any }>>({});

  useEffect(() => {
    const fetchChallengeUsers = async () => {
      try {
        const usersData: Record<string, { sender: any, receiver: any }> = {};
        
        for (const challenge of activeChallenges) {
          const users = await getChallengeUsers(challenge);
          usersData[challenge.id] = users;
        }
        
        setChallengeUsers(usersData);
      } catch (error) {
        console.error('Error fetching challenge users:', error);
      }
    };
    
    if (activeChallenges.length > 0) {
      fetchChallengeUsers();
    }
  }, [activeChallenges, getChallengeUsers]);

  useEffect(() => {
    const loadChallenges = async () => {
      try {
        setRefreshError(null);
        await refreshChallenges();
      } catch (error: any) {
        console.error('Error refreshing challenges:', error);
        setRefreshError(error.message || 'Failed to load challenges');
        toast({
          title: 'Error loading challenges',
          description: 'Please try again later',
          variant: 'destructive',
        });
      }
    };
    
    loadChallenges();
  }, [refreshChallenges, toast]);

  const handleUpdateProgress = (challengeId: string, progress: number) => {
    updateProgress(challengeId, progress);
  };

  const handleDeclineChallenge = (challengeId: string) => {
    declineChallenge(challengeId);
  };

  const handleAcceptChallenge = (challengeId: string) => {
    acceptChallenge(challengeId);
  };

  const handleCreateChallenge = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    if (!selectedFriendId) {
      toast({
        title: 'Error',
        description: 'Please select a friend to challenge',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      
      await createChallenge({
        receiverId: selectedFriendId,
        habitName,
        description,
        frequency,
        duration,
        startDate: startDate.toISOString()
      });

      setSelectedFriendId('');
      setHabitName('');
      setDescription('');
      setFrequency('daily');
      setDuration(7);
      setStartDate(new Date());
      setIsDialogOpen(false);

      toast({
        title: 'Challenge Created',
        description: 'Your challenge has been sent to your friend!',
      });
    } catch (error) {
      console.error('Error creating challenge:', error);
      toast({
        title: 'Error',
        description: 'Failed to create challenge. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderChallengeCard = (challenge: Challenge) => {
    const users = challengeUsers[challenge.id];
    
    return (
      <Card key={challenge.id} className="mb-4">
        <CardHeader className="pb-2">
          <div className="flex justify-between">
            <CardTitle className="text-lg">{challenge.habitName}</CardTitle>
            <Trophy className="h-5 w-5 text-habit-purple" />
          </div>
          <CardDescription>
            {challenge.frequency === 'daily' ? 'Daily' : 'Weekly'} • 
            {challenge.duration} days • 
            Starts {format(new Date(challenge.startDate), 'MMM d')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm mb-4">{challenge.description}</p>
          
          {users && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-8 h-8 rounded-full bg-habit-purple flex items-center justify-center text-white mr-2">
                    {users.sender.username.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{users.sender.username}</p>
                    <p className="text-xs text-muted-foreground">{users.sender.progress}% complete</p>
                  </div>
                </div>
                <div className="w-20 bg-gray-200 rounded-full h-2.5">
                  <div className="bg-habit-purple h-2.5 rounded-full" style={{ width: `${users.sender.progress}%` }}></div>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-8 h-8 rounded-full bg-habit-success flex items-center justify-center text-white mr-2">
                    {users.receiver.username.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{users.receiver.username}</p>
                    <p className="text-xs text-muted-foreground">{users.receiver.progress}% complete</p>
                  </div>
                </div>
                <div className="w-20 bg-gray-200 rounded-full h-2.5">
                  <div className="bg-habit-success h-2.5 rounded-full" style={{ width: `${users.receiver.progress}%` }}></div>
                </div>
              </div>
            </div>
          )}
          
          <div className="mt-4">
            <p className="text-sm font-medium mb-1">Your Progress</p>
            <Slider 
              defaultValue={[challenge.senderId === users?.sender.id ? challenge.senderProgress : challenge.receiverProgress]} 
              max={100} 
              step={5}
              onValueCommit={(value) => handleUpdateProgress(challenge.id, value[0])}
            />
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderPendingCard = (challenge: Challenge, isPending: boolean) => (
    <Card key={challenge.id} className="mb-4">
      <CardHeader className="pb-2">
        <CardTitle>{challenge.habitName}</CardTitle>
        <CardDescription>
          {challenge.frequency === 'daily' ? 'Daily' : 'Weekly'} • 
          {challenge.duration} days • 
          Starts {format(new Date(challenge.startDate), 'MMM d')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm">{challenge.description}</p>
      </CardContent>
      {isPending && (
        <CardFooter className="flex space-x-2">
          <Button 
            variant="outline" 
            onClick={() => handleDeclineChallenge(challenge.id)}
          >
            Decline
          </Button>
          <Button 
            onClick={() => handleAcceptChallenge(challenge.id)}
          >
            Accept
          </Button>
        </CardFooter>
      )}
    </Card>
  );

  return (
    <div className="space-y-6 pb-16">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Challenges</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> New Challenge
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create Challenge</DialogTitle>
              <DialogDescription>
                Challenge a friend to build a habit together.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateChallenge} className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Friend</label>
                <Select 
                  value={selectedFriendId} 
                  onValueChange={setSelectedFriendId}
                  disabled={isSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select friend to challenge" />
                  </SelectTrigger>
                  <SelectContent>
                    {friends.length > 0 ? (
                      friends.map(friend => (
                        <SelectItem key={friend.id} value={friend.id}>
                          {friend.username}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="" disabled>
                        No friends available
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Habit Name</label>
                <Input
                  value={habitName}
                  onChange={(e) => setHabitName(e.target.value)}
                  placeholder="Read books, Exercise, Meditate..."
                  required
                  disabled={isSubmitting}
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Details about the challenge..."
                  disabled={isSubmitting}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Frequency</label>
                  <Select
                    value={frequency}
                    onValueChange={(value: 'daily' | 'weekly') => setFrequency(value)}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Duration (days)</label>
                  <Select
                    value={duration.toString()}
                    onValueChange={(value) => setDuration(parseInt(value))}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select duration" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">7 days</SelectItem>
                      <SelectItem value="14">14 days</SelectItem>
                      <SelectItem value="30">30 days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Start Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !startDate && "text-muted-foreground"
                      )}
                      disabled={isSubmitting}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={(date) => date && setStartDate(date)}
                      initialFocus
                      disabled={(date) => date < new Date()}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsDialogOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting || !selectedFriendId}>
                  {isSubmitting ? 'Creating...' : 'Create Challenge'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      
      {refreshError ? (
        <div className="text-center py-8 border rounded-lg bg-white">
          <AlertCircle className="h-10 w-10 mx-auto text-red-500 mb-2" />
          <h3 className="text-lg font-medium mb-2">Error Loading Challenges</h3>
          <p className="text-muted-foreground mb-4">{refreshError}</p>
          <Button onClick={() => refreshChallenges()}>Try Again</Button>
        </div>
      ) : isLoading ? (
        <div className="flex justify-center py-8">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-t-habit-purple rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading challenges...</p>
          </div>
        </div>
      ) : (
        <Tabs defaultValue="active" className="w-full">
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="active">
              <Trophy className="h-4 w-4 mr-2" />
              Active ({activeChallenges.length})
            </TabsTrigger>
            <TabsTrigger value="pending">
              <UserCheck className="h-4 w-4 mr-2" />
              Pending ({receivedChallenges.length})
            </TabsTrigger>
            <TabsTrigger value="completed">
              <CalendarIcon className="h-4 w-4 mr-2" />
              History ({completedChallenges.length})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="active">
            {activeChallenges.length > 0 ? (
              <div>
                {activeChallenges.map(challenge => renderChallengeCard(challenge))}
              </div>
            ) : (
              <div className="text-center py-10 border rounded-lg bg-white">
                <Trophy className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                <h3 className="text-lg font-medium mb-2">No active challenges</h3>
                <p className="text-muted-foreground mb-4">
                  Create a new challenge with a friend to start building habits together.
                </p>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="pending">
            {receivedChallenges.length > 0 ? (
              <div>
                {receivedChallenges.map(challenge => renderPendingCard(challenge, true))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No pending challenges</p>
              </div>
            )}
            
            {sentChallenges.length > 0 && (
              <div className="mt-8">
                <h3 className="text-lg font-medium mb-4">Sent Challenges</h3>
                {sentChallenges.map(challenge => renderPendingCard(challenge, false))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="completed">
            {completedChallenges.length > 0 ? (
              <div>
                {completedChallenges.map(challenge => (
                  <Card key={challenge.id} className="mb-4">
                    <CardHeader className="pb-2">
                      <CardTitle>{challenge.habitName}</CardTitle>
                      <CardDescription>
                        Completed on {format(new Date(challenge.endDate), 'MMM d, yyyy')}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-sm font-medium">Final Progress</p>
                          <p className="text-xs text-muted-foreground">
                            You: {challenge.senderId ? challenge.senderProgress : challenge.receiverProgress}% •
                            Friend: {challenge.senderId ? challenge.receiverProgress : challenge.senderProgress}%
                          </p>
                        </div>
                        <div>
                          {challenge.senderProgress > challenge.receiverProgress ? (
                            <p className="text-sm font-medium text-habit-success">Sender won!</p>
                          ) : challenge.receiverProgress > challenge.senderProgress ? (
                            <p className="text-sm font-medium text-habit-success">Receiver won!</p>
                          ) : (
                            <p className="text-sm font-medium">It's a tie!</p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No completed challenges</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default ChallengesPage;
