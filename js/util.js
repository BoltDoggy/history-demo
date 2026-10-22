export const $=s=>document.querySelector(s);

export function fmtYear(y){return y<0?'前'+(-y):(y===0?'元年':''+y)}

export function hexA(h,a){
  return 'rgba('+parseInt(h.slice(1,3),16)+','+parseInt(h.slice(3,5),16)+','+parseInt(h.slice(5,7),16)+','+a+')';
}

export function seedRand(seed){
  let s=0;
  for(const ch of seed)s=(s*31+ch.charCodeAt(0))>>>0;
  return ()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296};
}

export function tornClip(rand){
  const N=14,l=[],r=[];
  for(let i=0;i<=N;i++){
    const y=(i/N*100).toFixed(2)+'%';
    if(i===0||i===N){l.push('0px '+y);r.push('100% '+y);}
    else{
      l.push((rand()*16-3).toFixed(1)+'px '+y);
      r.push('calc(100% + '+(rand()*16-3).toFixed(1)+'px) '+y);
    }
  }
  return 'polygon('+l.concat(r.reverse()).join(',')+')';
}

let toastTimer=null;
export function toast(msg){
  const t=$('#toast');
  t.textContent=msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>t.classList.remove('show'),2600);
}
