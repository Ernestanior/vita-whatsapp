import { imageHandler } from '../src/lib/whatsapp/image-handler';
import { whatsappClient } from '../src/lib/whatsapp/client';
import { logger } from '../src/utils/logger';
import fs from 'fs';
import path from 'path';

/**
 * 模拟 WhatsApp 图片接收集成测试
 * 该脚本通过构造一个模拟的 WhatsApp Message 对象并直接调用 ImageHandler 来模拟用户发送图片。
 * 它不经过网络 Webhook，但会触发完整的 AI 识别、评分和数据库记录逻辑。
 */
async function testImageRecognition() {
  const TEST_PHONE = '6588888888'; // 模拟测试号码
  const TEST_IMAGE_PATH = path.join(process.cwd(), 'test-assets', 'laksa.jpg'); // 确保该路径下有测试图片
  
  if (!fs.existsSync(TEST_IMAGE_PATH)) {
    console.error(`❌ 测试图片不存在: ${TEST_IMAGE_PATH}. 请先放置一张图片。`);
    return;
  }

  console.log('🚀 开始集成测试：模拟发送 Laksa 图片...');

  // 1. 构造模拟消息上下文
  const context = {
    userId: TEST_PHONE,
    language: 'en',
    timestamp: new Date(),
  };

  // 2. 构造模拟 WhatsApp 消息对象
  // 注意：在真实环境下，message.image.id 会由 WhatsAppClient.downloadMedia 使用
  // 为了测试，我们需要 Mock 掉 downloadMedia 或者确保 mediaId 能够对应到本地文件
  const message = {
    id: 'test_msg_' + Date.now(),
    type: 'image',
    from: TEST_PHONE,
    timestamp: Math.floor(Date.now() / 1000).toString(),
    image: {
      id: 'local_test_id', // 模拟 Media ID
      mime_type: 'image/jpeg',
      sha256: 'mock_sha256'
    }
  };

  // 3. Mock WhatsAppClient.downloadMedia 避免真实 API 调用
  const originalDownload = whatsappClient.downloadMedia;
  whatsappClient.downloadMedia = async (id: string) => {
    console.log(`📥 [Mock] 正在读取本地测试图片: ${id}`);
    return fs.readFileSync(TEST_IMAGE_PATH);
  };

  // 4. Mock whatsappClient.sendTextMessage 观察回复
  const originalSendText = whatsappClient.sendTextMessage;
  whatsappClient.sendTextMessage = async (to: string, text: string) => {
    console.log(`\n💬 [AI 回复给 ${to}]:`);
    console.log('------------------------------------');
    console.log(text);
    console.log('------------------------------------\n');
    return { messaging_product: 'whatsapp', contacts: [], messages: [{ id: 'mock_id' }] };
  };

  // 5. Mock whatsappClient.sendInteractiveButtons
  const originalSendButtons = whatsappClient.sendInteractiveButtons;
  whatsappClient.sendInteractiveButtons = async (to: string, text: string, buttons: any[]) => {
    console.log(`🔘 [AI 发送按钮给 ${to}]: ${text}`);
    buttons.forEach(b => console.log(`   [${b.title}]`));
    return { messaging_product: 'whatsapp', contacts: [], messages: [{ id: 'mock_id' }] };
  };

  try {
    // 执行处理器
    await imageHandler.handle(message as any, context as any);
    console.log('✅ 测试执行完成。请检查上方 AI 回复是否包含 Nutri-Grade、GI 以及本地化建议。');
  } catch (error) {
    console.error('❌ 测试执行失败:', error);
  } finally {
    // 恢复原始方法
    whatsappClient.downloadMedia = originalDownload;
    whatsappClient.sendTextMessage = originalSendText;
    whatsappClient.sendInteractiveButtons = originalSendButtons;
  }
}

// 运行测试
testImageRecognition();
