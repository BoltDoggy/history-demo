import{ENTRIES,PALETTE} from './data.js';
import{S,dom} from './state.js';
import{fmtYear,hexA,seedRand,tornClip,toast} from './util.js';
import{refreshNodes,measure,goToAnchor,poke} from './scroll.js';
import{buildTimeMap,renderLanes,yearToX} from './lanes.js';

const {viewport,track,laneWrap,laneCanvas,laneTip}=dom;

function fetchRegimeEvents(d){
  if(!d.f||location.protocol==='file:')return Promise.resolve(null);
  return Promise.all([
    fetch('data/regimes/'+d.f+'.json')
      .then(r=>r.ok?r.json():null)
      .catch(()=>null),
    new Promise(r=>setTimeout(r,300))
  ]).then(a=>a[0]&&a[0].events?a[0]:null);
}

function insertDetailNodes(regime,evts){
  const reg=ENTRIES.find(x=>x.n===regime),pc=PALETTE[reg.g];
  const eras=S.regimeEras.get(regime)||[];
  const made=[];
  evts.slice().sort((a,b)=>a.y-b.y).forEach(ev=>{
    const era=eras.find(er=>ev.y>=er.s&&ev.y<=er.e);
    const yp=ev.p||(ev.y<0?'前':'');
    const el=document.createElement('article');
    el.className='node detail';
    el.dataset.y=ev.y;
    el.dataset.era=regime;
    el.dataset.title=ev.t;
    el.dataset.regime=regime;
    el.dataset.ytxt=(yp?yp+' ':'')+Math.abs(ev.y);
    el.innerHTML=
      '<div class="card" style="border-left-color:'+pc.f+'">'+
      '<span class="chip" style="background:'+pc.f+';border-color:'+pc.b+';color:#f6efdd">'+regime+(era?' · '+era.n:'')+'</span>'+
      '<h3 class="year"><em>'+yp+'</em>'+Math.abs(ev.y)+'</h3>'+
      '<h4 class="title">'+ev.t+'</h4>'+
      '<p class="desc">'+ev.d+'</p></div>'+
      '<span class="connector"></span><span class="dot" style="border-color:'+pc.f+'"></span>';
    let ref=null;
    for(const n of S.domNodes){
      if(+n.dataset.y<ev.y)ref=n;else break;
    }
    track.insertBefore(el,ref?ref.nextSibling:document.getElementById('outro'));
    refreshNodes();
    made.push(el);
  });
  made.forEach(el=>{
    el.classList.add(S.domNodes.indexOf(el)%2?'down':'up');
  });
  return made;
}

function rebuildAfterChange(){
  refreshNodes();
  buildTimeMap();
  renderLanes();
  measure();
  updateBands();
  renderRulerStrips();
  renderMinorPoints();
}

function updateBands(){
  track.querySelectorAll('.tear-band').forEach(b=>b.remove());
  const TW=track.scrollWidth;
  const laneB=laneWrap.offsetHeight+4;
  S.loadedRegimes.forEach(name=>{
    const d=ENTRIES.find(x=>x.n===name);
    if(!d)return;
    const own=[...track.querySelectorAll('.node[data-regime="'+name+'"]')];
    if(!own.length)return;
    const pc=PALETTE[d.g];
    let l=Math.max(0,yearToX(d.s)-24),r=Math.min(yearToX(d.e)+24,TW-24);
    l=Math.min(l,Math.min(...own.map(e=>e.offsetLeft))-24);
    r=Math.max(r,Math.max(...own.map(e=>e.offsetLeft+e.offsetWidth))+24);
    if(r-l<40)return;
    const blockers=S.domNodes
      .filter(n=>n.dataset.regime!==name&&+n.dataset.y!==d.s)
      .map(n=>({l:n.offsetLeft-14,r:n.offsetLeft+n.offsetWidth+14}))
      .filter(b=>b.l<r&&b.r>l)
      .sort((a,b)=>a.l-b.l);
    if(blockers.length&&blockers[0].l<=l+60)blockers.shift();
    const segs=[];
    let cs=l;
    blockers.forEach(b=>{
      if(b.l-cs>40)segs.push([cs,b.l]);
      cs=Math.max(cs,b.r);
    });
    if(r-cs>40)segs.push([cs,r]);
    segs.forEach((sg,gi)=>{
      const band=document.createElement('div');
      band.className='tear-band';
      band.dataset.regime=name;
      band.style.left=sg[0]+'px';
      band.style.width=(sg[1]-sg[0])+'px';
      band.style.bottom=laneB+'px';
      band.style.background=
        'linear-gradient(180deg,'+hexA(pc.f,.05)+','+hexA(pc.f,.13)+'),'
        +'linear-gradient(180deg,rgba(233,219,183,.95),rgba(223,207,166,.93))';
      band.style.clipPath=tornClip(seedRand(name+'#'+gi));
      track.appendChild(band);
    });
  });
}

