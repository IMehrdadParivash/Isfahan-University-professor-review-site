/* UI hotfix — keep Professor Scout visible and useful while professor details are open. */
(()=>{
  const mascot=document.getElementById('professorScoutMascot');
  const drawer=document.getElementById('drawer');
  const compareModal=document.getElementById('compareModal');
  if(!mascot||!drawer)return;

  const avatarBtn=mascot.querySelector('.ps-avatar-btn');
  const bubble=mascot.querySelector('.ps-bubble');
  const bubbleText=bubble?.querySelector('span');
  let reopenTimer;
  let collapseTimer;
  let wasDrawerOpen=false;

  const drawerIsOpen=()=>drawer.getAttribute('aria-hidden')==='false'||drawer.classList.contains('open');
  const compareIsOpen=()=>compareModal&&(compareModal.classList.contains('open')||compareModal.classList.contains('show'));

  function collapseLater(){
    clearTimeout(collapseTimer);
    collapseTimer=setTimeout(()=>{
      mascot.classList.add('is-collapsed');
      avatarBtn?.setAttribute('aria-expanded','false');
    },2600);
  }

  function sync(){
    const drawerOpen=drawerIsOpen();
    const compareOpen=!!compareIsOpen();

    mascot.classList.toggle('with-drawer',drawerOpen&&!compareOpen);

    /* avatar-motion.js intentionally hid Scout for overlays. Keep that behavior for
       the comparison modal, but not for the professor detail drawer. */
    if(drawerOpen&&!compareOpen){
      mascot.classList.remove('is-hidden');

      if(!wasDrawerOpen){
        clearTimeout(reopenTimer);
        reopenTimer=setTimeout(()=>{
          if(!drawerIsOpen()||compareIsOpen())return;
          if(bubbleText)bubbleText.textContent='جزئیات باز شد؛ تعداد نظر و پشتوانهٔ داده را هم کنار امتیاز ببین.';
          mascot.classList.remove('is-collapsed');
          avatarBtn?.setAttribute('aria-expanded','true');
          collapseLater();
        },90);
      }
    }else if(!compareOpen){
      mascot.classList.remove('is-hidden');
    }

    wasDrawerOpen=drawerOpen;
  }

  const observer=new MutationObserver(sync);
  observer.observe(drawer,{attributes:true,attributeFilter:['class','aria-hidden']});
  if(compareModal)observer.observe(compareModal,{attributes:true,attributeFilter:['class','style']});
  sync();
})();

