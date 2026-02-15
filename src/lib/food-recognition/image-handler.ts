import sharp from 'sharp';
import crypto from 'crypto';
import { logger } from '@/utils/logger';

export interface ImageProcessingResult {
  buffer: Buffer;
  hash: string;
  size: number;
  format: string;
}

export class ImageHandler {
  private readonly MAX_SIZE = 10 * 1024 * 1024; // 10MB
  private readonly TARGET_SIZE = 1024; // 1024x1024 pixels
  private readonly QUALITY = 85;

  /**
   * Download image from URL
   */
  async downloadImage(url: string): Promise<Buffer> {
    try {
      logger.info({ url }, 'Downloading image');
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to download image: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      if (buffer.length > this.MAX_SIZE) {
        throw new Error(`Image size ${buffer.length} exceeds maximum ${this.MAX_SIZE}`);
      }

      logger.info({ size: buffer.length }, 'Image downloaded successfully');
      return buffer;
    } catch (error) {
      logger.error({ error, url }, 'Failed to download image');
      throw error;
    }
  }

  /**
   * Process and optimize image for AI API
   */
  async processImage(imageBuffer: Buffer): Promise<ImageProcessingResult> {
    try {
      logger.info({ originalSize: imageBuffer.length }, 'Processing image');

      // Get image metadata
      const metadata = await sharp(imageBuffer).metadata();
      logger.debug({ metadata }, 'Image metadata');

      // Optimize image: resize and compress
      const optimizedBuffer = await sharp(imageBuffer)
        .resize(this.TARGET_SIZE, this.TARGET_SIZE, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({ quality: this.QUALITY })
        .toBuffer();

      // Calculate SHA256 hash for caching
      const hash = this.calculateHash(optimizedBuffer);

      const result: ImageProcessingResult = {
        buffer: optimizedBuffer,
        hash,
        size: optimizedBuffer.length,
        format: 'jpeg',
      };

      logger.info(
        {
          originalSize: imageBuffer.length,
          optimizedSize: optimizedBuffer.length,
          compressionRatio: (1 - optimizedBuffer.length / imageBuffer.length).toFixed(2),
          hash,
        },
        'Image processed successfully'
      );

      return result;
    } catch (error) {
      logger.error({ error }, 'Failed to process image');
      throw error;
    }
  }

  /**
   * Calculate SHA256 hash of image buffer
   */
  calculateHash(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Convert image buffer to base64 data URL for OpenAI API
   */
  toDataUrl(buffer: Buffer, format: string = 'jpeg'): string {
    const base64 = buffer.toString('base64');
    return `data:image/${format};base64,${base64}`;
  }

  /**
   * Validate image format
   */
  async validateImage(buffer: Buffer): Promise<boolean> {
    try {
      const metadata = await sharp(buffer).metadata();
      const supportedFormats = ['jpeg', 'jpg', 'png', 'webp'];
      
      if (!metadata.format || !supportedFormats.includes(metadata.format)) {
        logger.warn({ format: metadata.format }, 'Unsupported image format');
        return false;
      }

      return true;
    } catch (error) {
      logger.error({ error }, 'Failed to validate image');
      return false;
    }
  }
}

export const imageHandler = new ImageHandler();
