import test from 'node:test';
import assert from 'node:assert/strict';
import { readProject, writeProject, scheduleCsv } from '../src/files.mjs';
import { exampleProject } from '../src/example.mjs';

test('project JSON round trips including scenario and preserves Unicode cues', () => {
  const project = exampleProject(); project.scenario.extra=12; project.segments[0].cue='Café ☕\nOpen doors';
  assert.deepEqual(readProject(writeProject(project)),project);
  assert.deepEqual(readProject('\uFEFF'+writeProject(project)),project);
});
test('imports reject malformed, unknown version and oversized input with bounded errors', () => {
  for (const source of ['{secret-input', '{}', 'null', '[]', 'x'.repeat(100001)]) assert.throws(()=>readProject(source));
  assert.throws(()=>readProject('{secret-input'),error=>!error.message.includes('secret-input'));
});
test('normalization discards arbitrary imported metadata', () => {
  const project=exampleProject(); project.extra={secret:'not-a-project-field'};
  assert.equal(writeProject(project).includes('not-a-project-field'),false);
});
test('CSV lists both timelines and added minutes', () => {
  const project=exampleProject(); project.scenario.extra=15;
  const csv=scheduleCsv(project);
  assert.match(csv, /"Build something small","session","Speaker","09:25","09:55","09:25","10:10","30","15"/);
  assert.match(csv, /"Room reset","transition","Stage lead","09:55","10:00","10:10","10:15"/);
  assert.equal(csv.split('\r\n').length,8);
});
test('CSV escapes quotes, newlines and formula-like user fields', () => {
  const project=exampleProject(); project.segments[0].title='=1+1'; project.segments[0].owner=' +SUM(A1)'; project.segments[0].cue='Say "hello"\nThen go';
  const csv=scheduleCsv(project);
  assert.ok(csv.includes('"\'=1+1"'));
  assert.ok(csv.includes('"\' +SUM(A1)"'));
  assert.ok(csv.includes('"Say ""hello""\nThen go"'));
});
