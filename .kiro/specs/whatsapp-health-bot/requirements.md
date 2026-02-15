# 需求文档：Vita AI

## 简介

Vita AI 是一款专为新加坡市场设计的智能健康饮食助手，通过 WhatsApp Bot 和轻量 Web Dashboard 帮助用户识别食物、获取营养信息和个性化健康建议。产品分三个阶段开发，第一阶段聚焦 MVP 核心功能（"杂菜饭神器"），解决新加坡人外食"不知道怎么吃、多少热量"的痛点。

## 技术约束和架构原则

### AI 模型策略
- **不需要自训练模型**：系统使用现成的多模态 AI API（如 GPT-4o、GPT-4o-mini、Claude 3.5 Sonnet 等）
- **视觉识别**：通过 Vision API 进行食物识别，无需训练自定义计算机视觉模型
- **本地化优化**：通过 Prompt Engineering 和 Few-shot Learning 实现新加坡食物的准确识别
- **成本控制**：优先使用 GPT-4o-mini 等性价比高的模型，仅在需要时使用更强大的模型

### 架构原则
- **Serverless 优先**：使用云函数（AWS Lambda、Vercel Functions 等）降低运维成本
- **托管服务优先**：数据库使用 Supabase 或 Firebase，避免自建基础设施
- **API 优先**：所有 AI 能力通过 API 调用，不涉及模型训练和部署
- **快速迭代**：使用现成的 SDK 和服务，专注于产品功能而非底层技术

## 术语表

- **Vita_AI**: Vita AI 系统，包含 WhatsApp Bot 和 Web Dashboard
- **User**: 使用 Vita AI 的新加坡用户
- **Food_Image**: 用户通过 WhatsApp 发送的食物照片
- **Nutrition_Data**: 包含卡路里、蛋白质、碳水化合物、脂肪的营养信息
- **Health_Profile**: 用户的健康画像，包含身高、体重、健康目标、活动水平
- **Health_Goal**: 用户的健康目标（减脂/增肌/控糖/维持）
- **Activity_Level**: 用户的日常活动水平（久坐/轻度活动/中度活动/高度活动）
- **Traffic_Light_Rating**: 红黄绿灯评价系统（红=不健康，黄=适中，绿=健康）
- **Daily_Digest**: 每日健康总结报告
- **Health_Report**: 用户上传的体检报告
- **Nutrition_Label**: 超市商品的营养成分表
- **WhatsApp_Bot**: 通过 WhatsApp 与用户交互的聊天机器人
- **Web_Dashboard**: 用于查看历史数据和统计的轻量网页界面
- **Subscription_Tier**: 订阅等级（Free/Premium/Pro）
- **Recognition_Quota**: 食物识别次数配额
- **Meal_Context**: 用餐场景（早餐/午餐/晚餐/加餐）
- **Food_Database**: 新加坡本地化食物营养数据库
- **Confidence_Score**: AI 识别的置信度分数（0-100%）

## 需求

### 需求 1: 多模态食物识别

**用户故事:** 作为新加坡用户，我想通过拍照识别食物，以便快速了解我吃的是什么以及营养成分。

#### 验收标准

1. WHEN 用户通过 WhatsApp 发送一张食物照片 THEN THE Vita_AI SHALL 在 3 秒内返回初步响应确认收到
2. WHEN THE Vita_AI 处理食物照片 THEN THE Vita_AI SHALL 通过多模态 AI API（如 GPT-4o-mini Vision）识别出照片中的新加坡本地食物名称及置信度分数
3. WHEN THE Vita_AI 识别出食物 THEN THE Vita_AI SHALL 估算该食物的营养数据范围（卡路里、蛋白质、碳水化合物、脂肪、钠含量）
4. WHEN THE Vita_AI 识别置信度低于 60% THEN THE Vita_AI SHALL 询问用户确认食物类型或提供选项
5. WHEN THE Vita_AI 无法识别食物 THEN THE Vita_AI SHALL 返回友好的错误提示并建议用户从不同角度重新拍照
6. WHEN THE Vita_AI 返回营养数据 THEN THE Vita_AI SHALL 以区间形式展示（例如：450-550 卡路里）并说明估算依据
7. WHEN THE Vita_AI 识别出多种食物 THEN THE Vita_AI SHALL 分别列出每种食物的营养信息及总计
8. THE Vita_AI SHALL 使用 Prompt Engineering 优化新加坡食物识别准确度，无需训练自定义模型

