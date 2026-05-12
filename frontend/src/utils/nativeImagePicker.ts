import { Capacitor } from '@capacitor/core';
import { Camera as CapCamera, CameraResultType, CameraSource } from '@capacitor/camera';

export const canUseNativeImagePicker = () =>
  Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('Camera');

const isPickerCancel = (error: unknown) => {
  const message = String((error as any)?.message || error || '').toLowerCase();
  return message.includes('cancel') || message.includes('dismiss') || message.includes('user cancelled');
};

export const pickNativeImageAsDataUrl = async ({
  quality = 80,
  promptLabelHeader = 'Escolher foto',
  promptLabelPhoto = 'Escolher da Galeria',
  promptLabelPicture = 'Tirar Foto',
}: {
  quality?: number;
  promptLabelHeader?: string;
  promptLabelPhoto?: string;
  promptLabelPicture?: string;
}) => {
  if (!canUseNativeImagePicker()) return null;

  try {
    const image = await CapCamera.getPhoto({
      quality,
      allowEditing: false,
      resultType: CameraResultType.Base64,
      source: CameraSource.Prompt,
      promptLabelHeader,
      promptLabelPhoto,
      promptLabelPicture,
    });

    if (!image.base64String) return null;
    return `data:image/${image.format || 'jpeg'};base64,${image.base64String}`;
  } catch (error) {
    if (isPickerCancel(error)) return null;
    throw error;
  }
};
