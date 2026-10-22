export const S={
  current:0,target:0,maxScroll:0,anchors:[0],
  lastInput:0,dragging:false,activeAnchor:-1,moved:0,
  domNodes:[],ctrl:[],gLanes:[],gLaneOf:[],
  gLastY:null,gLastIdx:null,hintGone:false,
  loadedRegimes:new Set(),loadingSet:new Set(),
  regimeEras:new Map(),regimeRulers:new Map()
};

export const hooks={onActiveNode:null,onToggleRegime:null};

export const dom={
  viewport:document.getElementById('viewport'),
  track:document.getElementById('track'),
  fill:document.getElementById('progressFill'),
  eraLabel:document.getElementById('eraLabel'),
  hint:document.getElementById('hint'),
  tickBar:document.getElementById('progressTrack'),
  far:document.getElementById('farLayer'),
  mid:document.getElementById('midLayer'),
  near:document.getElementById('nearLayer'),
  sun:document.getElementById('sunLayer'),
  laneWrap:document.getElementById('laneWrap'),
  laneCanvas:document.getElementById('laneCanvas'),
  laneAxis:document.getElementById('laneAxis'),
  laneGuide:document.getElementById('laneGuide'),
  laneTip:document.getElementById('laneTip')
};
