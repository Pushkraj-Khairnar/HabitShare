
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
      
      // Convert blob to base64
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

      // Upload to Imgur using updated API approach
      const uploadData = {
        image: base64,
        type: 'base64',
        title: `Challenge ${challengeId} - ${userId}`,
        description: 'Challenge completion proof'
      };

      console.log('Sending request to Imgur API...');
      
      const imgurResponse = await fetch('https://api.imgur.com/3/image', {
        method: 'POST',
        headers: {
          'Authorization': 'Client-ID 546c25a59c58ad7',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(uploadData),
      });

      console.log('Imgur response status:', imgurResponse.status);
      
      if (!imgurResponse.ok) {
        const errorText = await imgurResponse.text();
        console.error('Imgur API error:', errorText);
        throw new Error(`Imgur upload failed: ${imgurResponse.status} - ${errorText}`);
      }

      const imgurData = await imgurResponse.json();
      console.log('Imgur response:', imgurData);
      
      if (!imgurData.success) {
        console.error('Imgur upload unsuccessful:', imgurData);
        throw new Error(`Imgur upload failed: ${imgurData.data?.error || 'Unknown error'}`);
      }

      console.log('Upload successful, image URL:', imgurData.data.link);
      return imgurData.data.link;
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
