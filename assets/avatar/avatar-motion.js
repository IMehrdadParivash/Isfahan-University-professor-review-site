/* V16 — Loading-screen-only avatar motion. Local-only/offline-safe. */
(()=>{
  const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const fallback='assets/avatar/loader-avatar.webp';
  const assets={
    think:'assets/avatar/pose-think.webp',
    work:'assets/avatar/pose-work.webp',
    walk:'assets/avatar/pose-walk.webp',
    success:'assets/avatar/pose-success.webp'
  };

  Object.values(assets).forEach(src=>{
    const img=new Image();
    img.src=src;
  });

  const loader=document.getElementById('storyLoader');
  const storyAvatar=loader?.querySelector('.story-avatar');
  const storyPrompt=loader?.querySelector('.story-prompt');
  const storyAi=loader?.querySelector('.story-ai span');

  const css=`
  #storyLoader .story-avatar{transform-origin:50% 100%;will-change:transform,filter;object-fit:contain;image-rendering:pixelated}
  #storyLoader .story-avatar.v16-arrive{animation:v16Arrive .55s cubic-bezier(.2,.8,.2,1) both}
  #storyLoader .story-avatar.v16-think{animation:v16Think .85s ease-in-out both}
  #storyLoader .story-avatar.v16-work{animation:v16Work .7s ease-in-out infinite alternate}
  #storyLoader .story-avatar.v16-done{animation:v16Done .55s cubic-bezier(.2,.8,.2,1) both;filter:drop-shadow(0 18px 28px rgba(216,242,122,.25))}
  @keyframes v16Arrive{from{opacity:0;transform:translateX(42px) scale(.94)}to{opacity:1;transform:none}}
  @keyframes v16Think{0%,100%{transform:translateY(0) rotate(0)}50%{transform:translateY(-5px) rotate(-1.5deg)}}
  @keyframes v16Work{from{transform:translateY(0) scale(1)}to{transform:translateY(-3px) scale(1.015)}}
  @keyframes v16Done{0%{transform:scale(.96)}55%{transform:scale(1.055) rotate(-1deg)}100%{transform:scale(1)}}
  @media(prefers-reduced-motion:reduce){#storyLoader .story-avatar{animation:none!important}}
  `;

  const style=document.createElement('style');
  style.id='v16-avatar-motion-style';
  style.textContent=css;
  document.head.appendChild(style);

  const safeSrc=key=>assets[key]||fallback;
  const setImage=(img,key)=>{
    if(!img)return;
    img.onerror=()=>{
      img.onerror=null;
      img.src=fallback;
    };
    img.src=safeSrc(key);
  };

  function story(state,pose,prompt,caption){
    if(!storyAvatar)return;
    setImage(storyAvatar,pose);
    storyAvatar.className='story-avatar v16-'+state;
    if(prompt&&storyPrompt)storyPrompt.textContent=prompt;
    if(caption&&storyAi)storyAi.textContent=caption;
  }

  if(!loader)return;

  if(reduced){
    story('done','success','> Professor Scout ready','Professor Scout · ready');
    setTimeout(()=>loader.classList.add('hide'),450);
    return;
  }

  story('arrive','walk','> idea: choose professors better','Human idea');
  setTimeout(()=>story('think','think','> understand student needs','Human intent → structured task'),600);
  setTimeout(()=>story('work','work','> build search · filters · compare','AI execution → interface'),1400);
  setTimeout(()=>story('done','success','> site ready ✓','Professor Scout · ready'),2400);
})();
