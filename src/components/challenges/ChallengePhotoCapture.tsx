
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useCamera } from '@/hooks/useCamera';
import { Camera, Check, X } from 'lucide-react';

interface ChallengePhotoCaptureProps {
  isOpen: boolean;
  onClose: () => void;
  onPhotoSubmitted: (photoUrl: string) => void;
  challengeId: string;
  userId: string;
}

export function ChallengePhotoCapture({ 
  isOpen, 
  onClose, 
  onPhotoSubmitted, 
  challengeId, 
  userId 
}: ChallengePhotoCaptureProps) {
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { takePhoto, uploadPhoto } = useCamera();

  const handleTakePhoto = async () => {
    const photoUri = await takePhoto();
    if (photoUri) {
      setCapturedPhoto(photoUri);
    }
  };

  const handleSubmitPhoto = async () => {
    if (!capturedPhoto) return;

    setIsUploading(true);
    const photoUrl = await uploadPhoto(capturedPhoto, challengeId, userId);
    
    if (photoUrl) {
      onPhotoSubmitted(photoUrl);
      setCapturedPhoto(null);
      onClose();
    }
    
    setIsUploading(false);
  };

  const handleRetakePhoto = () => {
    setCapturedPhoto(null);
  };

  const handleCancel = () => {
    setCapturedPhoto(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Challenge Proof</DialogTitle>
          <DialogDescription>
            Take a photo to prove you've completed today's challenge.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col items-center space-y-4 py-4">
          {!capturedPhoto ? (
            <Button
              onClick={handleTakePhoto}
              className="w-full"
              size="lg"
            >
              <Camera className="mr-2 h-5 w-5" />
              Take Photo
            </Button>
          ) : (
            <div className="space-y-4 w-full">
              <div className="relative">
                <img
                  src={capturedPhoto}
                  alt="Challenge proof"
                  className="w-full max-h-64 object-cover rounded-lg"
                />
              </div>
              
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  onClick={handleRetakePhoto}
                  className="flex-1"
                >
                  <X className="mr-2 h-4 w-4" />
                  Retake
                </Button>
                <Button
                  onClick={handleSubmitPhoto}
                  disabled={isUploading}
                  className="flex-1"
                >
                  {isUploading ? (
                    'Uploading...'
                  ) : (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Submit
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
          
          <Button
            variant="ghost"
            onClick={handleCancel}
            className="w-full"
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
