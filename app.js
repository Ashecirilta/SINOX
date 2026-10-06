(()=>{"use strict";
const q=s=>document.querySelector(s), items=SINOX_ITEMS, st={i:0,yes:[],x0:0,dx:0,drag:false};
function preload(){for(let k=1;k<=3;k++){let x=items[st.i+k];if(x){let im=new Image();im.src=x.image}}}
function show(){if(st.i>=items.length)return finish();let x=items[st.i];q("#count").textContent=`${st.i+1} / ${items.length}`;q("#photo").src=x.image;q("#cat").textContent=x.category;q("#title").textContent=x.title;q("#author").textContent=x.author;let c=q("#card");c.style.transform="";c.style.opacity=1;q("#noTag").style.opacity=0;q("#yesTag").style.opacity=0;preload()}
function vote(v){if(v)st.yes.push(items[st.i]);let c=q("#card");c.style.transform=`translateX(${v?110:-110}%)`;c.style.opacity=0;setTimeout(()=>{st.i++;show()},180)}
function finish(){q("#play").hidden=true;q("#done").hidden=false;q("#summary").textContent=`Has elegido ${st.yes.length} de ${items.length}.`;q("#grid").innerHTML=st.yes.map(x=>`<img loading="lazy" src="${x.image}" alt="">`).join("")}
q("#no").onclick=()=>vote(false);q("#yes").onclick=()=>vote(true);q("#again").onclick=()=>{st.i=0;st.yes=[];q("#done").hidden=true;q("#play").hidden=false;show()};
let c=q("#card");c.onpointerdown=e=>{st.drag=true;st.x0=e.clientX;c.setPointerCapture(e.pointerId)};c.onpointermove=e=>{if(!st.drag)return;st.dx=e.clientX-st.x0;c.style.transform=`translateX(${st.dx}px) rotate(${st.dx/28}deg)`;q("#yesTag").style.opacity=Math.max(0,Math.min(1,st.dx/90));q("#noTag").style.opacity=Math.max(0,Math.min(1,-st.dx/90))};c.onpointerup=()=>{if(!st.drag)return;st.drag=false;if(Math.abs(st.dx)>80)vote(st.dx>0);else show();st.dx=0};
document.addEventListener("keydown",e=>{if(e.key==="ArrowLeft")vote(false);if(e.key==="ArrowRight")vote(true)});
show();
})();