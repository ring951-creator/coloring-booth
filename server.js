// 서버 실행 파일 - 로컬 테스트("npm start")와 Render 배포 양쪽에서 그대로 사용됩니다.

const os = require('os');
const path = require('path');
const express = require('express');
const app = require('./lib/app');

app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('=================================================');
  console.log('  서버가 켜졌어요!');

  const nets = os.networkInterfaces();
  const isLocalNetwork = Object.keys(nets).length > 0;
  if (isLocalNetwork) {
    console.log('  (로컬 실행 중이라면) 같은 wifi의 태블릿에서 아래 주소로 접속:');
    for (const name of Object.keys(nets)) {
      for (const net of nets[name]) {
        if (net.family === 'IPv4' && !net.internal) {
          console.log(`  → http://${net.address}:${PORT}`);
          console.log(`  → http://${net.address}:${PORT}/caricature.html`);
        }
      }
    }
  }

  console.log('=================================================');
  console.log('');

  if (!process.env.GEMINI_API_KEY) {
    console.log('⚠️  경고: GEMINI_API_KEY가 설정되지 않았어요.');
    console.log('   .env 파일(로컬) 또는 Render 환경변수에 GEMINI_API_KEY를 넣어주세요.');
    console.log('');
  }
});
