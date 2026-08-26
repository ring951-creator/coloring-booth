// 실시간 카메라 미리보기 + 촬영 + 카메라 전환 + 파일 업로드 폴백을 담당하는 공통 모듈
// index.html, caricature.html 양쪽에서 그대로 가져다 씀

function createCameraCapture({ videoEl, statusEl, captureBtn, switchBtn, uploadBtn, uploadInput, backBtn, onCaptured, onBack }){
  let stream = null;
  let facingMode = 'user';

  function setStatus(msg, level){
    if(!statusEl) return;
    statusEl.textContent = msg || '';
    statusEl.className = 'status' + (level ? ' ' + level : '');
  }

  async function start(){
    stop();
    setStatus('카메라를 여는 중...');
    try{
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode }, audio: false });
      videoEl.srcObject = stream;
      videoEl.style.transform = (facingMode === 'user') ? 'scaleX(-1)' : 'none';
      setStatus('');
    }catch(err){
      console.error('카메라 열기 실패:', err);
      setStatus('카메라를 열 수 없어요. 아래 "사진 업로드"를 이용해주세요.', 'warn');
    }
  }

  function stop(){
    if(stream){
      stream.getTracks().forEach(t => t.stop());
      stream = null;
    }
  }

  captureBtn.addEventListener('click', () => {
    if(!videoEl.videoWidth){
      setStatus('카메라 준비 중이에요, 잠시 후 다시 눌러주세요.', 'warn');
      return;
    }
    const canvas = document.createElement('canvas');
    canvas.width = videoEl.videoWidth;
    canvas.height = videoEl.videoHeight;
    const ctx = canvas.getContext('2d');
    if(facingMode === 'user'){
      // 전면 카메라는 화면엔 좌우반전으로 보이니, 캡처 결과도 눈에 보이는 대로 반전해서 저장
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(blob => {
      if(!blob) return;
      onCaptured(new File([blob], 'capture.jpg', { type: 'image/jpeg' }));
    }, 'image/jpeg', 0.9);
  });

  if(switchBtn){
    switchBtn.addEventListener('click', () => {
      facingMode = (facingMode === 'user') ? 'environment' : 'user';
      start();
    });
  }

  if(uploadBtn && uploadInput){
    uploadBtn.addEventListener('click', () => uploadInput.click());
    uploadInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if(file) onCaptured(file);
      uploadInput.value = '';
    });
  }

  if(backBtn){
    backBtn.addEventListener('click', () => {
      stop();
      if(onBack) onBack();
    });
  }

  return { start, stop };
}
