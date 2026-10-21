import test from 'node:test';
import assert from 'node:assert/strict';
import { schedule, validateProject, clockLabel, clockMinutes } from '../src/core.mjs';
import { exampleProject } from '../src/example.mjs';

test('baseline sample cascades exactly and leaves ten minutes', () => {
  const result = schedule(exampleProject());
  assert.deepEqual(result.rows.map(row => [row.start, row.end]), [[540,555],[555,565],[565,595],[595,600],[600,635],[635,650]]);
  assert.equal(result.remaining, 10);
  assert.equal(result.plannedMinutes, 110);
  assert.equal(result.breakMinutes, 15);
});
test('overrun changes selected duration and downstream starts without mutating baseline', () => {
  const input = exampleProject(); input.scenario.extra = 15;
  const before = structuredClone(input);
  const result = schedule(input);
  assert.equal(result.rows[2].extra, 15);
  assert.equal(result.rows[2].drift, 0);
  assert.equal(result.rows[3].drift, 15);
  assert.equal(result.end, 665);
  assert.equal(result.baselineEnd, 650);
  assert.equal(result.remaining, -5);
  assert.deepEqual(input, before);
});
test('hard stop before start is next day and labels roll across midnight', () => {
  const input = exampleProject(); input.start = '23:30'; input.stop = '01:30';
  const result = schedule(input);
  assert.equal(result.deadline, 1530);
  assert.equal(clockLabel(result.end), '01:20 (+1d)');
  assert.equal(result.remaining, 10);
});
test('clock validation rejects ambiguous and out of range times', () => {
  for (const value of ['9:00','24:00','12:60','-1:00','09:00:00',null]) assert.throws(() => clockMinutes(value));
  assert.equal(clockMinutes('00:00'), 0);
  assert.throws(() => clockLabel(-1));
});
test('rejects invalid duration, duplicate IDs, missing scenario and equal start/stop', () => {
  const invalid = [p => {p.segments[0].minutes=0;},p=>{p.segments[0].minutes=1.5;},p=>{p.segments[1].id=p.segments[0].id;},p=>{p.scenario.segmentId='unknown';},p=>{p.scenario.extra=121;},p=>{p.stop=p.start;},p=>{p.segments=[];}];
  for (const mutate of invalid) { const input=exampleProject(); mutate(input); assert.throws(()=>schedule(input)); }
});
test('normalizes imported fields and counts unowned segments', () => {
  const input=exampleProject(); input.unknown='discard'; input.segments[0].owner=' '; input.segments[0].extra='discard';
  const result=schedule(input);
  assert.equal(result.missingOwners,1);
  assert.equal('unknown' in result.project,false);
  assert.equal('extra' in result.project.segments[0],false);
});
test('bounds project size and rejects unsupported control characters', () => {
  const input=exampleProject(); input.segments[0].cue='a\u0000b'; assert.throws(()=>validateProject(input));
  input.segments[0].cue='ok'; input.title='x'.repeat(81); assert.throws(()=>validateProject(input));
  input.title='ok'; input.segments=Array.from({length:61},(_,i)=>({...input.segments[0],id:`s${i}`})); assert.throws(()=>validateProject(input));
});
