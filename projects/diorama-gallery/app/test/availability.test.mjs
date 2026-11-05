import test from 'node:test';
import assert from 'node:assert/strict';
import {unavailableMarkup} from '../src/availability.js';
test('fallback explicitly distinguishes unavailable preview from rendered result',()=>{
 const html=unavailableMarkup(true);
 assert.match(html,/3D 미리보기 사용 불가/);assert.match(html,/WebGL 2/);assert.match(html,/실제 장면이 렌더링되지 않았습니다/);assert.doesNotMatch(html,/<img|<canvas/);
});
test('viewer fallback explains supported next action without quality claim',()=>{
 assert.match(unavailableMarkup(false),/이 브라우저에서는 3D 장면을 표시할 수 없어요/);
 assert.match(unavailableMarkup(false),/지원하는 브라우저/);
});