### 需求 2: 新加坡本地化食物数据库

**用户故事:** 作为新加坡用户，我想系统能识别本地特色食物，以便获得准确的营养信息。

#### 验收标准

1. THE Vita_AI SHALL 支持识别至少 100 种新加坡常见食物（包括但不限于：Lontong、Bak Chor Mee、杂菜饭、Chicken Rice、Roti Prata、Laksa、Nasi Lemak、Char Kway Teow）
2. WHEN THE Vita_AI 识别杂菜饭 THEN THE Vita_AI SHALL 识别出具体的菜色组合（例如：青菜、豆腐、咖喱鸡）
3. WHEN THE Vita_AI 估算营养数据 THEN THE Vita_AI SHALL 基于新加坡本地食物的典型份量和烹饪方式
4. THE Vita_AI SHALL 维护一个可扩展的食物数据库，支持管理员添加新食物条目
5. WHEN THE Vita_AI 识别同一食物的不同烹饪方式 THEN THE Vita_AI SHALL 区分处理（例如：炸鸡 vs 烤鸡）
6. THE Vita_AI SHALL 支持识别常见饮料（Teh、Kopi、果汁、汽水）及其糖分含量

### 需求 3: 红黄绿灯健康评价

**用户故事:** 作为用户，我想获得即时的健康评价，以便知道这顿饭是否健康。

#### 验收标准

1. WHEN THE Vita_AI 分析完食物 THEN THE Vita_AI SHALL 给出红黄绿灯评价（红=不健康，黄=适中，绿=健康）
2. WHEN THE Vita_AI 给出评价 THEN THE Vita_AI SHALL 提供具体的健康提示（例如：高钠、高油、高糖、均衡）
3. WHEN THE Vita_AI 检测到不健康因素 THEN THE Vita_AI SHALL 提供具体的改善建议（例如：去鸡皮、少喝汤、减少酱料）
4. WHEN THE Vita_AI 评价食物 THEN THE Vita_AI SHALL 基于用户的健康画像和健康目标进行个性化评价
5. WHEN THE Vita_AI 评价食物 THEN THE Vita_AI SHALL 考虑用餐场景（早餐/午餐/晚餐）的营养需求差异
6. WHEN 食物整体健康但某项指标超标 THEN THE Vita_AI SHALL 给出黄灯评价并标注具体问题（例如：整体均衡但钠含量偏高）

### 需求 4: 用户健康画像管理

**用户故事:** 作为用户，我想设置我的健康信息，以便获得个性化的建议。

#### 验收标准

1. WHEN 用户首次使用 THE Vita_AI THEN THE Vita_AI SHALL 通过对话式引导收集必要信息（身高、体重、健康目标）
2. WHEN 用户输入健康信息 THEN THE Vita_AI SHALL 验证数据的合理性（身高 100-250cm，体重 30-300kg）
3. WHEN 用户完成基础画像设置 THEN THE Vita_AI SHALL 计算并显示用户的 BMI 和每日推荐卡路里摄入量
4. THE Vita_AI SHALL 允许用户跳过可选信息（年龄、性别、活动水平），使用默认值
5. THE Vita_AI SHALL 允许用户随时通过简单对话更新健康画像信息（例如："我现在 65kg"）
6. WHEN 用户选择健康目标 THEN THE Vita_AI SHALL 支持四种目标类型：减脂、增肌、控糖、维持健康
7. WHEN 用户未提供活动水平 THEN THE Vita_AI SHALL 默认使用"轻度活动"并允许后续调整
8. WHEN THE Vita_AI 计算每日推荐摄入量 THEN THE Vita_AI SHALL 基于 Mifflin-St Jeor 公式
9. THE Vita_AI SHALL 在用户完成首次设置后立即可用，无需复杂的注册流程

### 需求 5: WhatsApp Bot 交互

**用户故事:** 作为用户，我想通过 WhatsApp 与系统交互，以便在日常使用的应用中获得服务。

#### 验收标准

