/**
 * 登录监控和异常检测
 * 检测异常登录模式并通过 WhatsApp 发送安全通知
 */

import { createClient } from '@/lib/database';
import { logSecurityEvent } from '@/lib/logging';
import { sendWhatsAppMessage } from '@/lib/whatsapp/client';

/**
 * 登录日志接口
 */
export interface LoginLog {
  id: string;
  userId: string;
  timestamp: Date;
  ipAddress: string;
  userAgent: string;
  location?: {
    country?: string;
    city?: string;
  };
  success: boolean;
  failureReason?: string;
}

/**
 * 异常登录类型
 */
export type AnomalyType =
  | 'new_location'
  | 'new_device'
  | 'multiple_failures'
  | 'unusual_time'
  | 'rapid_succession';

/**
 * 异常登录检测结果
 */
export interface AnomalyDetectionResult {
  isAnomalous: boolean;
  anomalyTypes: AnomalyType[];
  riskScore: number; // 0-100
  shouldNotify: boolean;
}

/**
 * 记录登录日志
 */
export async function logLogin(params: {
  userId: string;
  ipAddress: string;
  userAgent: string;
  success: boolean;
  failureReason?: string;
}): Promise<void> {
  const supabase = createClient();

  try {
    // 插入登录日志
    const { error } = await supabase.from('login_logs').insert({
      user_id: params.userId,
      ip_address: params.ipAddress,
      user_agent: params.userAgent,
      success: params.success,
      failure_reason: params.failureReason,
      timestamp: new Date().toISOString(),
    });

    if (error) {
      console.error('Failed to log login:', error);
    }

    // 记录到应用日志
    logSecurityEvent({
      event: params.success ? 'login_success' : 'login_failure',
      userId: params.userId,
      ip: params.ipAddress,
      details: {
        userAgent: params.userAgent,
        failureReason: params.failureReason,
      },
    });
  } catch (error) {
    console.error('Error logging login:', error);
  }
}

/**
 * 检测异常登录
 */
