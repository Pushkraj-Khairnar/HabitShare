
import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { format, isValid, parseISO } from 'date-fns';

interface ChallengePhotoViewerProps {
  isOpen: boolean;
  onClose: () => void;
  date: string;
  userPhoto?: string;
  partnerPhoto?: string;
  userName: string;
  partnerName: string;
}

export function ChallengePhotoViewer({ 
  isOpen, 
  onClose, 
  date,
  userPhoto,
  partnerPhoto,
  userName,
  partnerName
}: ChallengePhotoViewerProps) {
  // Safely parse and validate the date
  const parseDate = (dateString: string) => {
    if (!dateString) return null;
    
    // Try parsing as ISO date first (YYYY-MM-DD format)
    let parsedDate = parseISO(dateString);
    
    // If that fails, try regular Date constructor
    if (!isValid(parsedDate)) {
      parsedDate = new Date(dateString);
    }
    
    // Return valid date or null
    return isValid(parsedDate) ? parsedDate : null;
  };
  
  const validDate = parseDate(date);
  const formattedDate = validDate ? format(validDate, 'MMMM d, yyyy') : 'Invalid Date';
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Challenge Photos</DialogTitle>
          <DialogDescription>
            Photos uploaded on {formattedDate}
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
          {/* User's Photo */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium">{userName} (You)</h3>
            {userPhoto ? (
              <div className="aspect-square rounded-lg overflow-hidden border">
                <img
                  src={userPhoto}
                  alt={`${userName}'s challenge proof`}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="aspect-square rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
                <p className="text-sm text-muted-foreground">No photo uploaded</p>
              </div>
            )}
          </div>
          
          {/* Partner's Photo */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium">{partnerName}</h3>
            {partnerPhoto ? (
              <div className="aspect-square rounded-lg overflow-hidden border">
                <img
                  src={partnerPhoto}
                  alt={`${partnerName}'s challenge proof`}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="aspect-square rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
                <p className="text-sm text-muted-foreground">No photo uploaded</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
