import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import dotenv from "dotenv";
import fs from "fs";
import admin from "firebase-admin";
import { AlipaySdk, AlipayFormData } from "alipay-sdk";

dotenv.config();

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception thrown:', err);
});

import { fileURLToPath } from "url";
import path from "path";

// CJS production: __dirname and __filename are provided by Node.js
// We reference them to prevent the warning but don't use them directly

// Initialize Firebase Admin globally so it doesn't crash on startup if missing.
// This is typically provided via service account json
let firebaseAdminApp: admin.app.App | null = null;
try {
  // If we don't have a service account JSON, we will skip it for now and throw later when needed
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    firebaseAdminApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  }
} catch (e) {
  console.log("Firebase Admin could not be initialized immediately. Ensure FIREBASE_SERVICE_ACCOUNT is set in .env");
}

let alipaySdk: AlipaySdk | null = null;
try {
  if (process.env.ALIPAY_APP_ID && process.env.ALIPAY_PRIVATE_KEY && process.env.ALIPAY_PUBLIC_KEY) {
    // Standard initialization using constructor
    alipaySdk = new AlipaySdk({
      appId: process.env.ALIPAY_APP_ID,
      privateKey: process.env.ALIPAY_PRIVATE_KEY,
      alipayPublicKey: process.env.ALIPAY_PUBLIC_KEY,
      gateway: process.env.ALIPAY_GATEWAY || 'https://openapi.alipay.com/gateway.do',
    });
  }
} catch (e) {
  console.log("Alipay SDK could not be initialized");
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  const uploadsDir = path.join(process.cwd(), "uploads");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Helper middleware for Auth
  const requireAuth = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const idToken = authHeader.split('Bearer ')[1];

    // Beta token bypass
    if (idToken && idToken.startsWith('beta-')) {
      (req as any).user = { uid: idToken.replace('beta-', '') };
      return next();
    }

    try {
      if (!firebaseAdminApp) throw new Error("Firebase Admin not configured");
      const decodedToken = await firebaseAdminApp.auth().verifyIdToken(idToken);
      (req as any).user = decodedToken;
      next();
    } catch (e) {
      console.log(e);
      return res.status(401).json({ error: 'Unauthorized' });
    }
  };

  app.use(express.json({ limit: '200mb' }));
  app.use(express.urlencoded({ limit: '200mb', extended: true }));
  app.use("/uploads", express.static(uploadsDir));

  // Payment Endpoints
  app.post("/api/payment/create", requireAuth, async (req, res) => {
    try {
      const { amount, points, description } = req.body;
      const uid = (req as any).user.uid;
      
      if (!firebaseAdminApp) throw new Error("Firebase admin not initialized.");
      const db = firebaseAdminApp.firestore();

      // Create a pending transaction
      const txRef = db.collection('transactions').doc();
      await txRef.set({
        userId: uid,
        amount: Number(amount),
        points: Number(points),
        type: 'recharge',
        status: 'pending',
        description: description || `Recharge ${points} points`,
        metadata: {},
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      if (!alipaySdk) {
        // Mock payment process if Alipay is not configured
        console.log("Mocking payment success since Alipay is not configured.");
        
        // Let's pretend it succeeds instantly for preview purpose
        setTimeout(async () => {
           await txRef.update({ status: 'completed' });
           await db.collection('users').doc(uid).update({
             points: admin.firestore.FieldValue.increment(Number(points))
           });
        }, 1000);
        
        return res.json({ mock: true, message: "模拟支付环境：积分将自动到账" });
      }

      const orderId = txRef.id;
      const formData = new AlipayFormData();
      formData.setMethod('get');
      formData.addField('bizContent', {
        outTradeNo: orderId,
        productCode: 'FAST_INSTANT_TRADE_PAY',
        totalAmount: amount.toString(),
        subject: description || 'Points Recharge',
      });
      // The returnUrl can be our domain
      formData.addField('returnUrl', `${req.protocol}://${req.get('host')}/app/pricing`);
      formData.addField('notifyUrl', `https://${req.get('host')}/api/payment/notify`);

      const result = await alipaySdk.exec(
        'alipay.trade.page.pay',
        {},
        { formData: formData }
      );

      res.json({ url: result });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/payment/notify", async (req, res) => {
    if (!alipaySdk) return res.send('failure');
    // Verify Alipay signature here
    const postData = req.body;
    try {
      const ok = alipaySdk.checkNotifySign(postData);
      if (!ok) {
        return res.send('failure');
      }

      if (postData.trade_status === 'TRADE_SUCCESS' || postData.trade_status === 'TRADE_FINISHED') {
         const orderId = postData.out_trade_no;
         if (firebaseAdminApp) {
           const db = firebaseAdminApp.firestore();
           const txRef = db.collection('transactions').doc(orderId);
           const txSnap = await txRef.get();
           if (txSnap.exists && txSnap.data()?.status === 'pending') {
             await txRef.update({
                status: 'completed',
                metadata: postData
             });
             await db.collection('users').doc(txSnap.data()?.userId).update({
                points: admin.firestore.FieldValue.increment(Number(txSnap.data()?.points))
             });
           }
         }
      }
      res.send("success");
    } catch (e) {
      console.error(e);
      res.send("failure");
    }
  });


  // API Route for chat completion
  app.post("/api/chat", async (req, res) => {
    try {
      const { message } = req.body;
      const apiKey = process.env.VECTORENGINE_API_KEY || "sk-BAVz4Ih538ynhPGkXsbxzQZb4kmBsxyTPoj3ljFAqMWJCmvW";
      const baseUrl = process.env.VECTORENGINE_BASE_URL || "https://api.apimart.ai/v1";
      const fallbackApiKey = process.env.VECTORENGINE_IMAGE_API_KEY || "sk-WtgcIw3flJOhtjGQAUcevn1fXW97ow4UIojLjRD3IVSNIVPu";
      const fallbackBaseUrl = "https://api.apimart.ai/v1";
      
      let response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gemini-3-flash-preview",
          messages: [{ role: "user", content: message }]
        }),
      });
      
      if (!response.ok) {
        // Silent fallback
        response = await fetch(`${fallbackBaseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${fallbackApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gemini-3-flash-preview",
            messages: [{ role: "user", content: message }]
          }),
        });
      }

      const rawText = await response.text();
      let data;
      try {
        data = JSON.parse(rawText);
      } catch (e) {
        throw new Error("模型返回了不支持的格式");
      }
      
      if (!response.ok) {
        throw new Error(data.error?.message || "Failed to generate content");
      }
      
      const resultText = data.choices?.[0]?.message?.content || "";
      res.json({ result: resultText });
    } catch (error) {
      console.error(error);
      if (error instanceof Error) {
        res.status(500).json({ error: error.message });
      } else {
        res.status(500).json({ error: "An unknown error occurred" });
      }
    }
  });

  // Custom route for generating image via OpenAI DALL-E 2
  app.post("/api/generate-image/submit", requireAuth, async (req, res) => {
    try {
      const { prompt, style, ratio, resolution, image, images } = req.body;
      const uid = (req as any).user.uid;
      
      let creditCost = 6;
      let requestResolution = (resolution || "1K").toLowerCase();
      if (requestResolution === "4k") creditCost = 10;
      else if (requestResolution === "2k") creditCost = 8;
      else requestResolution = "1k";

      if (firebaseAdminApp) {
        const db = firebaseAdminApp.firestore();
        const userRef = db.collection('users').doc(uid);
        const userSnap = await userRef.get();
        if (!userSnap.exists) throw new Error("用户未找到");
        const currentPoints = userSnap.data()?.points || 0;
        if (currentPoints < creditCost) {
           return res.status(403).json({ error: "算力不足，请充值" });
        }
        await userRef.update({ points: admin.firestore.FieldValue.increment(-creditCost) });
        
        // Log consumption
        await db.collection('transactions').add({
          userId: uid,
          amount: 0,
          points: -creditCost,
          type: 'consume',
          status: 'completed',
          description: `生成紫砂图片 (${requestResolution})`,
          metadata: {},
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }

      const apiKey = process.env.VECTORENGINE_API_KEY || "sk-BAVz4Ih538ynhPGkXsbxzQZb4kmBsxyTPoj3ljFAqMWJCmvW";
      const baseUrl = "https://api.apimart.ai/v1";
      
      const defaultPrompt = `以用户上传的紫砂壶原图为唯一主体参考，100%严格、无差别复刻紫砂壶的所有本体特征：包括壶形整体轮廓、壶嘴/壶把/壶盖/壶钮的比例与结构、泥料的原生颜色与光泽度、壶身的所有纹路、刻绘细节、泥料颗粒质感、壶体的接缝与做工细节；绝对禁止修改、变形、重构、美化壶体的任何部分，壶体必须与原图完全一致，无任何结构、颜色、细节上的偏差；仅对画面的光影、场景、背景、构图进行优化创作，所有创作不得干扰、遮挡、改变紫砂壶主体。

拍摄设备为索尼A7R V全画幅微单相机，搭载索尼FE 90mm f/2.8 Macro G OSS 专业微距镜头；拍摄参数：光圈f/10，ISO 100，快门速度1/125s，白平衡自定义5500K，RAW格式原片拍摄，无镜头畸变，无透视变形，对焦精准锁定在紫砂壶壶身主体，100%合焦清晰。

采用商业静物摄影4灯布光法：主光为45°侧逆光120cm八角柔光箱，精准勾勒紫砂壶的轮廓线条，突出泥料的温润质感与立体结构；辅光为正面90cm柔光板低功率补光，消除壶身正面死黑阴影，保留明暗过渡的细腻层次；轮廓光为双侧窄条柔光箱，强化壶嘴、壶把的线条感；细节光为束光筒，精准打亮壶身刻绘/纹路，强化细节质感；整体光影层次丰富，明暗对比适中，影调过渡柔和自然，无过曝、无死黑，完美呈现泥料的原生质感。

色彩空间为Adobe RGB，色深16bit；紫砂壶泥料的颜色严格与原图保持一致；整体色调为新中式原木暖调，饱和度适中，不过分艳丽，对比度+10，呈现干净、高级的质感。

景别：中景，完整展示紫砂壶全壶，同时带入少量场景氛围，无裁切；机位：平视机位，镜头光轴与紫砂壶壶身中心完全水平；构图：居中对称构图，壶体位于画面视觉中心，上下左右预留均匀的呼吸空间，无边缘裁切；景深：壶体整体位于景深范围内，100%全程清晰，背景与配景元素适度虚化，焦外过渡柔和自然，进一步突出主体。

场景为新中式禅意茶空间，桌面为老榆木风化实木茶桌，背景为浅灰色亚麻肌理背景板，搭配1个粗陶品茗杯、一小枝枯竹，所有配景元素位于画面边缘，体积远小于紫砂壶主体，且做虚化处理，绝对不遮挡、不抢紫砂壶的视觉焦点，整体场景干净整洁，无杂乱元素，契合东方禅意美学。

8K超高清分辨率，超精细细节还原，商业级静物摄影质感，专业级后期修图，画面通透干净，无噪点、无颗粒、无畸变、无眩光、无水印、无文字、无logo，边缘锐利清晰，质感细腻温润，动态范围拉满，完美保留壶身所有暗部与亮部细节，呈现商业广告级的极致画质。

禁止紫砂壶壶体变形、比例失调、结构错误、壶嘴/壶把/壶盖缺失/错位；禁止壶身纹路、刻绘、泥料颗粒质感模糊、丢失、修改；禁止泥料颜色偏色、变色、饱和度异常；禁止画面出现多余人物、杂乱元素、水印、文字、logo、二维码；禁止画面过曝、死黑、噪点、畸变、眩光、模糊、对焦不实；禁止配景元素遮挡紫砂壶主体；禁止改变紫砂壶的任何本体特征。`;

      let promptToUse = prompt || style || defaultPrompt;
      let requestSize = ratio || "2:3";

      const requestBody: any = {
        model: "gpt-image-2",
        prompt: promptToUse,
        n: 1,
        size: requestSize,
        resolution: requestResolution
      };
      
      if (images && Array.isArray(images)) {
        requestBody.image_urls = images;
      } else if (image) {
        requestBody.image_urls = [image];
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);

      const response = await fetch(`${baseUrl}/images/generations`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const data = await response.json().catch(() => ({}));
      
      if (!response.ok || !data.data || !data.data[0]) {
        console.error("Submit task failed. Status:", response.status, "Data:", data, "Request Body:", JSON.stringify(requestBody).substring(0, 500) + '...');
        throw new Error(data.error?.message || "Failed to submit image task");
      }
      
      const taskId = data.data[0].task_id;
      if (!taskId) {
        throw new Error("No task_id returned from API");
      }
      
      res.json({ taskId });
    } catch (error) {
      console.error(error);
      if (error instanceof Error) {
        res.status(500).json({ error: error.message });
      } else {
        res.status(500).json({ error: "An unknown error occurred" });
      }
    }
  });

  app.get("/api/generate-image/status", async (req, res) => {
    try {
      const { taskId } = req.query;
      if (!taskId) return res.status(400).json({ error: "Missing taskId" });
      
      const apiKey = process.env.VECTORENGINE_API_KEY || "sk-BAVz4Ih538ynhPGkXsbxzQZb4kmBsxyTPoj3ljFAqMWJCmvW";
      const baseUrl = "https://api.apimart.ai/v1";

      const taskResponse = await fetch(`${baseUrl}/tasks/${taskId}`, {
        headers: {
          "Authorization": `Bearer ${apiKey}`
        }
      });
      
      if (!taskResponse.ok) {
        const errorData = await taskResponse.json().catch(() => ({}));
        throw new Error(errorData.error?.message || "Failed to check task status");
      }

      const taskData = await taskResponse.json().catch(() => ({}));
      if (taskData.data) {
        const status = taskData.data.status;
        if (status === "completed") {
          const urlArr = taskData.data.result?.images?.[0]?.url;
          if (urlArr && urlArr.length > 0) {
            return res.json({ status: "completed", resultUrl: urlArr[0] });
          }
        } else if (status === "failed") {
          return res.json({ status: "failed", error: taskData.error?.message || "Image generation task failed" });
        }
        return res.json({ status }); // pending or processing
      }
      res.json({ status: "unknown" });
    } catch (error) {
      console.error(error);
      if (error instanceof Error) {
        res.status(500).json({ error: error.message });
      } else {
        res.status(500).json({ error: "An unknown error occurred" });
      }
    }
  });

  // Analytics and prompt generation for MultiView Center base scene
  app.post("/api/multiview-base-prompt", async (req, res) => {
    try {
      const { images, remarks } = req.body;
      
      const analysisPrompt = `#任务1说明：
担任一名经验丰富的艺术品鉴定专家观察图片。
请仔细观察上传的产品原图，分析出产品的：器型特征、泥料质感（如紫砂颗粒感）、光泽特征（水色/包浆）、核心工艺细节与落款位置。
请输出一段准确详尽的产品细节描述，以确保后续AI绘画能精准还原，不允许有任何偏色和形状差异。

用户备注补充：${remarks || "无"}`;

      const apiKey = process.env.VECTORENGINE_API_KEY || "sk-BAVz4Ih538ynhPGkXsbxzQZb4kmBsxyTPoj3ljFAqMWJCmvW";
      const baseUrl = process.env.VECTORENGINE_BASE_URL || "https://api.apimart.ai/v1";
      const fallbackApiKey = process.env.VECTORENGINE_IMAGE_API_KEY || "sk-WtgcIw3flJOhtjGQAUcevn1fXW97ow4UIojLjRD3IVSNIVPu";
      const fallbackBaseUrl = "https://api.apimart.ai/v1";

      const content1: any[] = [{ type: "text", text: analysisPrompt }];
      if (images && Array.isArray(images)) {
        for (let i = 0; i < images.length && i < 3; i++) {
           content1.push({
             type: "image_url",
             image_url: { url: images[i] }
           });
        }
      }

      let response1 = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gemini-3-flash-preview",
          messages: [{ role: "user", content: content1 }],
          temperature: 0.2,
          stream: false
        }),
      });

      if (!response1.ok) {
        response1 = await fetch(`${fallbackBaseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${fallbackApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gemini-3-flash-preview",
            messages: [{ role: "user", content: content1 }],
            temperature: 0.2,
            stream: false
          }),
        });
      }

      const data1 = await response1.json().catch(() => ({}));
      const productAnalysis = data1.choices?.[0]?.message?.content || "";

      const generationPrompt = `#任务说明
我想为我的紫砂壶/艺术品制作一套博物馆级的视觉大片，请帮我生成一套适用于AI绘画平台的艺术摄影图设计系统提示词。

#角色设定
你是一名顶级的静物摄影大师兼高端艺术品视觉总监，精通徕卡/哈苏中画幅相机的镜头语言、顶级的光影塑造（如伦勃朗光、侧逆光轮廓）、东方禅意美学以及苏富比/佳士得级别的拍卖图录排版。你极其注重器物气韵的传达、泥料质感的微距捕捉以及色彩的绝对真实还原。请根据用户的紫砂壶器皿分析，生成出图提示词。

##提示词视觉要求：
光影叙事与色彩美学：视觉需深邃、高雅，通过绝佳的明暗对比（Chiaroscuro）瞬间抓住藏家眼球。光影与色彩极具高级感。设计必须保持统一的东方美学或极简空间风格，绝对不能有割裂感。

##提示词生成规范：
艺术品极度还原要求（核心）：
必须在提示词中明确强调并说明："100%严格还原上传的艺术品/紫砂壶图片，包括器型比例、流把细节、落款铭文位置等所有物理特征" "只参考产品，不保留场景背景" "绝对忠于原物的真实色彩，精准还原泥料种类，绝不允许偏色" "极致刻画真实的材质肌理"。

#初始化：
基于以下详细的产品分析：
${productAnalysis}

请直接输出一段用于主场景图生成的中文提示词（不要包含长宽比参数，只要内容主体）。只输出提示词，不需要任何额外的解释或 Markdown 包装格式。`;

      let response2 = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gemini-3-flash-preview",
          messages: [{ role: "user", content: generationPrompt }],
          temperature: 0.2,
          stream: false
        }),
      });

      if (!response2.ok) {
        response2 = await fetch(`${fallbackBaseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${fallbackApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gemini-3-flash-preview",
            messages: [{ role: "user", content: generationPrompt }],
            temperature: 0.2,
            stream: false
          }),
        });
      }

      const data2 = await response2.json().catch(() => ({}));
      const prompt = data2.choices?.[0]?.message?.content || "";

      res.json({ prompt });
    } catch (error) {
       console.error("Base prompt error: ", error);
       res.status(500).json({ error: error instanceof Error ? error.message : "Error generating base prompt" });
    }
  });

  // Analytics and prompt generation for MultiView Center batch prompts
  app.post("/api/multiview-generate-prompts", async (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Transfer-Encoding", "chunked");
    
    const keepAliveInterval = setInterval(() => {
      res.write(" ");
    }, 15000);

    req.on("close", () => {
      clearInterval(keepAliveInterval);
    });

    try {
      const { basePrompt, count, ratio, resolution } = req.body;
      
      const generationPrompt = `你之前为这件艺术品生成的主场景提示词是：
【${basePrompt}】

现在我们需要基于这个统一的主场景风格，生成 ${count} 个不同景别和视角的摄影提示词。
要求：
1. 场景、光影、泥料描述必须与主场景高度一致，让人一眼看出是在同一个场景下拍摄的。
2. 仅仅改变'相机视角、景别大小、聚焦位置'（例如：主图全景、侧边高位俯拍、嘴部微距特写、壶盖特写、低角仰拍、光影局部特写等视角互不重复）。
3. 注意：这 ${count} 张图中，绝对不要和主场景的第一张视角产生重复！必须是探索这把壶的其他全新角度或局部特写！
4. 每一个提示词都必须包含还原紫砂壶的要求（"100%严格还原紫砂壶比例与细节，只参考产品，不保留场景背景，绝不允许偏色"）。
5. 结尾必须加上参数 --ar ${ratio}，同时强调 ${resolution} 画质。

输出格式要求：严禁返回Markdown！只返回JSON格式数组结构。每项是一个字符串。例如：
[
  "正向长提示词1...",
  "正向长提示词2..."
]`;

      const apiKey = process.env.VECTORENGINE_API_KEY || "sk-BAVz4Ih538ynhPGkXsbxzQZb4kmBsxyTPoj3ljFAqMWJCmvW";
      const baseUrl = process.env.VECTORENGINE_BASE_URL || "https://api.apimart.ai/v1";
      const fallbackApiKey = process.env.VECTORENGINE_IMAGE_API_KEY || "sk-WtgcIw3flJOhtjGQAUcevn1fXW97ow4UIojLjRD3IVSNIVPu";
      const fallbackBaseUrl = "https://api.apimart.ai/v1";

      let response2 = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gemini-3-flash-preview",
          messages: [{ role: "user", content: generationPrompt }],
          temperature: 0.2,
          stream: false
        }),
      });

      if (!response2.ok) {
        response2 = await fetch(`${fallbackBaseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${fallbackApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gemini-3-flash-preview",
            messages: [{ role: "user", content: generationPrompt }],
            temperature: 0.2,
            stream: false
          }),
        });
      }

      if (!response2.ok) {
        const data = await response2.json().catch(() => ({}));
        throw new Error("Prompt Generation failed at Step 2: " + (data.error?.message || response2.statusText));
      }

      const rawBody2 = await response2.text();
      let data2;
      if (rawBody2.trim().startsWith("data: ")) {
         const lines = rawBody2.split('\\n');
         let contentAcc = "";
         for (const line of lines) {
            if (line.startsWith("data: ") && line.trim() !== "data: [DONE]") {
               try {
                   const chunk = JSON.parse(line.substring(6));
                   if (chunk.choices && chunk.choices[0] && chunk.choices[0].delta && chunk.choices[0].delta.content) {
                       contentAcc += chunk.choices[0].delta.content;
                   }
               } catch(e) {}
            }
         }
         data2 = { choices: [{ message: { content: contentAcc } }] };
      } else {
         try {
            data2 = JSON.parse(rawBody2);
         } catch(e) {
            console.error(rawBody2.substring(0, 500));
            throw new Error("模型解析服务不可用");
         }
      }
      
      const rawText = data2.choices?.[0]?.message?.content || "";
      let prompts = [];
      try {
        const cleanedText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
        const arrayMatch = cleanedText.match(/\[\s*([\s\S]*?)\s*\]/);
        if (arrayMatch && arrayMatch[0]) {
          prompts = JSON.parse(arrayMatch[0]);
        } else {
          prompts = JSON.parse(cleanedText);
        }
      } catch (e) {
        console.error("Failed to parse JSON prompts", e);
        throw new Error("模型返回的并不是标准的 JSON。");
      }

      clearInterval(keepAliveInterval);
      res.write(JSON.stringify({ prompts }));
      res.end();
    } catch (error) {
      console.error("Multiview generate prompts error: ", error);
      clearInterval(keepAliveInterval);
      if (error instanceof Error) {
        res.write(JSON.stringify({ error: error.message }));
      } else {
        res.write(JSON.stringify({ error: "An unknown error occurred" }));
      }
      res.end();
    }
  });

  // Analytics and prompt generation for Layout Center
  app.post("/api/layout-generate-prompts", async (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Transfer-Encoding", "chunked");
    
    const keepAliveInterval = setInterval(() => {
      res.write(" ");
    }, 15000);

    req.on("close", () => {
      clearInterval(keepAliveInterval);
    });

    try {
      const { images } = req.body;
      
      const analysisPrompt = `#任务1说明：
担任一名经验丰富的艺术品鉴定专家观察图片。
请仔细观察上传的产品原图，分析出产品的：器型特征、泥料质感（如紫砂颗粒感）、光泽特征（水色/包浆）、核心工艺细节与落款位置。
请输出一段准确详尽的产品细节描述，以确保后续AI绘画能精准还原，不允许有任何偏色和形状差异。`;

      const apiKey = process.env.VECTORENGINE_API_KEY || "sk-BAVz4Ih538ynhPGkXsbxzQZb4kmBsxyTPoj3ljFAqMWJCmvW";
      const baseUrl = process.env.VECTORENGINE_BASE_URL || "https://api.apimart.ai/v1";
      const fallbackApiKey = process.env.VECTORENGINE_IMAGE_API_KEY || "sk-WtgcIw3flJOhtjGQAUcevn1fXW97ow4UIojLjRD3IVSNIVPu";
      const fallbackBaseUrl = "https://api.apimart.ai/v1";

      const content1: any[] = [{ type: "text", text: analysisPrompt }];
      if (images && Array.isArray(images)) {
        for (let i = 0; i < images.length && i < 3; i++) {
           content1.push({
             type: "image_url",
             image_url: { url: images[i] }
           });
        }
      }

      let response1 = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gemini-3-flash-preview",
          messages: [{ role: "user", content: content1 }],
          temperature: 0.2,
          stream: false
        }),
      });

      if (!response1.ok) {
        // Fallback to older working API key silently
        response1 = await fetch(`${fallbackBaseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${fallbackApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gemini-3-flash-preview",
            messages: [{ role: "user", content: content1 }],
            temperature: 0.2,
            stream: false
          }),
        });
      }

      if (!response1.ok) {
        const data = await response1.json().catch(() => ({}));
        throw new Error("Prompt Generation failed at Step 1: " + (data.error?.message || response1.statusText));
      }

      const rawBody = await response1.text();
      let data1;
      if (rawBody.trim().startsWith("data: ")) {
         const lines = rawBody.split('\n');
         let contentAcc = "";
         for (const line of lines) {
            if (line.startsWith("data: ") && line.trim() !== "data: [DONE]") {
               try {
                   const chunk = JSON.parse(line.substring(6));
                   if (chunk.choices && chunk.choices[0] && chunk.choices[0].delta && chunk.choices[0].delta.content) {
                       contentAcc += chunk.choices[0].delta.content;
                   }
               } catch(e) {}
            }
         }
         data1 = { choices: [{ message: { content: contentAcc } }] };
      } else {
         try {
            data1 = JSON.parse(rawBody);
         } catch(e) {
            console.error(rawBody.substring(0, 500));
            throw new Error("模型解析初次服务不可用");
         }
      }
      const productAnalysis = data1.choices?.[0]?.message?.content || "";

      const generationPrompt = `#任务2说明：
作为顶级的静物摄影大师兼高端艺术品视觉总监，基于以下艺术品鉴定专家的详尽分析描述：
【产品特征描述】
${productAnalysis}

为我生成一套适用于AI绘画平台的艺术摄影图设计系统提示词。

##提示词视觉要求：
1. 拍卖级图录排版：每一页的排版设计要像顶级艺术杂志或博物馆级图录一样留白且高级。摄影角度多元化（平视威严感、45度把玩视角、90度俯拍、极致微距特写等）。
2. 光影叙事与色彩美学：视觉需深邃、高雅，通过明暗对比（Chiaroscuro）。8K超高清，光影质感。统一风格（如侘寂风、高级暗黑），中文文字采用统一的宋体/明朝体等高级雅致字体竖向排版。
3. 每屏内容详尽：主标题和副标题（充满诗意）、画面主体描述（严格要求还原【产品特征描述】中的细节，并且必须强调：只参考产品，不保留场景背景）、光影布置手法、空间场景道具、排版形式、美学感强调、负面提示词、以及长宽比 '--ar 2:3'。

#格式输出要求
请严格输出一个 JSON 数组，数组只包含刚好 15 个字符串，每个字符串为一屏的纯英文完整提示词内容（Midjourney prompt格式）。不要输出任何 markdown 代码块标记，不要包含 \`\`\`json 标签，严格返回合法的 JSON 数组结构。`;

      let response2 = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gemini-3-flash-preview",
          messages: [{ role: "user", content: generationPrompt }],
          temperature: 0.2,
          stream: false
        }),
      });

      if (!response2.ok) {
        // Fallback to older working API key silently
        response2 = await fetch(`${fallbackBaseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${fallbackApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gemini-3-flash-preview",
            messages: [{ role: "user", content: generationPrompt }],
            temperature: 0.2,
            stream: false
          }),
        });
      }

      if (!response2.ok) {
        const data = await response2.json().catch(() => ({}));
        throw new Error("Prompt Generation failed at Step 2: " + (data.error?.message || response2.statusText));
      }

      const rawBody2 = await response2.text();
      let data2;
      if (rawBody2.trim().startsWith("data: ")) {
         const lines = rawBody2.split('\n');
         let contentAcc = "";
         for (const line of lines) {
            if (line.startsWith("data: ") && line.trim() !== "data: [DONE]") {
               try {
                   const chunk = JSON.parse(line.substring(6));
                   if (chunk.choices && chunk.choices[0] && chunk.choices[0].delta && chunk.choices[0].delta.content) {
                       contentAcc += chunk.choices[0].delta.content;
                   }
               } catch(e) {}
            }
         }
         data2 = { choices: [{ message: { content: contentAcc } }] };
      } else {
         try {
           data2 = JSON.parse(rawBody2);
         } catch (e) {
           console.error("Failed to parse prompt response:", rawBody2.substring(0, 500));
           throw new Error("模型服务暂时不可用或返回格式错误，请稍后重试");
         }
      }
      const rawText = data2.choices?.[0]?.message?.content || "";
      let prompts = [];
      try {
        const cleanedText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
        // Look for the array if there is any conversational text
        const arrayMatch = cleanedText.match(/\[\s*([\s\S]*?)\s*\]/);
        if (arrayMatch && arrayMatch[0]) {
          prompts = JSON.parse(arrayMatch[0]);
        } else {
          prompts = JSON.parse(cleanedText);
        }
      } catch (e) {
        console.error("Failed to parse JSON prompts", e);
        // Fallback to split by newlines if it output a numbered list instead of a JSON array
        const lines = rawText.split('\n').filter(l => l.trim().length > 10 && !l.includes('```'));
        if (lines.length > 5) {
          prompts = lines;
        } else {
          prompts = [rawText];
        }
      }

      clearInterval(keepAliveInterval);
      res.write(JSON.stringify({ prompts }));
      res.end();
    } catch (error) {
      console.error("Layout generate prompts error: ", error);
      clearInterval(keepAliveInterval);
      if (error instanceof Error) {
        res.write(JSON.stringify({ error: error.message }));
      } else {
        res.write(JSON.stringify({ error: "An unknown error occurred" }));
      }
      res.end();
    }
  });

  // Analytics and prompt generation for Batch Center
  app.post("/api/batch-generate-prompts", async (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Transfer-Encoding", "chunked");
    
    const keepAliveInterval = setInterval(() => {
      res.write(" ");
    }, 15000);

    req.on("close", () => {
      clearInterval(keepAliveInterval);
    });

    try {
      const { image, ratio, resolution } = req.body;
      
      const analysisPrompt = `#任务1说明：
担任一名经验丰富的艺术品鉴定专家。
请仔细观察上传的产品原图，分析出产品的：器型特征、泥料质感（如紫砂颗粒感）、光泽特征、核心工艺细节。
请输出一段准确详尽的产品细节描述，以确保后续AI绘画能精准还原，不允许有任何偏色和形状差异。`;

      const apiKey = process.env.VECTORENGINE_API_KEY || "sk-BAVz4Ih538ynhPGkXsbxzQZb4kmBsxyTPoj3ljFAqMWJCmvW";
      const baseUrl = process.env.VECTORENGINE_BASE_URL || "https://api.apimart.ai/v1";
      const fallbackApiKey = process.env.VECTORENGINE_IMAGE_API_KEY || "sk-WtgcIw3flJOhtjGQAUcevn1fXW97ow4UIojLjRD3IVSNIVPu";
      const fallbackBaseUrl = "https://api.apimart.ai/v1";

      const content1: any[] = [{ type: "text", text: analysisPrompt }];
      if (image) {
         content1.push({
           type: "image_url",
           image_url: { url: image }
         });
      }

      let response1 = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gemini-3-flash-preview",
          messages: [{ role: "user", content: content1 }],
          temperature: 0.2,
          stream: false
        }),
      });

      if (!response1.ok) {
        response1 = await fetch(`${fallbackBaseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${fallbackApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gemini-3-flash-preview",
            messages: [{ role: "user", content: content1 }],
            temperature: 0.2,
            stream: false
          }),
        });
      }

      if (!response1.ok) {
        throw new Error("Prompt Generation failed at Step 1");
      }

      const data1 = await response1.json().catch(() => ({}));
      const productAnalysis = data1.choices?.[0]?.message?.content || "";

      const generationPrompt = `#任务2说明：
作为顶级的静物摄影大师兼高端艺术品视觉总监，基于以下艺术品鉴定专家的详尽分析描述：
【产品特征描述】
${productAnalysis}

为我生成一套适用于AI绘画平台的艺术摄影图设计系统提示词。

## 批量流水线视觉要求：
1. 请先为这款紫砂壶量身定制一个最具格调的高级商业摄影风格和场景（如环境、背景、光影、氛围等），并将这个【核心场景与风格】固定下来，整套组图必须在这个固定场景下拍摄。
2. 基于上述统一的【核心场景与风格】，生成 9 个不同景别和视角的摄影提示词（例如：主图全景、侧边高位俯拍、嘴部微距特写、壶盖特写、低角仰拍、光影局部特写等）。
3. 这 9 张图必须让人一眼看出是在同一次拍摄、同一个场景下完成的，环境氛围高度连续一致。
4. 主体紫砂壶必须严格遵循【产品特征描述】中的泥料颜色、形制、质感，外形与颜色100%不可改变！同时在提示词中明确写道："只参考产品，不保留场景背景"。必须强调精确还原不偏色。
5. 每张画面的光影都要有极强的空间感和质感，符合 ${resolution} 超高清的商业图册标准，长宽比需写上 --ar ${ratio}。

#格式输出要求
请严格输出一个 JSON 数组（不要提供任何其他 Markdown 文字，只需合法的 JSON 数组！），包含 9 个字符串，每个字符串为一张图的完整中文提示词。
**注意**：这9个提示词的场景渲染、光影描述、泥料外观描述必须高度一致，核心是要在提示词中仅仅改变“相机视角、景别大小、聚焦位置”的描述。`;

      let response2 = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gemini-3-flash-preview",
          messages: [{ role: "user", content: generationPrompt }],
          temperature: 0.2,
          stream: false
        }),
      });

      if (!response2.ok) {
        response2 = await fetch(`${fallbackBaseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${fallbackApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gemini-3-flash-preview",
            messages: [{ role: "user", content: generationPrompt }],
            temperature: 0.2,
            stream: false
          }),
        });
      }

      if (!response2.ok) {
        throw new Error("Prompt Generation failed at Step 2");
      }

      const data2 = await response2.json().catch(() => ({}));
      const rawText = data2.choices?.[0]?.message?.content || "";
      let prompts = [];
      try {
        const cleanedText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
        const arrayMatch = cleanedText.match(/\[\s*([\s\S]*?)\s*\]/);
        if (arrayMatch && arrayMatch[0]) {
          prompts = JSON.parse(arrayMatch[0]);
        } else {
          prompts = JSON.parse(cleanedText);
        }
      } catch (e) {
        console.error("Failed to parse JSON prompts", e);
        throw new Error("模型返回非标准JSON");
      }

      clearInterval(keepAliveInterval);
      res.write(JSON.stringify({ prompts }));
      res.end();
    } catch (error) {
      console.error("Batch generate prompts error: ", error);
      clearInterval(keepAliveInterval);
      if (error instanceof Error) {
        res.write(JSON.stringify({ error: error.message }));
      } else {
        res.write(JSON.stringify({ error: "An unknown error occurred" }));
      }
      res.end();
    }
  });

  app.get("/api/proxy-image", async (req, res) => {
    try {
      const imageUrl = req.query.url as string;
      if (!imageUrl) {
        return res.status(400).send("No url provided");
      }
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch from url: ${response.statusText}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      res.setHeader("Content-Type", response.headers.get("content-type") || "image/jpeg");
      res.send(Buffer.from(arrayBuffer));
    } catch (e) {
      console.error("Proxy image error:", e);
      res.status(500).send("Error proxying image");
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