function renderRulerStrips(){
  track.querySelectorAll('.ruler-strip').forEach(s=>s.remove());
  const TW=track.scrollWidth;
  const laneB=laneWrap.offsetHeight+4;
  S.regimeRulers.forEach((rulers,name)=>{
    const d=ENTRIES.find(x=>x.n===name);
    if(!d||!rulers||!rulers.length)return;
    const pc=PALETTE[d.g];
    const l=Math.max(0,yearToX(d.s)),r=Math.min(yearToX(d.e),TW-24);
    if(r-l<30)return;
    const strip=document.createElement('div');
    strip.className='ruler-strip';
    strip.dataset.regime=name;
    strip.style.left=l+'px';
    strip.style.width=(r-l)+'px';
    strip.style.bottom=laneB+'px';
    strip.style.background='linear-gradient(180deg,'+hexA(pc.f,.34)+','+hexA(pc.f,.5)+')';
    const ROW_H=19;
    const items=[];
    rulers.forEach((emp,ei)=>{
      const sl=Math.max(l,yearToX(Math.max(emp.s,d.s))),sr=Math.min(r,yearToX(Math.min(emp.e+1,d.e)));
      if(sr-sl<=1)return;
      const label=emp.l||emp.m||emp.n||emp.p||'';
      const lw=label.length*12+6,lc=(sl+sr)/2;
      const lr=label?[Math.max(l,lc-lw/2),Math.min(r,lc+lw/2)]:null;
      items.push({emp,ei,sl,sr,label,lr});
    });
    const rows=[];
    items.forEach((it,k)=>{
      const end=k+1<items.length?Math.min(it.sr,items[k+1].sl):it.sr;
      let ri=rows.findIndex(row=>
        !row.ivs.some(x=>it.sl<x[1]&&end>x[0])&&
        (!it.lr||!row.lbs.some(x=>it.lr[0]<x[1]&&it.lr[1]>x[0])));
      if(ri<0){rows.push({ivs:[],lbs:[]});ri=rows.length-1;}
      rows[ri].ivs.push([it.sl,end]);
      if(it.lr)rows[ri].lbs.push(it.lr);
      it.ri=ri;
      it.end=end;
    });
    strip.style.height=(rows.length*ROW_H)+'px';
    items.forEach(m2=>{
      const seg=document.createElement('span');
      seg.className='ruler-seg'+(m2.ei%2?' alt':'');
      seg.style.left=(m2.sl-l)+'px';
      seg.style.width=Math.max(0,m2.end-m2.sl)+'px';
      seg.style.top=((rows.length-1-m2.ri)*ROW_H)+'px';
      seg.style.bottom='auto';
      seg.style.height=ROW_H+'px';
      if(m2.label)seg.textContent=m2.label;
      seg._emp=m2.emp;
      strip.appendChild(seg);
    });
    strip.addEventListener('mousemove',e2=>{
      const sg=e2.target.closest('.ruler-seg');
      if(!sg){laneTip.style.display='none';return}
      const emp=sg._emp;
      laneTip.innerHTML='<b>'+(emp.m?emp.m+' · '+emp.n:(emp.n||emp.l))+'</b>'
        +'<span class="y">在位 '+fmtYear(emp.s)+' — '+fmtYear(emp.e)+'</span>'
        +(emp.m?'<p>庙号 · '+emp.m+'</p>':'')
        +(emp.p?'<p>谥号 · '+emp.p+'</p>':'')
        +(emp.t?'<p>'+emp.t+'</p>':'');
      const vr2=viewport.getBoundingClientRect();
      let tx=e2.clientX-vr2.left+S.current+14;
      const ty=e2.clientY-vr2.top-laneWrap.offsetTop;
      if(tx>TW-210)tx-=224;
      laneTip.style.left=Math.max(4,tx)+'px';
      laneTip.style.top=Math.max(4,ty-96)+'px';
      laneTip.style.transform='';
      laneTip.style.display='block';
    });
    strip.addEventListener('mouseleave',()=>laneTip.style.display='none');
    track.appendChild(strip);
  });
}

