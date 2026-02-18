/**
 * Test Natural Language Commands
 * Sends you a message asking you to test natural language commands
 */

import { NextResponse } from 'next/server';
import { whatsappClient } from '@/lib/whatsapp/client';

const TEST_USER_ID = '6583153431';

export async function GET() {
  try {
    const message = `🧪 **自然语言命令测试**

现在系统支持自然语言了！试试这些：

📊 **统计数据**：
• "我想看一下数据分析"
• "给我看看统计"
• "我的饮食数据"

📝 **历史记录**：
• "我最近吃了什么"
• "历史记录"
• "之前的餐食"

👤 **个人信息**：
• "我的个人信息"
• "查看我的画像"

❓ **帮助**：
• "怎么用这个"
• "不会用"

试试发送上面任何一句话，系统会自动识别你的意图！

不需要输入精确的命令了 lah! 😊`;

    await whatsappClient.sendTextMessage(TEST_USER_ID, message);

    return NextResponse.json({
      success: true,
      message: 'Test message sent! Try sending natural language commands on WhatsApp.',
      examples: [
        '我想看一下数据分析',
        '我最近吃了什么',
        '我的个人信息',
        '怎么用这个',
      ],
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
