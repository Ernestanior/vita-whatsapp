/**
 * Food Record Manager
 * Manages food recognition records and image storage
 * Requirements: 1.1, 1.2
 */

import { createClient } from '@/lib/supabase/server';
import { FoodRecognitionResult, HealthRating } from '@/types';
import { logger } from '@/utils/logger';

export interface SaveRecordParams {
  userId: string;
  imageBuffer: Buffer;
  imageHash: string;
  recognitionResult: FoodRecognitionResult;
  healthRating: HealthRating;
}

export interface FoodRecord {
  id: string;
  userId: string;
  imageUrl: string;
  imageHash: string;
  recognitionResult: FoodRecognitionResult;
  healthRating: HealthRating;
  mealContext: 'breakfast' | 'lunch' | 'dinner' | 'snack' | null;
  createdAt: Date;
}

export class FoodRecordManager {
  private readonly STORAGE_BUCKET = 'food-images';

  /**
   * Save food recognition record
   * Requirements: 1.1, 1.2
   */
  async saveRecord(params: SaveRecordParams): Promise<FoodRecord> {
    const { userId, imageBuffer, imageHash, recognitionResult, healthRating } = params;

    try {
      logger.info({ userId, imageHash }, 'Saving food record');

      // 1. Upload image to Supabase Storage
      const imageUrl = await this.uploadImage(userId, imageHash, imageBuffer);

      // 2. Save record to database
      const supabase: any = await createClient();

      const { data, error } = await supabase
        .from('food_records')
        .insert({
          user_id: userId,
          image_url: imageUrl,
          image_hash: imageHash,
          recognition_result: recognitionResult,
          health_rating: healthRating,
          meal_context: recognitionResult.mealContext || null,
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to save record: ${error.message}`);
      }

      logger.info({ recordId: data.id, userId }, 'Food record saved successfully');

      return {
        id: data.id,
        userId: data.user_id,
        imageUrl: data.image_url,
        imageHash: data.image_hash,
        recognitionResult: data.recognition_result,
        healthRating: data.health_rating,
        mealContext: data.meal_context,
        createdAt: new Date(data.created_at),
      };
    } catch (error) {
      logger.error({ error, userId, imageHash }, 'Failed to save food record');
      throw error;
    }
  }

  /**
   * Upload image to Supabase Storage
   * Requirements: 1.1
   */
  private async uploadImage(userId: string, imageHash: string, imageBuffer: Buffer): Promise<string> {
    try {
      const supabase: any = await createClient();

      // Generate unique file path
      const timestamp = Date.now();
      const filePath = `${userId}/${timestamp}-${imageHash}.jpg`;

      // Upload to storage
      const { error } = await supabase.storage
        .from(this.STORAGE_BUCKET)
        .upload(filePath, imageBuffer, {
          contentType: 'image/jpeg',
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        throw new Error(`Failed to upload image: ${error.message}`);
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(this.STORAGE_BUCKET)
        .getPublicUrl(filePath);

      logger.info({ filePath, userId }, 'Image uploaded successfully');

      return urlData.publicUrl;
    } catch (error) {
      logger.error({ error, userId, imageHash }, 'Failed to upload image');
      throw error;
    }
  }

  /**
   * Get record by ID
   * Requirements: 1.2
   */
  async getRecord(recordId: string): Promise<FoodRecord | null> {
    try {
      const supabase: any = await createClient();

      const { data, error } = await supabase
        .from('food_records')
        .select('*')
        .eq('id', recordId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Record not found
        }
        throw new Error(`Failed to get record: ${error.message}`);
      }

      return {
        id: data.id,
        userId: data.user_id,
        imageUrl: data.image_url,
        imageHash: data.image_hash,
        recognitionResult: data.recognition_result,
        healthRating: data.health_rating,
        mealContext: data.meal_context,
        createdAt: new Date(data.created_at),
      };
    } catch (error) {
      logger.error({ error, recordId }, 'Failed to get food record');
      throw error;
    }
  }

  /**
   * Delete record
   * Requirements: 1.2
   */
  async deleteRecord(recordId: string, userId: string): Promise<void> {
    try {
      const supabase: any = await createClient();

      // Get record to find image path
      const record = await this.getRecord(recordId);
      if (!record || record.userId !== userId) {
        throw new Error('Record not found or unauthorized');
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('food_records')
        .delete()
        .eq('id', recordId)
        .eq('user_id', userId);

      if (dbError) {
        throw new Error(`Failed to delete record: ${dbError.message}`);
      }

      // Delete image from storage
      try {
        const imagePath = this.extractPathFromUrl(record.imageUrl);
        if (imagePath) {
          await supabase.storage.from(this.STORAGE_BUCKET).remove([imagePath]);
        }
      } catch (storageError) {
        // Log but don't fail if image deletion fails
        logger.warn({ error: storageError, recordId }, 'Failed to delete image from storage');
      }

      logger.info({ recordId, userId }, 'Food record deleted successfully');
    } catch (error) {
      logger.error({ error, recordId, userId }, 'Failed to delete food record');
      throw error;
    }
  }

  /**
   * Check if record exists by image hash
   * Requirements: 1.2
   */
  async findByImageHash(imageHash: string, userId: string): Promise<FoodRecord | null> {
    try {
      const supabase: any = await createClient();

      const { data, error } = await supabase
        .from('food_records')
        .select('*')
        .eq('user_id', userId)
        .eq('image_hash', imageHash)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        throw new Error(`Failed to find record by hash: ${error.message}`);
      }

      if (!data) {
        return null;
      }

      return {
        id: data.id,
        userId: data.user_id,
        imageUrl: data.image_url,
        imageHash: data.image_hash,
        recognitionResult: data.recognition_result,
        healthRating: data.health_rating,
        mealContext: data.meal_context,
        createdAt: new Date(data.created_at),
      };
    } catch (error) {
      logger.error({ error, imageHash, userId }, 'Failed to find record by hash');
      throw error;
    }
  }

  /**
   * Extract file path from Supabase Storage URL
   */
  private extractPathFromUrl(url: string): string | null {
    try {
      const match = url.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)$/);
      return match ? match[1] : null;
    } catch {
      return null;
    }
  }

  /**
   * Get storage bucket name
   */
  getStorageBucket(): string {
    return this.STORAGE_BUCKET;
  }
}

export const foodRecordManager = new FoodRecordManager();
