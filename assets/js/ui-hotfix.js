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
