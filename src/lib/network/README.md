# Network Optimization Module

网络优化模块，提供图片压缩、上传重试、离线缓存和网络状态检测功能。

## 功能特性

### 1. 智能图片压缩 (Image Compression)

自动压缩图片以减少上传时间和流量消耗：

```typescript
import { getNetworkOptimizer } from '@/lib/network';

const optimizer = getNetworkOptimizer();

// 基础压缩
const result = await optimizer.compressImage(imageBuffer);
console.log(result);
// {
//   buffer: Buffer,
//   size: 245678,
//   compressed: true
// }

// 自定义压缩选项
const customResult = await optimizer.compressImage(imageBuffer, {
  maxWidth: 1280,
  maxHeight: 1280,
  quality: 75,
  format: 'jpeg',
});

// 根据网络状况自适应压缩
const networkStatus = optimizer.getNetworkStatus();
const adaptiveResult = await optimizer.adaptiveCompress(imageBuffer, networkStatus);
```

### 2. 带重试的上传 (Upload with Retry)

自动重试失败的上传操作：

```typescript
// 简单重试
const uploadResult = await optimizer.uploadWithRetry(
  async () => {
    // 你的上传逻辑
    return await uploadToSupabase(buffer);
  },
  3, // 最多重试3次
  (attempt, status) => {
    console.log(`Attempt ${attempt}: ${status}`);
  }
);

if (uploadResult.success) {
  console.log('Upload successful:', uploadResult.url);
} else {
  console.error('Upload failed:', uploadResult.error);
}
```

### 3. 智能上传 (Smart Upload)

结合压缩和重试的完整上传方案：

```typescript
// 智能上传（自动压缩 + 重试）
const result = await optimizer.smartUpload(
  imageBuffer,
  async (buffer) => {
    return await uploadToSupabase(buffer);
  },
  networkStatus, // 可选：网络状态
  (attempt, status) => {
    // 进度回调
    await sendWhatsAppMessage(phoneNumber, status);
  }
);

console.log(result);
// {
//   success: true,
//   url: 'https://...',
//   compressed: true,
//   originalSize: 2048576,
//   compressedSize: 512345,
//   attempts: 2
// }
```

### 4. 离线缓存 (Offline Cache)

缓存用户数据以支持离线访问：

```typescript
import { getOfflineCache } from '@/lib/network';

const cache = getOfflineCache();

// 缓存用户健康画像
await cache.cacheUserProfile(userId, profileData);

// 获取缓存的画像
const cachedProfile = await cache.getCachedUserProfile(userId);

// 缓存常见食物数据
await cache.cacheFoodData('Chicken Rice', {
  calories: 500,
  protein: 25,
  // ...
});

// 获取缓存的食物数据
const foodData = await cache.getCachedFoodData('Chicken Rice');

// 缓存历史记录
await cache.cacheHistory(userId, historyRecords);

// 优先从缓存加载历史
const history = await cache.getCachedHistory(userId);
if (!history) {
  // 从数据库加载
  const dbHistory = await loadFromDatabase(userId);
  await cache.cacheHistory(userId, dbHistory);
}
```

### 5. 离线队列 (Offline Queue)

在离线时排队操作，恢复网络后自动处理：

```typescript
// 添加操作到队列
const operationId = await cache.queueOperation('upload', {
  userId,
  imageBuffer,
  timestamp: Date.now(),
});

// 处理队列（网络恢复后）
const result = await cache.processQueue(async (operation) => {
  try {
    if (operation.type === 'upload') {
      await uploadImage(operation.data.imageBuffer);
      return true; // 成功
    }
    return false;
  } catch (error) {
    return false; // 失败，会重试
  }
});

console.log(`Processed: ${result.processed}, Failed: ${result.failed}`);

// 获取队列大小
const queueSize = cache.getQueueSize();

// 清空队列
await cache.clearQueue();
```

### 6. 网络状态检测 (Network Status Detection)

