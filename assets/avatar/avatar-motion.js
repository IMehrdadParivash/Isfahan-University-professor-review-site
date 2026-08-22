/* V16 — Loading-screen-only 24-frame avatar animation. Local-only/offline-safe. */
(()=>{
  const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const fallback='assets/avatar/loader-avatar.webp';
  const assets={
    walk:'assets/avatar/pose-walk.webp',
    think:'assets/avatar/pose-think.webp',
    work:'assets/avatar/pose-work.webp',
    success:'assets/avatar/pose-success.webp'
  };

  const loader=document.getElementById('storyLoader');
  const avatar=loader?.querySelector('.story-avatar');
  const prompt=loader?.querySelector('.story-prompt');
  const caption=loader?.querySelector('.story-ai span');
  if(!loader||!avatar)return;

  Object.values(assets).forEach(src=>{const img=new Image();img.src=src});

  const css=`
    #storyLoader .story-avatar{
      transform-origin:50% 100%;
      object-fit:contain;
      image-rendering:pixelated;
      will-change:transform,opacity,filter;
      transition:filter 100ms linear;
    }
    #storyLoader .story-scene{will-change:transform,opacity,filter}
    #storyLoader.v16-ready .story-scene{animation:v16LoaderExit .48s cubic-bezier(.4,0,.2,1) both}
    @keyframes v16LoaderExit{
      from{opacity:1;transform:scale(1);filter:blur(0)}
      to{opacity:0;transform:scale(.985);filter:blur(3px)}
    }
    @media(prefers-reduced-motion:reduce){
      #storyLoader .story-avatar,#storyLoader .story-scene{animation:none!important;transition:none!important}
    }
  `;
  const style=document.createElement('style');
  style.id='v16-avatar-motion-style';
  style.textContent=css;
  document.head.appendChild(style);

  const setPose=pose=>{
    const src=assets[pose]||fallback;
    if(avatar.dataset.pose===pose)return;
    avatar.dataset.pose=pose;
    avatar.onerror=()=>{avatar.onerror=null;avatar.src=fallback};
    avatar.src=src;
  };

  const frames=[
    {pose:'walk',x:54,y:3,s:.92,r:2,o:0.00},
    {pose:'walk',x:44,y:1,s:.94,r:1.5,o:.32},
    {pose:'walk',x:34,y:-2,s:.96,r:.7,o:.58},
    {pose:'walk',x:24,y:0,s:.98,r:-.5,o:.78},
    {pose:'walk',x:14,y:-3,s:1.00,r:-1,o:.92},
    {pose:'walk',x:6,y:0,s:1.01,r:.4,o:1.00},
    {pose:'think',x:1,y:-1,s:1.00,r:0,o:1.00},
    {pose:'think',x:0,y:-4,s:1.01,r:-.8,o:1.00},
    {pose:'think',x:0,y:-6,s:1.015,r:-1.4,o:1.00},
    {pose:'think',x:0,y:-5,s:1.015,r:-1.1,o:1.00},
    {pose:'think',x:0,y:-3,s:1.01,r:-.6,o:1.00},
    {pose:'think',x:0,y:-1,s:1.00,r:0,o:1.00},
    {pose:'work',x:-1,y:0,s:1.00,r:.2,o:1.00},
    {pose:'work',x:1,y:-2,s:1.01,r:-.3,o:1.00},
    {pose:'work',x:-1,y:-1,s:1.015,r:.3,o:1.00},
    {pose:'work',x:1,y:-3,s:1.02,r:-.4,o:1.00},
    {pose:'work',x:-1,y:-1,s:1.015,r:.25,o:1.00},
    {pose:'work',x:0,y:-3,s:1.02,r:-.25,o:1.00},
    {pose:'work',x:0,y:-1,s:1.01,r:0,o:1.00},
    {pose:'success',x:0,y:0,s:.97,r:0,o:1.00,glow:.10},
    {pose:'success',x:0,y:-4,s:1.045,r:-1.2,o:1.00,glow:.25},
    {pose:'success',x:0,y:-2,s:1.025,r:.6,o:1.00,glow:.34},
    {pose:'success',x:0,y:0,s:1.01,r:-.2,o:1.00,glow:.28},
    {pose:'success',x:0,y:0,s:1.00,r:0,o:1.00,glow:.22}
  ];

  const beats={
    0:['> ورود به Professor Scout','شروع انتخاب آگاهانه'],
    6:['> بررسی تجربه‌های دانشجویی','داده‌های خام → سیگنال‌های مفید'],
    12:['> پالایش · جست‌وجو · مقایسه','اطلاعات → تصمیم بهتر'],
    19:['> آماده برای انتخاب ✓','Professor Scout · ready']
  };

  const frameDuration=100; // 24 discrete frames across 2.4 seconds.
  const totalDuration=frames.length*frameDuration;
  let lastFrame=-1;
  let startedAt=0;

  function renderFrame(index){
    const f=frames[index];
    setPose(f.pose);
    avatar.style.opacity=String(f.o);
    avatar.style.transform=`translate3d(${f.x}px,${f.y}px,0) scale(${f.s}) rotate(${f.r}deg)`;
    const glow=f.glow||0;
    avatar.style.filter=glow?`drop-shadow(0 18px 28px rgba(216,242,122,${glow}))`:'none';
    const beat=beats[index];
    if(beat){
      if(prompt)prompt.textContent=beat[0];
      if(caption)caption.textContent=beat[1];
    }
  }

  function finish(){
    renderFrame(frames.length-1);
    loader.classList.add('v16-ready');
  }

  if(reduced){
    renderFrame(frames.length-1);
    if(prompt)prompt.textContent='> آماده برای انتخاب ✓';
    if(caption)caption.textContent='Professor Scout · ready';
    setTimeout(()=>loader.classList.add('hide'),450);
    return;
  }

  function tick(now){
    if(!startedAt)startedAt=now;
    const elapsed=now-startedAt;
    const index=Math.min(frames.length-1,Math.floor(elapsed/frameDuration));
    if(index!==lastFrame){
      lastFrame=index;
      renderFrame(index);
    }
    if(elapsed<totalDuration){
      requestAnimationFrame(tick);
    }else{
      finish();
    }
  }

  requestAnimationFrame(tick);
})();
