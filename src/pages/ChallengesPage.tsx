
import { useState, useEffect } from 'react';
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
import { format, addDays, startOfToday, subDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { Calendar as CalendarIcon, Trophy, Plus, UserCheck, RefreshCw, Camera } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Toggle } from '@/components/ui/toggle';
import { useAuth } from '@/contexts/AuthContext';
import { CalendarCheck } from 'lucide-react';
import { ChallengePhotoCapture } from '@/components/challenges/ChallengePhotoCapture';
import { ChallengePhotoViewer } from '@/components/challenges/ChallengePhotoViewer';

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
  const { currentUser } = useAuth();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedFriendId, setSelectedFriendId] = useState<string>('');
  const [habitName, setHabitName] = useState('');
  const [description, setDescription] = useState('');
  const [frequency, setFrequency] = useState<'daily' | 'weekly'>('daily');
  const [duration, setDuration] = useState<number>(7);
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const [challengeUsers, setChallengeUsers] = useState<Record<string, { sender: any, receiver: any }>>({});
  
  const [photoDialogOpen, setPhotoDialogOpen] = useState(false);
  const [selectedChallengeId, setSelectedChallengeId] = useState<string>('');
  
  const [photoViewerOpen, setPhotoViewerOpen] = useState(false);
  const [selectedPhotoDate, setSelectedPhotoDate] = useState<string>('');
  const [selectedPhotoChallenge, setSelectedPhotoChallenge] = useState<Challenge | null>(null);
  
  useEffect(() => {
    const loadData = async () => {
      await refreshChallenges();
    };
    
    loadData();
  }, []);
  
  useEffect(() => {
    const fetchChallengeUsers = async () => {
      const usersData: Record<string, { sender: any, receiver: any }> = {};
      
      for (const challenge of activeChallenges) {
        try {
          const users = await getChallengeUsers(challenge);
          usersData[challenge.id] = users;
        } catch (error) {
          console.error('Error fetching users for challenge:', challenge.id, error);
        }
      }
      
      setChallengeUsers(usersData);
    };
    
    if (activeChallenges.length > 0) {
      fetchChallengeUsers();
    }
  }, [activeChallenges, getChallengeUsers]);
  
  const handleCreateChallenge = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedFriendId) {
      toast({
        title: 'Select a friend',
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
        startDate: startDate.toISOString(),
      });
      
      toast({
        title: 'Challenge sent!',
        description: 'Your friend will need to accept the challenge to start.',
      });
      
      setSelectedFriendId('');
      setHabitName('');
      setDescription('');
      setFrequency('daily');
      setDuration(7);
      setStartDate(new Date());
      setIsDialogOpen(false);
      
      await refreshChallenges();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create challenge',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshChallenges();
      toast({
        title: 'Refreshed',
        description: 'Challenge data has been updated',
      });
    } catch (error) {
      console.error('Failed to refresh challenges:', error);
    } finally {
      setIsRefreshing(false);
    }
  };
  
  const handleAcceptChallenge = async (challengeId: string) => {
    try {
      await acceptChallenge(challengeId);
      toast({
        title: 'Challenge accepted',
        description: 'Good luck with your challenge!',
      });
      await refreshChallenges();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to accept challenge',
        variant: 'destructive',
      });
    }
  };
  
  const handleDeclineChallenge = async (challengeId: string) => {
    try {
      await declineChallenge(challengeId);
      toast({
        title: 'Challenge declined',
        description: 'The challenge has been declined',
      });
      await refreshChallenges();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to decline challenge',
        variant: 'destructive',
      });
    }
  };
  
  const handleUpdateProgress = async (challengeId: string, progress: number, photoUrl?: string) => {
    try {
      await updateProgress(challengeId, progress, photoUrl);
      toast({
        title: 'Progress updated',
        description: photoUrl ? 'Challenge completed with photo proof!' : 'Your challenge progress has been updated',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update progress',
        variant: 'destructive',
      });
    }
  };
  
  const handleTakePhoto = (challengeId: string) => {
    setSelectedChallengeId(challengeId);
    setPhotoDialogOpen(true);
  };
  
  const handlePhotoSubmitted = (photoUrl: string) => {
    if (selectedChallengeId) {
      const challenge = activeChallenges.find(c => c.id === selectedChallengeId);
      if (challenge) {
        const isSender = challenge.senderId === currentUser?.uid;
        const userCompletions = isSender 
          ? challenge.senderDailyCompletions || []
          : challenge.receiverDailyCompletions || [];
        
        const newProgress = ((userCompletions.length + 1) * (100 / challenge.duration));
        handleUpdateProgress(selectedChallengeId, newProgress, photoUrl);
      }
    }
    setSelectedChallengeId('');
  };
  
  const handleViewPhotos = (challengeId: string, date: string) => {
    const challenge = activeChallenges.find(c => c.id === challengeId);
    if (challenge) {
      setSelectedPhotoChallenge(challenge);
      setSelectedPhotoDate(date);
      setPhotoViewerOpen(true);
    }
  };
  
  const renderChallengeCard = (challenge: Challenge) => {
    const users = challengeUsers[challenge.id];
    const today = startOfToday();
    
    // Show only 4 days: today and previous 3 days
    const last4Days = Array.from({ length: 4 }, (_, i) => {
      return format(subDays(today, 3 - i), 'yyyy-MM-dd');
    });
    
    const isSender = users?.sender.id === currentUser?.uid;
    const userCompletions = isSender 
      ? challenge.senderDailyCompletions || []
      : challenge.receiverDailyCompletions || [];
    const userPhotos = isSender 
      ? challenge.senderDailyPhotos || {}
      : challenge.receiverDailyPhotos || {};
    const partnerPhotos = isSender 
      ? challenge.receiverDailyPhotos || {}
      : challenge.senderDailyPhotos || {};
    
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
                    {users.sender.username?.charAt(0) || 'U'}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{users.sender.username || 'User'}</p>
                    <p className="text-xs text-muted-foreground">{users.sender.progress || 0}% complete</p>
                  </div>
                </div>
                <div className="w-20 bg-gray-200 rounded-full h-2.5">
                  <div className="bg-habit-purple h-2.5 rounded-full" style={{ width: `${users.sender.progress || 0}%` }}></div>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-8 h-8 rounded-full bg-habit-success flex items-center justify-center text-white mr-2">
                    {users.receiver.username?.charAt(0) || 'U'}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{users.receiver.username || 'User'}</p>
                    <p className="text-xs text-muted-foreground">{users.receiver.progress || 0}% complete</p>
                  </div>
                </div>
                <div className="w-20 bg-gray-200 rounded-full h-2.5">
                  <div className="bg-habit-success h-2.5 rounded-full" style={{ width: `${users.receiver.progress || 0}%` }}></div>
                </div>
              </div>
            </div>
          )}
          
          <div className="mt-6">
            <p className="text-sm font-medium mb-3">Daily Progress</p>
            <div className="flex gap-3 justify-center">
              {last4Days.map((date) => {
                const isCompleted = userCompletions.includes(date);
                const hasUserPhoto = userPhotos[date];
                const hasPartnerPhoto = partnerPhotos[date];
                const hasAnyPhoto = hasUserPhoto || hasPartnerPhoto;
                const isPast = new Date(date) < today;
                const isToday = date === format(today, 'yyyy-MM-dd');
                
                return (
                  <div key={date} className="flex flex-col items-center gap-2">
                    <Toggle
                      pressed={isCompleted}
                      disabled={!isToday || challenge.status !== 'active'}
                      onPressedChange={(pressed) => {
                        if (pressed) {
                          handleUpdateProgress(challenge.id, 
                            (userCompletions.length + 1) * (100 / challenge.duration)
                          );
                        }
                      }}
                      className={cn(
                        "flex flex-col items-center p-1 gap-1 h-12 w-12 data-[state=on]:bg-habit-success text-xs",
                        isCompleted ? "bg-habit-success text-white" : "bg-muted",
                        !isToday && "opacity-50"
                      )}
                    >
                      <CalendarCheck className="h-4 w-4" />
                      <span className="text-xs leading-none">{format(new Date(date), 'd')}</span>
                    </Toggle>
                    
                    <div className="flex flex-col gap-1 w-full items-center">
                      {isToday && challenge.status === 'active' && !isCompleted && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleTakePhoto(challenge.id)}
                          className="h-6 w-8 p-0 text-xs"
                        >
                          <Camera className="h-3 w-3" />
                        </Button>
                      )}
                      
                      {hasAnyPhoto && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewPhotos(challenge.id, date)}
                          className="h-6 w-full p-0 text-xs"
                        >
                          View
                        </Button>
                      )}
                    </div>
                    
                    {/* Small photo indicators */}
                    {(hasUserPhoto || hasPartnerPhoto) && (
                      <div className="flex gap-1 justify-center">
                        {hasUserPhoto && (
                          <div className="w-3 h-3 rounded border border-habit-success overflow-hidden">
                            <img
                              src={hasUserPhoto}
                              alt="Your proof"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        {hasPartnerPhoto && (
                          <div className="w-3 h-3 rounded border border-habit-purple overflow-hidden">
                            <img
                              src={hasPartnerPhoto}
                              alt="Partner's proof"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
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
            onClick={() => declineChallenge(challenge.id)}
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

  // Get safe user names for photo viewer
  const getUserNames = () => {
    if (!selectedPhotoChallenge || !challengeUsers[selectedPhotoChallenge.id]) {
      return { userName: 'You', partnerName: 'Partner' };
    }
    
    const users = challengeUsers[selectedPhotoChallenge.id];
    const isSender = users.sender.id === currentUser?.uid;
    
    return {
      userName: isSender ? (users.sender.username || 'You') : (users.receiver.username || 'You'),
      partnerName: isSender ? (users.receiver.username || 'Partner') : (users.sender.username || 'Partner')
    };
  };

  const getPhotoUrls = () => {
    if (!selectedPhotoChallenge || !selectedPhotoDate) {
      return { userPhoto: undefined, partnerPhoto: undefined };
    }
    
    const isSender = challengeUsers[selectedPhotoChallenge.id]?.sender.id === currentUser?.uid;
    
    return {
      userPhoto: isSender 
        ? selectedPhotoChallenge.senderDailyPhotos?.[selectedPhotoDate]
        : selectedPhotoChallenge.receiverDailyPhotos?.[selectedPhotoDate],
      partnerPhoto: isSender 
        ? selectedPhotoChallenge.receiverDailyPhotos?.[selectedPhotoDate]
        : selectedPhotoChallenge.senderDailyPhotos?.[selectedPhotoDate]
    };
  };

  return (
    <div className="space-y-6 pb-16">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Challenges</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="h-10 w-10"
          >
            <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
          </Button>
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
      </div>
      
      {isLoading ? (
        <div className="flex justify-center py-8">
          <p className="text-muted-foreground">Loading challenges...</p>
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
      
      <ChallengePhotoCapture
        isOpen={photoDialogOpen}
        onClose={() => setPhotoDialogOpen(false)}
        onPhotoSubmitted={handlePhotoSubmitted}
        challengeId={selectedChallengeId}
        userId={currentUser?.uid || ''}
      />
      
      <ChallengePhotoViewer
        isOpen={photoViewerOpen}
        onClose={() => setPhotoViewerOpen(false)}
        date={selectedPhotoDate}
        {...getPhotoUrls()}
        {...getUserNames()}
      />
    </div>
  );
};

export default ChallengesPage;
