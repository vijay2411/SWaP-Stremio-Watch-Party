import test from 'node:test';
import assert from 'node:assert/strict';
import { chooseStage, viewSpace } from '../src/layout.js';
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
test('player search respects fullscreen boundary and does not resize the overlay ancestor',()=>{
  const body=node(null),fullscreen=node(body,['player-container-a']),video=node(fullscreen,[],'VIDEO');
  assert.equal(chooseStage(video,{body,fullscreenElement:fullscreen,host:{},width:1200,height:800}),video);
  fullscreen.contains=()=>true;assert.equal(chooseStage(video,{body,host:{},width:1200,height:800}),video);
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
