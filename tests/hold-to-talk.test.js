import test from 'node:test';
import assert from 'node:assert/strict';
import { HoldToTalk, validTalkKey } from '../src/hold-to-talk.js';
function setup() {
  const win=new EventTarget(),doc=Object.assign(new EventTarget(),{hidden:false}),states=[];let blocked=false;
  const hold=new HoldToTalk(active=>states.push(active),{win,doc,blocked:()=>blocked});hold.setEnabled(true);
  return {win,doc,states,hold,block:()=>blocked=true,active:()=>states.at(-1)};
}
function key(type, value='v', options={}) {
  const e=new Event(type,{cancelable:true});Object.assign(e,{key:value,code:'Key'+value.toUpperCase(),repeat:false,...options});
  e.composedPath=()=>options.path || [];return e;
}
test('chosen key opens mic only while held and reserves its events from the player',()=>{
 const f=setup();let playerEvents=0;f.win.addEventListener('keydown',()=>playerEvents++);
 const down=key('keydown');f.win.dispatchEvent(down);assert.equal(f.active(),true);assert.equal(down.defaultPrevented,true);assert.equal(playerEvents,0);
 f.win.dispatchEvent(key('keyup'));assert.equal(f.active(),false);f.hold.close();
});
test('custom key, uppercase typing and physical key release match correctly',()=>{
 const f=setup();assert.equal(f.hold.setKey('B'),true);f.win.dispatchEvent(key('keydown'));assert.equal(f.active(),false);
 f.win.dispatchEvent(key('keydown','B',{code:'KeyB',shiftKey:true}));assert.equal(f.active(),true);
 f.win.dispatchEvent(key('keyup','b',{code:'KeyB'}));assert.equal(f.active(),false);f.hold.close();
});
test('chat, shadow-root fields, selects, text roles and contenteditable never transmit',()=>{
 const f=setup();for(const target of [{tagName:'INPUT'},{tagName:'TEXTAREA'},{tagName:'SELECT'},{isContentEditable:true},{getAttribute:()=> 'textbox'}]) {
  const e=key('keydown','v',{path:[target,{tagName:'DIV'}]});f.win.dispatchEvent(e);assert.equal(f.active(),false);assert.equal(e.defaultPrevented,false);
 }
 f.hold.close();
});
test('browser shortcuts, IME composition and repeated keys after a blur do not unmute',()=>{
 const f=setup();for(const flags of [{ctrlKey:true},{metaKey:true},{altKey:true},{isComposing:true},{keyCode:229},{repeat:true}]) {
  const e=key('keydown','v',flags);f.win.dispatchEvent(e);assert.equal(f.active(),false);assert.equal(e.defaultPrevented,false);
 }
 f.win.dispatchEvent(key('keydown'));f.win.dispatchEvent(new Event('blur'));assert.equal(f.active(),false);
 f.win.dispatchEvent(key('keydown','v',{repeat:true}));assert.equal(f.active(),false);f.hold.close();
});
test('focus loss, tab hiding, editable focus and leaving always release the mic',()=>{
 const f=setup();for(const release of [()=>f.win.dispatchEvent(new Event('blur')),()=>{f.doc.hidden=true;f.doc.dispatchEvent(new Event('visibilitychange'));f.doc.hidden=false;},()=>{const e=new Event('focusin');e.composedPath=()=>[{tagName:'INPUT'}];f.doc.dispatchEvent(e);},()=>f.win.dispatchEvent(new Event('pagehide'))]) {
  f.win.dispatchEvent(key('keydown'));assert.equal(f.active(),true);release();assert.equal(f.active(),false);
 }
 f.win.dispatchEvent(key('keydown'));f.hold.setEnabled(false);assert.equal(f.active(),false);f.hold.close();
});
test('button and shortcut holds coexist and releasing one does not strand the other',()=>{
 const f=setup();f.hold.hold('pointer',true);f.win.dispatchEvent(key('keydown'));f.win.dispatchEvent(key('keyup'));assert.equal(f.active(),true);
 f.hold.hold('pointer',false);assert.equal(f.active(),false);f.hold.close();
});
test('changing keys, disabling shortcut or opening a dialog cannot leave transmission active',()=>{
 const f=setup();f.win.dispatchEvent(key('keydown'));f.hold.setKey('B');assert.equal(f.active(),false);
 f.hold.setKey('');f.win.dispatchEvent(key('keydown','b'));assert.equal(f.active(),false);
 f.hold.setKey('V');f.block();f.win.dispatchEvent(key('keydown'));assert.equal(f.active(),false);f.hold.hold('pointer',true);assert.equal(f.active(),false);f.hold.close();
 for(const value of ['VV','v','Shift',' ','<',null])assert.equal(validTalkKey(value),false);
});
test('open-mic mode and closed controllers do not consume Stremio keys',()=>{
 const f=setup();f.hold.setEnabled(false);const e=key('keydown');f.win.dispatchEvent(e);assert.equal(e.defaultPrevented,false);assert.equal(f.active(),false);
 f.hold.close();const end=key('keydown');f.win.dispatchEvent(end);assert.equal(end.defaultPrevented,false);
});
