import { z } from 'zod';
export const styleSchema = z.enum(['melee','ranged','magic','none']);
const itemSchema=z.object({slot:z.number().int().min(0).max(40),id:z.number().int().positive(),quantity:z.number().int().positive()});
export const eventSchema = z.object({
  t:z.number().finite().min(0).max(7200), tick:z.number().int().min(0).optional(),
  kind:z.enum(['snapshot','incoming','outgoing','heal','death','note','prayer','inventory','equipment','animation','selfHit','targetHit','targetOverhead']),
  hp:z.number().min(0).max(255).optional(), maxHp:z.number().min(1).max(255).optional(),
  prayerPoints:z.number().min(0).max(255).optional(),
  style:styleSchema.optional(), protection:styleSchema.optional(), opponentProtection:styleSchema.optional(),
  activeProtection:styleSchema.optional(),targetProtection:styleSchema.optional(),
  items:z.array(itemSchema).max(40).optional(),actorRole:z.enum(['self','target']).optional(),animationId:z.number().int().min(-1).optional(),
  amount:z.number().min(0).max(255).optional(), text:z.string().max(1000).optional(),
  source:z.enum(['observed','manual','synthetic']).default('manual')
});
export const importSchema=z.object({
  version:z.literal(1),game:z.literal('osrs'),mode:z.enum(['LMS','Wilderness','Duel practice']).default('LMS'),
  title:z.string().min(1).max(100), outcome:z.enum(['win','loss','unknown']).default('unknown'),
  duration:z.number().min(0).max(7200), events:z.array(eventSchema).max(10000)
}).superRefine((s,ctx)=>{if(s.events.some(e=>e.t>s.duration))ctx.addIssue({code:'custom',message:'An event timestamp exceeds the session duration.'});});
export type FightEvent=z.infer<typeof eventSchema>;
export type FightImport=z.infer<typeof importSchema>;
export type Finding={id:string,t:number,category:'resources'|'defense'|'offense'|'reflection',severity:'focus'|'review'|'positive',title:string,evidence:string,action:string,confidence:'observed'|'suggestion',eventIndices:number[]};
export type Review={version:1,findings:Finding[],summary:string,focus:string,coverage:{snapshots:number,incoming:number,outgoing:number,events:number},limits:string[]};
export function analyze(events:FightEvent[],threshold=40):Review {
  const sorted=events.map((e,i)=>({...e,_i:i})).sort((a,b)=>a.t-b.t);
  const findings:Finding[]=[]; let low:typeof sorted=[];
  const addLow=()=>{if(low.length>=2&&low.at(-1)!.t-low[0].t>=0.6){const first=low[0],last=low.at(-1)!;findings.push({id:`hp-${first._i}`,t:first.t,category:'resources',severity:'focus',title:'A low-health window worth reviewing',evidence:`${low.length} observations over ${(last.t-first.t).toFixed(1)}s were at or below your ${threshold}% review threshold. Lowest recorded HP: ${Math.min(...low.map(e=>e.hp!))}.`,action:'Rewatch this window: was food available, and could you have healed before committing to another attack?',confidence:'suggestion',eventIndices:low.slice(0,20).map(e=>e._i)});}low=[];};
  for(const e of sorted){
    if(e.kind==='snapshot'){
      if(e.hp!==undefined&&e.maxHp&&e.hp>0&&100*e.hp/e.maxHp<=threshold){if(low.length&&e.t-low.at(-1)!.t>1.5)addLow();low.push(e);}else addLow();
    }
    if(e.kind==='death'||e.kind==='heal')addLow();
    if(e.kind==='incoming'&&e.style&&e.style!=='none'&&e.protection!==undefined&&e.style!==e.protection){findings.push({id:`def-${e._i}`,t:e.t,category:'defense',severity:'review',title:'Attack recorded without matching protection',evidence:`${e.style} attack; protection at attack evaluation recorded as ${e.protection}.${e.amount!==undefined?` Observed damage: ${e.amount}.`:''}`,action:'Check the attack timing in the replay. Practice recognizing the visible style and selecting its protection prayer. Damage alone cannot prove a prayer error.',confidence:'observed',eventIndices:[e._i]});}
    if(e.kind==='outgoing'&&e.style&&e.style!=='none'&&e.style===e.opponentProtection){findings.push({id:`off-${e._i}`,t:e.t,category:'offense',severity:'review',title:'Your attack met matching protection',evidence:`Your ${e.style} attack and the opponent’s ${e.opponentProtection} protection were recorded together.`,action:'Review whether this was intentional pressure or a missed switch. Compare the visible overhead at the attack’s evaluation time.',confidence:'observed',eventIndices:[e._i]});}
    if(e.kind==='heal'&&e.amount&&e.amount>0){findings.push({id:`heal-${e._i}`,t:e.t,category:'resources',severity:'positive',title:'Health recovered',evidence:`A heal of ${e.amount} HP was recorded.`,action:'Check how this heal fit between attacks. Repeat the timing when the same opportunity appears.',confidence:'observed',eventIndices:[e._i]});}
    if(e.kind==='note'&&e.text){findings.push({id:`note-${e._i}`,t:e.t,category:'reflection',severity:'review',title:'Your review note',evidence:e.text,action:'Use this moment to choose one concrete adjustment for the next fight.',confidence:'suggestion',eventIndices:[e._i]});}
  }
  addLow();findings.sort((a,b)=>a.t-b.t);
  const concerns=findings.filter(f=>f.severity!=='positive');
  const focus=concerns.find(f=>f.category==='resources')?.action||concerns[0]?.action||'Review one fight and mark the first decision you would change.';
  const death=sorted.find(e=>e.kind==='death');
  return {version:1,findings:findings.slice(0,150),summary:death?(concerns.length?'The log confirms a death. These earlier decisions are review candidates, not proven causes.':'A death was recorded, but there is not enough evidence to explain its cause.'):(concerns.length?'Review these recorded moments and decide which adjustment to take into your next fight.':'No review signals found in the available evidence. This does not mean the fight was mistake-free.'),focus,coverage:{snapshots:sorted.filter(e=>e.kind==='snapshot').length,incoming:sorted.filter(e=>e.kind==='incoming').length,outgoing:sorted.filter(e=>e.kind==='outgoing').length,events:events.length},limits:[...(findings.length>150?['Showing the first 150 review moments. Split long recordings for complete per-moment inspection.']:[]),'This is a rule-based review, not an optimal-play solver.','The low-HP threshold is a personal review setting, not an opponent max-hit or safe-HP calculation.','Opponent special energy, hidden inputs and counterfactual damage are unknown.','Prayer checks require protection at attack evaluation; a damage-time snapshot is insufficient.']};
}
export const adapters = [{id:'osrs',name:'Old School RuneScape',status:'available',modes:['LMS','Wilderness','Duel practice']},{id:'minecraft',name:'Minecraft',status:'planned',modes:[]},{id:'cod-mobile',name:'Call of Duty Mobile',status:'planned',modes:[]}];
export function getAdapter(game:string){if(game!=='osrs')throw new Error('This game adapter is not available yet.');return {parse:(raw:unknown)=>importSchema.parse(raw),analyze};}
