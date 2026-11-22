import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === 'production';

const app = express();
app.use(express.json({ limit: '8mb' }));

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('مفتاح Gemini API غير متوفر في إعدادات الخادم.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

app.post('/api/identify-part', async (req, res) => {
  try {
    const { imageBase64, mimeType } = req.body as {
      imageBase64?: string;
      mimeType?: string;
    };

    if (!imageBase64 || typeof imageBase64 !== 'string') {
      res.status(400).json({ error: 'يرجى إرسال صورة صالحة للتحليل.' });
      return;
    }

    const base64Data = imageBase64.includes(',')
      ? imageBase64.split(',')[1]
      : imageBase64;

    const cleanMime =
      typeof mimeType === 'string' && mimeType.startsWith('image/')
        ? mimeType
        : 'image/jpeg';

    const ai = getGeminiClient();

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: cleanMime,
              data: base64Data,
            },
          },
          {
            text:
              'أنت خبير قطع غيار سيارات مستعملة وفرط في السوق العربي والعراقي. حلّل هذه الصورة لقطعة غيار سيارة واستخرج المعلومات بدقة باللغة العربية. ' +
              'اختر القسم الأنسب حصراً من هذه القائمة: محرك وتبريد، كهرباء، هيكل وأبواب، إضاءة، فرامل وتعليق، قطع داخلية، أخرى. ' +
              'اختر الحالة الأنسب حصراً من هذه القائمة: مستعمل - نظيف، فرط وكالة، جديد. ' +
              'إذا لم يظهر نوع أو موديل سيارة محدد في الصورة، اكتب "غير محدد" أو الماركة الأقرب إن وجدت علامة واضحة.',
          },
        ],
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: {
              type: Type.STRING,
              description: 'الاسم الشائع لقطعة الغيار بالعربية مثل: دينمو، كمبريسر تكييف، كشاف أمامي، باب أمامي',
            },
            category: {
              type: Type.STRING,
              description: 'القسم من القائمة المحددة',
            },
            carMake: {
              type: Type.STRING,
              description: 'نوع/شركة السيارة المتوقعة مثل تويوتا، هيونداي، كيا أو غير محدد',
            },
            carModel: {
              type: Type.STRING,
              description: 'الموديل والسنة المتوقعة إن ظهرت وإلا فارغ',
            },
            condition: {
              type: Type.STRING,
              description: 'حالة القطعة من القائمة: مستعمل - نظيف أو فرط وكالة أو جديد',
            },
            notes: {
              type: Type.STRING,
              description: 'ملاحظات فنية مختصرة باللغة العربية حول القطعة الظاهرة وحالتها',
            },
          },
          required: ['name', 'category', 'carMake', 'carModel', 'condition', 'notes'],
        },
      },
    });

    const rawText = (response.text ?? '{}').trim();
    const parsed = JSON.parse(rawText);
    res.json({ result: parsed });
  } catch (error) {
    console.error('Gemini identify-part error:', error);
    const message =
      error instanceof Error
        ? error.message
        : 'تعذر تحليل الصورة بالذكاء الاصطناعي.';
    res.status(500).json({ error: message });
  }
});

async function startServer() {
  // Always prevent stale browser caching of Service Worker and Web Manifest
  // so installed iOS/Android PWAs pick up every new deployment immediately.
  app.use((req, res, next) => {
    if (
      req.path === '/sw.js' ||
      req.path === '/dev-sw.js' ||
      req.path === '/manifest.webmanifest'
    ) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Service-Worker-Allowed', '/');
    }
    next();
  });

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