1. THE Vita_AI SHALL 通过 WhatsApp Business API 或 WhatsApp Cloud API 提供聊天机器人服务
2. WHEN 用户发送文本消息 THEN THE Vita_AI SHALL 识别并响应命令（/start、/profile、/help、/stats、/settings）
3. WHEN 用户发送图片 THEN THE Vita_AI SHALL 自动触发食物识别流程，无需额外命令
4. WHEN THE Vita_AI 响应用户 THEN THE Vita_AI SHALL 在 3 秒内返回初步响应
5. WHEN THE Vita_AI 处理复杂请求 THEN THE Vita_AI SHALL 显示"正在分析..."的状态提示
6. WHEN 用户发送语音消息 THEN THE Vita_AI SHALL 提示用户使用文字或图片进行交互
7. THE Vita_AI SHALL 支持中文和英文双语交互，自动识别用户语言
8. WHEN 用户发送不支持的内容类型 THEN THE Vita_AI SHALL 返回友好的提示说明支持的交互方式
9. THE Vita_AI SHALL 使用对话式交互，避免复杂的命令语法
10. WHEN 用户首次发送图片 THEN THE Vita_AI SHALL 自动引导完成健康画像设置（如未设置）

### 需求 6: 每日健康总结

**用户故事:** 作为用户，我想每天收到健康总结，以便了解我的饮食情况并获得改善建议。

#### 验收标准

1. THE Vita_AI SHALL 每天晚上 9 点（新加坡时间 SGT+8）自动发送每日健康总结
2. WHEN THE Vita_AI 生成每日总结 THEN THE Vita_AI SHALL 基于用户当天发送的所有食物照片
3. WHEN THE Vita_AI 生成每日总结 THEN THE Vita_AI SHALL 包含总卡路里摄入、三大营养素分布、钠摄入量和健康评分
4. WHEN THE Vita_AI 生成每日总结 THEN THE Vita_AI SHALL 对比用户的每日推荐摄入量并给出差异分析
5. WHEN THE Vita_AI 生成每日总结 THEN THE Vita_AI SHALL 提供个性化的运动建议（例如：多跑 2 公里、多走 3000 步）
6. WHEN 用户当天未发送任何照片 THEN THE Vita_AI SHALL 发送鼓励消息而非总结
7. WHEN 用户当天摄入超标 THEN THE Vita_AI SHALL 提供具体的补救建议（例如：晚餐减少碳水、增加运动）
8. THE Vita_AI SHALL 允许用户自定义每日总结的发送时间

### 需求 7: 订阅和支付管理

**用户故事:** 作为产品运营方，我想实现订阅付费模式，以便产品可持续运营。

#### 验收标准

1. THE Vita_AI SHALL 提供三个订阅等级：Free（每日 3 次）、Premium（无限次 + 每日总结）、Pro（无限次 + 所有高级功能）
2. WHEN 免费用户超过每日配额 THEN THE Vita_AI SHALL 友好提示升级订阅，但不阻断用户查看历史记录
3. THE Vita_AI SHALL 通过 Stripe 处理订阅支付
4. WHEN 用户完成支付 THEN THE Vita_AI SHALL 在 1 分钟内自动解锁相应功能
5. THE Vita_AI SHALL 支持 PayNow 和信用卡作为支付方式
6. WHEN 订阅到期前 3 天 THEN THE Vita_AI SHALL 通知用户续费
7. WHEN 订阅到期 THEN THE Vita_AI SHALL 自动降级用户至 Free 等级，保留所有历史数据
8. THE Vita_AI SHALL 允许用户随时查看当前订阅状态和剩余配额
9. THE Vita_AI SHALL 支持月度订阅和年度订阅（年度享 20% 优惠）
10. WHEN 用户取消订阅 THEN THE Vita_AI SHALL 保留数据直到当前订阅周期结束
11. THE Vita_AI SHALL 提供 7 天免费试用 Premium 功能（新用户）
12. WHEN 用户分享产品给朋友 THEN THE Vita_AI SHALL 奖励双方额外的免费识别次数

### 需求 8: 体检报告数字化（第三阶段）

**用户故事:** 作为用户，我想上传体检报告并获得解读，以便理解我的健康状况并获得饮食建议。

#### 验收标准

