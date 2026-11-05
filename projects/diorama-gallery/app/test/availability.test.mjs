import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {unavailableMarkup} from '../src/availability.js';
test('fallback explicitly distinguishes unavailable preview from rendered result',()=>{
 const html=unavailableMarkup(true);
 assert.match(html,/3D 미리보기 사용 불가/);assert.match(html,/WebGL 2/);assert.match(html,/실제 장면이 렌더링되지 않았습니다/);assert.doesNotMatch(html,/<img|<canvas/);
});
test('viewer fallback explains supported next action without quality claim',()=>{
 assert.match(unavailableMarkup(false),/이 브라우저에서는 장면을 표시할 수 없어요/);
 assert.match(unavailableMarkup(false),/지원하는 브라우저/);
});

test('multi-world gallery shell does not identify every city as the harbor',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.match(html,/<title>Small Worlds — Interactive Dioramas<\/title>/);
 assert.doesNotMatch(html,/Harbor in a box|miniature harbor/i);
});
