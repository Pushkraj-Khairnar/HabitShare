
import { useState } from 'react';
import { useHabits, Habit, HabitLog } from '@/contexts/HabitContext';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, X, Trash } from 'lucide-react';
import { format, subDays, isSameDay, parseISO, startOfWeek, endOfWeek, subWeeks } from 'date-fns';
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
  
  // Generate progress data based on habit frequency
  const progressData = habit.frequency === 'weekly' 
    ? Array.from({ length: 7 }, (_, i) => {
        const weekStart = startOfWeek(subWeeks(new Date(), 6 - i), { weekStartsOn: 0 });
        const weekEnd = endOfWeek(weekStart, { weekStartsOn: 0 });
        const weekStartStr = format(weekStart, 'yyyy-MM-dd');
        const weekEndStr = format(weekEnd, 'yyyy-MM-dd');
        
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
    : Array.from({ length: 7 }, (_, i) => {
        const date = subDays(new Date(), 6 - i);
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
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm">{habit.description}</p>
          
          <div className="mt-4">
            <p className="text-sm font-medium mb-2">Current Streak: {habit.currentStreak} {habit.frequency === 'daily' ? 'days' : 'weeks'}</p>
            <div className="flex justify-between mt-2">
              {progressData.map((item, index) => (
                <div key={index} className="flex flex-col items-center">
                  <div className="text-xs mb-1">
                    {habit.frequency === 'weekly' 
                      ? format(item.date, 'd') 
                      : format(item.date, 'd')
                    }
                  </div>
                  <div 
                    className={cn(
                      "streak-dot",
                      item.status === 'completed' ? 'streak-dot-completed' : 
                      item.status === 'missed' ? 'streak-dot-missed' : 'streak-dot-pending'
                    )}
                  ></div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
        <CardFooter className="pt-2">
          <div className="flex space-x-2 w-full">
            <Button 
              variant="outline" 
              className="flex-1 border-red-200 hover:border-red-300 hover:bg-red-50"
              onClick={() => handleMarkStatus(format(new Date(), 'yyyy-MM-dd'), 'missed')}
            >
              <X className="h-4 w-4 mr-1 text-destructive" /> Miss
            </Button>
            <Button 
              className="flex-1 bg-habit-success hover:bg-habit-success/90"
              onClick={() => handleMarkStatus(format(new Date(), 'yyyy-MM-dd'), 'completed')}
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
