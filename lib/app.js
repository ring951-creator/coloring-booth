// 청사진의 시대 - Express 앱 (라우트 정의만 담당, 서버 실행은 안 함)
// server.js(로컬 실행용)와 api/[...path].js(Vercel 배포용) 양쪽에서 이 파일을 가져다 씁니다.

require('dotenv/config');
const express = require('express');
const multer = require('multer');

const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 4 * 1024 * 1024 } // Vercel 요청 크기 제한(약 4.5MB)에 맞춤
});

app.use(express.json({ limit: '4mb' }));

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image';

// 하루 최대 호출 수 안전장치 (비용 폭주 방지용).
// 주의: Vercel 서버리스 환경에서는 함수가 매 요청마다 새로 켜질 수 있어
// 이 카운터가 완벽하게 누적되지 않을 수 있습니다 (참고용 안전장치로만 사용).
const MAX_DAILY_CALLS = parseInt(process.env.MAX_DAILY_CALLS || '1000', 10);
let dailyCallCount = 0;
let dailyCountDate = new Date().toDateString();

function checkAndConsumeDailyLimit() {
  const today = new Date().toDateString();
  if (today !== dailyCountDate) {
    dailyCountDate = today;
    dailyCallCount = 0;
  }
  if (dailyCallCount >= MAX_DAILY_CALLS) return false;
  dailyCallCount++;
  return true;
}

// 컬러링 페이지 스타일로 바꾸는 프롬프트.
const PROMPT = `Redraw this photo as a clean black-and-white children's coloring book page.
Keep the person's hairstyle, facial features, and expression recognizable, but turn everything
into smooth, continuous, uniform-width black outlines on a pure white background.
No shading, no gray tones, no color, no background clutter, no text. Bold, clean, friendly
cartoon-illustration linework suitable for a child to color in with crayons.`;

// 캐리커처용 스타일 4종. 사용자가 이 중 하나를 고르면 그 스타일 "하나만" 생성합니다.
const CARICATURE_STYLES = [
  {
    id: 'cute-chibi',
    label: '귀여운 카툰',
    emoji: '🎨',
    prompt: `Turn this photo into a cute chibi-style caricature: slightly oversized head, big
sparkling eyes, small simplified body, soft rounded shapes, vibrant warm colors, clean bold
outlines, plain light background. Keep the person recognizable and expression friendly.`
  },
  {
    id: 'watercolor',
    label: '수채화 일러스트',
    emoji: '🖌️',
    prompt: `Turn this photo into a soft watercolor-style caricature portrait: gentle painterly
brush strokes, light color washes, delicate visible paper texture, warm pastel palette, artistic
and elegant. Keep the person recognizable.`
  },
  {
    id: 'pop-art',
    label: '팝아트',
    emoji: '💥',
    prompt: `Turn this photo into a bold pop-art style caricature portrait: flat saturated colors,
thick black outlines, halftone dot shading, high contrast, comic-book energy. Keep the person
recognizable.`
  },
  {
    id: 'pencil-sketch',
    label: '색연필 스케치',
    emoji: '✏️',
    prompt: `Turn this photo into a hand-drawn colored-pencil sketch caricature: visible pencil
stroke texture, warm and soft coloring, slightly exaggerated friendly features, sketchbook
illustration feel. Keep the person recognizable.`
  }
];

// 컬러 캐리커처를 흑백 망가/잉크 일러스트 스타일로 다시 그리는 프롬프트.
const INK_PROMPT = `Redraw this portrait as a black-and-white manga/comic ink illustration.
Pure black and white only — no gray tones, no color. Use bold solid black fills for hair and
deep shadow areas, fine cross-hatching or line-shading strokes to suggest form and depth on the
face and clothing, and clean confident black outlines. Keep the person's likeness and expression
recognizable. Plain pure white background, no text, no frame, high contrast professional inked
portrait style.`;