1. WHEN 用户上传体检报告照片 THEN THE Vita_AI SHALL 使用多模态 AI API 的 OCR 能力提取关键健康指标
2. WHEN THE Vita_AI 提取健康指标 THEN THE Vita_AI SHALL 识别新加坡常见体检报告格式（包括公立医院和私人诊所）
3. WHEN THE Vita_AI 解读体检报告 THEN THE Vita_AI SHALL 提取至少 10 项关键指标（血糖、胆固醇、血压、BMI、肝功能等）
4. WHEN THE Vita_AI 解读体检报告 THEN THE Vita_AI SHALL 将医学指标转化为通俗易懂的行动建议
5. WHEN THE Vita_AI 检测到异常指标 THEN THE Vita_AI SHALL 提供针对性的饮食调整建议
6. WHEN THE Vita_AI 检测到严重异常 THEN THE Vita_AI SHALL 建议用户咨询医生
7. WHEN THE Vita_AI 解读报告 THEN THE Vita_AI SHALL 结合用户的历史饮食数据提供个性化建议
8. THE Vita_AI SHALL 安全存储体检报告数据并支持历史对比
9. THE Vita_AI SHALL 使用 AI API 进行文本提取和解读，无需训练医疗专用模型

### 需求 9: 超市扫描助手（第三阶段）

**用户故事:** 作为用户，我想在超市购物时扫描商品营养标签，以便做出更健康的购买决策。

#### 验收标准

1. WHEN 用户拍摄商品营养成分表 THEN THE Vita_AI SHALL 识别并提取营养信息
2. WHEN THE Vita_AI 分析商品 THEN THE Vita_AI SHALL 基于用户健康目标和体检数据给出购买建议
3. WHEN THE Vita_AI 给出建议 THEN THE Vita_AI SHALL 使用"推荐购买"、"偶尔尝试"、"不推荐"三级评价
4. THE Vita_AI SHALL 支持识别新加坡主流超市（FairPrice、Cold Storage、Sheng Siong）的商品标签格式
5. WHEN THE Vita_AI 评价商品 THEN THE Vita_AI SHALL 考虑用户的健康画像和体检报告数据
6. WHEN THE Vita_AI 识别到高糖/高钠/高脂商品 THEN THE Vita_AI SHALL 推荐更健康的替代品
7. THE Vita_AI SHALL 支持扫描条形码快速查询商品信息
8. WHEN 用户扫描同类商品 THEN THE Vita_AI SHALL 提供营养对比功能

### 需求 10: Web Dashboard 数据可视化

**用户故事:** 作为用户，我想通过网页查看我的历史数据，以便了解长期的饮食趋势。

#### 验收标准

1. THE Vita_AI SHALL 提供一个轻量级响应式 Web Dashboard 供用户访问
2. WHEN 用户访问 Dashboard THEN THE Vita_AI SHALL 显示用户的历史食物识别记录（带缩略图）
3. WHEN 用户访问 Dashboard THEN THE Vita_AI SHALL 显示营养摄入趋势图表（日/周/月视图）
4. WHEN 用户访问 Dashboard THEN THE Vita_AI SHALL 显示健康评分变化趋势和红黄绿灯分布
5. THE Vita_AI SHALL 通过 WhatsApp 发送的一次性登录链接实现用户身份验证
6. WHEN 用户在 Dashboard 查看数据 THEN THE Vita_AI SHALL 确保数据与 WhatsApp Bot 实时同步
7. WHEN 用户访问 Dashboard THEN THE Vita_AI SHALL 显示当前订阅状态和剩余配额
8. THE Vita_AI SHALL 允许用户在 Dashboard 导出历史数据（CSV 或 PDF 格式）
9. WHEN 用户访问 Dashboard THEN THE Vita_AI SHALL 显示每周/每月的营养摄入目标达成率
10. THE Vita_AI SHALL 在 Dashboard 提供食物识别历史的搜索和筛选功能

### 需求 11: 数据隐私和安全

**用户故事:** 作为用户，我想确保我的健康数据安全，以便放心使用服务。

#### 验收标准

1. THE Vita_AI SHALL 使用 AES-256 加密存储所有用户健康数据
2. THE Vita_AI SHALL 遵守新加坡个人数据保护法（PDPA）
3. WHEN 用户请求删除数据 THEN THE Vita_AI SHALL 在 7 天内完全删除用户所有数据
4. THE Vita_AI SHALL 不与第三方分享用户健康数据（支付处理和 AI 服务提供商除外）
5. WHEN THE Vita_AI 处理支付信息 THEN THE Vita_AI SHALL 通过 Stripe 安全处理，不存储信用卡信息
6. THE Vita_AI SHALL 在用户首次使用时展示隐私政策并要求同意
7. THE Vita_AI SHALL 实施 API 速率限制防止滥用（每用户每分钟最多 10 次请求）
8. THE Vita_AI SHALL 记录所有数据访问日志用于安全审计
9. WHEN THE Vita_AI 检测到异常登录 THEN THE Vita_AI SHALL 通过 WhatsApp 通知用户

