import test from 'node:test';
import assert from 'node:assert/strict';
import {analyze,importSchema,getAdapter} from '../lib/coach/engine.ts';
const snap=(t,hp)=>({kind:'snapshot',t,hp,maxHp:99,source:'observed'});
test('sparse observations never invent a death cause',()=>{const r=analyze([{kind:'death',t:10,source:'observed'}]);assert.match(r.summary,/not enough evidence/);assert.equal(r.findings.length,0);});
test('sustained low health creates a conditional review signal',()=>{const r=analyze([snap(0,35),snap(.6,35),snap(1.2,28)]);assert.equal(r.findings.length,1);assert.equal(r.findings[0].confidence,'suggestion');assert.match(r.findings[0].action,/was food available/);});
test('gaps and healing break low-health windows',()=>{assert.equal(analyze([snap(0,35),snap(20,28)]).findings.length,0);assert.equal(analyze([snap(0,35),{kind:'heal',t:.3,source:'observed'},snap(.6,30)]).findings.length,0);});
test('death snapshots are not low-health mistakes',()=>{assert.equal(analyze([snap(0,0),snap(.6,0)]).findings.length,0);});
test('damage alone cannot establish a prayer error',()=>{assert.equal(analyze([{kind:'incoming',t:1,amount:45,source:'observed'}]).findings.length,0);});
test('RuneLite client-state events import without inventing attack or damage causation',()=>{
  const events=[
    {kind:'inventory',t:0,tick:0,items:[{slot:0,id:385,quantity:1}],source:'observed'},
    {kind:'snapshot',t:.6,tick:1,hp:80,maxHp:99,prayerPoints:40,activeProtection:'ranged',targetProtection:'magic',source:'observed'},
    {kind:'prayer',t:.7,tick:1,activeProtection:'magic',source:'observed'},
    {kind:'targetOverhead',t:.75,tick:1,targetProtection:'ranged',source:'observed'},
    {kind:'animation',t:.8,tick:1,actorRole:'target',animationId:1234,source:'observed'},
    {kind:'targetHit',t:1,tick:1,amount:25,source:'observed'},
    {kind:'selfHit',t:1.1,tick:1,amount:18,source:'observed'}
  ];
  const imported=importSchema.parse({version:1,game:'osrs',title:'Tick review',duration:2,events});
  assert.equal(imported.events.length,events.length);
  assert.equal(analyze(imported.events).findings.length,0);
});
test('explicit attacks into matching overhead are review candidates, not proven mistakes',()=>{const r=analyze([{kind:'outgoing',t:1,style:'ranged',opponentProtection:'ranged',source:'manual'}]);assert.equal(r.findings[0].severity,'review');assert.match(r.findings[0].action,/intentional pressure/);});
test('invalid times and unsupported adapters are rejected',()=>{assert.throws(()=>importSchema.parse({version:1,game:'osrs',title:'Test',duration:2,events:[snap(5,30)]}));assert.throws(()=>getAdapter('minecraft'));});
test('input remains immutable and unsorted events are interpreted chronologically',()=>{const events=[snap(1.2,30),snap(0,35),snap(.6,35)];const before=JSON.stringify(events);const result=analyze(events);assert.equal(result.findings[0].t,0);assert.equal(JSON.stringify(events),before);});
test('zero snapshots do not produce a perfect rating',()=>{const result=analyze([]);assert.ok(!('score' in result));assert.match(result.summary,/does not mean/);});
