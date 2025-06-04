
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
      // Convert URI to blob
      const response = await fetch(photoUri);
      const blob = await response.blob();
      
      // Convert blob to base64
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          // Remove data:image/jpeg;base64, prefix
          const base64Data = result.split(',')[1];
          resolve(base64Data);
        };
        reader.readAsDataURL(blob);
      });

      // Upload to Imgur
      const formData = new FormData();
      formData.append('image', base64);
      formData.append('type', 'base64');
      formData.append('title', `Challenge ${challengeId} - ${userId}`);

      const imgurResponse = await fetch('https://api.imgur.com/3/image', {
        method: 'POST',
        headers: {
          'Authorization': 'Client-ID 546c25a59c58ad7', // Public Imgur client ID
        },
        body: formData,
      });

      if (!imgurResponse.ok) {
        throw new Error('Failed to upload to Imgur');
      }

      const imgurData = await imgurResponse.json();
      
      if (!imgurData.success) {
        throw new Error('Imgur upload failed');
      }

      return imgurData.data.link;
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
