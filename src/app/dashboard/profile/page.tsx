'use client';

import { useState, useEffect } from 'react';
import { useFirebase } from '@/firebase';
import { updateUserProfile, updateUserPassword } from '@/firebase/non-blocking-login';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { Loader2, User as UserIcon, Lock, CheckCircle2, FlaskConical } from 'lucide-react';
import { cn } from '@/lib/utils';

const AVATAR_OPTIONS = [
  { id: '1', label: '>_o', color: 'bg-gradient-to-br from-blue-600 to-indigo-600', gradient: 'from-blue-600 to-indigo-600' },
  { id: '2', label: 'o_o', color: 'bg-gradient-to-br from-emerald-600 to-teal-600', gradient: 'from-emerald-600 to-teal-600' },
  { id: '3', label: '^__^', color: 'bg-gradient-to-br from-amber-600 to-orange-600', gradient: 'from-amber-600 to-orange-600' },
  { id: '4', label: '*_*', color: 'bg-gradient-to-br from-purple-600 to-pink-600', gradient: 'from-purple-600 to-pink-600' },
  { id: '5', label: '-_-', color: 'bg-gradient-to-br from-slate-600 to-gray-600', gradient: 'from-slate-600 to-gray-600' },
];

export default function ProfilePage() {
  const { user, isUserLoading, refreshUser } = useFirebase();
  const { toast } = useToast();
  
  const [displayName, setDisplayName] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [isProfileUpdating, setIsProfileUpdating] = useState(false);
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setNewConfirmPassword] = useState('');
  const [isPasswordUpdating, setIsPasswordUpdating] = useState(false);

  // Sync internal state when user loads
  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || '');
      setPhotoURL(user.photoURL || '');
    }
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setIsProfileUpdating(true);
    try {
      await updateUserProfile(user, { displayName, photoURL });
      await refreshUser(); // Sync to top-right header and other components
    } catch (error: any) {
      toast({
        title: 'Update Failed',
        description: error.message || 'Could not update profile.',
        variant: 'destructive',
      });
    } finally {
      setIsProfileUpdating(false);
    }
  };

  const handleUpdateAvatar = async (label: string) => {
    if (!user) return;
    setPhotoURL(label); // Update local state for immediate feedback
    try {
      await updateUserProfile(user, { photoURL: label });
      await refreshUser(); // Sync to top-right header and other components
    } catch (error: any) {
      toast({
        title: 'Update Failed',
        description: error.message || 'Could not change avatar.',
        variant: 'destructive',
      });
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    if (newPassword !== confirmPassword) {
      toast({
        title: 'Passwords Mismatch',
        description: 'New password and confirmation must match.',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: 'Weak Password',
        description: 'Password must be at least 6 characters.',
        variant: 'destructive',
      });
      return;
    }

    setIsPasswordUpdating(true);
    try {
      await updateUserPassword(user, newPassword);
      toast({
        title: 'Password Changed',
        description: 'Your password has been updated.',
      });
      setNewPassword('');
      setNewConfirmPassword('');
    } catch (error: any) {
      let message = error.message;
      if (error.code === 'auth/requires-recent-login') {
        message = 'Please log out and log in again to perform this sensitive action.';
      }
      toast({
        title: 'Action Failed',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsPasswordUpdating(false);
    }
  };

  const getAvatarGradient = (url: string) => {
    const option = AVATAR_OPTIONS.find(opt => opt.label === url);
    return option ? option.color : 'bg-gradient-to-br from-blue-600 to-indigo-600';
  };

  if (isUserLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2 border-b pb-6">
        <h1 className="font-headline text-4xl font-bold tracking-tight">Profile Settings</h1>
        <p className="text-muted-foreground text-lg">Manage your research identity and account security.</p>
      </div>

      <div className="grid gap-8 md:grid-cols-[1fr_300px]">
        <div className="space-y-8">
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="font-headline text-2xl flex items-center gap-2">
                <UserIcon className="h-5 w-5 text-primary" />
                Personal Information
              </CardTitle>
              <CardDescription>Update your public profile details.</CardDescription>
            </CardHeader>
            <form onSubmit={handleUpdateProfile}>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input id="email" value={user?.email || ''} disabled className="bg-muted/50" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="displayName">Display Name</Label>
                  <Input 
                    id="displayName" 
                    placeholder="Enter your name" 
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                  />
                </div>
              </CardContent>
              <CardFooter className="bg-muted/5 border-t py-4">
                <Button type="submit" disabled={isProfileUpdating} className="gap-2">
                  {isProfileUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  Save Changes
                </Button>
              </CardFooter>
            </form>
          </Card>

          <Card className="border-2">
            <CardHeader>
              <CardTitle className="font-headline text-2xl flex items-center gap-2">
                <Lock className="h-5 w-5 text-primary" />
                Update Password
              </CardTitle>
              <CardDescription>Ensure your account stays secure.</CardDescription>
            </CardHeader>
            <form onSubmit={handleChangePassword}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input 
                    id="newPassword" 
                    type="password" 
                    placeholder="Min. 6 characters" 
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input 
                    id="confirmPassword" 
                    type="password" 
                    placeholder="Repeat new password" 
                    value={confirmPassword}
                    onChange={(e) => setNewConfirmPassword(e.target.value)}
                    required
                  />
                </div>
              </CardContent>
              <CardFooter className="bg-muted/5 border-t py-4">
                <Button type="submit" variant="secondary" disabled={isPasswordUpdating} className="gap-2">
                  {isPasswordUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Update Password
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-2 shadow-lg overflow-hidden">
            <CardHeader className="bg-primary/5 border-b text-center">
              <div className="mx-auto mb-4 relative group">
                <Avatar className="h-24 w-24 border-4 border-background shadow-xl">
                  {photoURL && photoURL.startsWith('http') && <AvatarImage src={photoURL} />}
                  <AvatarFallback className={cn("text-white text-xl font-bold transition-all duration-500", getAvatarGradient(photoURL))}>
                    {photoURL && !photoURL.startsWith('http') ? photoURL : <UserIcon className="h-10 w-10" />}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                   <FlaskConical className="text-white h-6 w-6" />
                </div>
              </div>
              <CardTitle className="font-headline text-lg truncate">{displayName || 'Researcher'}</CardTitle>
              <CardDescription className="text-[10px] uppercase font-bold tracking-widest text-primary mt-1">Science Identity</CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              <Label className="text-xs font-bold text-muted-foreground uppercase mb-3 block text-center">Choose Research Symbol</Label>
              <div className="grid grid-cols-3 gap-2">
                {AVATAR_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleUpdateAvatar(opt.label)}
                    className={cn(
                      "relative group h-16 w-16 rounded-xl overflow-hidden border-2 transition-all hover:scale-105 flex items-center justify-center",
                      photoURL === opt.label ? "border-primary shadow-md ring-2 ring-primary/20" : "border-transparent opacity-70 hover:opacity-100"
                    )}
                  >
                    <div className={cn("h-full w-full flex items-center justify-center text-white font-bold", opt.color)}>
                      {opt.label}
                    </div>
                    {photoURL === opt.label && (
                      <div className="absolute top-1 right-1 bg-white rounded-full p-0.5 shadow-sm">
                        <CheckCircle2 className="h-3 w-3 text-primary" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