### 需求 12: 系统性能和可靠性

**用户故事:** 作为用户，我想系统快速响应，以便获得流畅的使用体验。

#### 验收标准

1. WHEN 用户发送食物照片 THEN THE Vita_AI SHALL 在 10 秒内返回完整识别结果
2. WHEN THE Vita_AI 处理图片 THEN THE Vita_AI SHALL 支持最大 10MB 的图片文件
3. THE Vita_AI SHALL 保持 99.5% 的月度可用性
4. WHEN THE Vita_AI 遇到错误 THEN THE Vita_AI SHALL 记录详细错误日志并通知运维团队
5. THE Vita_AI SHALL 支持至少 1000 个并发用户
6. WHEN THE Vita_AI 服务不可用 THEN THE Vita_AI SHALL 返回友好的错误消息并提供预计恢复时间
7. THE Vita_AI SHALL 实施自动重试机制处理临时性失败（最多重试 3 次）
8. THE Vita_AI SHALL 使用 CDN 加速图片上传和下载
9. WHEN THE Vita_AI 处理高峰流量 THEN THE Vita_AI SHALL 自动扩展计算资源

### 需求 13: 用户反馈和持续改进

**用户故事:** 作为产品团队，我想收集用户反馈，以便持续改进产品质量。

#### 验收标准

1. WHEN THE Vita_AI 返回食物识别结果 THEN THE Vita_AI SHALL 提供"识别准确"和"识别错误"的反馈按钮
2. WHEN 用户标记识别错误 THEN THE Vita_AI SHALL 询问正确的食物名称并记录用于模型优化
3. THE Vita_AI SHALL 允许用户通过 /feedback 命令提交产品建议
4. WHEN 用户提交反馈 THEN THE Vita_AI SHALL 确认收到并提供反馈编号
5. THE Vita_AI SHALL 每月分析用户反馈数据识别高频问题
6. WHEN THE Vita_AI 识别置信度低于 70% THEN THE Vita_AI SHALL 主动请求用户反馈

### 需求 14: 社交和激励机制（第二阶段）

**用户故事:** 作为用户，我想获得使用激励，以便保持长期使用习惯。

#### 验收标准

1. THE Vita_AI SHALL 实施连续打卡机制，记录用户连续使用天数
2. WHEN 用户连续使用 7 天 THEN THE Vita_AI SHALL 发送祝贺消息和健康徽章
3. THE Vita_AI SHALL 设置成就系统（例如：识别 100 种食物、连续 30 天健康饮食）
4. WHEN 用户达成成就 THEN THE Vita_AI SHALL 发送祝贺并解锁特殊功能或折扣
5. THE Vita_AI SHALL 允许用户设置每周健康目标（例如：每周至少 5 天绿灯评价）
6. WHEN 用户完成每周目标 THEN THE Vita_AI SHALL 发送鼓励消息和进度总结
7. WHERE 用户选择加入 THEN THE Vita_AI SHALL 提供匿名排行榜功能（基于健康评分）

### 需求 15: 多语言和本地化支持

**用户故事:** 作为新加坡多元文化背景的用户，我想使用我熟悉的语言，以便更好地理解健康建议。

#### 验收标准

1. THE Vita_AI SHALL 支持英文、简体中文、繁体中文三种语言
2. WHEN 用户首次使用 THEN THE Vita_AI SHALL 自动检测用户语言偏好或询问用户选择
3. THE Vita_AI SHALL 允许用户随时切换界面语言
4. WHEN THE Vita_AI 识别食物 THEN THE Vita_AI SHALL 以用户选择的语言返回食物名称和建议
5. THE Vita_AI SHALL 正确处理新加坡特色食物的多语言名称（例如：Chicken Rice / 海南鸡饭）
6. WHEN THE Vita_AI 显示营养单位 THEN THE Vita_AI SHALL 使用新加坡常用单位（卡路里、克、毫克）

### 需求 16: 智能上下文理解

**用户故事:** 作为用户，我想系统能理解我的用餐习惯和偏好，以便获得更个性化的体验。

#### 验收标准

