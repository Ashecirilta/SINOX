const API="https://collectionapi.metmuseum.org/public/collection/v1";
const $=s=>document.querySelector(s);
const state={items:[],i:0,yes:[],drag:false,startX:0,dx:0};

function dayKey(){
  const d=new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function hash(s){let h=2166136261;for(const c of s){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
function seededShuffle(a,seed){
  let x=seed||1, out=[...a];
  const rnd=()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return (x>>>0)/4294967296};
  for(let i=out.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[out[i],out[j]]=[out[j],out[i]]}
  return out;
}
function cacheKey(){return `sinox-v2-${dayKey()}`}
function save(items){localStorage.setItem(cacheKey(),JSON.stringify({t:Date.now(),items}))}
function load(){
  try{
    const x=JSON.parse(localStorage.getItem(cacheKey()));
    if(x&&Array.isArray(x.items)&&x.items.length>=SINOX_CONFIG.dailyCount) return x.items;
  }catch(e){}
  return null;
}
async function json(url){const r=await fetch(url);if(!r.ok)throw new Error(r.status);return r.json()}
async function fetchCategory(cat,index){
  const search=await json(`${API}/search?hasImages=true&isPublicDomain=true&q=${encodeURIComponent(cat.query)}`);
  const ids=seededShuffle(search.objectIDs||[],hash(dayKey()+cat.name)).slice(0,Math.max(24,SINOX_CONFIG.perCategory*3));
  const objects=[];
  // Pedimos candidatos por tandas y paramos al tener 10 válidos.
  for(let p=0;p<ids.length && objects.length<SINOX_CONFIG.perCategory;p+=6){
    const batch=await Promise.all(ids.slice(p,p+6).map(id=>json(`${API}/objects/${id}`).catch(()=>null)));
    for(const o of batch){
      if(!o||!o.primaryImageSmall||o.isPublicDomain!==true)continue;
      objects.push({
        id:o.objectID,
        category:cat.name,
        title:o.title||"Sin título",
        author:o.artistDisplayName||o.culture||o.period||"Autor desconocido",
        image:o.primaryImageSmall,
        objectURL:o.objectURL||""
      });
      if(objects.length>=SINOX_CONFIG.perCategory)break;
    }
  }
  return objects;
}
async function buildDaily(){
  const groups=await Promise.all(SINOX_CONFIG.categories.map(fetchCategory));
  let items=groups.flat();
  // Si alguna categoría devuelve menos, completamos con candidatos generales ya válidos.
  if(items.length<SINOX_CONFIG.dailyCount){
    const extraSearch=await json(`${API}/search?hasImages=true&isPublicDomain=true&q=art`);
    const used=new Set(items.map(x=>x.id));
    const ids=seededShuffle(extraSearch.objectIDs||[],hash(dayKey()+"extra")).filter(id=>!used.has(id)).slice(0,120);
    for(let p=0;p<ids.length && items.length<SINOX_CONFIG.dailyCount;p+=8){
      const batch=await Promise.all(ids.slice(p,p+8).map(id=>json(`${API}/objects/${id}`).catch(()=>null)));
      for(const o of batch){
        if(o&&o.primaryImageSmall&&o.isPublicDomain===true&&!used.has(o.objectID)){
          used.add(o.objectID);
          items.push({id:o.objectID,category:"Descubrimiento",title:o.title||"Sin título",author:o.artistDisplayName||o.culture||"Autor desconocido",image:o.primaryImageSmall,objectURL:o.objectURL||""});
          if(items.length>=SINOX_CONFIG.dailyCount)break;
        }
      }
    }
  }
  return seededShuffle(items,hash(dayKey()+"final")).slice(0,SINOX_CONFIG.dailyCount);
}
function preload(){
  for(let n=1;n<=SINOX_CONFIG.preloadAhead;n++){
    const item=state.items[state.i+n]; if(!item)continue;
    const im=new Image(); im.decoding="async"; im.src=item.image;
  }
}
function render(){
  if(state.i>=state.items.length)return finish();
  const x=state.items[state.i];
  $("#counter").textContent=`${state.i+1} / ${state.items.length}`;
  $("#art").src=x.image; $("#art").alt=x.title;
  $("#category").textContent=x.category; $("#title").textContent=x.title; $("#author").textContent=x.author;
  const c=$("#card"); c.style.transform="";c.style.opacity="1";
  $(".yes-badge").style.opacity=0;$(".no-badge").style.opacity=0;
  preload();
}
function vote(yes){
  const c=$("#card");
  c.style.transform=`translateX(${yes?110:-110}%) rotate(${yes?10:-10}deg)`; c.style.opacity="0";
  if(yes)state.yes.push(state.items[state.i]);
  setTimeout(()=>{state.i++;render()},210);
}
function finish(){
  $("#game").classList.add("hidden");$("#results").classList.remove("hidden");
  $("#counter").textContent=`100 / 100`;
  $("#resultCount").textContent=`Has elegido ${state.yes.length} de ${state.items.length}.`;
  $("#grid").innerHTML=state.yes.map(x=>`<article class="tile"><img loading="lazy" src="${x.image}" alt=""><div><strong>${escapeHtml(x.title)}</strong><span>${escapeHtml(x.category)}</span></div></article>`).join("");
}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))}
function dragStart(e){state.drag=true;state.startX=(e.touches?e.touches[0].clientX:e.clientX);state.dx=0;$("#card").style.transition="none"}
function dragMove(e){
  if(!state.drag)return;const x=(e.touches?e.touches[0].clientX:e.clientX);state.dx=x-state.startX;
  $("#card").style.transform=`translateX(${state.dx}px) rotate(${state.dx/25}deg)`;
  $(".yes-badge").style.opacity=Math.max(0,Math.min(1,state.dx/90));
  $(".no-badge").style.opacity=Math.max(0,Math.min(1,-state.dx/90));
}
function dragEnd(){
  if(!state.drag)return;state.drag=false;$("#card").style.transition="";
  if(Math.abs(state.dx)>85)vote(state.dx>0);else render();
}
async function start(){
  try{
    let items=load();
    if(!items){items=await buildDaily(); if(items.length<20)throw new Error("Muy pocas obras"); save(items)}
    state.items=items.slice(0,SINOX_CONFIG.dailyCount);
    $("#loading").classList.add("hidden");$("#game").classList.remove("hidden");render();
  }catch(e){console.error(e);$("#loading").classList.add("hidden");$("#error").classList.remove("hidden")}
}
$("#yesBtn").addEventListener("click",()=>vote(true));$("#noBtn").addEventListener("click",()=>vote(false));
$("#restartBtn").addEventListener("click",()=>{state.i=0;state.yes=[];$("#results").classList.add("hidden");$("#game").classList.remove("hidden");render()});
const card=$("#card");
card.addEventListener("pointerdown",dragStart);window.addEventListener("pointermove",dragMove);window.addEventListener("pointerup",dragEnd);
card.addEventListener("touchstart",dragStart,{passive:true});card.addEventListener("touchmove",dragMove,{passive:true});card.addEventListener("touchend",dragEnd);
start();
