import test from 'node:test';
import assert from 'node:assert/strict';
import { chooseStage, viewSpace, WatchLayout } from '../src/layout.js';
function node(parent, classes=[], tagName='DIV', pageContent=false) {
  return {parentElement:parent,classList:classes,tagName,contains:()=>false,getBoundingClientRect:()=>({width:1200,height:800}),querySelector:()=>pageContent?{}:null};
}
test('Stremio resizes the common shell including controls and subtitles, not just its video layer',()=>{
  const body=node(null),shell=node(body,['player-container-AbC']),layer=node(shell,['video-layer-AbC']),video=node(layer,[],'VIDEO');
  const control=node(shell,['control-bar-layer-AbC']);
  const chosen=chooseStage(video,{body,host:{},width:1200,height:800});assert.equal(chosen,shell);assert.equal(control.parentElement,chosen);
});
test('generic page content is not mistaken for a video player shell',()=>{
  const body=node(null),main=node(body,[],'MAIN',true),video=node(main,[],'VIDEO');
  assert.equal(chooseStage(video,{body,host:{},width:1200,height:800}),video);
});
test('fullscreen reserves one common area for video, controls and subtitles',()=>{
  const body=node(null),fullscreen=node(body,['player-container-a']),layer=node(fullscreen,['video-layer-a']),video=node(layer,[],'VIDEO');
  fullscreen.contains=()=>true;
  assert.equal(chooseStage(video,{body,fullscreenElement:fullscreen,host:{},width:1200,height:800}),fullscreen);
});
test('player search selects the fullscreen shell but avoids other overlay ancestors',()=>{
  const body=node(null),fullscreen=node(body,['player-container-a']),video=node(fullscreen,[],'VIDEO');
  assert.equal(chooseStage(video,{body,fullscreenElement:fullscreen,host:{},width:1200,height:800}),fullscreen);
  fullscreen.contains=()=>true;assert.equal(chooseStage(video,{body,host:{},width:1200,height:800}),video);
});
test('leaving fullscreen restores the common shell even if resize fires before fullscreenchange',()=>{
  const body=node(null),shell=node(body,['player-container-a']),layer=node(shell,['video-layer-a']),video=node(layer,[],'VIDEO'),host=node(body);
  for(const el of [body,shell,layer,video,host]){
    el.attributes=new Map();el.setAttribute=(key,value)=>el.attributes.set(key,value);el.removeAttribute=key=>el.attributes.delete(key);
    el.contains=child=>{for(let p=child;p;p=p.parentElement)if(p===el)return true;return false;};
    el.append=child=>{child.parentElement=el;};el.isConnected=true;
  }
  host.dataset={};host.style={setProperty(){}};video.clientWidth=1200;video.clientHeight=800;
  const home={append:el=>{el.parentNode=home;}},compact={append:el=>{el.parentNode=compact;}},section={parentNode:home};
  const els={'compact':{},'call-section':section,'call-home':home,'compact-content':compact};
  const docEvents=new Map(),windowEvents=new Map();
  const doc={body,head:{append(){}},fullscreenElement:null,createElement:()=>({}),querySelectorAll:()=>[video],addEventListener:(name,fn)=>docEvents.set(name,fn)};
  const globals={document:doc,window:{addEventListener:(name,fn)=>windowEvents.set(name,fn)},innerWidth:1200,innerHeight:800};
  const previous=Object.fromEntries(Object.keys(globals).map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
  let layout;
  try{
    for(const [key,value]of Object.entries(globals))Object.defineProperty(globalThis,key,{value,configurable:true});
    layout=new WatchLayout(host,{getElementById:id=>els[id]});layout.set(true,true,false);
    assert.equal(layout.target,shell);
    doc.fullscreenElement=shell;docEvents.get('fullscreenchange')();
    assert.equal(host.parentElement,shell);assert.equal(layout.target,shell);assert.match(layout.style.textContent,/grid-template-columns/);
    doc.fullscreenElement=null;windowEvents.get('resize')();docEvents.get('fullscreenchange')();
    assert.equal(host.parentElement,body);assert.equal(layout.target,shell);assert.ok(shell.attributes.has('data-sidekick-stage'));
    assert.equal(layer.attributes.has('data-sidekick-stage'),false);assert.doesNotMatch(layout.style.textContent,/grid-template-columns/);
  }finally{
    clearInterval(layout?.timer);
    for(const key of Object.keys(globals)){if(previous[key])Object.defineProperty(globalThis,key,previous[key]);else delete globalThis[key];}
  }
});
test('open panels reserve space; minimizing without a call restores the entire movie',()=>{
  assert.deepEqual(viewSpace(true,true,true,1200,800),{strip:false,sidebar:true,drawer:false,top:0,right:370,bottom:0});
  assert.deepEqual(viewSpace(false,true,false,1200,800),{strip:false,sidebar:true,drawer:false,top:0,right:370,bottom:0});
  assert.deepEqual(viewSpace(true,false,false,1200,800),{strip:false,sidebar:false,drawer:false,top:0,right:0,bottom:0});
});
test('narrow windows dock below the movie; minimized calls reserve only the top strip',()=>{
  assert.deepEqual(viewSpace(true,true,true,390,844),{strip:false,sidebar:false,drawer:true,top:0,right:0,bottom:464});
  assert.equal(viewSpace(true,true,false,700,1200).bottom,480);
  assert.deepEqual(viewSpace(true,false,true,390,844),{strip:true,sidebar:false,drawer:false,top:148,right:0,bottom:0});
  assert.equal(viewSpace(true,false,true,1200,800).top,112);
  assert.equal(viewSpace(false,false,true,1200,800).top,0);
});
