import {defineWorld,toolkit} from '@diorama/worlds';
import rome from './rome.js';
import {compileConstruction} from './construction-batches.js';
import {DURATION,PHASES,constructionTime,constructionWindow,progressAt} from './rome-timeline.js';
export default defineWorld({...rome,name:'rome-city-formation',title:'Rome · A City Takes Shape',description:'An artistic 84-second formation of Rome: Tiber and stone bridges, ancient monuments, basilica and terracotta neighborhoods, gardens and an illuminated completed city. A poetic sequence, not historical dating.',duration:DURATION,still:0,reducedStill:68,timeline:true,moments:PHASES,rendering:{...rome.rendering,staticBatches:false},
 build(W){const source=W.group();source.name='rome-construction-source';const S=toolkit(source);W.own({dispose:()=>S.dispose()});const original=rome.build(S);const construction=compileConstruction(W,source,original.dynamicRoots,constructionWindow);return{source,S,original,construction,dynamicRoots:[source,construction.root]};},
 tick({t,parts}){const time=constructionTime(t);rome.tick({t,parts:parts.original});parts.construction.update(time);const life=progressAt(time,55,61);for(const b of parts.original.boats)b.scale.setScalar(life);}
});
