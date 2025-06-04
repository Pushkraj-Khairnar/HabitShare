
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
      
      // Convert blob to base64 for ImageBB
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          if (!result) {
            reject(new Error('Failed to convert to base64'));
            return;
          }
          // Remove data:image/jpeg;base64, prefix
          const base64Data = result.split(',')[1];
          resolve(base64Data);
        };
        reader.onerror = () => reject(new Error('FileReader error'));
        reader.readAsDataURL(blob);
      });

      console.log('Base64 conversion complete, length:', base64.length);

      // Create FormData for ImageBB API
      const formData = new FormData();
      formData.append('image', base64);
      formData.append('name', `challenge_${challengeId}_${userId}_${Date.now()}`);

      console.log('Sending request to ImageBB API...');
      
      const imageBBResponse = await fetch('https://api.imgbb.com/1/upload?key=90894185323ce2eff1ebafa717fad5f7', {
        method: 'POST',
        body: formData,
      });

      console.log('ImageBB response status:', imageBBResponse.status);
      
      if (!imageBBResponse.ok) {
        const errorText = await imageBBResponse.text();
        console.error('ImageBB API error:', errorText);
        throw new Error(`ImageBB upload failed: ${imageBBResponse.status} - ${errorText}`);
      }

      const imageBBData = await imageBBResponse.json();
      console.log('ImageBB response:', imageBBData);
      
      if (!imageBBData.success) {
        console.error('ImageBB upload unsuccessful:', imageBBData);
        throw new Error(`ImageBB upload failed: ${imageBBData.error?.message || 'Unknown error'}`);
      }

      console.log('Upload successful, image URL:', imageBBData.data.url);
      return imageBBData.data.url;
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast({
        title: 'Upload Error',
        description: error instanceof Error ? error.message : 'Failed to upload photo. Please try again.',
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