function renderMinorPoints(){
  track.querySelectorAll('.mini-node').forEach(m=>m.remove());
  const TW=track.scrollWidth;
  S.regimePoints.forEach((pts,name)=>{
    const d=ENTRIES.find(x=>x.n===name);
    if(!d||!pts||!pts.length)return;
    const pc=PALETTE[d.g];
    pts.forEach((p,i)=>{
      const x=yearToX(p.y);
      if(x<0||x>TW)return;
      const yp=p.p||(p.y<0?'前':'');
      const el=document.createElement('div');
      el.className='mini-node'+(i%2?' up':'');
      el.dataset.regime=name;
      el.style.left=x+'px';
      el.title='';
      el.innerHTML='<span class="mini-yr">'+(yp?yp+' ':'')+Math.abs(p.y)+'</span>'
        +'<span class="mini-dot" style="background:'+pc.f+';border-color:'+pc.b+'"></span>';
      el.addEventListener('mousemove',e2=>{
        laneTip.innerHTML='<b>'+p.t+'</b><span class="y">'+name+' · '
          +(yp?yp+' ':'')+Math.abs(p.y)+' 年</span><p>'+p.d+'</p>';
        const vr2=viewport.getBoundingClientRect();
        let tx=e2.clientX-vr2.left+S.current+14;
        const ty=e2.clientY-laneWrap.getBoundingClientRect().top-8;
        if(tx>TW-210)tx-=224;
        laneTip.style.left=Math.max(4,tx)+'px';
        laneTip.style.top=ty+'px';
        laneTip.style.transform='translateY(-100%)';
        laneTip.style.display='block';
      });
      el.addEventListener('mouseleave',()=>laneTip.style.display='none');
      track.appendChild(el);
    });
  });
}

export async function toggleRegime(d){
  const name=d.n;
  if(track.querySelector('.node[data-regime="'+name+'"]')){
    track.querySelectorAll('.node[data-regime="'+name+'"]').forEach(el=>el.remove());
    S.loadedRegimes.delete(name);
    S.regimeEras.delete(name);
    S.regimeRulers.delete(name);
    S.regimePoints.delete(name);
    rebuildAfterChange();
    toast('已收起 '+name+' 明细');
    return;
  }
  if(S.loadingSet.has(name))return;
  S.loadingSet.add(name);
  const bar=laneCanvas.querySelector('.lane-bar[data-i="'+ENTRIES.indexOf(d)+'"]');
  if(bar)bar.classList.add('loading');
  const data=await fetchRegimeEvents(d);
  S.loadingSet.delete(name);
  if(bar)bar.classList.remove('loading');
  if(!data||!data.events||!data.events.length){
    toast(location.protocol==='file:'
      ?'文件直开无法加载数据,请经 HTTP 服务访问(如 python3 -m http.server)'
      :name+' · 明细编纂中,已跳到相近节点');
    goToAnchor(mapRegimeToNode(d)+1);
    poke();
    return;
  }
  if(data.eras&&data.eras.length)S.regimeEras.set(name,data.eras);
  if(data.emperors&&data.emperors.length)S.regimeRulers.set(name,data.emperors);
  if(data.points&&data.points.length)S.regimePoints.set(name,data.points);
  const made=insertDetailNodes(name,data.events);
  S.loadedRegimes.add(name);
  rebuildAfterChange();
  goToAnchor(S.domNodes.indexOf(made[0])+1);
  poke();
  toast('已展开 '+name+' · '+data.events.length+' 则事件,再点泳道条可收起');
}

function mapRegimeToNode(d){
  const yrs=S.domNodes.map(el=>+el.dataset.y);
  const mid=(d.s+d.e)/2;
  const inSpan=yrs.map((y,j)=>({j,dd:Math.abs(y-mid)})).filter(o=>yrs[o.j]>=d.s&&yrs[o.j]<=d.e);
  if(inSpan.length){
    inSpan.sort((a,b2)=>a.dd-b2.dd);
    return inSpan[0].j;
  }
  let bi=-1;
  yrs.forEach((y,j)=>{if(y<d.s)bi=j});
  let ai=-1;
  for(let j=0;j<yrs.length;j++){if(yrs[j]>d.e){ai=j;break}}
  const db=bi>=0?d.s-yrs[bi]:Infinity;
  const da=ai>=0?yrs[ai]-d.e:Infinity;
  return (da<=250&&da<db)?ai:(bi>=0?bi:Math.max(ai,0));
}
