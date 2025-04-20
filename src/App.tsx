
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { HabitProvider } from "./contexts/HabitContext";
import { FriendProvider } from "./contexts/FriendContext";
import { ChallengeProvider } from "./contexts/ChallengeContext";

// Pages
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import HomePage from "./pages/HomePage";
import FriendsPage from "./pages/FriendsPage";
import ChallengesPage from "./pages/ChallengesPage";
import SettingsPage from "./pages/SettingsPage";

// Layouts
import MainLayout from "./components/layout/MainLayout";

const queryClient = new QueryClient();

// Auth protection
const PrivateRoute = () => {
  const { currentUser, loading } = useAuth();
  
  if (loading) {
    // Show loading state while checking auth
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }
  
  return currentUser ? <Outlet /> : <Navigate to="/login" replace />;
};

const PublicOnlyRoute = () => {
  const { currentUser, loading } = useAuth();
  
  if (loading) {
    // Show loading state while checking auth
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }
  
  return currentUser ? <Navigate to="/home" replace /> : <Outlet />;
};

const AppContent = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes (redirect to /home if logged in) */}
        <Route element={<PublicOnlyRoute />}>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>

        {/* Protected routes */}
        <Route element={<PrivateRoute />}>
          <Route element={<MainLayout />}>
            <Route path="/home" element={<HomePage />} />
            <Route path="/friends" element={<FriendsPage />} />
            <Route path="/challenges" element={<ChallengesPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Route>

        {/* Catch-all route */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <HabitProvider>
        <FriendProvider>
          <ChallengeProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <AppContent />
            </TooltipProvider>
          </ChallengeProvider>
        </FriendProvider>
      </HabitProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
