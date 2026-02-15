/**
 * 网络优化管理器
 * 处理图片压缩、上传重试、网络状态检测
 */

import sharp from 'sharp';
import { logger } from '@/utils/logger';

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp';
}

export interface UploadResult {
  success: boolean;
  url?: string;
  compressed?: boolean;
  originalSize?: number;
  compressedSize?: number;
  attempts?: number;
  error?: string;
}

export interface NetworkStatus {
  isOnline: boolean;
  connectionType?: string;
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
}

export class NetworkOptimizer {
  private defaultCompressionOptions: CompressionOptions = {
    maxWidth: 1920,
    maxHeight: 1920,
    quality: 85,
    format: 'jpeg',
  };

  /**
   * Calculate exponential backoff delay
   */
  private calculateRetryDelay(attempt: number): number {
    const baseDelay = 1000; // 1 second
    const maxDelay = 30000; // 30 seconds
    const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
    // Add jitter
    return delay + Math.random() * 1000;
  }

  /**
   * 智能压缩图片
   * 需求 18.1: 网络不稳定时自动压缩图片
   */
  async compressImage(
    imageBuffer: Buffer,
    options?: CompressionOptions
  ): Promise<{ buffer: Buffer; size: number; compressed: boolean }> {
    try {
      const opts = { ...this.defaultCompressionOptions, ...options };
      const originalSize = imageBuffer.length;

      // 获取图片元数据
      const metadata = await sharp(imageBuffer).metadata();
      
      logger.info('Image compression started', {
        originalSize,
        originalWidth: metadata.width,
        originalHeight: metadata.height,
        format: metadata.format,
      });

      // 如果图片已经很小，不需要压缩
      if (originalSize < 500 * 1024) {
        // 小于 500KB
        logger.info('Image is small enough, skipping compression');
        return {
          buffer: imageBuffer,
          size: originalSize,
          compressed: false,
        };
      }

      // 压缩图片
      let sharpInstance = sharp(imageBuffer);

      // 调整尺寸
      if (
        metadata.width &&
        metadata.height &&
        (metadata.width > opts.maxWidth! || metadata.height > opts.maxHeight!)
      ) {
        sharpInstance = sharpInstance.resize(opts.maxWidth, opts.maxHeight, {
          fit: 'inside',
          withoutEnlargement: true,
        });
      }

      // 转换格式并压缩
      let compressedBuffer: Buffer;
      switch (opts.format) {
        case 'jpeg':
          compressedBuffer = await sharpInstance
            .jpeg({ quality: opts.quality, progressive: true })
            .toBuffer();
          break;
        case 'webp':
          compressedBuffer = await sharpInstance
            .webp({ quality: opts.quality })
            .toBuffer();
          break;
        case 'png':
          compressedBuffer = await sharpInstance
            .png({ compressionLevel: 9 })
            .toBuffer();
          break;
        default:
          compressedBuffer = await sharpInstance.toBuffer();
      }

      const compressedSize = compressedBuffer.length;
      const compressionRatio = ((1 - compressedSize / originalSize) * 100).toFixed(1);

      logger.info('Image compression completed', {
        originalSize,
        compressedSize,
        compressionRatio: `${compressionRatio}%`,
      });

      return {
        buffer: compressedBuffer,
        size: compressedSize,
        compressed: true,
      };
    } catch (error) {
      logger.error('Error compressing image', { error });
      // 如果压缩失败，返回原图
      return {
        buffer: imageBuffer,
        size: imageBuffer.length,
        compressed: false,
      };
    }
  }

  /**
   * 自适应压缩（根据网络状况）
   */
  async adaptiveCompress(
    imageBuffer: Buffer,
    networkStatus: NetworkStatus
  ): Promise<{ buffer: Buffer; size: number; compressed: boolean }> {
    // 根据网络状况调整压缩参数
    let options: CompressionOptions;

    if (!networkStatus.isOnline) {
      // 离线状态，最大压缩
      options = {
        maxWidth: 1280,
        maxHeight: 1280,
        quality: 70,
        format: 'jpeg',
      };
    } else if (
      networkStatus.effectiveType === '2g' ||
      networkStatus.effectiveType === 'slow-2g'
    ) {
      // 2G 网络，高压缩
      options = {
        maxWidth: 1280,
        maxHeight: 1280,
        quality: 75,
        format: 'jpeg',
      };
    } else if (networkStatus.effectiveType === '3g') {
      // 3G 网络，中等压缩
      options = {
        maxWidth: 1600,
        maxHeight: 1600,
        quality: 80,
        format: 'jpeg',
      };
    } else {
      // 4G/5G 网络，轻度压缩
      options = {
        maxWidth: 1920,
        maxHeight: 1920,
        quality: 85,
        format: 'jpeg',
      };
    }

    logger.info('Adaptive compression', {
      networkType: networkStatus.effectiveType,
      options,
    });

    return this.compressImage(imageBuffer, options);
  }