1. WHEN 用户在特定时间段发送食物照片 THEN THE Vita_AI SHALL 自动推断用餐场景（早餐 6-10am、午餐 11am-2pm、晚餐 5-9pm、加餐其他时间）
2. WHEN THE Vita_AI 识别用户连续 3 次拍摄同一食物 THEN THE Vita_AI SHALL 记录为用户偏好并在评价时考虑
3. WHEN 用户询问"今天吃什么" THEN THE Vita_AI SHALL 基于用户历史偏好、当前营养缺口和健康目标推荐食物
4. WHEN THE Vita_AI 检测到用户某类营养素持续不足 THEN THE Vita_AI SHALL 主动推荐富含该营养素的新加坡食物
5. WHEN 用户发送位置信息 THEN THE Vita_AI SHALL 推荐附近的健康餐饮选择
6. THE Vita_AI SHALL 学习用户的饮食模式并在异常时提醒（例如：通常午餐时间未记录）

### 需求 17: 快速操作和快捷回复

**用户故事:** 作为忙碌的用户，我想快速完成操作，以便不影响用餐体验。

#### 验收标准

1. WHEN THE Vita_AI 返回识别结果 THEN THE Vita_AI SHALL 提供快捷回复按钮（"记录"、"修改"、"忽略"）
2. WHEN 用户点击"记录" THEN THE Vita_AI SHALL 直接保存数据无需额外确认
3. WHEN 用户点击"修改" THEN THE Vita_AI SHALL 提供常见调整选项（份量、去除某项食物）
4. THE Vita_AI SHALL 支持批量拍照，一次发送多张图片自动识别所有食物
5. WHEN 用户发送"快速记录"关键词 THEN THE Vita_AI SHALL 进入快速模式，只返回核心信息（卡路里和评分）
6. THE Vita_AI SHALL 记住用户的常用操作偏好，减少重复选择

### 需求 18: 离线和网络优化

**用户故事:** 作为在新加坡移动使用的用户，我想在网络不佳时也能使用基本功能，以便随时记录饮食。

#### 验收标准

1. WHEN 用户网络连接不稳定 THEN THE Vita_AI SHALL 自动压缩图片后上传
2. WHEN 图片上传失败 THEN THE Vita_AI SHALL 自动重试并通知用户当前状态
3. THE Vita_AI SHALL 缓存用户的健康画像和常见食物数据在本地（Web Dashboard）
4. WHEN 用户查询历史记录 THEN THE Vita_AI SHALL 优先从缓存加载，提升响应速度
5. THE Vita_AI SHALL 支持渐进式加载，优先显示关键信息（卡路里和评分）
6. WHEN 用户在地铁或电梯等信号差的地方 THEN THE Vita_AI SHALL 提示用户稍后会处理图片

### 需求 19: 智能错误处理和用户引导

**用户故事:** 作为用户，我想在遇到问题时获得清晰的指引，以便快速解决问题继续使用。

#### 验收标准

1. WHEN THE Vita_AI 无法识别图片内容 THEN THE Vita_AI SHALL 提供具体的拍照建议（光线、角度、距离）
2. WHEN 用户上传的图片不包含食物 THEN THE Vita_AI SHALL 友好提示并提供示例图片链接
3. WHEN 用户输入无效数据 THEN THE Vita_AI SHALL 说明有效范围并提供示例
4. THE Vita_AI SHALL 在用户首次使用时提供简短的使用教程（可跳过）
5. WHEN 用户连续 3 次操作失败 THEN THE Vita_AI SHALL 主动提供帮助或联系客服选项
6. THE Vita_AI SHALL 使用表情符号和友好语气，避免生硬的错误提示
7. WHEN THE Vita_AI 遇到系统错误 THEN THE Vita_AI SHALL 记录错误 ID 并告知用户，方便后续追踪
8. THE Vita_AI SHALL 提供常见问题快速入口（/faq 命令）

### 需求 20: 成本控制和监控

**用户故事:** 作为产品运营方，我想控制运营成本并监控系统健康状况，以便确保产品可持续运营。

#### 验收标准

1. THE Vita_AI SHALL 实施 AI API 调用成本监控，记录每次调用的 token 使用量
2. WHEN 单个用户的 API 调用成本异常高 THEN THE Vita_AI SHALL 触发告警并限制该用户的请求频率
3. THE Vita_AI SHALL 优先使用成本较低的 AI 模型（如 GPT-4o-mini），仅在必要时使用更强大的模型
4. WHEN 图片质量较差 THEN THE Vita_AI SHALL 先进行图片预处理，减少 AI API 调用失败率
5. THE Vita_AI SHALL 缓存常见食物的识别结果，减少重复的 AI API 调用
6. THE Vita_AI SHALL 实施实时监控仪表板，显示关键指标（API 调用量、成本、错误率、响应时间）
7. WHEN 系统错误率超过 5% THEN THE Vita_AI SHALL 自动发送告警通知运维团队
8. WHEN 每日 API 成本超过预算 THEN THE Vita_AI SHALL 触发告警并考虑降级服务
9. THE Vita_AI SHALL 记录用户行为分析数据（识别次数、活跃时段、功能使用率）用于产品优化
10. THE Vita_AI SHALL 每周生成运营报告，包含用户增长、留存率、收入和成本数据

