import{NOW,ENTRIES,PALETTE} from './data.js';
import{S,hooks,dom} from './state.js';
import{fmtYear} from './util.js';

const {viewport,track,laneWrap,laneCanvas,laneAxis,laneGuide,laneTip}=dom;

export function packLanes(){
  const order=ENTRIES.map((d,i)=>i).sort((a,b)=>{
    const A=ENTRIES[a],B=ENTRIES[b];
    if(A.s!==B.s)return A.s-B.s;
    const am=A.m?1:0,bm=B.m?1:0;
    if(am!==bm)return bm-am;
    return B.e-A.e;
  });
  const fits=(d,l)=>d.s>l.end||(d.m&&d.s===l.end);
  S.gLanes=[];S.gLaneOf=[];
  order.forEach(i=>{
    const d=ENTRIES[i];
    let li=S.gLanes.findIndex(l=>fits(d,l));
    if(li<0){S.gLanes.push({end:d.e,items:[]});li=S.gLanes.length-1;}
    else S.gLanes[li].end=d.e;
    S.gLanes[li].items.push(i);
    S.gLaneOf[i]=li;
  });
}

export function buildTimeMap(){
  S.ctrl=S.domNodes.map(el=>({x:el.offsetLeft+el.offsetWidth/2,y:+el.dataset.y}));
}

export function yearToX(y){
  const ctrl=S.ctrl;
  const c0=ctrl[0],cN=ctrl[ctrl.length-1];
  if(y<=c0.y){
    const k=(ctrl[1].x-c0.x)/(ctrl[1].y-c0.y);
    return c0.x+(y-c0.y)*k;
  }
  for(let i=1;i<ctrl.length;i++){
    if(y<=ctrl[i].y){
      const a=ctrl[i-1],b=ctrl[i];
      return a.x+(y-a.y)/(b.y-a.y)*(b.x-a.x);
    }
  }
  const k=(cN.x-ctrl[ctrl.length-2].x)/(cN.y-ctrl[ctrl.length-2].y);
  return cN.x+(y-cN.y)*k;
}

export function xToYear(x){
  const ctrl=S.ctrl;
  const c0=ctrl[0],cN=ctrl[ctrl.length-1];
  if(x<=c0.x){
    const k=(ctrl[1].y-c0.y)/(ctrl[1].x-c0.x);
    return c0.y+(x-c0.x)*k;
  }
  for(let i=1;i<ctrl.length;i++){
    if(x<=ctrl[i].x){
      const a=ctrl[i-1],b=ctrl[i];
      return a.y+(x-a.x)/(b.x-a.x)*(b.y-a.y);
    }
  }
  const k=(cN.y-ctrl[ctrl.length-2].y)/(cN.x-ctrl[ctrl.length-2].x);
  return cN.y+(x-cN.x)*k;
}

const LANE_NOTE=location.protocol==='file:'
  ?'文件直开模式 · 事件明细需经 HTTP 服务加载'
  :'历代政权泳道 · 悬停查看 · 点击展开该政权历史事件';

export function renderLanes(){
  const TW=track.scrollWidth;
  laneAxis.innerHTML='<span class="lane-note">'+LANE_NOTE+'</span>';
  laneCanvas.innerHTML='';
  S.ctrl.forEach(c=>{
    const tk=document.createElement('div');
    tk.className='lane-tick';
    tk.style.left=c.x+'px';
    tk.textContent=fmtYear(c.y);
    laneAxis.appendChild(tk);
    const g=document.createElement('div');
    g.className='lane-grid';
    g.style.left=c.x+'px';
    laneCanvas.appendChild(g);
  });
  S.gLanes.forEach((lane,li)=>{
    const row=document.createElement('div');
    row.className='lane-row';
    row.style.top='calc(var(--laneH) * '+li+')';
    laneCanvas.appendChild(row);
    lane.items.forEach((idx,k)=>{
      const d=ENTRIES[idx];
      const l=Math.max(0,yearToX(d.s)),r=Math.min(yearToX(d.e),TW-24);
      if(r<=l)return;
      const bar=document.createElement('div');
      bar.className='lane-bar'+(d.f?' data':'')+(S.loadedRegimes.has(d.n)?' done':'')+(S.loadingSet.has(d.n)?' loading':'');
      bar.dataset.i=idx;
      bar.style.left=l+'px';
      bar.style.width=Math.max(2,r-l)+'px';
      const p=PALETTE[d.g];
      bar.style.background=p.f;
      bar.style.borderColor=p.b;
      const lblW=d.n.length*13+12;
      const eras=S.regimeEras.get(d.n);
      if(eras&&eras.length){
        eras.forEach((er,ei)=>{
          const el2=yearToX(Math.max(er.s,d.s)),er2=yearToX(Math.min(er.e+1,d.e));
          const sl=Math.max(l,el2),sr=Math.min(r,er2);
          if(sr-sl>1){
            const seg=document.createElement('span');
            seg.className='lane-era'+(ei%2?' alt':'');
            seg.style.left=(sl-l)+'px';
            seg.style.width=(sr-sl)+'px';
            if(sr-sl>er.n.length*12+6)seg.textContent=er.n;
            bar.appendChild(seg);
          }
        });
      }else if(r-l>lblW+8){
        bar.innerHTML='<span class="lane-name">'+d.n+'</span>';
      }else{
        const lim=k+1<lane.items.length?yearToX(ENTRIES[lane.items[k+1]].s):TW;
        if(lim-r>lblW+8&&r+6+lblW<=TW){
          const lb=document.createElement('span');
          lb.className='lane-lbl';
          lb.textContent=d.n;
          lb.style.left=(r+6)+'px';
          row.appendChild(lb);
        }
      }
      row.appendChild(bar);
    });
  });
  laneCanvas.style.height='calc(var(--laneH) * '+S.gLanes.length+')';
  laneWrap.style.height='calc(var(--laneH) * '+S.gLanes.length+' + 34px)';
  if(S.gLastY!=null)syncBars(S.gLastY);
  if(S.gLastIdx!=null&&S.ctrl[S.gLastIdx]){
    laneGuide.style.display='block';
    laneGuide.style.left=S.ctrl[S.gLastIdx].x+'px';
  }
}