检测当前网络状况：

```typescript
const networkStatus = optimizer.getNetworkStatus();
console.log(networkStatus);
// {
//   isOnline: true,
//   connectionType: 'wifi',
//   effectiveType: '4g',
//   downlink: 10, // Mbps
//   rtt: 50 // ms
// }

// 根据网络状况调整行为
if (!networkStatus.isOnline) {
  await cache.queueOperation('upload', data);
  await sendWhatsAppMessage(
    phoneNumber,
    'You are offline. Your image will be processed when connection is restored.'
  );
} else if (networkStatus.effectiveType === '2g') {
  await sendWhatsAppMessage(
    phoneNumber,
    'Slow network detected. Compressing image for faster upload...'
  );
}
```

## WhatsApp 集成示例

### 场景1: 网络不稳定时自动压缩

```typescript
import { getNetworkOptimizer } from '@/lib/network';

async function handleImageMessage(phoneNumber: string, imageUrl: string) {
  const optimizer = getNetworkOptimizer();
  
  // 下载图片
  const imageBuffer = await downloadImage(imageUrl);
  
  // 检测网络状况
  const networkStatus = optimizer.getNetworkStatus();
  
  // 智能上传
  const result = await optimizer.smartUpload(
    imageBuffer,
    async (buffer) => {
      return await uploadToSupabase(buffer);
    },
    networkStatus,
    async (attempt, status) => {
      // 通知用户当前状态
      await sendWhatsAppMessage(phoneNumber, status);
    }
  );
  
  if (result.success) {
    // 继续处理
    await recognizeFood(result.url);
  } else {
    await sendWhatsAppMessage(
      phoneNumber,
      'Upload failed. Please try again later or check your connection.'
    );
  }
}
```

### 场景2: 离线时排队处理

```typescript
import { getOfflineCache, getNetworkOptimizer } from '@/lib/network';

async function handleOfflineImage(userId: string, imageBuffer: Buffer) {
  const cache = getOfflineCache();
  const optimizer = getNetworkOptimizer();
  
  const networkStatus = optimizer.getNetworkStatus();
  
  if (!networkStatus.isOnline) {
    // 离线：添加到队列
    await cache.queueOperation('upload', {
      userId,
      imageBuffer,
      timestamp: Date.now(),
    });
    
    return {
      success: false,
      message: "You're offline. Your image will be processed when you're back online.",
    };
  }
  
  // 在线：正常处理
  return await processImage(imageBuffer);
}

// 网络恢复后处理队列
async function onNetworkRestore() {
  const cache = getOfflineCache();
  
  const result = await cache.processQueue(async (operation) => {
    if (operation.type === 'upload') {
      const { userId, imageBuffer } = operation.data;
      
      try {
        await processImage(imageBuffer);
        
        // 通知用户
        const user = await getUser(userId);
        await sendWhatsAppMessage(
          user.phone_number,
          'Your queued image has been processed!'
        );
        
        return true;
      } catch (error) {
        return false;
      }
    }
    return false;
  });
  
  console.log(`Processed ${result.processed} operations`);
}
```

### 场景3: 优先从缓存加载

```typescript
import { getOfflineCache } from '@/lib/network';

async function getUserHistory(userId: string) {
  const cache = getOfflineCache();
  
  // 1. 尝试从缓存加载（快速响应）
  let history = await cache.getCachedHistory(userId);
  
  if (history) {
    // 缓存命中，立即返回
    await sendWhatsAppMessage(
      phoneNumber,
      formatHistory(history)
    );
    
    // 后台更新缓存
    updateCacheInBackground(userId);
    return;
  }
  
  // 2. 缓存未命中，从数据库加载
  await sendWhatsAppMessage(phoneNumber, 'Loading your history...');
  
  history = await loadHistoryFromDatabase(userId);
  
  // 3. 更新缓存
  await cache.cacheHistory(userId, history);
  
  // 4. 返回结果
  await sendWhatsAppMessage(
    phoneNumber,
    formatHistory(history)
  );
}
```

