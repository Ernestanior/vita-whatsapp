import { describe, it, expect, beforeEach } from '@jest/globals';
import { ImageHandler } from '../image-handler';
import sharp from 'sharp';

describe('ImageHandler', () => {
  let imageHandler: ImageHandler;

  beforeEach(() => {
    imageHandler = new ImageHandler();
  });

  describe('calculateHash', () => {
    it('should generate consistent SHA256 hash for same buffer', () => {
      const buffer = Buffer.from('test data');
      const hash1 = imageHandler.calculateHash(buffer);
      const hash2 = imageHandler.calculateHash(buffer);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA256 produces 64 hex characters
    });

    it('should generate different hashes for different buffers', () => {
      const buffer1 = Buffer.from('test data 1');
      const buffer2 = Buffer.from('test data 2');

      const hash1 = imageHandler.calculateHash(buffer1);
      const hash2 = imageHandler.calculateHash(buffer2);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('toDataUrl', () => {
    it('should convert buffer to base64 data URL', () => {
      const buffer = Buffer.from('test');
      const dataUrl = imageHandler.toDataUrl(buffer, 'jpeg');

      expect(dataUrl).toMatch(/^data:image\/jpeg;base64,/);
      expect(dataUrl.length).toBeGreaterThan(30);
    });

    it('should handle different image formats', () => {
      const buffer = Buffer.from('test');
      
      const jpegUrl = imageHandler.toDataUrl(buffer, 'jpeg');
      const pngUrl = imageHandler.toDataUrl(buffer, 'png');

      expect(jpegUrl).toContain('data:image/jpeg');
      expect(pngUrl).toContain('data:image/png');
    });
  });

  describe('validateImage', () => {
    it('should validate JPEG images', async () => {
      // Create a simple 100x100 JPEG image
      const buffer = await sharp({
        create: {
          width: 100,
          height: 100,
          channels: 3,
          background: { r: 255, g: 0, b: 0 },
        },
      })
        .jpeg()
        .toBuffer();

      const isValid = await imageHandler.validateImage(buffer);
      expect(isValid).toBe(true);
    });

    it('should validate PNG images', async () => {
      const buffer = await sharp({
        create: {
          width: 100,
          height: 100,
          channels: 3,
          background: { r: 0, g: 255, b: 0 },
        },
      })
        .png()
        .toBuffer();

      const isValid = await imageHandler.validateImage(buffer);
      expect(isValid).toBe(true);
    });

    it('should reject invalid image data', async () => {
      const buffer = Buffer.from('not an image');
      const isValid = await imageHandler.validateImage(buffer);
      expect(isValid).toBe(false);
    });
  });

  describe('processImage', () => {
    it('should compress and optimize image', async () => {
      // Create a large 2000x2000 image
      const largeBuffer = await sharp({
        create: {
          width: 2000,
          height: 2000,
          channels: 3,
          background: { r: 255, g: 255, b: 255 },
        },
      })
        .jpeg()
        .toBuffer();

      const result = await imageHandler.processImage(largeBuffer);

      expect(result.buffer).toBeDefined();
      expect(result.hash).toHaveLength(64);
      expect(result.size).toBeLessThan(largeBuffer.length);
      expect(result.format).toBe('jpeg');

      // Check that image was resized
      const metadata = await sharp(result.buffer).metadata();
      expect(metadata.width).toBeLessThanOrEqual(1024);
      expect(metadata.height).toBeLessThanOrEqual(1024);
    });

    it('should not enlarge small images', async () => {
      // Create a small 500x500 image
      const smallBuffer = await sharp({
        create: {
          width: 500,
          height: 500,
          channels: 3,
          background: { r: 100, g: 100, b: 100 },
        },
      })
        .jpeg()
        .toBuffer();

      const result = await imageHandler.processImage(smallBuffer);

      const metadata = await sharp(result.buffer).metadata();
      expect(metadata.width).toBeLessThanOrEqual(500);
      expect(metadata.height).toBeLessThanOrEqual(500);
    });

    it('should maintain aspect ratio when resizing', async () => {
      // Create a rectangular 2000x1000 image
      const buffer = await sharp({
        create: {
          width: 2000,
          height: 1000,
          channels: 3,
          background: { r: 200, g: 200, b: 200 },
        },
      })
        .jpeg()
        .toBuffer();

      const result = await imageHandler.processImage(buffer);

      const metadata = await sharp(result.buffer).metadata();
      const aspectRatio = metadata.width! / metadata.height!;
      
      // Original aspect ratio is 2:1
      expect(aspectRatio).toBeCloseTo(2, 1);
    });
  });
});
