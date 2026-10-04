import test from 'node:test';
import assert from 'node:assert/strict';
import { FoldedPosition } from '../src/folded-position.js';

function fixture(saved=null, blocked=false) {
  const data=new Map(saved===null?[]:[['swap-folded-position',saved]]),frames=[];
  const win=Object.assign(new EventTarget(),{innerWidth:1000,innerHeight:700,requestAnimationFrame:fn=>{frames.push(fn);return frames.length;},sessionStorage:{getItem:key=>{if(blocked)throw Error();return data.get(key)??null;},setItem:(key,value)=>data.set(key,value),removeItem:key=>data.delete(key)}});
  const style=()=>({removeProperty(key){delete this[key];}});
  const bar=Object.assign(new EventTarget(),{hidden:false,dataset:{},style:style(),width:220,height:46,getBoundingClientRect(){const left=parseFloat(this.style.left)||390,top=parseFloat(this.style.top)||630;return {left,top,width:this.width,height:this.height,right:left+this.width,bottom:top+this.height};}});
  const previews=Object.assign(new EventTarget(),{style:style(),getBoundingClientRect:()=>({width:440,height:0})});
  const handle={closest:()=>handle,matches:()=>true,setPointerCapture(){},hasPointerCapture:()=>false};
  const control=new FoldedPosition(bar,previews,{win,doc:new EventTarget()});
  const flush=()=>{while(frames.length)frames.shift()();};flush();
  const event=(type,x=0,y=0,extra={})=>Object.assign(new Event(type,{cancelable:true}),{clientX:x,clientY:y,pointerId:1,button:0,isPrimary:true,...extra});
  const down=(x=420,y=650,target=handle)=>control.down({...event('pointerdown',x,y),clientX:x,clientY:y,pointerId:1,button:0,target,stopPropagation(){}});
  const move=(x,y)=>control.move(event('pointermove',x,y));
  const up=()=>control.up(event('pointerup'));
  return {control,bar,previews,win,data,frames,flush,event,down,move,up,handle};
}
test('normal clicks and small mouse movement are never treated as dragging',()=>{
  const f=fixture();f.down();f.move(423,652);f.up();const click=f.event('click',0,0,{detail:1});f.control.click(click);
  assert.equal(click.defaultPrevented,false);assert.equal(f.control.position,undefined);assert.equal(f.data.size,0);
});
test('a drag moves both controls, saves position and suppresses only its own click',()=>{
  const f=fixture();f.down();f.move(820,150);assert.equal(f.bar.dataset.dragging,'true');f.up();
  assert.equal(f.bar.style.left,'768px');assert.equal(f.bar.style.top,'130px');assert.equal(f.bar.dataset.dragging,undefined);
  const click=f.event('click',0,0,{detail:1});f.control.click(click);assert.equal(click.defaultPrevented,true);assert.equal(f.data.size,1);
  f.down(800,150);f.up();const next=f.event('click',0,0,{detail:1});f.control.click(next);assert.equal(next.defaultPrevented,false);
});
test('dragging to screen edges is clamped and notifications switch below at the top',()=>{
  const f=fixture();f.down();f.move(-500,-500);f.up();assert.equal(f.bar.style.left,'12px');assert.equal(f.bar.style.top,'12px');
  assert.equal(f.previews.style.left,'12px');assert.equal(f.previews.style.top,'66px');assert.equal(f.previews.style.transform,'none');
  f.down(20,20);f.move(2500,2500);f.up();assert.equal(f.bar.style.left,'768px');assert.equal(f.bar.style.top,'642px');assert.equal(f.previews.style.transform,'translateY(-100%)');
});
test('composer growth and viewport resize keep the bar in view without losing its anchor',()=>{
  const f=fixture();f.control.place(760,600);const anchor={...f.control.position};f.bar.width=494;f.control.update();assert.equal(f.bar.style.left,'494px');
  f.win.innerWidth=390;f.win.innerHeight=300;f.bar.width=366;f.control.update();
  assert.equal(f.bar.style.left,'12px');assert.ok(parseFloat(f.bar.style.top)+46<=288);assert.deepEqual(f.control.position,anchor);
  f.win.innerWidth=1000;f.win.innerHeight=700;f.bar.width=220;f.control.update();assert.equal(f.bar.style.left,'760px');
});
test('reply inputs, secondary clicks and a different pointer cannot move the bar',()=>{
  const f=fixture();f.down(420,650,{closest:()=>null});f.move(820,150);assert.equal(f.control.position,undefined);
  f.control.down({target:f.handle,button:2});assert.equal(f.control.drag,undefined);
  f.down();f.control.move(f.event('pointermove',900,100,{pointerId:2}));assert.equal(f.control.position,undefined);f.up();
});
test('hiding or cancelling a drag releases it without blocking keyboard activation',()=>{
  const f=fixture();f.down();f.move(600,200);f.control.up(f.event('pointercancel'));assert.equal(f.control.drag,null);
  const click=f.event('click',0,0,{detail:0});f.control.click(click);assert.equal(click.defaultPrevented,false);
  f.down();f.move(650,220);f.bar.hidden=true;f.control.update();assert.equal(f.control.drag,null);assert.equal(f.bar.dataset.dragging,undefined);
});
test('tab position restores safely; malformed or blocked storage preserves the centered default',()=>{
  const f=fixture(JSON.stringify({x:0.9,y:0.1}));assert.equal(f.bar.style.left,'768px');assert.equal(f.bar.style.top,'47px');
  for(const saved of ['invalid','null','{"x":"0.5","y":0.3}']){const f=fixture(saved);assert.equal(f.control.position,undefined);}
  assert.doesNotThrow(()=>fixture(null,true).control.place(50,50));
});
test('Alt+arrows move the focused bar and Home restores the original CSS position',()=>{
  const f=fixture();let prevented=false;
  const key={target:f.handle,key:'ArrowUp',altKey:true,preventDefault(){prevented=true;},stopPropagation(){}};
  f.control.key(key);assert.equal(f.bar.style.top,'614px');assert.equal(prevented,true);
  f.control.key({...key,key:'Home',altKey:false});f.flush();assert.equal(f.control.position,null);assert.equal(f.data.size,0);assert.equal(f.bar.style.left,undefined);assert.equal(f.bar.style.top,undefined);
});
