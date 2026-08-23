/* V16 — Professor Scout 24-frame loading storyboard. Loading-screen only. */
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
  const terminal=loader?.querySelector('.story-terminal');
  const prompt=loader?.querySelector('.story-prompt');
  const code=loader?.querySelector('.story-code');
  const caption=loader?.querySelector('.story-ai span');
  const progress=loader?.querySelector('.story-progress');
  const scene=loader?.querySelector('.story-scene');
  if(!loader||!avatar)return;

  Object.values(assets).forEach(src=>{const img=new Image();img.src=src});

  const css=`
    #storyLoader{--ps-progress:0%}
    #storyLoader .story-avatar{
      transform-origin:50% 100%;object-fit:contain;image-rendering:pixelated;
      will-change:transform,opacity,filter;transition:filter 80ms linear;
    }
    #storyLoader .story-terminal{will-change:transform,opacity,filter;transition:transform 80ms linear,opacity 80ms linear,filter 80ms linear}
    #storyLoader .story-prompt{font-variant-ligatures:none;white-space:nowrap}
    #storyLoader .story-prompt::after{content:'_';display:inline-block;margin-inline-start:3px;opacity:.95;animation:psCursor .55s steps(1,end) infinite}
    #storyLoader .story-ai span{transition:opacity 90ms linear}
    #storyLoader .story-progress{overflow:hidden;position:relative}
    #storyLoader .story-progress::after{
      content:'';position:absolute;inset:0 auto 0 0;width:var(--ps-progress);
      background:linear-gradient(90deg,rgba(216,242,122,.35),rgba(216,242,122,.95));
      box-shadow:0 0 18px rgba(216,242,122,.25);transition:width 100ms linear;
    }
    #storyLoader.v16-ready .story-scene{animation:psLoaderExit .42s cubic-bezier(.4,0,.2,1) both}
    @keyframes psCursor{0%,48%{opacity:1}49%,100%{opacity:0}}
    @keyframes psLoaderExit{from{opacity:1;transform:scale(1);filter:blur(0)}to{opacity:0;transform:scale(.985);filter:blur(3px)}}
    @media(prefers-reduced-motion:reduce){
      #storyLoader .story-avatar,#storyLoader .story-scene,#storyLoader .story-prompt::after{animation:none!important;transition:none!important}
    }
  `;
  const style=document.createElement('style');
  style.id='v16-avatar-motion-style';
  style.textContent=css;
  document.head.appendChild(style);

  const setImage=key=>{
    const src=assets[key]||fallback;
    if(avatar.getAttribute('src')===src)return;
    avatar.onerror=()=>{avatar.onerror=null;avatar.src=fallback};
    avatar.src=src;
  };

  const setText=(p,c)=>{
    if(prompt&&typeof p==='string')prompt.textContent=p;
    if(caption&&typeof c==='string')caption.textContent=c;
  };

  const frames=[
    {pose:'walk',x:36,y:4,s:.94,r:-1,o:0,p:'> built by Mehrdad',c:'Professor Scout',prog:2},
    {pose:'walk',x:29,y:2,s:.955,r:-1,o:.35,p:'> built by Mehrdad',c:'Initializing…',prog:5},
    {pose:'walk',x:22,y:1,s:.97,r:-.7,o:.65,p:'> initializing Professor Scout',c:'Loading workspace',prog:8},
    {pose:'walk',x:14,y:0,s:.985,r:-.4,o:.85,p:'> initializing Professor Scout',c:'Loading workspace',prog:11},
    {pose:'think',x:8,y:-1,s:1,r:0,o:1,p:'> scan student reviews',c:'Reading student experiences',prog:15},
    {pose:'think',x:4,y:-3,s:1,r:-.5,o:1,p:'> scan student reviews',c:'Scanning reviews…',prog:19},
    {pose:'think',x:2,y:-4,s:1.005,r:-.8,o:1,p:'> collecting signals',c:'Collecting data',prog:24},
    {pose:'think',x:0,y:-3,s:1.008,r:-.5,o:1,p:'> collecting signals',c:'Finding useful patterns',prog:30},
    {pose:'think',x:0,y:-2,s:1.01,r:0,o:1,p:'> quick quality check',c:'Checking context',prog:35},
    {pose:'think',x:0,y:-4,s:1.012,r:.4,o:1,p:'> analyze reviews',c:'Analyzing…',prog:40},
    {pose:'work',x:0,y:-2,s:1.01,r:0,o:1,p:'> filtering signals',c:'Remove duplicates · reduce noise',prog:46},
    {pose:'work',x:0,y:-1,s:1.008,r:0,o:1,p:'> filtering complete ✓',c:'Structured data ready',prog:52},
    {pose:'work',x:-1,y:-2,s:1.012,r:.2,o:1,p:'> deep dive',c:'Analyzing professor patterns',prog:58},
    {pose:'work',x:-1,y:-3,s:1.014,r:.3,o:1,p:'> extract patterns',c:'Extracting insights',prog:63},
    {pose:'work',x:0,y:-2,s:1.012,r:0,o:1,p:'> processing',c:'Ratings · difficulty · teaching style',prog:68},
    {pose:'work',x:1,y:-1,s:1.01,r:-.2,o:1,p:'> building comparisons',c:'Building comparisons',prog:73},
    {pose:'work',x:0,y:-2,s:1.012,r:0,o:1,p:'> aggregate data',c:'Preparing professor cards',prog:78},
    {pose:'work',x:1,y:-3,s:1.014,r:-.3,o:1,p:'> quality check',c:'Checking result quality',prog:82},
    {pose:'work',x:0,y:-1,s:1.01,r:0,o:1,p:'> almost there',c:'Calculating final scores',prog:86},
    {pose:'work',x:0,y:-2,s:1.012,r:.2,o:1,p:'> preparing results',c:'Organizing results',prog:90},
    {pose:'think',x:0,y:-2,s:1.008,r:0,o:1,p:'> final check',c:'One last check',prog:94},
    {pose:'success',x:0,y:-4,s:1.035,r:-.6,o:1,p:'> ready ✓',c:'Ready to choose',prog:97,glow:1},
    {pose:'success',x:0,y:-3,s:1.045,r:.3,o:1,p:'> Professor Scout ready ✓',c:'Professor Scout',prog:100,glow:1},
    {pose:'success',x:0,y:-1,s:1.025,r:0,o:1,p:'> let’s go',c:'Choose smarter',prog:100,glow:1}
  ];

  const frameDuration=100; // 24 storyboard beats over ~2.4 s
  let index=0,timer=0;

  function renderFrame(f){
    setImage(f.pose);
    avatar.style.opacity=String(f.o);
    avatar.style.transform=`translate(${f.x}px,${f.y}px) scale(${f.s}) rotate(${f.r}deg)`;
    avatar.style.filter=f.glow?'drop-shadow(0 18px 30px rgba(216,242,122,.33))':'drop-shadow(0 10px 18px rgba(0,0,0,.16))';
    setText(f.p,f.c);
    loader.style.setProperty('--ps-progress',`${f.prog}%`);
    if(terminal){
      const active=f.pose==='work'||f.pose==='think';
      terminal.style.transform=active?'translateY(-1px) scale(1.006)':'translateY(0) scale(1)';
      terminal.style.filter=f.glow?'drop-shadow(0 0 18px rgba(216,242,122,.16))':'none';
    }
    if(code){
      const lines=code.querySelectorAll('i');
      lines.forEach((line,i)=>{line.style.opacity=String(Math.min(1,.28+(f.prog/100)*.72-(i*.04)))});
    }
  }

  function finish(){
    loader.classList.add('v16-ready');
    setTimeout(()=>loader.classList.add('hide'),390);
  }

  if(reduced){
    renderFrame(frames[22]);
    setTimeout(finish,260);
    return;
  }

  renderFrame(frames[0]);
  timer=window.setInterval(()=>{
    index+=1;
    if(index>=frames.length){
      clearInterval(timer);
      finish();
      return;
    }
    renderFrame(frames[index]);
  },frameDuration);
})();