  /**
   * 带重试的上传
   * 需求 18.2: 上传失败时自动重试
   */
  async uploadWithRetry(
    uploadFn: () => Promise<string>,
    maxRetries: number = 3,
    onProgress?: (attempt: number, status: string) => void
  ): Promise<UploadResult> {
    const startTime = Date.now();
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // 通知进度
        if (onProgress) {
          onProgress(attempt, `Uploading... (Attempt ${attempt}/${maxRetries})`);
        }

        logger.info('Upload attempt', { attempt, maxRetries });

        // 执行上传
        const url = await uploadFn();

        const duration = Date.now() - startTime;
        logger.info('Upload successful', { attempt, duration });

        return {
          success: true,
          url,
          attempts: attempt,
        };
      } catch (error) {
        lastError = error as Error;
        logger.warn('Upload failed', { attempt, error });

        // If not the last attempt, wait before retrying
        if (attempt < maxRetries) {
          const delay = this.calculateRetryDelay(attempt);
          
          if (onProgress) {
            onProgress(
              attempt,
              `Upload failed. Retrying in ${Math.round(delay / 1000)}s...`
            );
          }

          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    // 所有重试都失败
    logger.error('Upload failed after all retries', {
      maxRetries,
      error: lastError,
    });

    return {
      success: false,
      attempts: maxRetries,
      error: lastError?.message || 'Upload failed',
    };
  }

  /**
   * 智能上传（压缩 + 重试）
   * 需求 18.1, 18.2: 自动压缩和重试
   */
  async smartUpload(
    imageBuffer: Buffer,
    uploadFn: (buffer: Buffer) => Promise<string>,
    networkStatus?: NetworkStatus,
    onProgress?: (attempt: number, status: string) => void
  ): Promise<UploadResult> {
    try {
      const originalSize = imageBuffer.length;

      // 1. 根据网络状况压缩图片
      let processedBuffer = imageBuffer;
      let compressed = false;

      if (networkStatus) {
        const result = await this.adaptiveCompress(imageBuffer, networkStatus);
        processedBuffer = result.buffer;
        compressed = result.compressed;
      } else {
        const result = await this.compressImage(imageBuffer);
        processedBuffer = result.buffer;
        compressed = result.compressed;
      }

      // 2. 带重试的上传
      const uploadResult = await this.uploadWithRetry(
        () => uploadFn(processedBuffer),
        3,
        onProgress
      );

      return {
        ...uploadResult,
        compressed,
        originalSize,
        compressedSize: processedBuffer.length,
      };
    } catch (error) {
      logger.error('Smart upload failed', { error });
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * 检测网络状态（浏览器端）
   * 需求 18.6: 检测网络状态
   */
  getNetworkStatus(): NetworkStatus {
    // 这个方法主要用于浏览器端
    // 在 Node.js 环境中，我们假设网络正常
    if (typeof navigator === 'undefined') {
      return {
        isOnline: true,
        connectionType: 'unknown',
        effectiveType: '4g',
      };
    }

    const connection =
      (navigator as any).connection ||
      (navigator as any).mozConnection ||
      (navigator as any).webkitConnection;

    return {
      isOnline: navigator.onLine,
      connectionType: connection?.type,
      effectiveType: connection?.effectiveType,
      downlink: connection?.downlink,
      rtt: connection?.rtt,
    };
  }

  /**
   * 批量压缩图片
   */
  async compressMultiple(
    images: Buffer[],
    options?: CompressionOptions
  ): Promise<
    Array<{ buffer: Buffer; size: number; compressed: boolean; index: number }>
  > {
    const results = await Promise.all(
      images.map(async (buffer, index) => {
        const result = await this.compressImage(buffer, options);
        return { ...result, index };
      })
    );

    return results;
  }

  /**
   * 估算上传时间
   */
  estimateUploadTime(fileSize: number, networkSpeed: number = 1): Promise<number> {
    // networkSpeed in Mbps
    // fileSize in bytes
    const fileSizeInMb = fileSize / (1024 * 1024);
    const timeInSeconds = (fileSizeInMb * 8) / networkSpeed;
    return Promise.resolve(Math.ceil(timeInSeconds));
  }
}

// 导出单例
let networkOptimizer: NetworkOptimizer | null = null;

export function getNetworkOptimizer(): NetworkOptimizer {
  if (!networkOptimizer) {
    networkOptimizer = new NetworkOptimizer();
  }
  return networkOptimizer;
}
