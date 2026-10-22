import{NODES} from './data.js';
import{S,hooks,dom} from './state.js';

const {viewport,track,fill,eraLabel,hint,tickBar,far,mid,near,sun}=dom;

const clamp=v=>Math.max(0,Math.min(S.maxScroll,v));

export function refreshNodes(){
  S.domNodes=[...track.querySelectorAll('.node')].sort((a,b)=>(+a.dataset.y)-(+b.dataset.y));
}

export function buildNodes(){
  const frag=document.createDocumentFragment();
  NODES.forEach((n,i)=>{
    const el=document.createElement('article');
    el.className='node '+(i%2?'down':'up');
    el.dataset.idx=i;
    el.dataset.y=n.y;
    el.dataset.era=n.era;
    el.dataset.title=n.title;
    el.dataset.ytxt=(n.p?n.p+' ':'')+n.n;
    el.innerHTML=
      '<div class="card"><span class="chip">'+n.era+'</span>'+
      '<h3 class="year"><em>'+n.p+'</em>'+n.n+'</h3>'+
      '<h4 class="title">'+n.title+'</h4>'+
      '<p class="desc">'+n.desc+'</p></div>'+
      '<span class="connector"></span><span class="dot"></span>';
    frag.appendChild(el);
  });
  track.insertBefore(frag,document.getElementById('outro'));
  refreshNodes();
}

function buildTicks(){
  tickBar.querySelectorAll('.tick').forEach(t=>t.remove());
  if(S.maxScroll<=0)return;
  S.domNodes.forEach((el,i)=>{
    const b=document.createElement('button');
    b.className='tick'+(el.classList.contains('detail')?' det':'');
    b.dataset.idx=i;
    b.style.left=(S.anchors[i+1]/S.maxScroll*100)+'%';
    b.setAttribute('aria-label',el.dataset.era+' · '+el.dataset.title);
    b.title=el.dataset.era+' · '+el.dataset.title;
    tickBar.appendChild(b);
  });
}

export function measure(){
  const ratio=S.maxScroll>0?S.current/S.maxScroll:0;
  const W=viewport.clientWidth;
  S.maxScroll=Math.max(0,track.scrollWidth-W);
  S.anchors=[0];
  refreshNodes();
  S.domNodes.forEach(el=>{
    S.anchors.push(clamp(el.offsetLeft+el.offsetWidth/2-W/2));
  });
  S.anchors.push(S.maxScroll);
  buildTicks();
  S.current=S.target=clamp(ratio*S.maxScroll);
}

function nearestAnchorIdx(v){
  let bi=0,bd=Infinity;
  S.anchors.forEach((a,i)=>{const d=Math.abs(a-v);if(d<bd){bd=d;bi=i}});
  return bi;
}

function apply(){
  track.style.transform='translate3d('+(-S.current)+'px,0,0)';
  far.style.backgroundPositionX=(-S.current*0.05)+'px';
  mid.style.backgroundPositionX=(-S.current*0.13)+'px';
  near.style.backgroundPositionX=(-S.current*0.24)+'px';
  sun.style.transform='translate3d('+(-S.current*0.028)+'px,0,0)';
  if(S.maxScroll>0)fill.style.width=(S.current/S.maxScroll*100)+'%';
  const ni=nearestAnchorIdx(S.current);
  if(ni!==S.activeAnchor){
    S.activeAnchor=ni;
    track.querySelectorAll('.node.active').forEach(e=>e.classList.remove('active'));
    tickBar.querySelectorAll('.tick.active').forEach(e=>e.classList.remove('active'));
    const el=S.domNodes[ni-1];
    const tk=tickBar.querySelector('.tick[data-idx="'+(ni-1)+'"]');
    if(el){
      el.classList.add('active');
      if(tk)tk.classList.add('active');
      eraLabel.textContent=el.dataset.era+' · '+el.dataset.ytxt+' 年';
      if(hooks.onActiveNode)hooks.onActiveNode(ni-1);
    }else{
      eraLabel.textContent=ni===0?'卷首 · 华夏长卷':'卷终 · 以史为鉴';
    }
  }
}

