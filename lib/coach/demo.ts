import { analyze, type FightEvent } from './engine';
export const demoEvents:FightEvent[]=[];
for(let i=0;i<=120;i++){const t=+(i*.6).toFixed(1);let hp=99;if(t>10)hp=76;if(t>18)hp=62;if(t>25)hp=85;if(t>34)hp=64;if(t>45)hp=35;if(t>48)hp=60;if(t>57)hp=51;if(t>62)hp=32;if(t>65)hp=28;if(t>=69)hp=0;demoEvents.push({t,kind:'snapshot',hp,maxHp:99,prayerPoints:Math.max(0,70-Math.floor(t/2)),source:'synthetic'});}
demoEvents.push({t:18.6,kind:'incoming',style:'magic',protection:'ranged',amount:14,source:'synthetic'},{t:25.2,kind:'heal',amount:23,source:'synthetic'},{t:35.4,kind:'outgoing',style:'ranged',opponentProtection:'ranged',source:'synthetic'},{t:48.6,kind:'heal',amount:25,source:'synthetic'},{t:69,kind:'death',source:'synthetic'});demoEvents.sort((a,b)=>a.t-b.t);
export const demoSession={id:'demo',title:'A fight worth learning from',game:'osrs',mode:'LMS',outcome:'loss',duration:72,events:demoEvents,review:analyze(demoEvents),parts:[],notes:'',createdAt:'',ai:null,demo:true};