export async function detectAnomalousLogin(params: {
  userId: string;
  ipAddress: string;
  userAgent: string;
}): Promise<AnomalyDetectionResult> {
  const supabase = createClient();
  const anomalyTypes: AnomalyType[] = [];
  let riskScore = 0;

  try {
    // 获取用户最近的登录历史（30 天内）
    const { data: recentLogins, error } = await supabase
      .from('login_logs')
      .select('*')
      .eq('user_id', params.userId)
      .eq('success', true)
      .gte('timestamp', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .order('timestamp', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Failed to fetch login history:', error);
      return {
        isAnomalous: false,
        anomalyTypes: [],
        riskScore: 0,
        shouldNotify: false,
      };
    }

    // 如果是首次登录，不视为异常
    if (!recentLogins || recentLogins.length === 0) {
      return {
        isAnomalous: false,
        anomalyTypes: [],
        riskScore: 0,
        shouldNotify: false,
      };
    }

    // 1. 检测新位置（基于 IP 地址）
    const knownIPs = new Set(recentLogins.map((log) => log.ip_address));
    if (!knownIPs.has(params.ipAddress)) {
      anomalyTypes.push('new_location');
      riskScore += 30;
    }

    // 2. 检测新设备（基于 User Agent）
    const knownDevices = new Set(recentLogins.map((log) => log.user_agent));
    if (!knownDevices.has(params.userAgent)) {
      anomalyTypes.push('new_device');
      riskScore += 20;
    }

    // 3. 检测多次失败尝试
    const { data: recentFailures } = await supabase
      .from('login_logs')
      .select('*')
      .eq('user_id', params.userId)
      .eq('success', false)
      .gte('timestamp', new Date(Date.now() - 60 * 60 * 1000).toISOString()) // 最近 1 小时
      .order('timestamp', { ascending: false });

    if (recentFailures && recentFailures.length >= 3) {
      anomalyTypes.push('multiple_failures');
      riskScore += 40;
    }

    // 4. 检测异常时间（凌晨 2-6 点）
    const hour = new Date().getHours();
    if (hour >= 2 && hour < 6) {
      anomalyTypes.push('unusual_time');
      riskScore += 15;
    }

    // 5. 检测快速连续登录（5 分钟内多次登录）
    const recentSuccessLogins = recentLogins.filter(
      (log) =>
        new Date(log.timestamp).getTime() > Date.now() - 5 * 60 * 1000
    );
    if (recentSuccessLogins.length >= 3) {
      anomalyTypes.push('rapid_succession');
      riskScore += 25;
    }

    // 确定是否应该通知用户
    const shouldNotify = riskScore >= 50; // 风险分数 >= 50 时通知

    return {
      isAnomalous: anomalyTypes.length > 0,
      anomalyTypes,
      riskScore,
      shouldNotify,
    };
  } catch (error) {
    console.error('Error detecting anomalous login:', error);
    return {
      isAnomalous: false,
      anomalyTypes: [],
      riskScore: 0,
      shouldNotify: false,
    };
  }
}

/**
 * 发送安全通知
 */
export async function sendSecurityNotification(params: {
  userId: string;
  phoneNumber: string;
  anomalyTypes: AnomalyType[];
  ipAddress: string;
  timestamp: Date;
}): Promise<void> {
  try {
    // 构建通知消息
    const anomalyDescriptions: Record<AnomalyType, string> = {
      new_location: '新位置登录',
      new_device: '新设备登录',
      multiple_failures: '多次登录失败',
      unusual_time: '异常时间登录',
      rapid_succession: '快速连续登录',
    };

    const anomalies = params.anomalyTypes
      .map((type) => `• ${anomalyDescriptions[type]}`)
      .join('\n');

    const message = `🔒 安全提醒

我们检测到您的账户有异常登录活动：

${anomalies}

时间: ${params.timestamp.toLocaleString('zh-CN', { timeZone: 'Asia/Singapore' })}
IP 地址: ${params.ipAddress}

如果这是您本人的操作，请忽略此消息。
如果不是，请立即联系我们的客服团队。

回复 /help 获取帮助`;

    // 发送 WhatsApp 消息
    await sendWhatsAppMessage(params.phoneNumber, message);

    // 记录安全事件
    logSecurityEvent({
      event: 'suspicious_activity',
      userId: params.userId,
      ip: params.ipAddress,
      details: {
        anomalyTypes: params.anomalyTypes,
        notificationSent: true,
      },
    });
  } catch (error) {
    console.error('Failed to send security notification:', error);
    logSecurityEvent({
      event: 'suspicious_activity',
      userId: params.userId,
      ip: params.ipAddress,
      details: {
        anomalyTypes: params.anomalyTypes,
        notificationSent: false,
        error: (error as Error).message,
      },
    });
  }
}

/**
 * 处理登录并检测异常
 */
export async function handleLogin(params: {
  userId: string;
  phoneNumber: string;
  ipAddress: string;
  userAgent: string;
  success: boolean;
  failureReason?: string;
}): Promise<void> {
  // 记录登录
  await logLogin({
    userId: params.userId,
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
    success: params.success,
    failureReason: params.failureReason,
  });

  // 如果登录成功，检测异常
  if (params.success) {
    const detection = await detectAnomalousLogin({
      userId: params.userId,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });

    // 如果检测到异常且应该通知，发送安全通知
    if (detection.shouldNotify) {
      await sendSecurityNotification({
        userId: params.userId,
        phoneNumber: params.phoneNumber,
        anomalyTypes: detection.anomalyTypes,
        ipAddress: params.ipAddress,
        timestamp: new Date(),
      });
    }
  }
}

/**
 * 获取用户登录历史
 */
export async function getLoginHistory(
  userId: string,
  limit: number = 20
): Promise<LoginLog[]> {
  const supabase = createClient();

  try {
    const { data, error } = await supabase
      .from('login_logs')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Failed to fetch login history:', error);
      return [];
    }

    return (data || []).map((log) => ({
      id: log.id,
      userId: log.user_id,
      timestamp: new Date(log.timestamp),
      ipAddress: log.ip_address,
      userAgent: log.user_agent,
      success: log.success,
      failureReason: log.failure_reason,
    }));
  } catch (error) {
    console.error('Error fetching login history:', error);
    return [];
  }
}