export function frame(){
  const now=performance.now();
  if(!S.dragging&&now-S.lastInput>200){
    const i=nearestAnchorIdx(S.target);
    const d=S.anchors[i]-S.target;
    const g1=i>0?S.anchors[i]-S.anchors[i-1]:Infinity;
    const g2=i<S.anchors.length-1?S.anchors[i+1]-S.anchors[i]:Infinity;
    if(Math.abs(d)<Math.min(g1,g2)*0.45)S.target+=d*0.08;
  }
  if(!S.dragging)S.current+=(S.target-S.current)*0.12;
  apply();
  requestAnimationFrame(frame);
}

export function poke(){
  if(S.hintGone)return;
  S.hintGone=true;
  hint.classList.add('hidden');
}

addEventListener('wheel',e=>{
  if(e.ctrlKey)return;
  e.preventDefault();
  let d=e.deltaY+e.deltaX;
  if(e.deltaMode===1)d*=16;else if(e.deltaMode===2)d*=viewport.clientWidth;
  S.target=clamp(S.target+d*1.6);
  S.lastInput=performance.now();
  poke();
},{passive:false});

let px=0,vel=0,lastX=0,lastT=0;
viewport.addEventListener('pointerdown',e=>{
  if(e.pointerType==='mouse'&&e.button!==0)return;
  S.dragging=true;S.moved=0;vel=0;
  px=lastX=e.clientX;lastT=performance.now();
  viewport.classList.add('grabbing');
});
addEventListener('pointermove',e=>{
  if(!S.dragging)return;
  const now=performance.now(),x=e.clientX,dx=x-px;
  S.moved+=Math.abs(dx);
  S.target=S.current=clamp(S.target-dx);
  const dt=Math.max(now-lastT,1);
  vel=vel*0.7+((x-lastX)/dt)*0.3;
  px=lastX=x;lastT=now;S.lastInput=now;
});
function endDrag(){
  if(!S.dragging)return;
  S.dragging=false;
  viewport.classList.remove('grabbing');
  S.target=clamp(S.target-Math.max(-2400,Math.min(2400,vel*230)));
  S.lastInput=performance.now();
  poke();
}
addEventListener('pointerup',endDrag);
addEventListener('pointercancel',endDrag);

track.addEventListener('click',e=>{
  if(S.moved>6)return;
  const el=e.target.closest('.node');
  if(el)goToAnchor(1+ +el.dataset.idx);
});
tickBar.addEventListener('click',e=>{
  const t=e.target.closest('.tick');
  if(t)goToAnchor(1+ +t.dataset.idx);
});

export function goToAnchor(i){
  i=Math.max(0,Math.min(S.anchors.length-1,i));
  S.target=S.anchors[i];
  S.lastInput=performance.now();
  poke();
}
function nav(dir){
  const ni=nearestAnchorIdx(S.current+dir*10);
  let i=Math.max(0,Math.min(S.anchors.length-1,ni+dir));
  while(i>0&&i<S.anchors.length-1&&S.anchors[i]===S.anchors[ni])i+=dir;
  goToAnchor(i);
}
addEventListener('keydown',e=>{
  const k=e.key;
  if(k==='ArrowRight'||k==='PageDown'){nav(1);e.preventDefault();}
  else if(k==='ArrowLeft'||k==='PageUp'){nav(-1);e.preventDefault();}
  else if(k==='Home'){goToAnchor(0);e.preventDefault();}
  else if(k==='End'){goToAnchor(S.anchors.length-1);e.preventDefault();}
});

let rz=null;
addEventListener('resize',()=>{cancelAnimationFrame(rz);rz=requestAnimationFrame(measure)});