## 需求优先级

### 第一阶段 MVP（必须实现）
- 需求 1: 多模态食物识别
- 需求 2: 新加坡本地化食物数据库
- 需求 3: 红黄绿灯健康评价
- 需求 4: 用户健康画像管理
- 需求 5: WhatsApp Bot 交互
- 需求 11: 数据隐私和安全
- 需求 12: 系统性能和可靠性
- 需求 15: 多语言和本地化支持（基础版：中英文）
- 需求 17: 快速操作和快捷回复（基础版）
- 需求 19: 智能错误处理和用户引导
- 需求 20: 成本控制和监控（基础版）

### 第二阶段（留存与闭环）
- 需求 6: 每日健康总结
- 需求 7: 订阅和支付管理
- 需求 10: Web Dashboard 数据可视化
- 需求 13: 用户反馈和持续改进
- 需求 14: 社交和激励机制
- 需求 16: 智能上下文理解
- 需求 18: 离线和网络优化
- 需求 20: 成本控制和监控（完整版）

### 第三阶段（高阶差异化）
- 需求 8: 体检报告数字化
- 需求 9: 超市扫描助手
- 需求 15: 多语言和本地化支持（完整版：增加繁体中文）
- 需求 16: 智能上下文理解（高级功能：位置推荐）


## 成功指标

### 第一阶段 MVP 成功指标（3 个月内）
- **用户获取**: 1000+ 注册用户
- **用户活跃**: 日活跃用户 (DAU) 达到 200+
- **识别准确率**: 食物识别准确率 > 85%
- **用户满意度**: 识别结果反馈"准确"比例 > 80%
- **响应时间**: 95% 的请求在 10 秒内完成
- **系统可用性**: 月度可用性 > 99%

### 第二阶段成功指标（6 个月内）
- **用户增长**: 5000+ 注册用户
- **付费转化**: 付费用户占比 > 5%
- **用户留存**: 7 日留存率 > 40%，30 日留存率 > 20%
- **用户参与**: 平均每用户每周识别 > 5 次
- **收入目标**: 月度经常性收入 (MRR) > SGD 2000
- **成本控制**: 单用户月度 AI API 成本 < SGD 0.50

### 第三阶段成功指标（12 个月内）
- **市场地位**: 新加坡健康饮食助手类产品前 3 名
- **用户规模**: 20000+ 注册用户
- **付费转化**: 付费用户占比 > 10%
- **用户留存**: 30 日留存率 > 30%
- **收入目标**: 月度经常性收入 (MRR) > SGD 10000
- **品牌认知**: 在新加坡健康社群中获得认可和推荐

## 风险和缓解策略

### 技术风险
- **风险**: AI API 成本过高导致亏损
  - **缓解**: 实施严格的成本监控、使用缓存、优先使用低成本模型
- **风险**: 食物识别准确率不达标
  - **缓解**: 持续优化 Prompt、收集用户反馈、建立本地化食物数据库
- **风险**: WhatsApp API 限制或政策变化
  - **缓解**: 遵守 WhatsApp 使用政策、准备备用通信渠道（Telegram）

### 市场风险
- **风险**: 用户付费意愿低
  - **缓解**: 提供慷慨的免费额度、7 天试用、清晰展示价值
- **风险**: 竞争对手进入市场
  - **缓解**: 快速迭代、建立技术壁垒（本地化数据）、培养用户习惯
- **风险**: 新加坡市场规模有限
  - **缓解**: 第一阶段专注新加坡，后续扩展至马来西亚、香港等市场

### 运营风险
- **风险**: 用户数据泄露
  - **缓解**: 严格的安全措施、遵守 PDPA、定期安全审计
- **风险**: 医疗建议引发法律问题
  - **缓解**: 明确声明非医疗建议、建议用户咨询专业医生、购买责任保险
