/* V16 — Professor Scout code-driven avatar state system. Local-only/offline-safe. */
(()=>{
  const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const fallback='assets/avatar/loader-avatar.webp';
  const assets={idle:'assets/avatar/pose-idle.webp',think:'assets/avatar/pose-think.webp',work:'assets/avatar/pose-work.webp',walk:'assets/avatar/pose-walk.webp',search:'assets/avatar/pose-search.webp',success:'assets/avatar/pose-success.webp',compare:'assets/avatar/pose-compare.webp',empty:'assets/avatar/pose-empty.webp'};
  Object.values(assets).forEach(src=>{const img=new Image();img.src=src;});

  const loader=document.getElementById('storyLoader');
  const storyAvatar=loader?.querySelector('.story-avatar');
  const storyPrompt=loader?.querySelector('.story-prompt');
  const storyAi=loader?.querySelector('.story-ai span');
  const css=`
  .story-avatar{transform-origin:50% 100%;will-change:transform,filter;object-fit:contain;image-rendering:pixelated}
  .story-avatar.v16-arrive{animation:v16Arrive .55s cubic-bezier(.2,.8,.2,1) both}.story-avatar.v16-think{animation:v16Think .85s ease-in-out both}.story-avatar.v16-work{animation:v16Work .7s ease-in-out infinite alternate}.story-avatar.v16-done{animation:v16Done .55s cubic-bezier(.2,.8,.2,1) both;filter:drop-shadow(0 18px 28px rgba(216,242,122,.25))}
  @keyframes v16Arrive{from{opacity:0;transform:translateX(42px) scale(.94)}to{opacity:1;transform:none}}@keyframes v16Think{0%,100%{transform:translateY(0) rotate(0)}50%{transform:translateY(-5px) rotate(-1.5deg)}}@keyframes v16Work{from{transform:translateY(0) scale(1)}to{transform:translateY(-3px) scale(1.015)}}@keyframes v16Done{0%{transform:scale(.96)}55%{transform:scale(1.055) rotate(-1deg)}100%{transform:scale(1)}}
  #professorScoutMascot{position:fixed;left:14px;bottom:14px;z-index:58;width:72px;height:72px;transition:opacity .2s,transform .2s,bottom .2s;pointer-events:none}
  #professorScoutMascot.is-hidden{opacity:0;transform:translateY(18px);visibility:hidden}
  #professorScoutMascot.has-comparebar{bottom:86px}
  #professorScoutMascot .ps-avatar-btn{position:absolute;left:0;bottom:0;width:72px;height:72px;border:1px solid color-mix(in srgb,var(--line) 85%,transparent);border-radius:22px;background:color-mix(in srgb,var(--surface) 72%,transparent);box-shadow:0 12px 28px rgba(0,0,0,.32);backdrop-filter:blur(12px);display:grid;place-items:center;padding:3px;cursor:pointer;pointer-events:auto;transition:transform .18s,border-color .18s,background .18s}
  #professorScoutMascot .ps-avatar-btn:hover{transform:translateY(-2px);border-color:color-mix(in srgb,var(--accent,#d8f27a) 45%,var(--line));background:color-mix(in srgb,var(--surface) 88%,transparent)}
  #professorScoutMascot img{width:62px;height:62px;object-fit:contain;image-rendering:pixelated;filter:drop-shadow(0 7px 13px rgba(0,0,0,.32));animation:v16MascotIdle 2.8s ease-in-out infinite}
  #professorScoutMascot .ps-bubble{position:absolute;left:54px;bottom:68px;width:max-content;min-width:170px;max-width:min(280px,calc(100vw - 92px));padding:10px 12px;border:1px solid var(--line);border-radius:16px 16px 16px 6px;background:color-mix(in srgb,var(--surface) 96%,transparent);box-shadow:var(--shadow);backdrop-filter:blur(16px);font-size:10px;line-height:1.8;color:var(--muted);pointer-events:auto;transform-origin:bottom left;transition:opacity .18s,transform .18s,visibility .18s}
  #professorScoutMascot .ps-bubble b{display:block;margin-bottom:2px;font-size:11px;color:var(--text)}
  #professorScoutMascot.is-collapsed .ps-bubble{opacity:0;visibility:hidden;transform:translateY(8px) scale(.96);pointer-events:none}
  #professorScoutMascot[data-state="think"] img{animation:v16Think 1s ease-in-out infinite}#professorScoutMascot[data-state="search"] img{animation:v16Search .8s ease-in-out infinite alternate}#professorScoutMascot[data-state="work"] img{animation:v16Work .65s ease-in-out infinite alternate}#professorScoutMascot[data-state="compare"] img{animation:v16Compare .7s ease-in-out infinite alternate}#professorScoutMascot[data-state="success"] img{animation:v16Done .6s ease-out both}#professorScoutMascot[data-state="empty"] img{filter:grayscale(.15) drop-shadow(0 7px 13px rgba(0,0,0,.32));animation:v16Think 1.2s ease-in-out infinite}
  @keyframes v16MascotIdle{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}@keyframes v16Search{from{transform:translateX(0) rotate(0)}to{transform:translateX(4px) rotate(-1.5deg)}}@keyframes v16Compare{from{transform:scale(1)}to{transform:scale(1.025) translateY(-2px)}}
  @media(max-width:650px){#professorScoutMascot{left:8px;bottom:8px;width:60px;height:60px}#professorScoutMascot.has-comparebar{bottom:78px}#professorScoutMascot .ps-avatar-btn{width:60px;height:60px;border-radius:18px}#professorScoutMascot img{width:52px;height:52px}#professorScoutMascot .ps-bubble{left:36px;bottom:58px;min-width:150px;max-width:min(230px,calc(100vw - 58px));font-size:9px;padding:9px 10px}}
  @media(prefers-reduced-motion:reduce){.story-avatar,#professorScoutMascot img{animation:none!important}#professorScoutMascot,#professorScoutMascot .ps-bubble,#professorScoutMascot .ps-avatar-btn{transition:none!important}}
  `;
  const style=document.createElement('style');style.id='v16-avatar-motion-style';style.textContent=css;document.head.appendChild(style);
  const safeSrc=key=>assets[key]||assets.idle||fallback;
  const setImage=(img,key)=>{if(!img)return;img.onerror=()=>{img.onerror=null;img.src=fallback};img.src=safeSrc(key)};
  function story(state,pose,prompt,caption){if(!storyAvatar)return;setImage(storyAvatar,pose);storyAvatar.className='story-avatar v16-'+state;if(prompt&&storyPrompt)storyPrompt.textContent=prompt;if(caption&&storyAi)storyAi.textContent=caption}
  if(loader){if(reduced){story('done','success','> Professor Scout ready','Professor Scout · ready');setTimeout(()=>loader.classList.add('hide'),450)}else{story('arrive','walk','> idea: choose professors better','Human idea');setTimeout(()=>story('think','think','> understand student needs','Human intent → structured task'),600);setTimeout(()=>story('work','work','> build search · filters · compare','AI execution → interface'),1400);setTimeout(()=>story('done','success','> site ready ✓','Professor Scout · ready'),2400)}}

  const mascot=document.createElement('div');
  mascot.id='professorScoutMascot';mascot.dataset.state='idle';mascot.className='is-collapsed';mascot.setAttribute('aria-live','polite');
  mascot.innerHTML=`<button class="ps-avatar-btn" type="button" aria-label="باز کردن راهنمای Professor Scout" aria-expanded="false" title="Professor Scout"><img src="${assets.idle}" alt="Professor Scout" decoding="async"></button><div class="ps-bubble" role="status"><b>Professor Scout</b><span>سلام! برای انتخاب بهتر استاد اینجام.</span></div>`;
  document.body.appendChild(mascot);
  const avatarBtn=mascot.querySelector('.ps-avatar-btn'),mascotAvatar=mascot.querySelector('img'),text=mascot.querySelector('.ps-bubble span');
  mascotAvatar.onerror=()=>{mascotAvatar.onerror=null;mascotAvatar.src=fallback};
  const messages={idle:'سلام! برای انتخاب بهتر استاد اینجام.',think:'دارم گزینه‌ها و فیلترها را بررسی می‌کنم…',search:'جست‌وجو کن؛ نتیجه‌ها را سریع‌تر پیدا می‌کنیم.',work:'جزئیات استاد را باز کن تا امتیازها و تجربه‌ها را ببینی.',compare:'بیا گزینه‌ها را کنار هم مقایسه کنیم.',success:'خوبه. حالا می‌توانی ذخیره یا مقایسه کنی.',empty:'چیزی با این فیلترها پیدا نشد؛ یکی از فیلترها را تغییر بده.'};
  let stateTimer,bubbleTimer;
  function collapseBubble(){clearTimeout(bubbleTimer);mascot.classList.add('is-collapsed');avatarBtn.setAttribute('aria-expanded','false')}
  function showBubble(ms=1900){clearTimeout(bubbleTimer);mascot.classList.remove('is-collapsed');avatarBtn.setAttribute('aria-expanded','true');if(ms>0)bubbleTimer=setTimeout(collapseBubble,ms)}
  function setState(s,hold=0,speak=true){clearTimeout(stateTimer);const state=assets[s]?s:'idle';mascot.dataset.state=state;setImage(mascotAvatar,state);text.textContent=messages[state]||messages.idle;if(speak)showBubble(reduced?900:Math.max(1400,hold||1800));if(hold>0)stateTimer=setTimeout(()=>{mascot.dataset.state='idle';setImage(mascotAvatar,'idle');text.textContent=messages.idle;collapseBubble()},hold)}
  avatarBtn.addEventListener('click',()=>mascot.classList.contains('is-collapsed')?showBubble(4200):collapseBubble());
  collapseBubble();
  window.addEventListener('scroll',collapseBubble,{passive:true});

  ['heroQ','q'].map(id=>document.getElementById(id)).filter(Boolean).forEach(el=>{el.addEventListener('focus',()=>setState('think',0,true));el.addEventListener('input',()=>setState(el.value.trim()?'search':'think',0,true));el.addEventListener('blur',()=>setTimeout(()=>setState(el.value.trim()?'success':'idle',2200,!!el.value.trim()),140))});
  document.getElementById('cards')?.addEventListener('click',()=>setState('work',2100,true));
  document.getElementById('compareGo')?.addEventListener('click',()=>setState('compare',2700,true));
  document.getElementById('savedCheck')?.addEventListener('change',()=>setState('success',1900,true));
  document.getElementById('clear')?.addEventListener('click',()=>{setState('idle',0,false);collapseBubble()});
  document.getElementById('loadMore')?.addEventListener('click',()=>setState('work',1500,true));
  const cards=document.getElementById('cards');if(cards&&'MutationObserver'in window){const inspect=()=>{if(cards.querySelector('.empty'))setState('empty',2600,true)};new MutationObserver(inspect).observe(cards,{childList:true,subtree:true})}
  const drawer=document.getElementById('drawer'),compareModal=document.getElementById('compareModal'),compareBar=document.getElementById('compareBar');
  function overlapGuard(){const drawerOpen=drawer?.getAttribute('aria-hidden')==='false'||drawer?.classList.contains('open');const compareOpen=compareModal?.classList.contains('open')||compareModal?.classList.contains('show');mascot.classList.toggle('is-hidden',!!(drawerOpen||compareOpen));mascot.classList.toggle('has-comparebar',!!compareBar?.classList.contains('show'));if(drawerOpen||compareOpen)collapseBubble()}
  if('MutationObserver'in window){if(drawer)new MutationObserver(overlapGuard).observe(drawer,{attributes:true,attributeFilter:['class','aria-hidden']});if(compareModal)new MutationObserver(overlapGuard).observe(compareModal,{attributes:true,attributeFilter:['class','style']});if(compareBar)new MutationObserver(overlapGuard).observe(compareBar,{attributes:true,attributeFilter:['class']})}
  overlapGuard();
  window.addEventListener('keydown',e=>{if(e.key==='Escape'&&!drawer?.classList.contains('open')&&!compareModal?.classList.contains('open'))collapseBubble()});
})();
