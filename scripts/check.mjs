import { open } from 'node:fs/promises';
import { readProject, scheduleCsv } from '../src/files.mjs';
import { schedule, clockLabel, MAX_FILE_CHARS } from '../src/core.mjs';
const args=process.argv.slice(2);
if(args.length<1 || args.length>2 || (args.length===2 && args[1]!=='--csv')) {
  console.error('Usage: node scripts/check.mjs <runloom-project.json> [--csv]'); process.exitCode=2;
} else {
  let handle;
  try {
    handle=await open(args[0],'r');
    const buffer=Buffer.alloc(MAX_FILE_CHARS*4+1); let size=0;
    while(size<buffer.length) {const {bytesRead}=await handle.read(buffer,size,buffer.length-size,null);if(!bytesRead) break;size+=bytesRead;}
    if(size===buffer.length) throw new Error('File too large.');
    const project=readProject(buffer.subarray(0,size).toString('utf8'));
    const result=schedule(project);
    if(args[1]==='--csv') process.stdout.write(scheduleCsv(project));
    else console.log(JSON.stringify({title:project.title,finish:clockLabel(result.end),baselineFinish:clockLabel(result.baselineEnd),hardStop:clockLabel(result.deadline),remainingMinutes:result.remaining,extraMinutes:result.extraMinutes,missingOwners:result.missingOwners,rows:result.rows},null,2));
    process.exitCode=result.remaining<0?1:0;
  } catch {
    console.error('Cannot read or validate project. Use a Runloom version 1 JSON file within the documented limits.'); process.exitCode=2;
  } finally {if(handle) await handle.close();}
}
