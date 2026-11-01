import test from 'node:test';
import assert from 'node:assert/strict';
import {chars,score,badges} from '../lib/scoring.ts';
test('Five-character word convention and net scoring',()=>{const s=score('hello world','hello worlx',60,12,2);assert.equal(s.raw,2.2);assert.equal(s.wpm,2);assert.equal(s.errors,1);assert.equal(s.corrected,1);assert.equal(s.accuracy,1000/11);assert.ok(Math.abs(s.firstAccuracy-1000/12)<1e-10)});
test('Unicode graphemes count visible characters',()=>{assert.equal(chars('e\u0301🙂').length,2);assert.equal(score('e\u0301🙂','e\u0301🙂',60).wpm,.4)});
test('No typed characters has zero speed',()=>{assert.equal(score('hello','',1).wpm,0);assert.equal(score('hello','',1).accuracy,100)});
test('Corrected errors remain in first-attempt accuracy',()=>{const s=score('hello','hello',30,6,1);assert.equal(s.accuracy,100);assert.ok(Math.abs(s.firstAccuracy-500/6)<1e-10);assert.equal(s.corrected,1)});
test('Error categories cover punctuation, numbers, case and spaces',()=>{const s=score('A 1!','aX2?',60);assert.deepEqual(s.mistakes.map(m=>m.kind),['Capitalization','Spacing','Number','Punctuation'])});
test('High-speed badges require a meaningful sample duration',()=>{assert.equal(badges([{finished:1,wpm:80,elapsed:3,typed:'abc',accuracy:100}])[3].earned,false);assert.equal(badges([{finished:1,wpm:55,elapsed:60,typed:'a'.repeat(200),accuracy:99}])[3].earned,true)});
