import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, writeFile, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const run=args=>spawnSync(process.execPath,['scripts/check.mjs',...args],{encoding:'utf8'});
test('baseline CLI fits the deadline and overrun exits 1',()=>{
  const base=run(['examples/workshop.json']); assert.equal(base.status,0);
  assert.equal(JSON.parse(base.stdout).remainingMinutes,10);
  const scenario=run(['examples/overrun.json']); assert.equal(scenario.status,1);
  const report=JSON.parse(scenario.stdout);
  assert.equal(report.finish,'11:05'); assert.equal(report.baselineFinish,'10:50'); assert.equal(report.remainingMinutes,-5);
});
test('CLI CSV matches checked-in scenario example',async()=>{
  const output=run(['examples/overrun.json','--csv']);
  assert.equal(output.status,1);
  assert.equal(output.stdout,await readFile('examples/overrun.csv','utf8'));
});
test('CLI rejects invalid arguments, malformed, oversized, and unreadable files',async()=>{
  assert.equal(run([]).status,2); assert.equal(run(['examples/workshop.json','--unknown']).status,2);
  const dir=await mkdtemp(join(tmpdir(),'runloom-test-'));
  try {
    const path=join(dir,'invalid.json'); await writeFile(path,'{private-sentinel');
    const invalid=run([path]); assert.equal(invalid.status,2); assert.equal(invalid.stderr.includes('private-sentinel'),false); assert.equal(invalid.stderr.includes(dir),false);
    await writeFile(path,'x'.repeat(400001)); assert.equal(run([path]).status,2);
    assert.equal(run([join(dir,'missing.json')]).status,2);
  } finally {
    // mkdtemp returned this exact test-owned directory under the system temp root.
    await rm(dir,{recursive:true,force:true});
  }
});
