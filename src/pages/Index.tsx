
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Check, Share2, Users, Trophy, ArrowRight } from 'lucide-react';

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navigation */}
      <header className="border-b py-4">
        <nav className="container flex items-center justify-between">
          <div className="text-xl font-bold text-habit-purple">HabitShare</div>
          <div className="flex gap-4">
            <Button
              variant="ghost"
              onClick={() => navigate('/login')}
              className="text-muted-foreground"
            >
              Login
            </Button>
            <Button onClick={() => navigate('/register')}>
              Get Started
            </Button>
          </div>
        </nav>
      </header>

      {/* Hero section */}
      <section className="py-16 md:py-24 lg:py-32 bg-gradient-to-b from-habit-purple/10 to-transparent">
        <div className="container flex flex-col lg:flex-row items-center gap-8 md:gap-16">
          <div className="flex-1 space-y-8">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
              Build Better Habits <span className="text-habit-purple">Together</span>
            </h1>
            <p className="text-xl text-muted-foreground">
              Track your habits, challenge friends, and stay accountable with HabitShare.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" onClick={() => navigate('/register')}>
                Create Your Account
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate('/login')}>
                Log In
              </Button>
            </div>
          </div>
          <div className="flex-1 flex justify-center">
            <div className="relative w-full max-w-md aspect-square bg-habit-purple/10 rounded-2xl overflow-hidden">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-3/4 h-3/4 bg-white rounded-xl shadow-lg flex items-center justify-center">
                  <div className="text-center p-8">
                    <div className="w-12 h-12 bg-habit-purple rounded-full flex items-center justify-center mx-auto mb-4">
                      <Trophy className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="text-xl font-bold">Track Habits Together</h3>
                    <p className="text-muted-foreground mt-2">Challenge friends and build consistency</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features section */}
      <section className="py-16 bg-white">
        <div className="container">
          <h2 className="text-3xl font-bold text-center mb-12">Build habits that stick</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-xl shadow-sm border">
              <div className="w-12 h-12 bg-habit-purple/20 rounded-full flex items-center justify-center mb-4">
                <Check className="h-6 w-6 text-habit-purple" />
              </div>
              <h3 className="text-xl font-bold mb-2">Track Daily Habits</h3>
              <p className="text-muted-foreground">
                Create and track daily and weekly habits with streak monitoring.
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-sm border">
              <div className="w-12 h-12 bg-habit-purple/20 rounded-full flex items-center justify-center mb-4">
                <Users className="h-6 w-6 text-habit-purple" />
              </div>
              <h3 className="text-xl font-bold mb-2">Connect with Friends</h3>
              <p className="text-muted-foreground">
                Add friends and build accountability through shared progress.
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-sm border">
              <div className="w-12 h-12 bg-habit-purple/20 rounded-full flex items-center justify-center mb-4">
                <Trophy className="h-6 w-6 text-habit-purple" />
              </div>
              <h3 className="text-xl font-bold mb-2">Create Challenges</h3>
              <p className="text-muted-foreground">
                Challenge friends to habits and compete on the leaderboard.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA section */}
      <section className="py-16 md:py-24 bg-habit-purple/10">
        <div className="container text-center space-y-8">
          <h2 className="text-3xl font-bold">Ready to build better habits?</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Join thousands of others who are improving their habits together.
          </p>
          <Button 
            size="lg" 
            onClick={() => navigate('/register')} 
            className="bg-habit-purple hover:bg-habit-purple/90"
          >
            Get Started For Free
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t">
        <div className="container flex flex-col md:flex-row justify-between items-center">
          <div className="text-habit-purple font-semibold mb-4 md:mb-0">
            HabitShare
          </div>
          <div className="text-sm text-muted-foreground">
            © 2025 HabitShare. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
