import test from 'node:test';
import assert from 'node:assert/strict';
import { QuickReply } from '../src/quick-reply.js';

function fixture() {
  const elements = new Map(), sent = [], notices = []; let succeeds = true, currentNotice = '';
  const root = { getElementById(id) {
    if (!elements.has(id)) elements.set(id, Object.assign(new EventTarget(), {
      value: '', hidden: true, textContent: '', dataset: {}, attributes: {},
      setAttribute(name, value) { this.attributes[name] = value; }, focus() { root.focused = id; }
    }));
    return elements.get(id);
  } };
  const controller = new QuickReply(root, text => { sent.push(text); if (succeeds instanceof Error) throw succeeds; return succeeds; }, (text, expected) => { if (expected && currentNotice !== expected) return; currentNotice = text; notices.push(text); });
  const $ = id => root.getElementById(id);
  const type = (id, text) => { $(id).value=text; $(id).dispatchEvent(new Event('input')); };
  const submit = (id='quick-form') => $(id).onsubmit({preventDefault(){}});
  return { controller, root, $, type, submit, sent, notices, result: value => succeeds=value, currentNotice: () => currentNotice, notice: text => currentNotice=text };
}
function key(element, extra = {}) {
  const event = Object.assign(new Event('keydown',{cancelable:true}),{key:'Enter',...extra}); element.dispatchEvent(event); return event;
}
test('quick reply is available only in a minimized active room and sends without closing',()=>{
  const f=fixture();f.controller.open();assert.equal(f.controller.isOpen,false);
  f.controller.setAvailable(true);f.$('quick-toggle').onclick();
  assert.equal(f.controller.isOpen,true);assert.equal(f.root.focused,'quick-input');assert.equal(f.$('quick-toggle').attributes['aria-expanded'],'true');
  f.type('quick-input','  Hello room  ');f.submit();assert.deepEqual(f.sent,['Hello room']);
  assert.equal(f.$('quick-input').value,'');assert.equal(f.$('chat-input').value,'');assert.equal(f.$('quick-status').textContent,'Sent');assert.equal(f.controller.isOpen,true);
});
test('both composers share one draft across closing, reopening and sidebar changes',()=>{
  const f=fixture();f.controller.setAvailable(true);f.controller.open();f.type('quick-input','Keep this draft');
  f.controller.close(true);assert.equal(f.root.focused,'quick-toggle');assert.equal(f.$('chat-input').value,'Keep this draft');
  f.controller.setAvailable(false);f.type('chat-input','Edited in sidebar');f.controller.setAvailable(true);f.controller.open();
  assert.equal(f.$('quick-input').value,'Edited in sidebar');f.submit('chat-form');assert.equal(f.$('quick-input').value,'');
});
test('rejected or throwing sends keep the draft and show an error beside the composer',()=>{
  const f=fixture();f.controller.setAvailable(true);f.controller.open();f.type('quick-input','Do not lose this');
  for(const result of [false,new Error('disconnected')]){f.result(result);f.submit();assert.equal(f.$('quick-input').value,'Do not lose this');assert.equal(f.$('chat-input').value,'Do not lose this');assert.equal(f.$('quick-status').dataset.error,'true');assert.equal(f.$('quick-status').hidden,false);}
  f.result(true);f.submit();assert.equal(f.$('quick-input').value,'');assert.equal(f.$('quick-status').dataset.error,'false');
});
test('sidebar send failures still surface in the sidebar and retain the shared draft',()=>{
  const f=fixture();f.result(false);f.type('chat-input','Retry');f.submit('chat-form');
  assert.equal(f.notices.length,1);assert.equal(f.$('quick-input').value,'Retry');
});
test('blank messages, hidden forms and IME confirmation never accidentally submit',()=>{
  const f=fixture();f.type('quick-input','Hidden');f.submit();assert.equal(f.sent.length,0);
  f.controller.setAvailable(true);f.controller.open();f.type('quick-input','   ');f.submit();assert.equal(f.sent.length,0);
  f.type('quick-input','こんにちは');f.$('quick-input').dispatchEvent(new Event('compositionstart'));
  assert.ok(key(f.$('quick-input'),{isComposing:true}).defaultPrevented);f.submit();assert.equal(f.sent.length,0);
  f.$('quick-input').dispatchEvent(new Event('compositionend'));assert.ok(key(f.$('quick-input'),{repeat:true}).defaultPrevented);
  assert.ok(key(f.$('quick-input'),{keyCode:229}).defaultPrevented);
  assert.equal(key(f.$('quick-input')).defaultPrevented,false);f.submit();assert.deepEqual(f.sent,['こんにちは']);
});
test('notification context is literal text and never replaces an in-progress reply',()=>{
  const f=fixture();f.controller.setAvailable(true);f.controller.open();f.type('quick-input','My reply');
  f.controller.open({name:'<b>Alice</b>',text:'<img src=x> Hello'});
  assert.equal(f.$('quick-context').textContent,'<b>Alice</b>: <img src=x> Hello');assert.equal(f.$('quick-input').value,'My reply');
  f.controller.close();assert.equal(f.$('quick-context').hidden,true);assert.equal(f.$('quick-input').value,'My reply');
});
test('leaving resets shared drafts and disables quick sending in a later room',()=>{
  const f=fixture();f.controller.setAvailable(true);f.controller.open();f.type('quick-input','Old room draft');f.controller.reset();
  assert.equal(f.controller.isOpen,false);assert.equal(f.$('quick-toggle').hidden,true);assert.equal(f.$('quick-input').value,'');assert.equal(f.$('chat-input').value,'');
  f.type('quick-input','Late submit');f.submit();assert.equal(f.sent.length,0);
});

test('successful retry clears only its own stale sidebar send error',()=>{
  for(const useQuick of [false,true]){
    const f=fixture();f.result(false);f.type('chat-input','Retry this');f.submit('chat-form');
    assert.match(f.currentNotice(),/Message not sent/);
    f.controller.setAvailable(true);f.controller.open();f.result(true);f.submit(useQuick?'quick-form':'chat-form');
    assert.equal(f.currentNotice(),'');assert.equal(f.$('chat-input').value,'');
    f.result(false);f.type('chat-input','Another retry');f.submit('chat-form');
    f.notice('Your browser is blocking call audio.');f.result(true);f.submit('chat-form');
    assert.equal(f.currentNotice(),'Your browser is blocking call audio.');
  }
});
