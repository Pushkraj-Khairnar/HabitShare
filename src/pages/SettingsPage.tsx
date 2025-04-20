
import { useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const SettingsPage = () => {
  const { userProfile, updateUserProfile, logout } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [username, setUsername] = useState(userProfile?.username || '');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setIsUpdating(true);
      await updateUserProfile({ username });
      
      toast({
        title: 'Profile updated',
        description: 'Your profile has been successfully updated.',
      });
    } catch (error: any) {
      toast({
        title: 'Update failed',
        description: error.message || 'There was an error updating your profile.',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };
  
  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };
  
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      setIsUpdating(true);
      
      const storage = getStorage();
      const fileRef = ref(storage, `avatars/${userProfile?.uid}`);
      
      await uploadBytes(fileRef, file);
      const avatarUrl = await getDownloadURL(fileRef);
      
      await updateUserProfile({ avatarUrl });
      
      toast({
        title: 'Avatar updated',
        description: 'Your profile picture has been updated.',
      });
    } catch (error: any) {
      toast({
        title: 'Avatar update failed',
        description: error.message || 'There was an error updating your profile picture.',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };
  
  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await logout();
      // Navigation handled by AuthContext and PrivateRoute
    } catch (error: any) {
      toast({
        title: 'Logout failed',
        description: error.message || 'There was an error logging out.',
        variant: 'destructive',
      });
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="space-y-6 pb-16">
      <h1 className="text-2xl font-bold">Settings</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>
            Update your personal information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center mb-6">
            <div className="relative" onClick={handleAvatarClick}>
              <Avatar className="h-24 w-24 cursor-pointer">
                <AvatarImage src={userProfile?.avatarUrl || undefined} alt={userProfile?.username || 'User'} />
                <AvatarFallback className="text-xl">
                  {userProfile?.username?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="absolute inset-0 bg-black bg-opacity-40 rounded-full flex items-center justify-center text-white opacity-0 hover:opacity-100 transition-opacity cursor-pointer">
                <span className="text-xs font-medium">Change</span>
              </div>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Click to change profile picture
            </p>
          </div>
          
          <form onSubmit={handleUpdateProfile}>
            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  value={userProfile?.email || ''}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  Your email address cannot be changed
                </p>
              </div>
              
              <div className="space-y-2">
                <label htmlFor="username" className="text-sm font-medium">
                  Username
                </label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isUpdating}
                  required
                />
              </div>
              
              <Button type="submit" disabled={isUpdating}>
                {isUpdating ? 'Updating...' : 'Update Profile'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardFooter>
          <Button 
            variant="outline" 
            className="text-destructive hover:text-destructive hover:border-destructive"
            onClick={handleLogout}
            disabled={isLoggingOut}
          >
            {isLoggingOut ? 'Logging out...' : 'Log out'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default SettingsPage;
