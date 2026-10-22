import{hooks} from './state.js';
import{buildNodes,measure,frame} from './scroll.js';
import{buildTimeMap,packLanes,renderLanes,syncGanttHighlight} from './lanes.js';
import{toggleRegime} from './regimes.js';

hooks.onActiveNode=syncGanttHighlight;
hooks.onToggleRegime=toggleRegime;

buildNodes();
buildTimeMap();
packLanes();
renderLanes();
measure();
requestAnimationFrame(frame);