function syncBars(y){
  laneCanvas.querySelectorAll('.lane-bar.on').forEach(e=>e.classList.remove('on'));
  ENTRIES.forEach((d,i)=>{
    if(y>=d.s&&y<=d.e){
      const b=laneCanvas.querySelector('.lane-bar[data-i="'+i+'"]');
      if(b)b.classList.add('on');
    }
  });
}

export function syncGanttHighlight(idx){
  if(idx==null||idx<0)return;
  S.gLastIdx=idx;
  S.gLastY=S.ctrl[idx].y;
  syncBars(S.gLastY);
  laneGuide.style.display='block';
  laneGuide.style.left=S.ctrl[idx].x+'px';
}

laneCanvas.addEventListener('mousemove',e=>{
  const b=e.target.closest('.lane-bar');
  if(!b){laneTip.style.display='none';return}
  const d=ENTRIES[+b.dataset.i];
  const dur=(d.now?NOW:d.e)-d.s;
  const vr=viewport.getBoundingClientRect();
  let eraLine='';
  const eras=S.regimeEras.get(d.n);
  const rulers=S.regimeRulers.get(d.n);
  if((eras&&eras.length)||(rulers&&rulers.length)){
    const y=xToYear(e.clientX-vr.left+S.current);
    if(eras&&eras.length){
      const hits=eras.filter(er=>y>=er.s&&y<=er.e+1);
      if(hits.length===1)eraLine='<i>年号 · '+hits[0].n+' '+fmtYear(hits[0].s)+'—'+fmtYear(hits[0].e)+'</i>';
      else if(hits.length>1)eraLine='<i>年号 · '+hits.map(h=>h.n).join('/')+' '+fmtYear(Math.floor(y))+'</i>';
    }
    if(rulers&&rulers.length){
      const emp=rulers.find(r2=>y>=r2.s&&y<=r2.e+1);
      if(emp){
        const head=emp.m?emp.m+'('+emp.n+')':(emp.n||emp.l);
        const kind=(emp.m||emp.p)?'帝王':'首脑';
        eraLine+='<i>'+kind+' · '+head+' '+fmtYear(emp.s)+'—'+fmtYear(emp.e)
          +(emp.p?' · 谥 '+emp.p:'')+'</i>';
      }
    }
  }
  laneTip.innerHTML='<b>'+d.n+'</b><span class="y">'+(d.ap?'约':'')+fmtYear(d.s)+' — '
    +(d.now?'今':(d.ap?'约':'')+fmtYear(d.e))+' · '+dur+'年</span><p>'+d.tip+'</p>'
    +eraLine
    +(d.f?'<i>'+(S.loadedRegimes.has(d.n)?'点击收起事件明细':'点击加载事件明细')+'</i>'
      :(location.protocol==='file:'?'<i>文件直开无法加载,需 HTTP 服务</i>':''));
  let tx=e.clientX-vr.left+S.current+14;
  const ty=e.clientY-vr.top-laneWrap.offsetTop;
  if(tx>track.scrollWidth-210)tx-=224;
  laneTip.style.left=Math.max(4,tx)+'px';
  laneTip.style.top=Math.max(4,ty-96)+'px';
  laneTip.style.transform='';
  laneTip.style.display='block';
});
laneCanvas.addEventListener('mouseleave',()=>laneTip.style.display='none');

laneCanvas.addEventListener('click',e=>{
  if(S.moved>6)return;
  const b=e.target.closest('.lane-bar');
  if(!b)return;
  if(hooks.onToggleRegime)hooks.onToggleRegime(ENTRIES[+b.dataset.i]);
});
