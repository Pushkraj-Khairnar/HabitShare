
import { ReactNode } from 'react';

interface AuthLayoutProps {
  children: ReactNode;
}

const AuthLayout = ({ children }: AuthLayoutProps) => {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-habit-purple/20 to-transparent">
      <div className="container flex flex-col items-center justify-center py-12">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-habit-purple">HabitShare</h1>
          <p className="text-muted-foreground mt-2">Build better habits together</p>
        </div>
        
        <div className="w-full max-w-md">
          {children}
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
