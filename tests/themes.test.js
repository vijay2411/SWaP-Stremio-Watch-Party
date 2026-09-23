import test from 'node:test';
import assert from 'node:assert/strict';
import { THEMES, themeStyles, readTheme, writeTheme, normalizeTheme, readMode, writeMode, DEFAULT_THEME, DEFAULT_MODE } from '../src/themes.js';
const denied = () => { throw new Error('Storage unavailable'); };
const luminance = hex => {
 const c=hex.slice(1).match(/../g).map(s=>parseInt(s,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
 return c[0]*.2126+c[1]*.7152+c[2]*.0722;
};
const contrast=(a,b)=>{const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};

test('missing, removed or invalid saved choices fall back without preventing startup',()=>{
 for(const value of [undefined,null,'','removed-theme','<script>','__proto__'])assert.equal(readTheme(()=>value),DEFAULT_THEME);
 assert.equal(readTheme(denied),DEFAULT_THEME);assert.equal(readMode(denied),DEFAULT_MODE);
 assert.equal(readMode(()=> 'not-a-mode'),'dark');assert.equal(readMode(()=> 'light'),'light');
});
test('theme and mode persist independently and storage failure does not throw',()=>{
 const choice=THEMES.find(t=>t.id!==DEFAULT_THEME)?.id??DEFAULT_THEME;
 let theme=DEFAULT_THEME,mode='dark';assert.equal(writeTheme(choice,id=>theme=id),true);
 assert.equal(writeMode('light',id=>mode=id),true);assert.equal(readTheme(()=>theme),choice);assert.equal(readMode(()=>mode),'light');
 writeTheme(DEFAULT_THEME,id=>theme=id);assert.equal(mode,'light');assert.equal(theme,DEFAULT_THEME);
 assert.equal(writeTheme('minimalism',denied),false);assert.equal(writeMode('dark',denied),false);
});
test('all theme palettes keep main text, muted text, actions and warnings readable',()=>{
 assert.equal(new Set(THEMES.map(t=>t.id)).size,THEMES.length);
 assert.ok(THEMES.some(t=>t.id===DEFAULT_THEME));
 for(const theme of THEMES)for(const mode of ['light','dark']){
  const p=theme.palettes[mode];assert.ok(p,`${theme.id} ${mode}`);
  for(const [fg,bg] of [['text','panel'],['muted','panel'],['text','surface'],['muted','surface'],['accent','panel'],['onAccent','accent'],['danger','panel']]){
   const ratio=contrast(p[fg],p[bg]);assert.ok(ratio>=4.5,`${theme.id} ${mode} ${fg}/${bg}: ${ratio.toFixed(2)}`);
  }
 }
});
test('theme styles remain scoped and optional modules can be removed without changing a fallback',()=>{
 const optional={...THEMES[0],id:'removable-test-theme'};
 const css=themeStyles([...THEMES,optional].filter(t=>t.id!==optional.id));
 assert.ok(!css.includes('data-theme="removable-test-theme"'));assert.ok(css.includes(':host([data-theme="minimalism"][data-mode="light"])'));
 assert.ok(!css.includes('$'));assert.ok(!css.includes('url('));assert.equal(normalizeTheme('minimalism'),'minimalism');
});
