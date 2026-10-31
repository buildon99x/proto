import test from 'node:test';
import assert from 'node:assert/strict';
import {COAT_PALETTES,coatColor,coatPixels} from './coat.js';
test('six coat maps contain flat surface color only with opaque bounded pixels',()=>{assert.equal(COAT_PALETTES.length,6);for(let skin=0;skin<6;skin++)for(const part of ['body','head']){const p=coatPixels(skin,part,32,16);assert.equal(p.length,32*16*4);assert.ok(p.every((n,i)=>i%4!==3||n===255));}});
test('tabby back has alternating color while belly and face stay clean',()=>{const palette=COAT_PALETTES[3];assert.equal(coatColor(3,'body',0,-1,0),palette.base);assert.equal(coatColor(3,'body',0,.8,.12),palette.patch);assert.equal(coatColor(3,'body',0,.8,.4),palette.base);assert.equal(coatColor(3,'head',0,0,-1),palette.base);});
test('coat generation is deterministic and a calico uses three colors',()=>{assert.deepEqual(coatPixels(1,'body',32,16),coatPixels(1,'body',32,16));const p=coatPixels(1,'body',64,32),colors=new Set();for(let i=0;i<p.length;i+=4)colors.add((p[i]<<16)|(p[i+1]<<8)|p[i+2]);assert.equal(colors.size,3);});