async function callGeminiImageEdit(fileBuffer, mimetype, prompt) {
  if (!GEMINI_API_KEY) {
    const err = new Error('서버에 GEMINI_API_KEY가 설정되지 않았어요.');
    err.status = 500;
    err.code = 'SERVER_NO_API_KEY';
    throw err;
  }
  if (!checkAndConsumeDailyLimit()) {
    const err = new Error(`오늘 하루 최대 호출 수(${MAX_DAILY_CALLS}회)를 넘었어요. 스태프에게 문의하세요.`);
    err.status = 429;
    err.code = 'DAILY_LIMIT';
    throw err;
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`;
  const base64Image = fileBuffer.toString('base64');

  const body = {
    contents: [{
      parts: [
        { text: prompt },
        { inlineData: { mimeType: mimetype || 'image/png', data: base64Image } }
      ]
    }]
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  const data = await response.json();

  if (!response.ok) {
    const message = (data && data.error && data.error.message) || '알 수 없는 오류';
    const err = new Error(message);
    err.isRefusal = /safety|policy|blocked|prohibited/i.test(message);
    err.status = response.status;
    throw err;
  }

  const candidate = data.candidates && data.candidates[0];
  if (!candidate) {
    const err = new Error('AI가 응답을 반환하지 않았어요 (안전 정책일 수 있어요).');
    err.isRefusal = true;
    err.status = 502;
    throw err;
  }

  if (candidate.finishReason && candidate.finishReason !== 'STOP') {
    const err = new Error(`AI 응답이 중단됐어요 (사유: ${candidate.finishReason})`);
    err.isRefusal = /SAFETY|PROHIBITED|BLOCKED/i.test(candidate.finishReason);
    err.status = 502;
    throw err;
  }

  const parts = (candidate.content && candidate.content.parts) || [];
  const imagePart = parts.find(p => p.inlineData);
  if (!imagePart) {
    const err = new Error('AI가 이미지를 반환하지 않았어요.');
    err.status = 502;
    throw err;
  }

  const { mimeType, data: imgB64 } = imagePart.inlineData;
  return `data:${mimeType || 'image/png'};base64,${imgB64}`;
}

// ---------- 스타일 목록 ----------
app.get('/api/caricature-styles', (req, res) => {
  res.json({
    styles: CARICATURE_STYLES.map(s => ({ id: s.id, label: s.label, emoji: s.emoji }))
  });
});

// ---------- 컬러링 페이지 모드 ----------
app.post('/api/generate', upload.single('photo'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'NO_FILE', message: '사진 파일이 없어요.' });
  }
  try {
    const image = await callGeminiImageEdit(req.file.buffer, req.file.mimetype, PROMPT);
    res.json({ image });
  } catch (err) {
    console.error('generate 오류:', err.message);
    res.status(err.status || 500).json({
      error: err.code || (err.isRefusal ? 'REFUSED' : 'API_ERROR'),
      message: err.message
    });
  }
});

// ---------- 캐리커처 모드: 선택한 스타일 1개만 생성 ----------
app.post('/api/caricature', upload.single('photo'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'NO_FILE', message: '사진 파일이 없어요.' });
  }
  const styleId = req.body.style;
  const style = CARICATURE_STYLES.find(s => s.id === styleId);
  if (!style) {
    return res.status(400).json({ error: 'BAD_STYLE', message: '스타일을 선택해주세요.' });
  }
  try {
    const image = await callGeminiImageEdit(req.file.buffer, req.file.mimetype, style.prompt);
    res.json({ image, styleLabel: style.label });
  } catch (err) {
    console.error('caricature 오류:', err.message);
    res.status(err.status || 500).json({
      error: err.code || (err.isRefusal ? 'REFUSED' : 'API_ERROR'),
      message: err.message
    });
  }
});

// ---------- 캐리커처 -> 흑백 잉크 스타일 변환 ----------
app.post('/api/inkify', async (req, res) => {
  const { imageDataUrl } = req.body || {};
  if (!imageDataUrl) {
    return res.status(400).json({ error: 'NO_IMAGE', message: '이미지 데이터가 없어요.' });
  }
  const match = imageDataUrl.match(/^data:(image\/\w+);base64,(.+)$/);
  if (!match) {
    return res.status(400).json({ error: 'BAD_IMAGE', message: '이미지 형식이 잘못됐어요.' });
  }
  try {
    const mimetype = match[1];
    const buffer = Buffer.from(match[2], 'base64');
    const image = await callGeminiImageEdit(buffer, mimetype, INK_PROMPT);
    res.json({ image });
  } catch (err) {
    console.error('inkify 오류:', err.message);
    res.status(err.status || 500).json({
      error: err.code || (err.isRefusal ? 'REFUSED' : 'API_ERROR'),
      message: err.message
    });
  }
});

module.exports = app;
