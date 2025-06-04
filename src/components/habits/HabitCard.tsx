
import { useState } from 'react';
import { useHabits, Habit, HabitLog } from '@/contexts/HabitContext';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, X, Trash } from 'lucide-react';
import { format, subDays, isSameDay, parseISO, startOfWeek, endOfWeek, subWeeks, isAfter, startOfDay } from 'date-fns';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface HabitCardProps {
  habit: Habit;
}

const HabitCard = ({ habit }: HabitCardProps) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { deleteHabit, logHabitCompletion, habitLogs } = useHabits();
  const { toast } = useToast();

  const recentLogs = habitLogs[habit.id] || [];
  
  // Check if habit has started
  const habitStartDate = startOfDay(new Date(habit.startDate));
  const today = startOfDay(new Date());
  const hasHabitStarted = !isAfter(habitStartDate, today);
  
  // Generate progress data based on habit frequency
  const progressData = habit.frequency === 'weekly' 
    ? Array.from({ length: 4 }, (_, i) => {
        const weekStart = startOfWeek(subWeeks(new Date(), 3 - i), { weekStartsOn: 0 });
        const weekEnd = endOfWeek(weekStart, { weekStartsOn: 0 });
        const weekStartStr = format(weekStart, 'yyyy-MM-dd');
        
        // Check if there's any completed log within this week
        const hasCompleted = recentLogs.some(log => {
          const logDate = parseISO(log.date);
          return log.status === 'completed' && 
                 logDate >= weekStart && 
                 logDate <= weekEnd;
        });
        
        // Check if there's any missed log within this week (and no completed)
        const hasMissed = !hasCompleted && recentLogs.some(log => {
          const logDate = parseISO(log.date);
          return log.status === 'missed' && 
                 logDate >= weekStart && 
                 logDate <= weekEnd;
        });
        
        return {
          date: weekStart,
          dateStr: weekStartStr,
          status: hasCompleted ? 'completed' : hasMissed ? 'missed' : 'pending',
          isCurrentWeek: weekStart <= new Date() && new Date() <= weekEnd,
          weekRange: `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d')}`
        };
      })
    : Array.from({ length: 4 }, (_, i) => {
        const date = subDays(new Date(), 3 - i);
        const dateStr = format(date, 'yyyy-MM-dd');
        
        const log = recentLogs.find(log => {
          const logDate = parseISO(log.date);
          return isSameDay(logDate, date);
        });
        
        return {
          date,
          dateStr,
          status: log?.status || 'pending',
          isCurrentWeek: false,
          weekRange: ''
        };
      });

  const handleDelete = async () => {
    try {
      setIsLoading(true);
      await deleteHabit(habit.id);
      toast({
        title: 'Habit deleted',
        description: 'The habit has been deleted successfully.',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete habit',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
      setShowDeleteDialog(false);
    }
  };

  const handleMarkStatus = async (date: string, status: 'completed' | 'missed') => {
    if (!hasHabitStarted) {
      toast({
        title: 'Habit not started',
        description: `This habit starts on ${format(habitStartDate, 'MMM d, yyyy')}. You cannot mark it as ${status} yet.`,
        variant: 'destructive',
      });
      return;
    }

    try {
      await logHabitCompletion(habit.id, date, status);
      toast({
        title: status === 'completed' ? 'Habit completed!' : 'Habit missed',
        description: status === 'completed' 
          ? 'Great job keeping up with your habit!' 
          : 'No worries, you can try again tomorrow!',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update habit status',
        variant: 'destructive',
      });
    }
  };

  return (
    <>
      <Card className="habit-card">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <CardTitle>{habit.title}</CardTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowDeleteDialog(true)}
              disabled={isLoading}
            >
              <Trash className="h-4 w-4 text-destructive" />
            </Button>
          </div>
          <div className="text-sm text-muted-foreground">
            {habit.frequency === 'daily' ? 'Daily' : 'Weekly'} • Started {format(new Date(habit.startDate), 'MMM d')}
            {!hasHabitStarted && (
              <span className="text-orange-600 ml-2">• Starts {format(habitStartDate, 'MMM d')}</span>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm">{habit.description}</p>
          
          <div className="mt-4">
            <p className="text-sm font-medium mb-2">Current Streak: {habit.currentStreak} {habit.frequency === 'daily' ? 'days' : 'weeks'}</p>
            <div className="mt-6">
              <p className="text-sm font-medium mb-3">
                {habit.frequency === 'weekly' ? 'Weekly Progress' : 'Daily Progress'}
              </p>
              <div className="flex gap-3 justify-center">
                {progressData.map((item, index) => (
                  <div key={index} className="flex flex-col items-center gap-2">
                    <div 
                      className={cn(
                        "flex flex-col items-center p-1 gap-1 text-xs",
                        habit.frequency === 'weekly' ? "h-16 w-16" : "h-12 w-12",
                        item.status === 'completed' ? "bg-habit-success text-white" : 
                        item.status === 'missed' ? "bg-red-100 text-red-600" : "bg-muted",
                        "rounded border"
                      )}
                    >
                      <div className="text-xs leading-none text-center">
                        {habit.frequency === 'weekly' 
                          ? item.weekRange
                          : format(item.date, 'd')
                        }
                      </div>
                      <div 
                        className={cn(
                          "w-2 h-2 rounded-full",
                          item.status === 'completed' ? 'bg-white' : 
                          item.status === 'missed' ? 'bg-red-600' : 'bg-gray-400'
                        )}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="pt-2">
          <div className="flex space-x-2 w-full">
            <Button 
              variant="outline" 
              className="flex-1 border-red-200 hover:border-red-300 hover:bg-red-50"
              onClick={() => handleMarkStatus(format(new Date(), 'yyyy-MM-dd'), 'missed')}
              disabled={!hasHabitStarted}
            >
              <X className="h-4 w-4 mr-1 text-destructive" /> Miss
            </Button>
            <Button 
              className="flex-1 bg-habit-success hover:bg-habit-success/90"
              onClick={() => handleMarkStatus(format(new Date(), 'yyyy-MM-dd'), 'completed')}
              disabled={!hasHabitStarted}
            >
              <Check className="h-4 w-4 mr-1" /> Complete
            </Button>
          </div>
        </CardFooter>
      </Card>
      
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Habit</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this habit? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isLoading}>
              {isLoading ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default HabitCard;
