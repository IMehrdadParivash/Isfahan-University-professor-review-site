/* V16 — Professor Scout code-driven avatar motion. Local-only, offline-safe, reduced-motion aware. */
(()=>{
  const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const asset='assets/avatar/loader-avatar.webp';
  const loader=document.getElementById('storyLoader');
  const storyAvatar=loader?.querySelector('.story-avatar');
  const storyPrompt=loader?.querySelector('.story-prompt');
  const storyAi=loader?.querySelector('.story-ai span');

  const css=`
  .story-avatar{transform-origin:50% 100%;will-change:transform,filter;image-rendering:auto}
  .story-avatar.v16-arrive{animation:v16Arrive .55s cubic-bezier(.2,.8,.2,1) both}
  .story-avatar.v16-think{animation:v16Think .85s ease-in-out both}
  .story-avatar.v16-work{animation:v16Work .7s ease-in-out infinite alternate}
  .story-avatar.v16-done{animation:v16Done .55s cubic-bezier(.2,.8,.2,1) both;filter:drop-shadow(0 18px 28px rgba(216,242,122,.25))}
  @keyframes v16Arrive{from{opacity:0;transform:translateX(42px) scale(.94)}to{opacity:1;transform:none}}
  @keyframes v16Think{0%,100%{transform:translateY(0) rotate(0)}50%{transform:translateY(-5px) rotate(-1.5deg)}}
  @keyframes v16Work{from{transform:translateY(0) scale(1)}to{transform:translateY(-3px) scale(1.015)}}
  @keyframes v16Done{0%{transform:scale(.96)}55%{transform:scale(1.055) rotate(-1deg)}100%{transform:scale(1)}}
  #professorScoutMascot{position:fixed;left:14px;bottom:14px;z-index:58;display:flex;align-items:flex-end;gap:9px;max-width:min(390px,calc(100vw - 28px));transition:opacity .2s,transform .2s}
  #professorScoutMascot.is-hidden{opacity:0;transform:translateY(20px);pointer-events:none}
  #professorScoutMascot img{width:76px;height:76px;object-fit:contain;border-radius:18px;image-rendering:auto;filter:drop-shadow(0 10px 18px rgba(0,0,0,.35));animation:v16MascotIdle 2.8s ease-in-out infinite}
  #professorScoutMascot .ps-bubble{min-width:170px;max-width:280px;padding:10px 12px;border:1px solid var(--line);border-radius:16px 16px 16px 5px;background:color-mix(in srgb,var(--surface) 94%,transparent);box-shadow:var(--shadow);backdrop-filter:blur(15px);font-size:10px;line-height:1.8;color:var(--muted)}
  #professorScoutMascot .ps-bubble b{display:block;margin-bottom:2px;font-size:11px;color:var(--text)}
  #professorScoutMascot[data-state="think"] img{animation:v16Think 1s ease-in-out infinite}
  #professorScoutMascot[data-state="search"] img{animation:v16Search .8s ease-in-out infinite alternate}
  #professorScoutMascot[data-state="work"] img{animation:v16Work .65s ease-in-out infinite alternate}
  #professorScoutMascot[data-state="success"] img{animation:v16Done .6s ease-out both}
  #professorScoutMascot[data-state="empty"] img{filter:grayscale(.18) drop-shadow(0 10px 18px rgba(0,0,0,.35));animation:v16Think 1.2s ease-in-out infinite}
  @keyframes v16MascotIdle{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}
  @keyframes v16Search{from{transform:translateX(0) rotate(0)}to{transform:translateX(4px) rotate(-1.5deg)}}
  @media(max-width:650px){#professorScoutMascot{left:8px;bottom:8px;max-width:calc(100vw - 16px)}#professorScoutMascot img{width:62px;height:62px}#professorScoutMascot .ps-bubble{max-width:220px;font-size:9px}}
  @media(prefers-reduced-motion:reduce){.story-avatar,#professorScoutMascot img{animation:none!important}#professorScoutMascot{transition:none!important}}
  `;
  const style=document.createElement('style');style.id='v16-avatar-motion-style';style.textContent=css;document.head.appendChild(style);

  function story(state,prompt,caption){
    if(!storyAvatar)return;
    storyAvatar.className='story-avatar v16-'+state;
    if(prompt&&storyPrompt)storyPrompt.textContent=prompt;
    if(caption&&storyAi)storyAi.textContent=caption;
  }
  if(loader){
    if(reduced){
      story('done','> Professor Scout ready','Professor Scout · ready');
      setTimeout(()=>loader.classList.add('hide'),450);
    }else{
      story('arrive','> idea: choose professors better','Human idea');
      setTimeout(()=>story('think','> understand student needs','Human intent → structured task'),600);
      setTimeout(()=>story('work','> build search · filters · compare','AI execution → interface'),1400);
      setTimeout(()=>story('done','> site ready ✓','Professor Scout · ready'),2400);
    }
  }

  const mascot=document.createElement('div');
  mascot.id='professorScoutMascot';mascot.dataset.state='idle';mascot.setAttribute('aria-live','polite');
  mascot.innerHTML=`<img src="${asset}" alt="Professor Scout" decoding="async"><div class="ps-bubble"><b>Professor Scout</b><span>سلام! برای انتخاب بهتر استاد اینجام.</span></div>`;
  document.body.appendChild(mascot);
  const text=mascot.querySelector('span');
  const messages={
    idle:'سلام! برای انتخاب بهتر استاد اینجام.',
    think:'دارم گزینه‌ها و فیلترها را بررسی می‌کنم…',
    search:'جست‌وجو کن؛ نتیجه‌ها را سریع‌تر پیدا می‌کنیم.',
    work:'جزئیات استاد را باز کن تا امتیازها و تجربه‌ها را ببینی.',
    success:'خوبه. حالا می‌توانی ذخیره یا مقایسه کنی.',
    empty:'چیزی با این فیلترها پیدا نشد؛ یکی از فیلترها را تغییر بده.'
  };
  let stateTimer;
  function setState(s,hold=0){
    clearTimeout(stateTimer);mascot.dataset.state=s;text.textContent=messages[s]||messages.idle;
    if(hold>0)stateTimer=setTimeout(()=>setState('idle'),hold);
  }

  const inputs=['heroQ','q'].map(id=>document.getElementById(id)).filter(Boolean);
  inputs.forEach(el=>{
    el.addEventListener('focus',()=>setState('think'));
    el.addEventListener('input',()=>setState(el.value.trim()?'search':'think'));
    el.addEventListener('blur',()=>setTimeout(()=>setState(el.value.trim()?'success':'idle',2400),140));
  });
  document.getElementById('cards')?.addEventListener('click',()=>setState('work',2200));
  document.getElementById('compareGo')?.addEventListener('click',()=>setState('success',2600));
  document.getElementById('savedCheck')?.addEventListener('change',()=>setState('success',2200));
  document.getElementById('clear')?.addEventListener('click',()=>setState('idle'));
  document.getElementById('loadMore')?.addEventListener('click',()=>setState('work',1500));

  const cards=document.getElementById('cards');
  if(cards&&'MutationObserver' in window){
    const inspect=()=>{
      const empty=cards.querySelector('.empty');
      if(empty)setState('empty');
    };
    new MutationObserver(inspect).observe(cards,{childList:true,subtree:true});
  }

  const drawer=document.getElementById('drawer');
  const compareModal=document.getElementById('compareModal');
  if('MutationObserver' in window){
    const overlapGuard=()=>{
      const drawerOpen=drawer?.getAttribute('aria-hidden')==='false'||drawer?.classList.contains('open');
      const compareOpen=compareModal?.classList.contains('open')||compareModal?.classList.contains('show');
      mascot.classList.toggle('is-hidden',!!(drawerOpen||compareOpen));
    };
    if(drawer)new MutationObserver(overlapGuard).observe(drawer,{attributes:true,attributeFilter:['class','aria-hidden']});
    if(compareModal)new MutationObserver(overlapGuard).observe(compareModal,{attributes:true,attributeFilter:['class','style']});
  }

  window.addEventListener('keydown',e=>{if(e.key==='Escape'&&!drawer?.classList.contains('open'))mascot.classList.toggle('is-hidden');});
})();
