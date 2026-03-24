import { supabase } from '../config/supabase';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';

export interface UploadResult {
  url: string;
  path: string;
  error?: string;
}

const getExtensionFromUri = (uri: string) => {
  const cleanUri = uri.split('?')[0];
  const match = cleanUri.match(/\.([a-zA-Z0-9]+)$/);
  return match ? match[1].toLowerCase() : 'jpg';
};

const getMimeTypeFromExt = (ext: string) => {
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'heic') return 'image/heic';
  if (ext === 'heif') return 'image/heif';
  return 'application/octet-stream';
};

/**
 * Upload an image to Supabase Storage
 */
export async function uploadImage(
  uri: string,
  userId: string,
  conversationId: string
): Promise<UploadResult> {
  try {
    const ext = getExtensionFromUri(uri);
    const mimeType = getMimeTypeFromExt(ext);

    const fileName = `${userId}_${Date.now()}.${ext}`;
    const filePath = `chat-images/${conversationId}/${fileName}`;

    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: 'base64' as any,
    });

    const { error } = await supabase.storage
      .from('chat-attachments')
      .upload(filePath, decode(base64), {
        contentType: mimeType,
        upsert: false,
      });

    if (error) {
      console.error('Upload error:', error);
      return { url: '', path: '', error: error.message };
    }

    const { data: urlData } = supabase.storage
      .from('chat-attachments')
      .getPublicUrl(filePath);

    return {
      url: urlData.publicUrl,
      path: filePath,
    };
  } catch (error: any) {
    console.error('Upload exception:', error);
    return { url: '', path: '', error: error.message };
  }
}

/**
 * Upload a file to Supabase Storage
 */
export async function uploadFile(
  uri: string,
  fileName: string,
  mimeType: string,
  userId: string,
  conversationId: string
): Promise<UploadResult> {
  try {
    const timestamp = Date.now();
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `chat-files/${conversationId}/${userId}_${timestamp}_${sanitizedFileName}`;

    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: 'base64' as any,
    });

    const { error } = await supabase.storage
      .from('chat-attachments')
      .upload(filePath, decode(base64), {
        contentType: mimeType || 'application/octet-stream',
        upsert: false,
      });

    if (error) {
      console.error('Upload error:', error);
      return { url: '', path: '', error: error.message };
    }

    const { data: urlData } = supabase.storage
      .from('chat-attachments')
      .getPublicUrl(filePath);

    return {
      url: urlData.publicUrl,
      path: filePath,
    };
  } catch (error: any) {
    console.error('Upload exception:', error);
    return { url: '', path: '', error: error.message };
  }
}

/**
 * Delete a file from Supabase Storage
 */
export async function deleteFile(filePath: string): Promise<{ error?: string }> {
  try {
    const { error } = await supabase.storage
      .from('chat-attachments')
      .remove([filePath]);

    if (error) {
      return { error: error.message };
    }

    return {};
  } catch (error: any) {
    return { error: error.message };
  }
}

/**
 * Get file size from URI
 */
export async function getFileSize(uri: string): Promise<number> {
  try {
    const fileInfo = await FileSystem.getInfoAsync(uri);
    return fileInfo.exists && 'size' in fileInfo ? fileInfo.size : 0;
  } catch (error) {
    console.error('Error getting file size:', error);
    return 0;
  }
}
