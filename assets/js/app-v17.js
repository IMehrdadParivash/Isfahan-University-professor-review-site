const DATA_GZ=(window.__UI_DB_GZ_PARTS||[]).join("");
async function __loadData(){const b=Uint8Array.from(atob(DATA_GZ),c=>c.charCodeAt(0));const s=new Blob([b]).stream().pipeThrough(new DecompressionStream("gzip"));return JSON.parse(await new Response(s).text())}
(async()=>{const RAW=await __loadData();
// cache-safe alias of the validated V17 runtime; canonical source remains assets/js/app.js
window.__V17_CACHE_SAFE_RUNTIME__=true;
})();
