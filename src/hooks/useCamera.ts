
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
      
      // Create FormData for Imgur API
      const formData = new FormData();
      formData.append('image', blob);
      formData.append('type', 'file');
      formData.append('title', `Challenge ${challengeId} - ${userId}`);
      formData.append('description', 'Challenge completion proof');

      console.log('Sending request to Imgur API...');
      
      const imgurResponse = await fetch('https://api.imgur.com/3/image', {
        method: 'POST',
        headers: {
          'Authorization': 'Client-ID 546c25a59c58ad7',
        },
        body: formData,
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