### 场景4: 渐进式加载

```typescript
async function sendProgressiveResponse(phoneNumber: string, foodRecordId: string) {
  // 1. 立即发送关键信息（从缓存）
  const cache = getOfflineCache();
  const cachedData = await cache.getCachedFoodData(foodRecordId);
  
  if (cachedData) {
    await sendWhatsAppMessage(
      phoneNumber,
      `🔥 ${cachedData.calories} cal | ${cachedData.rating} rating`
    );
  }
  
  // 2. 加载完整数据
  const fullData = await loadFullFoodRecord(foodRecordId);
  
  // 3. 发送详细信息
  await sendWhatsAppMessage(
    phoneNumber,
    formatFullFoodRecord(fullData)
  );
}
```

## 缓存管理

### 清理过期缓存

```typescript
const cache = getOfflineCache();

// 清理过期项
const cleaned = await cache.cleanExpiredCache();
console.log(`Cleaned ${cleaned} expired items`);

// 获取缓存统计
const stats = cache.getCacheStats();
console.log(stats);
// {
//   size: 45,
//   queueSize: 2,
//   oldestItem: 1705123456789,
//   newestItem: 1705234567890
// }

// 清空所有缓存
await cache.clearAll();
```

### 定时清理

```typescript
// 每小时清理一次过期缓存
setInterval(async () => {
  const cache = getOfflineCache();
  await cache.cleanExpiredCache();
}, 60 * 60 * 1000);
```

## 压缩选项

### 预设配置

```typescript
// 高质量（适合 4G/5G）
const highQuality: CompressionOptions = {
  maxWidth: 1920,
  maxHeight: 1920,
  quality: 85,
  format: 'jpeg',
};

// 中等质量（适合 3G）
const mediumQuality: CompressionOptions = {
  maxWidth: 1600,
  maxHeight: 1600,
  quality: 80,
  format: 'jpeg',
};

// 低质量（适合 2G）
const lowQuality: CompressionOptions = {
  maxWidth: 1280,
  maxHeight: 1280,
  quality: 70,
  format: 'jpeg',
};

// 最小尺寸（离线/极慢网络）
const minimal: CompressionOptions = {
  maxWidth: 800,
  maxHeight: 800,
  quality: 60,
  format: 'jpeg',
};
```

## 性能优化

1. **批量压缩**: 使用 `compressMultiple` 批量处理多张图片
2. **缓存复用**: 相同图片不重复压缩
3. **异步处理**: 压缩和上传在后台进行
4. **进度反馈**: 实时通知用户处理状态

## 错误处理

```typescript
try {
  const result = await optimizer.smartUpload(imageBuffer, uploadFn);
  
  if (!result.success) {
    // 上传失败
    if (result.attempts >= 3) {
      // 多次重试失败
      await sendWhatsAppMessage(
        phoneNumber,
        'Upload failed after multiple attempts. Please check your connection and try again.'
      );
    }
  }
} catch (error) {
  logger.error('Upload error', { error });
  await sendWhatsAppMessage(
    phoneNumber,
    'An error occurred. Please try again later.'
  );
}
```

## 配置要求

### 环境变量

无需额外环境变量。

### 依赖

- `sharp`: 图片处理库
- `@/lib/logging`: 日志系统
- `@/lib/error/retry-manager`: 重试管理器

## 浏览器支持

- **Network Information API**: Chrome 61+, Edge 79+
- **localStorage**: 所有现代浏览器
- **Service Worker**: 可选，用于更高级的离线支持

## 相关需求

- 需求 18.1: 网络不稳定时自动压缩图片
- 需求 18.2: 上传失败时自动重试
- 需求 18.3: 缓存用户健康画像和常见食物数据
- 需求 18.4: 优先从缓存加载
- 需求 18.5: 渐进式加载
- 需求 18.6: 检测网络状态并提示用户
