
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
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
      console.log('Starting photo upload for URI:', photoUri);
      
      // Convert URI to blob
      const response = await fetch(photoUri);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status}`);
      }
      
      const blob = await response.blob();
      console.log('Blob created, size:', blob.size, 'type:', blob.type);
      
      // Convert blob to data URL for local storage and display
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          if (!result) {
            reject(new Error('Failed to convert to data URL'));
            return;
          }
          resolve(result);
        };
        reader.onerror = () => reject(new Error('FileReader error'));
        reader.readAsDataURL(blob);
      });

      console.log('Data URL conversion complete, length:', dataUrl.length);

      // Store in localStorage for persistence (in a real app, this would be uploaded to your backend)
      const storageKey = `photo_${challengeId}_${userId}_${Date.now()}`;
      localStorage.setItem(storageKey, dataUrl);
      
      console.log('Photo stored locally with key:', storageKey);

      // Return the data URL for immediate display
      return dataUrl;
    } catch (error) {
      console.error('Error processing photo:', error);
      toast({
        title: 'Upload Error',
        description: 'Failed to process photo. Please try again.',
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