/* Precision professor filters — layered on top of the V16 app without changing the dataset. */
(async()=>{
  const $=s=>document.querySelector(s);
  const uniq=a=>[...new Set(a.filter(Boolean))];
  const esc=(s='')=>String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const norm=(s='')=>String(s).toLowerCase().replace(/[يى]/g,'ی').replace(/ك/g,'ک').replace(/[أإٱ]/g,'ا').replace(/ؤ/g,'و').replace(/[ۀة]/g,'ه').replace(/[\u064b-\u065f\u0670]/g,'').replace(/[\u200c\u200d]/g,' ').replace(/[^\p{L}\p{N}\s]/gu,' ').replace(/\s+/g,' ').trim();
  const avg=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:null;
  const dimLabels={coherence:'پیوستگی تدریس',knowledge:'دانش عمومی',teaching:'انتقال مطالب',management:'مدیریت کلاس',responsiveness:'پاسخگویی',behavior:'رفتار با دانشجو'};

  async function loadData(){
    const raw=(window.__DATA_GZ_PARTS||[]).join('');
    if(!raw)return null;
    const bytes=Uint8Array.from(atob(raw),c=>c.charCodeAt(0));
    const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    return JSON.parse(await new Response(stream).text());
  }
  async function waitForApp(){
    for(let i=0;i<100;i++){
      if($('#cards')&&$('#loadMore')&&$('#clear')&&$('#savedCheck')&&typeof $('#savedCheck').onchange==='function'&&typeof $('#loadMore').onclick==='function')return true;
      await new Promise(r=>setTimeout(r,50));
    }
    return false;
  }

  const DATA=await loadData();
  if(!DATA||!await waitForApp())return;

  const controls=['q','heroQ','faculty','department','course','sort'].reduce((o,id)=>(o[id]=$('#'+id),o),{});
  const cards=$('#cards'),resultCount=$('#resultCount'),loadMore=$('#loadMore'),clearBtn=$('#clear'),savedCheck=$('#savedCheck'),savedToggle=$('#savedToggle');
  const oldLoadMore=loadMore.onclick,oldClear=clearBtn.onclick,oldSavedCheck=savedCheck.onchange,oldSavedToggle=savedToggle?.onclick;
  const chips=document.querySelector('.material-row .chips');if(chips)chips.style.display='none';

  controls.sort.innerHTML=`<option value="confidence">پیشنهاد مطمئن‌تر</option><option value="reviews">بیشترین تعداد نظر</option><option value="rating">بالاترین امتیاز</option><option value="dim:teaching">بهترین انتقال مطالب</option><option value="dim:knowledge">بالاترین دانش عمومی</option><option value="dim:behavior">بهترین رفتار با دانشجو</option><option value="dim:responsiveness">بیشترین پاسخگویی</option><option value="dim:management">بهترین مدیریت کلاس</option><option value="dim:coherence">بیشترین پیوستگی تدریس</option><option value="name">نام استاد</option>`;
  controls.sort.value='confidence';

  const material=document.querySelector('.material-row');
  material?.insertAdjacentHTML('beforebegin',`<details id="precisionFilters" class="precision-panel"><summary><span><b>فیلترهای دقیق‌تر</b><small>امتیاز، پشتوانه داده، شاخص تدریس و الگوی کلاس</small></span><i>+</i></summary><div class="precision-grid"><label class="field field-select"><span class="field-label">حداقل امتیاز</span><select id="minRating" class="control"><option value="">بدون محدودیت</option><option value="6">۶ به بالا</option><option value="7">۷ به بالا</option><option value="8">۸ به بالا</option><option value="9">۹ به بالا</option></select></label><label class="field field-select"><span class="field-label">حداقل تعداد نظر</span><select id="minReviews" class="control"><option value="">بدون محدودیت</option><option value="2">حداقل ۲ نظر</option><option value="3">حداقل ۳ نظر</option><option value="5">حداقل ۵ نظر</option><option value="10">حداقل ۱۰ نظر</option></select></label><label class="field field-select"><span class="field-label">شاخص کلیدی</span><select id="dimension" class="control"><option value="">همه شاخص‌ها</option>${Object.entries(dimLabels).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select></label><label class="field field-select"><span class="field-label">حداقل شاخص کلیدی</span><select id="minDimension" class="control"><option value="">بدون محدودیت</option><option value="6">۶ به بالا</option><option value="7">۷ به بالا</option><option value="8">۸ به بالا</option><option value="9">۹ به بالا</option></select></label><label class="field field-select"><span class="field-label">الگوی نمره‌دهی غالب</span><select id="grading" class="control"></select></label><label class="field field-select"><span class="field-label">حضور و غیاب غالب</span><select id="attendance" class="control"></select></label><label class="field field-select"><span class="field-label">شواهد گفت‌وگویی</span><select id="communityEvidence" class="control"><option value="">بدون محدودیت</option><option value="any">دارای تجربه متنی</option><option value="direct">دارای تجربه مستقیم</option><option value="positive">دارای برداشت مثبت</option><option value="high">دارای اطمینان زیاد</option></select></label><label class="field field-select"><span class="field-label">نظر کامل ۶ شاخصی</span><select id="completeReviews" class="control"><option value="">بدون محدودیت</option><option value="1">حداقل ۱ نظر کامل</option><option value="3">حداقل ۳ نظر کامل</option><option value="5">حداقل ۵ نظر کامل</option></select></label></div><p class="precision-note">با انتخاب یک درس، امتیاز و تعداد نظر همان درس مبنای فیلتر و رتبه‌بندی می‌شود. شاخص‌های شش‌گانه در سطح کل استاد محاسبه شده‌اند.</p></details>`);

  const dominant=mix=>Object.entries(mix||{}).filter(([k])=>k!=='نامشخص').sort((a,b)=>b[1]-a[1])[0]?.[0]||'نامشخص';
  const mixKeys=field=>uniq(DATA.professors.flatMap(p=>Object.keys(p[field]||{})).filter(x=>x&&x!=='نامشخص')).sort((a,b)=>a.localeCompare(b,'fa'));
  const fill=(el,items,label)=>{const old=el.value;el.innerHTML=`<option value="">${label}</option>`+items.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join('');if(items.includes(old))el.value=old};
  fill($('#grading'),mixKeys('grading_mix'),'هر نوع نمره‌دهی');
  fill($('#attendance'),mixKeys('attendance_mix'),'هر نوع حضور و غیاب');

  function cascade(from='faculty'){
    const f=controls.faculty.value;
    const poolF=DATA.professors.filter(p=>!f||(p.faculties||[]).includes(f));
    if(from==='faculty')fill(controls.department,uniq(poolF.flatMap(p=>p.departments||[])).sort((a,b)=>a.localeCompare(b,'fa')),'همه گروه‌ها');
    const d=controls.department.value;
    const poolD=poolF.filter(p=>!d||(p.departments||[]).includes(d));
    if(from!=='course')fill(controls.course,uniq(poolD.flatMap(p=>p.courses||[])).sort((a,b)=>a.localeCompare(b,'fa')),'همه درس‌ها');
  }

  const num=id=>{const v=$(id)?.value;return v?Number(v):0};
  const courseStats=p=>{
    const c=controls.course.value;
    if(!c)return{score:p.avg_score,count:p.review_count};
    const rs=(p.reviews||[]).filter(r=>r.course===c),scores=rs.map(r=>Number(r.avg_score)).filter(Number.isFinite);
    return{score:avg(scores),count:rs.length};
  };
  const reliable=p=>{const s=courseStats(p);if(s.score==null)return-1;const prior=Number(DATA.stats?.overall_avg)||7,k=5;return(s.count/(s.count+k))*s.score+(k/(s.count+k))*prior};
  const searchable=p=>norm([p.name,...(p.faculties||[]),...(p.departments||[]),...(p.courses||[])].join(' '));

  let baseNodes=new Map();
  function refreshBaseNodes(){
    baseNodes=new Map();
    cards.querySelectorAll('.card').forEach(card=>{const name=card.querySelector('.card-main[data-open]')?.dataset.open;if(name)baseNodes.set(name,card)});
  }
  function expandAll(){
    for(let i=0;i<40&&loadMore.style.display!=='none';i++)oldLoadMore.call(loadMore);
    loadMore.style.display='none';
    refreshBaseNodes();
  }
  expandAll();

  function patchCard(card,p){
    const s=courseStats(p),c=controls.course.value;
    const ring=card.querySelector('.score-ring'),val=card.querySelector('.score-val'),badge=card.querySelector('.badges .badge'),courses=card.querySelector('.courses');
    if(ring){ring.style.setProperty('--p',Math.max(0,Math.min(100,(s.score||0)*10)));ring.classList.toggle('good',s.score!=null&&s.score>=8);ring.classList.toggle('mid',s.score!=null&&s.score>=6&&s.score<8);ring.classList.toggle('low',s.score!=null&&s.score<6)}
    if(val)val.innerHTML=`${s.score==null?'—':s.score.toLocaleString('fa-IR',{maximumFractionDigits:2})}<small>${c?'برای این درس':'از ۱۰'}</small>`;
    if(badge)badge.textContent=`${s.count.toLocaleString('fa-IR')} نظر${c?' مرتبط':''}`;
    if(courses)courses.textContent=c?c:((p.courses||[]).slice(0,5).join('، ')||'درس ثبت نشده');
  }

  function filtered(){
    const q=norm(controls.q.value),tokens=q.split(' ').filter(Boolean),f=controls.faculty.value,d=controls.department.value,c=controls.course.value;
    const minRating=num('#minRating'),minReviews=num('#minReviews'),dim=$('#dimension').value,minDim=num('#minDimension'),grading=$('#grading').value,attendance=$('#attendance').value,community=$('#communityEvidence').value,minComplete=num('#completeReviews');
    let arr=DATA.professors.filter(p=>{
      if(tokens.length){const hay=searchable(p);if(!tokens.every(t=>hay.includes(t)))return false}
      if(f&&!p.faculties.includes(f))return false;if(d&&!p.departments.includes(d))return false;if(c&&!p.courses.includes(c))return false;
      const s=courseStats(p);if(minRating&&(s.score==null||s.score<minRating))return false;if(minReviews&&s.count<minReviews)return false;if(minComplete&&(p.complete_review_count||0)<minComplete)return false;
      if(dim&&minDim&&(p.dimensions?.[dim]==null||p.dimensions[dim]<minDim))return false;if(grading&&dominant(p.grading_mix)!==grading)return false;if(attendance&&dominant(p.attendance_mix)!==attendance)return false;
      const ce=p.community_experiences||[];if(community==='any'&&!ce.length)return false;if(community==='direct'&&!ce.some(e=>e.evidence_type==='تجربه مستقیم'))return false;if(community==='positive'&&!ce.some(e=>e.sentiment==='مثبت'))return false;if(community==='high'&&!ce.some(e=>e.confidence==='زیاد'))return false;
      return baseNodes.has(p.name);
    });
    const sort=controls.sort.value,dimSort=sort.startsWith('dim:')?sort.slice(4):'';
    if(sort==='confidence')arr.sort((a,b)=>reliable(b)-reliable(a)||courseStats(b).count-courseStats(a).count);
    else if(sort==='rating')arr.sort((a,b)=>(courseStats(b).score??-1)-(courseStats(a).score??-1)||courseStats(b).count-courseStats(a).count);
    else if(sort==='reviews')arr.sort((a,b)=>courseStats(b).count-courseStats(a).count||(courseStats(b).score??-1)-(courseStats(a).score??-1));
    else if(dimSort)arr.sort((a,b)=>(b.dimensions?.[dimSort]??-1)-(a.dimensions?.[dimSort]??-1)||reliable(b)-reliable(a));
    else arr.sort((a,b)=>a.name.localeCompare(b.name,'fa'));
    return arr;
  }

  function apply(){
    refreshBaseNodes();
    const arr=filtered(),frag=document.createDocumentFragment(),visible=new Set(arr.map(p=>p.name));
    baseNodes.forEach((card,name)=>{card.style.display=visible.has(name)?'':'none'});
    arr.forEach(p=>{const card=baseNodes.get(p.name);if(card){patchCard(card,p);card.style.display='';frag.appendChild(card)}});
    cards.appendChild(frag);
    refreshBaseNodes();
    resultCount.textContent=`${arr.length.toLocaleString('fa-IR')} نتیجه${controls.course.value?` • بر مبنای «${controls.course.value}»`:''}`;
    loadMore.style.display='none';
  }

  /* Rebuild the original app's full card pool without exposing its private DATA closure. */
  function rebuildPool(){
    const vals={q:controls.q.value,h:controls.heroQ.value,f:controls.faculty.value,d:controls.department.value,c:controls.course.value,s:controls.sort.value};
    controls.q.value='';controls.heroQ.value='';controls.faculty.value='';controls.department.value='';controls.course.value='';controls.sort.value='reviews';
    oldSavedCheck.call(savedCheck,{target:savedCheck});
    controls.q.value=vals.q;controls.heroQ.value=vals.h;controls.faculty.value=vals.f;controls.department.value=vals.d;controls.course.value=vals.c;controls.sort.value=vals.s;
    refreshBaseNodes();apply();
  }

  controls.q.oninput=e=>{controls.heroQ.value=e.target.value;apply()};
  controls.heroQ.oninput=e=>{controls.q.value=e.target.value;apply()};
  controls.faculty.onchange=()=>{cascade('faculty');apply()};
  controls.department.onchange=()=>{cascade('department');apply()};
  controls.course.onchange=()=>apply();
  controls.sort.onchange=()=>apply();
  ['minRating','minReviews','dimension','minDimension','grading','attendance','communityEvidence','completeReviews'].forEach(id=>$('#'+id).onchange=apply);

  savedCheck.onchange=()=>rebuildPool();
  if(savedToggle&&oldSavedToggle)savedToggle.onclick=e=>{oldSavedToggle.call(savedToggle,e);refreshBaseNodes();apply()};
  clearBtn.onclick=e=>{
    oldClear.call(clearBtn,e);
    ['minRating','minReviews','dimension','minDimension','grading','attendance','communityEvidence','completeReviews'].forEach(id=>$('#'+id).value='');
    controls.sort.value='confidence';cascade('faculty');expandAll();apply();
  };

  document.addEventListener('click',e=>{
    if(e.target.closest('[data-save],[data-compare],#dSave,#dCompare'))setTimeout(rebuildPool,0);
  },true);

  apply();
})();