
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

export function useCamera() {
  const { toast } = useToast();

  const takePhoto = async (): Promise<string | null> => {
    try {
      const image = await Camera.getPhoto({
        quality: 80,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera,
      });

      if (!image.webPath) {
        throw new Error('Failed to capture image');
      }

      return image.webPath;
    } catch (error) {
      console.error('Error taking photo:', error);
      toast({
        title: 'Camera Error',
        description: 'Failed to take photo. Please try again.',
        variant: 'destructive',
      });
      return null;
    }
  };

  const uploadPhoto = async (photoUri: string, challengeId: string, userId: string): Promise<string | null> => {
    try {
      // Convert URI to blob
      const response = await fetch(photoUri);
      const blob = await response.blob();
      
      // Create a unique filename
      const timestamp = new Date().getTime();
      const filename = `challenges/${challengeId}/${userId}/${timestamp}.jpg`;
      
      // Upload to Firebase Storage
      const storageRef = ref(storage, filename);
      await uploadBytes(storageRef, blob);
      
      // Get download URL
      const downloadUrl = await getDownloadURL(storageRef);
      return downloadUrl;
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast({
        title: 'Upload Error',
        description: 'Failed to upload photo. Please try again.',
        variant: 'destructive',
      });
      return null;
    }
  };

  return {
    takePhoto,
    uploadPhoto,
  };
}
