const DATA_GZ=(window.__UI_DB_GZ_PARTS||[]).join("");
async function __loadData(){
  if(!DATA_GZ) throw new Error("embedded dataset is missing");
  const b=Uint8Array.from(atob(DATA_GZ),c=>c.charCodeAt(0));
  const s=new Blob([b]).stream().pipeThrough(new DecompressionStream("gzip"));
  return JSON.parse(await new Response(s).text());
}
(async()=>{
const RAW=await __loadData();
const DATA={stats:RAW.s,faculties:RAW.f,department_labels:RAW.d,courses:RAW.c,professors:RAW.p.map(a=>({id:a[0],name_fa:a[1],academic_rank:a[2],faculty:a[3],department:a[4],official_profile_url:a[5],review_coverage:{has_any_public_evidence:!!a[6][0],structured_evidence_count:a[6][1],qualitative_chat_evidence_count:a[6][2],course_pair_count:a[6][3],cautiously_rankable_course_pair_count:a[6][4]},courses:a[7].map(c=>({course:c[0],structured_report_count:c[1],overall_observed_mean_0_5:c[2],dimensions:Object.fromEntries(RAW.dims.map((k,i)=>[k,{observed_mean_0_5:c[3][i][0],sample_size:c[3][i][1]}])),latest_evidence_date:c[4],ranking_eligible_under_proposed_policy:!!c[5]}))}))};
const $=s=>document.querySelector(s);
const esc=(s="")=>String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[m]));
const uniq=a=>[...new Set(a.filter(Boolean))];
const fa=n=>Number(n||0).toLocaleString("fa-IR");
const dimLabels={coherence:"پیوستگی تدریس",knowledge:"دانش عمومی",teaching:"انتقال مطالب",management:"مدیریت کلاس",responsiveness:"پاسخ‌گویی",behavior:"رفتار با دانشجو"};
let limit=30,statusFilter="all",minEvidence=0,compare=[],savedOnly=false;
function safeGet(k,f){try{return localStorage.getItem(k)??f}catch{return f}}
function safeSet(k,v){try{localStorage.setItem(k,v)}catch{}}
let saved=new Set(JSON.parse(safeGet("ui_saved_professor_ids","[]")).map(Number));
function saveLocal(){safeSet("ui_saved_professor_ids",JSON.stringify([...saved]))}
function fillSelect(el,items,label){el.innerHTML=`<option value="">${label}</option>`+items.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join("")}
function faDate(iso){if(!iso)return"—";try{return new Intl.DateTimeFormat("fa-IR",{year:"numeric",month:"short",day:"numeric"}).format(new Date(iso+"T00:00:00"))}catch{return iso}}
function latestDate(p){const xs=p.courses.map(x=>x.latest_evidence_date).filter(Boolean).sort();return xs.at(-1)||null}
function totalReports(p){return p.review_coverage.structured_evidence_count||0}
function hasRankable(p){return (p.review_coverage.cautiously_rankable_course_pair_count||0)>0}
function scoreVisible(c){return (c.structured_report_count||0)>=2 && c.overall_observed_mean_0_5!=null}
function scorePct(v){return Math.max(0,Math.min(100,(v||0)*20))}
function scoreClass(v){return v==null?"":v>=4?"good":v>=3?"mid":"low"}
function evidenceLabel(p){const n=totalReports(p);if(!p.review_coverage.has_any_public_evidence)return"هنوز داده‌ای ندارد";if(hasRankable(p))return"پشتوانه بهتر";if(n>=3)return"داده موجود، اما محدود/قدیمی";return"نمونه محدود"}
function searchable(p){return [p.name_fa,p.name_en,p.academic_rank,p.faculty,p.department,...p.courses.map(c=>c.course)].filter(Boolean).join(" ").toLowerCase()}
function init(){
  const s=DATA.stats;
  $("#mReviews").textContent=fa(s.professors_with_any_public_evidence);
  $("#mProfessors").textContent=fa(s.professors);
  $("#mFaculties").textContent=fa(s.faculties);
  $("#mAvg").textContent=fa(s.department_units);
  $("#mComplete").textContent=fa(s.current_professor_course_pairs);
  $("#mCommunity").textContent=fa(s.cautiously_rankable_course_pairs);
  fillSelect($("#faculty"),DATA.faculties,"همه دانشکده‌ها");
  fillSelect($("#department"),DATA.department_labels,"همه گروه‌ها");
  fillSelect($("#course"),DATA.courses,"همه درس‌ها");
  renderReliable();render();applyTheme();applyHash();
}
function renderReliable(){
  const arr=[...DATA.professors].filter(hasRankable).sort((a,b)=>
    b.review_coverage.cautiously_rankable_course_pair_count-a.review_coverage.cautiously_rankable_course_pair_count ||
    totalReports(b)-totalReports(a) || a.name_fa.localeCompare(b.name_fa,"fa")
  ).slice(0,4);
  $("#reliableGrid").innerHTML=arr.map(p=>`<article class="reliable" data-open-id="${p.id}"><div class="reliable-top"><div><div class="reliable-name">${esc(p.name_fa)}</div><div class="reliable-faculty">${esc(p.faculty||"")}</div></div><div class="reliable-score">${fa(p.review_coverage.cautiously_rankable_course_pair_count)}</div></div><div class="reliable-meta">${fa(totalReports(p))} گزارش ساختاریافته • ${fa(p.review_coverage.cautiously_rankable_course_pair_count)} درس با پشتوانه بهتر</div></article>`).join("")||`<div class="empty">فعلاً رکوردی با guardrail انتخاب‌شده وجود ندارد.</div>`;
  bindOpen();
}
function getFiltered(){
  const q=$("#q").value.trim().toLowerCase(),f=$("#faculty").value,d=$("#department").value,c=$("#course").value,sort=$("#sort").value;
  let arr=DATA.professors.filter(p=>{
    if(q&&!searchable(p).includes(q))return false;
    if(f&&p.faculty!==f)return false;
    if(d&&p.department!==d)return false;
    if(c&&!p.courses.some(x=>x.course===c))return false;
    if(savedOnly&&!saved.has(p.id))return false;
    if(totalReports(p)<minEvidence)return false;
    if(statusFilter==="evidence"&&!p.review_coverage.has_any_public_evidence)return false;
    if(statusFilter==="rankable"&&!hasRankable(p))return false;
    if(statusFilter==="none"&&p.review_coverage.has_any_public_evidence)return false;
    return true;
  });
  if(sort==="rankable")arr.sort((a,b)=>b.review_coverage.cautiously_rankable_course_pair_count-a.review_coverage.cautiously_rankable_course_pair_count||totalReports(b)-totalReports(a));
  else if(sort==="name")arr.sort((a,b)=>a.name_fa.localeCompare(b.name_fa,"fa"));
  else arr.sort((a,b)=>totalReports(b)-totalReports(a)||b.review_coverage.course_pair_count-a.review_coverage.course_pair_count||a.name_fa.localeCompare(b.name_fa,"fa"));
  return arr;
}
function cardHTML(p){
  const ev=totalReports(p),rankable=p.review_coverage.cautiously_rankable_course_pair_count||0,latest=latestDate(p);
  return `<article class="card"><div class="card-main" data-open-id="${p.id}"><div class="card-head"><div class="person"><div class="name">${esc(p.name_fa)}</div><div class="faculty">${esc(p.faculty||"دانشکده نامشخص")}</div></div><div class="score-ring ${rankable?"good":ev>=3?"mid":""}" style="--p:${Math.min(100,ev*10)}"><div class="score-val">${fa(ev)}<small>گزارش</small></div></div></div><div class="badges"><span class="badge">${esc(p.academic_rank||"مرتبه نامشخص")}</span><span class="badge">${esc(p.department||"گروه نامشخص")}</span><span class="badge ${rankable?"strong":!p.review_coverage.has_any_public_evidence?"warn":""}">${esc(evidenceLabel(p))}</span></div><div class="courses">${esc(p.courses.slice(0,5).map(x=>x.course).join("، ")||"هنوز درس دارای بازخورد ثبت نشده")}</div><div class="signal"><div><label>درس با پشتوانه بهتر</label><span>${fa(rankable)}</span></div><div><label>آخرین شاهد</label><span>${faDate(latest)}</span></div></div></div><div class="card-foot"><div class="card-actions"><button class="mini-btn ${saved.has(p.id)?"on":""}" data-save-id="${p.id}">★ ذخیره</button><button class="mini-btn ${compare.includes(p.id)?"on":""}" data-compare-id="${p.id}">⇄ مقایسه</button></div><span class="details-link" data-open-id="${p.id}">جزئیات ←</span></div></article>`;
}
function bindOpen(){document.querySelectorAll("[data-open-id]").forEach(x=>x.onclick=()=>openProfessor(Number(x.dataset.openId)))}
function bindActions(){
  bindOpen();
  document.querySelectorAll("[data-save-id]").forEach(x=>x.onclick=e=>{e.stopPropagation();toggleSave(Number(x.dataset.saveId))});
  document.querySelectorAll("[data-compare-id]").forEach(x=>x.onclick=e=>{e.stopPropagation();toggleCompare(Number(x.dataset.compareId))});
}
function render(){
  const arr=getFiltered();$("#resultCount").textContent=`${fa(arr.length)} نتیجه از ۷۴۳ استاد رسمی`;
  $("#cards").innerHTML=arr.slice(0,limit).map(cardHTML).join("")||`<div class="empty">با این فیلترها نتیجه‌ای پیدا نشد.</div>`;
  $("#loadMore").style.display=arr.length>limit?"block":"none";bindActions();
  $("#savedToggle").classList.toggle("on",savedOnly);$("#savedToggle").textContent=savedOnly?"★ نمایش همه":"★ ذخیره‌شده‌ها";const sc=$("#savedCheck");if(sc)sc.checked=savedOnly;
}
function toggleSave(id){saved.has(id)?saved.delete(id):saved.add(id);saveLocal();render();if($("#drawer").classList.contains("open")&&Number($("#drawer").dataset.pid)===id)openProfessor(id,false)}
function toggleCompare(id){if(compare.includes(id))compare=compare.filter(x=>x!==id);else if(compare.length<3)compare.push(id);else{alert("حداکثر ۳ استاد را هم‌زمان مقایسه کنید.");return}render();updateCompare()}
function updateCompare(){const ps=compare.map(id=>DATA.professors.find(p=>p.id===id)).filter(Boolean);$("#compareNames").innerHTML=ps.map(p=>`<span class="ctag">${esc(p.name_fa)}</span>`).join("");$("#compareBar").classList.toggle("show",compare.length>0);$("#compareGo").disabled=compare.length<2}
function dimHTML(c){return Object.entries(dimLabels).map(([k,l])=>{const d=c.dimensions?.[k]||{},v=d.sample_size>=2?d.observed_mean_0_5:null;return `<div class="dim"><div class="dim-top"><span>${l}<small style="opacity:.6"> · n=${fa(d.sample_size||0)}</small></span><b>${v==null?"—":v.toLocaleString("fa-IR",{maximumFractionDigits:2})}</b></div><div class="track"><i style="width:${v==null?0:scorePct(v)}%"></i></div></div>`}).join("")}
function courseHTML(c){
  const n=c.structured_report_count||0,v=scoreVisible(c)?c.overall_observed_mean_0_5:null,ok=c.ranking_eligible_under_proposed_policy;
  return `<article class="review"><div class="rhead"><b>${esc(c.course||"درس")}</b><span class="rscore">${v==null?"داده عددی ناکافی":v.toLocaleString("fa-IR",{maximumFractionDigits:2})+" / ۵"}</span></div><div class="badges"><span class="badge ${ok?"strong":n<2?"warn":""}">${fa(n)} گزارش</span><span class="badge">آخرین شاهد: ${faDate(c.latest_evidence_date)}</span><span class="badge">${ok?"واجد guardrail مقایسه":"برای رتبه‌بندی کافی نیست"}</span></div>${n>=2?`<div class="dims">${dimHTML(c)}</div>`:""}<div class="note">${ok?"این درس حداقل ۳ گزارش ساختاریافته دارد و آخرین شاهد آن حداکثر ۳ سال قدمت دارد.":"امتیاز این درس برای رتبه‌بندی سراسری استفاده نمی‌شود؛ تعداد گزارش و تازگی را در تفسیر لحاظ کنید."}</div></article>`;
}
function openProfessor(id,push=true){
  const p=DATA.professors.find(x=>x.id===id);if(!p)return;
  $("#drawer").dataset.pid=id;$("#dName").textContent=p.name_fa;$("#dMeta").textContent=[p.academic_rank,p.faculty,p.department].filter(Boolean).join(" • ");
  const courses=[...p.courses].sort((a,b)=>Number(b.ranking_eligible_under_proposed_policy)-Number(a.ranking_eligible_under_proposed_policy)||b.structured_report_count-a.structured_report_count||(b.latest_evidence_date||"").localeCompare(a.latest_evidence_date||""));
  $("#drawerBody").innerHTML=`<div class="profile-top"><div class="profile-score"><b>${fa(totalReports(p))}</b><span>گزارش ساختاریافته</span></div><div class="profile-actions"><button class="mini-btn ${saved.has(p.id)?"on":""}" data-save-id="${p.id}">★ ذخیره</button><button class="mini-btn ${compare.includes(p.id)?"on":""}" data-compare-id="${p.id}">⇄ مقایسه</button></div></div><div class="callout" style="margin:16px 0"><b>امتیاز کلی استاد نمایش داده نمی‌شود.</b><br>امتیازها فقط در سطح هر درس و همراه با تعداد گزارش و تاریخ آخرین شاهد نمایش داده می‌شوند.</div><div class="badges"><span class="badge">${fa(p.review_coverage.course_pair_count)} درس دارای شاهد</span><span class="badge">${fa(p.review_coverage.cautiously_rankable_course_pair_count)} درس با پشتوانه بهتر</span><span class="badge">${fa(p.review_coverage.qualitative_chat_evidence_count)} شاهد متنی کیفی</span></div>${p.official_profile_url?`<p><a href="${esc(p.official_profile_url)}" target="_blank" rel="noopener">پروفایل رسمی دانشگاه ↗</a></p>`:""}<h3 style="margin-top:24px">دادهٔ استاد × درس</h3>${courses.length?courses.map(courseHTML).join(""):`<div class="empty">برای این عضو فعلی دانشگاه هنوز دادهٔ استاد×درس قابل‌استفاده ثبت نشده است.</div>`}`;
  $("#drawer").classList.add("open");$("#drawerBackdrop").classList.add("show");$("#drawer").setAttribute("aria-hidden","false");bindActions();
  if(push)history.replaceState(null,"",`#professor=${p.id}`);
}
function closeDrawer(){$("#drawer").classList.remove("open");$("#drawerBackdrop").classList.remove("show");$("#drawer").setAttribute("aria-hidden","true");if(location.hash.startsWith("#professor="))history.replaceState(null,"",location.pathname+location.search)}
function compareHTML(p){const cs=[...p.courses].sort((a,b)=>Number(b.ranking_eligible_under_proposed_policy)-Number(a.ranking_eligible_under_proposed_policy)||b.structured_report_count-a.structured_report_count).slice(0,6);return `<section class="compare-col"><h3>${esc(p.name_fa)}</h3><p class="muted">${esc([p.academic_rank,p.faculty,p.department].filter(Boolean).join(" • "))}</p><div class="badges"><span class="badge">${fa(totalReports(p))} گزارش</span><span class="badge strong">${fa(p.review_coverage.cautiously_rankable_course_pair_count)} درس واجد guardrail</span></div><div style="margin-top:12px">${cs.map(c=>`<div class="mix"><h4>${esc(c.course)}</h4><div class="mix-tags"><span>${scoreVisible(c)?c.overall_observed_mean_0_5.toLocaleString("fa-IR",{maximumFractionDigits:2})+" / ۵":"امتیاز ناکافی"}</span><span>n=${fa(c.structured_report_count)}</span><span>${faDate(c.latest_evidence_date)}</span></div></div>`).join("")||"داده‌ای ثبت نشده"}</div></section>`}
function showCompare(){const ps=compare.map(id=>DATA.professors.find(p=>p.id===id)).filter(Boolean);$("#compareBody").innerHTML=`<div class="compare-grid">${ps.map(compareHTML).join("")}</div><div class="callout" style="margin-top:18px">مقایسهٔ عددی فقط در سطح درس انجام می‌شود. برای مقایسهٔ واقعی دو استاد، درس مشترک، تعداد گزارش و تازگی شواهد را کنار هم ببینید.</div>`;$("#compareModal").classList.add("show")}
function applyTheme(){const t=safeGet("ui_theme",document.documentElement.dataset.theme||"dark");document.documentElement.dataset.theme=t}
function toggleTheme(){const t=document.documentElement.dataset.theme==="dark"?"light":"dark";document.documentElement.dataset.theme=t;safeSet("ui_theme",t)}
function applyHash(){const m=location.hash.match(/^#professor=(\d+)$/);if(m)openProfessor(Number(m[1]),false)}
function resetFilters(){statusFilter="all";minEvidence=0;savedOnly=false;limit=30;["#q","#faculty","#department","#course"].forEach(s=>$(s).value="");$("#sort").value="reviews";document.querySelectorAll(".chip").forEach(x=>x.classList.toggle("active",x.dataset.status==="all"));render()}
$("#q").oninput=()=>{limit=30;$("#heroQ").value=$("#q").value;render()};$("#heroQ").oninput=()=>{$("#q").value=$("#heroQ").value;limit=30;render()};
["#faculty","#department","#course","#sort"].forEach(s=>$(s).onchange=()=>{limit=30;render()});
$("#loadMore").onclick=()=>{limit+=30;render()};$("#clear").onclick=resetFilters;$("#savedToggle").onclick=()=>{savedOnly=!savedOnly;render()};$("#savedCheck").onchange=e=>{savedOnly=e.target.checked;render()};
$("#themeBtn").onclick=toggleTheme;$("#drawerClose").onclick=closeDrawer;$("#drawerBackdrop").onclick=closeDrawer;$("#compareGo").onclick=showCompare;$("#compareClose").onclick=()=>$("#compareModal").classList.remove("show");
$("#compareModal").onclick=e=>{if(e.target===$("#compareModal"))$("#compareModal").classList.remove("show")};
document.querySelectorAll(".chip").forEach(x=>x.onclick=()=>{document.querySelectorAll(".chip").forEach(y=>y.classList.remove("active"));x.classList.add("active");statusFilter=x.dataset.status||"all";minEvidence=Number(x.dataset.min||0);limit=30;render()});
document.addEventListener("keydown",e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="k"){e.preventDefault();$("#heroQ").focus()}if(e.key==="Escape"){closeDrawer();$("#compareModal").classList.remove("show")}});
window.addEventListener("hashchange",applyHash);
init();
})().catch(err=>{console.error(err);const el=document.querySelector("#cards");if(el)el.innerHTML=`<div class="empty">خطا در بارگذاری بانک داده. صفحه را دوباره باز کنید.</div>`;document.documentElement.classList.add("data-load-failed")});
