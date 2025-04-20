
import { useState } from 'react';
import { useHabits } from '@/contexts/HabitContext';
import { Button } from '@/components/ui/button';
import HabitCard from '@/components/habits/HabitCard';
import HabitForm from '@/components/habits/HabitForm';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus } from 'lucide-react';

const HomePage = () => {
  const { habits, isLoading } = useHabits();
  const [showAddHabit, setShowAddHabit] = useState(false);
  
  const dailyHabits = habits.filter(habit => habit.frequency === 'daily');
  const weeklyHabits = habits.filter(habit => habit.frequency === 'weekly');
  
  return (
    <div className="space-y-6 pb-16">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Your Habits</h1>
        <Button onClick={() => setShowAddHabit(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add Habit
        </Button>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="text-center">
            <p className="text-muted-foreground">Loading your habits...</p>
          </div>
        </div>
      ) : (
        <>
          {habits.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 border rounded-lg bg-white">
              <div className="text-center max-w-sm">
                <h3 className="text-lg font-medium mb-2">No habits yet</h3>
                <p className="text-muted-foreground mb-4">
                  Start by creating your first habit to track your progress and build consistency.
                </p>
                <Button onClick={() => setShowAddHabit(true)}>
                  <Plus className="mr-2 h-4 w-4" /> Create your first habit
                </Button>
              </div>
            </div>
          ) : (
            <Tabs defaultValue="all" className="w-full">
              <TabsList className="grid grid-cols-3 mb-4 w-full max-w-sm">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="daily">Daily</TabsTrigger>
                <TabsTrigger value="weekly">Weekly</TabsTrigger>
              </TabsList>
              
              <TabsContent value="all" className="space-y-4">
                {habits.map(habit => (
                  <HabitCard key={habit.id} habit={habit} />
                ))}
              </TabsContent>
              
              <TabsContent value="daily" className="space-y-4">
                {dailyHabits.length > 0 ? (
                  dailyHabits.map(habit => (
                    <HabitCard key={habit.id} habit={habit} />
                  ))
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No daily habits yet</p>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="weekly" className="space-y-4">
                {weeklyHabits.length > 0 ? (
                  weeklyHabits.map(habit => (
                    <HabitCard key={habit.id} habit={habit} />
                  ))
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No weekly habits yet</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </>
      )}
      
      <HabitForm isOpen={showAddHabit} onClose={() => setShowAddHabit(false)} />
    </div>
  );
};

export default HomePage;
