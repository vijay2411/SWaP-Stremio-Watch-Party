import test from 'node:test';
import assert from 'node:assert/strict';
import { ChatScroll } from '../src/chat-scroll.js';

function fixture() {
  const frames=[];let resize;
  const oldRAF=globalThis.requestAnimationFrame,oldObserver=globalThis.ResizeObserver;
  globalThis.requestAnimationFrame=f=>frames.push(f);
  globalThis.ResizeObserver=class {constructor(f){resize=f;}observe(){}};
  const area=Object.assign(new EventTarget(),{scrollTop:100,clientHeight:100,scrollHeight:200});
  const outer=Object.assign(new EventTarget(),{scrollTop:200,clientHeight:200,scrollHeight:400});
  const jump={hidden:true},content={querySelector:()=>({})};
  const scroll=new ChatScroll(area,content,jump,outer);
  return {area,outer,jump,scroll,resize:()=>resize(),flush:()=>{while(frames.length)frames.shift()();},restore:()=>{globalThis.requestAnimationFrame=oldRAF;globalThis.ResizeObserver=oldObserver;}};
}
test('chat follows new messages after rendering and after a layout resize',()=>{
  const f=fixture();try {
    f.area.scrollHeight=400;f.scroll.added();assert.equal(f.area.scrollTop,100);f.flush();assert.equal(f.area.scrollTop,400);
    f.area.scrollHeight=600;f.resize();f.flush();assert.equal(f.area.scrollTop,600);
  }finally{f.restore();}
});
test('reading history preserves scroll and exposes a jump-to-latest button',()=>{
  const f=fixture();try {
    f.area.scrollTop=0;f.area.dispatchEvent(new Event('scroll'));f.area.scrollHeight=400;f.scroll.added();f.flush();
    assert.equal(f.area.scrollTop,0);assert.equal(f.jump.hidden,false);
    f.jump.onclick();f.flush();assert.equal(f.area.scrollTop,400);assert.equal(f.jump.hidden,true);
  }finally{f.restore();}
});
test('hidden-panel messages scroll when reopened; own messages resume following',()=>{
  const f=fixture();try {
    f.area.clientHeight=0;f.area.scrollHeight=400;f.scroll.added();f.flush();assert.equal(f.area.scrollTop,100);
    f.area.clientHeight=100;f.scroll.bottom();f.flush();assert.equal(f.area.scrollTop,400);
    f.area.scrollTop=0;f.area.dispatchEvent(new Event('scroll'));f.scroll.added(true);f.flush();assert.equal(f.area.scrollTop,400);
  }finally{f.restore();}
});
