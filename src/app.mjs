import { schedule, clockLabel, MAX_SEGMENTS, MAX_FILE_CHARS, KINDS } from './core.mjs';
import { readProject, writeProject, scheduleCsv } from './files.mjs';
import { exampleProject } from './example.mjs';
const $ = id => document.getElementById(id);
let project = exampleProject();
let current = null;
let revision = 0;
const element = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};
function announce(text, error = false) {
  $('message').textContent = text;
  $('message').classList.toggle('error', error);
}
function field(label, value, key, type = 'text', maxLength) {
  const wrapper = element('label', key === 'cue' ? 'wide' : '');
  wrapper.append(document.createTextNode(label));
  const input = element(key === 'cue' ? 'textarea' : 'input');
  if (input.tagName === 'INPUT') input.type = type;
  if (maxLength) input.maxLength = maxLength;
  input.value = value;
  input.dataset.field = key;
  if (key === 'minutes') { input.min = '1'; input.max = '240'; input.step = '1'; }
  if (key === 'title') input.className = 'name';
  wrapper.append(input);
  return wrapper;
}
function renderEditors(focusId, focusAction = 'up') {
  $('segments').replaceChildren();
  project.segments.forEach((segment, index) => {
    const card = element('article', 'segment');
    card.dataset.id = segment.id;
    card.setAttribute('aria-label', `Segment ${index + 1}`);
    const top = element('div', 'segment-top');
    top.append(element('span', 'segment-index', String(index + 1).padStart(2, '0')));
    const actions = element('div', 'row-actions');
    for (const [action, label, disabled] of [['up','↑ Move up',index === 0],['down','↓ Move down',index === project.segments.length-1],['remove','Remove',project.segments.length === 1]]) {
      const button = element('button', '', label);
      button.dataset.action = action;
      button.setAttribute('aria-label', `${label} segment ${index + 1}`);
      button.disabled = disabled;
      actions.append(button);
    }
    top.append(actions);
    const fields = element('div', 'segment-fields');
    fields.append(field('Segment name',segment.title,'title','text',80),field('Minutes',segment.minutes,'minutes','number'));
    const secondary = element('div','secondary-fields');
    secondary.append(field('Owner / role',segment.owner,'owner','text',60));
    const typeLabel=element('label','','Type');
    const select=element('select'); select.dataset.field='kind';
    for (const kind of KINDS) { const option=element('option','',kind[0].toUpperCase()+kind.slice(1)); option.value=kind; select.append(option); }
    select.value=segment.kind; typeLabel.append(select); secondary.append(typeLabel);
    fields.append(secondary,field('Cue / handoff note',segment.cue,'cue','text',240));
    card.append(top,fields); $('segments').append(card);
    if (segment.id === focusId) {
      const control = actions.querySelector(`[data-action="${focusAction}"]`);
      if (control && !control.disabled) control.focus();
      else fields.querySelector('input').focus();
    }
  });
  $('segment-count').textContent=`${project.segments.length} / ${MAX_SEGMENTS}`;
  $('add').disabled=project.segments.length >= MAX_SEGMENTS;
  syncScenario();
}
function preview() {
  $('export-preview').value=current ? ($('export-type').value === 'json' ? writeProject(project) : scheduleCsv(project)) : '';
}
function renderOverview() {
  $('summary').replaceChildren(); $('timeline').replaceChildren();
  try {
    current=schedule(project);
    document.body.classList.remove('invalid');
    $('print').disabled=false;
    $('print-title').textContent=current.project.title;
    $('print-context').textContent=`${clockLabel(current.start)} start · ${clockLabel(current.deadline)} hard stop · ${current.extraMinutes ? `Scenario: +${current.extraMinutes} min at ${project.segments.find(segment=>segment.id===project.scenario.segmentId).title}` : 'Baseline schedule'} · Local wall-clock times`;
    for (const option of $('scenario-segment').options) {
      const segment=project.segments.find(segment=>segment.id===option.value);
      if(segment) option.textContent=segment.title;
    }
    const main=element('div',`summary-main${current.remaining < 0 ? ' over' : ''}`);
    main.append(element('span','',current.remaining < 0 ? 'Past the hard stop' : 'Room before the hard stop'));
    const remaining=element('div','remaining',`${Math.abs(current.remaining)} `);
    remaining.append(element('small','',current.remaining < 0 ? 'min over' : 'min spare'));
    main.append(remaining,element('p','',`Projected finish ${clockLabel(current.end)} · Hard stop ${clockLabel(current.deadline)}`));
    const stats=element('div','summary-stats');
    for (const [value,label] of [[`${current.projectedMinutes}m`,'Total runtime'],[`${current.breakMinutes}m`,'Planned breaks'],[`${current.extraMinutes}m`,'Added overrun']]) {
      const block=element('div'); block.append(element('strong','',value),element('span','',label)); stats.append(block);
    }
    $('summary').append(main,stats);
    if(current.missingOwners) $('summary').append(element('p','owner-note',`${current.missingOwners} segment(s) have no owner assigned.`));
    for(const row of current.rows) {
      const li=element('li',`timing-row ${row.kind}`);
      const times=element('div','time-line',`${clockLabel(row.start)} → ${clockLabel(row.end)}`);
      times.append(element('span','duration',`${row.minutes + row.extra} min · ${row.kind}`));
      li.append(times,element('h4','',row.title));
      if(row.drift || row.extra) li.append(element('div','baseline',`Baseline ${clockLabel(row.baselineStart)} → ${clockLabel(row.baselineEnd)}${row.extra ? ` · +${row.extra} min here` : ''}`));
      li.append(element('p','',row.owner.trim() || 'Owner not assigned'));
      if(row.cue.trim()) li.append(element('p','',row.cue));
      $('timeline').append(li);
    }
    $('timeline-panel').hidden=false;
    $('save').disabled=false; $('csv').disabled=false;
    preview();
    return true;
  } catch(error) {
    current=null; $('timeline-panel').hidden=true; $('save').disabled=true; $('csv').disabled=true;
    document.body.classList.add('invalid'); $('print').disabled=true;
    $('export-preview').value='';
    $('summary').append(element('p','help', 'Timing is unavailable until the input is valid.'));
    announce(error.message,true);
    return false;
  }
}
function changed() {
  revision++;
  if(renderOverview()) announce('Timing updated. Download a project to keep your changes.');
}
function loadProject(next,message) {
  revision++; project=next;
  for(const key of ['title','start','stop']) $(key).value=project[key];
  renderEditors(); renderOverview(); announce(message);
}

function installScenario() {
  const section=element('section','scenario');
  section.setAttribute('aria-labelledby','scenario-heading');
  const heading=element('h3','','What if a segment runs long?'); heading.id='scenario-heading';
  const intro=element('p','','Add minutes to one segment and see the downstream effect. Your planned durations stay intact.');
  const fields=element('div','scenario-fields');
  const segmentLabel=element('label','','Apply overrun to');
  const select=element('select'); select.id='scenario-segment'; segmentLabel.append(select);
  const extraLabel=element('label','','Extra minutes');
  const extra=element('input'); extra.id='scenario-extra'; extra.type='number'; extra.min='0'; extra.max='120'; extra.step='1'; extra.value='0'; extraLabel.append(extra);
  fields.append(segmentLabel,extraLabel);
  const reset=element('button','subtle','Reset overrun'); reset.id='scenario-reset';
  section.append(heading,intro,fields,reset); $('scenario-slot').append(section);
  select.addEventListener('change',()=>{ project.scenario.segmentId=select.value || null; changed(); });
  extra.addEventListener('input',()=>{project.scenario.extra=Number(extra.value); changed();});
  reset.addEventListener('click',()=>{project.scenario.extra=0; extra.value='0'; changed();});
  const print=element('button','subtle','Print crew sheet / Save PDF'); print.id='print';
  print.addEventListener('click',()=>{if(current) window.print();}); $('print-slot').append(print);
  const printHeader=element('div','print-heading');
  const title=element('h1'); title.id='print-title';
  const context=element('p'); context.id='print-context';
  printHeader.append(element('p','','Runloom / crew sheet'),title,context);
  const warning=element('p','print-warning','Schedule unavailable: resolve invalid inputs before printing.');
  $('summary').parentNode.prepend(printHeader,warning);
}
function syncScenario() {
  const select=$('scenario-segment'); select.replaceChildren();
  const none=element('option','','Choose a segment'); none.value=''; select.append(none);
  for(const segment of project.segments) {const option=element('option','',segment.title); option.value=segment.id; select.append(option);}
  select.value=project.scenario.segmentId ?? '';
  $('scenario-extra').value=project.scenario.extra;
}
function download(content,name,type) {
  if(!current) return;
  const url=URL.createObjectURL(new Blob([content],{type}));
  const link=element('a'); link.href=url; link.download=name; link.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
for(const key of ['title','start','stop']) $(key).addEventListener('input',()=>{project[key]=$(key).value; changed();});
$('segments').addEventListener('input',event=>{
  const control=event.target; const card=control.closest('[data-id]');
  if(!card || !control.dataset.field) return;
  const segment=project.segments.find(item=>item.id===card.dataset.id);
  segment[control.dataset.field]=control.dataset.field === 'minutes' ? Number(control.value) : control.value;
  changed();
});
$('segments').addEventListener('click',event=>{
  const button=event.target.closest('button[data-action]'); if(!button) return;
  const index=project.segments.findIndex(item=>item.id===button.closest('[data-id]').dataset.id);
  const id=project.segments[index].id; const action=button.dataset.action;
  if(action==='remove') {
    if(project.segments.length===1) return;
    project.segments.splice(index,1);
    if(project.scenario.segmentId===id) project.scenario={segmentId:null,extra:0};
  } else {
    const next=index+(action==='up'?-1:1); if(next<0 || next>=project.segments.length) return;
    [project.segments[index],project.segments[next]]=[project.segments[next],project.segments[index]];
  }
  renderEditors(action==='remove' ? project.segments[Math.min(index,project.segments.length-1)].id : id,action);
  changed();
});
$('add').addEventListener('click',()=>{
  if(project.segments.length>=MAX_SEGMENTS) return;
  const id=crypto.randomUUID(); project.segments.push({id,title:'New segment',minutes:5,kind:'session',owner:'',cue:''});
  renderEditors(id); changed();
});
$('example').addEventListener('click',()=>loadProject(exampleProject(),'Example restored. Existing downloaded files are unchanged.'));
$('new').addEventListener('click',()=>loadProject({version:1,title:'Untitled event',start:'09:00',stop:'10:00',segments:[{id:crypto.randomUUID(),title:'Welcome',minutes:10,kind:'session',owner:'',cue:''}],scenario:{segmentId:null,extra:0}},'New rundown created. Save a project file to keep it.'));
$('save').addEventListener('click',()=>download(writeProject(project),'runloom-project.json','application/json'));
$('csv').addEventListener('click',()=>download(scheduleCsv(project),'runloom-timing.csv','text/csv;charset=utf-8'));
$('export-type').addEventListener('change',preview);
$('open').addEventListener('change',async event=>{
  const file=event.target.files[0]; if(!file) return;
  const token=++revision;
  try {
    if(file.size>MAX_FILE_CHARS*4) throw new Error('Project is too large. Use a Runloom project under 100,000 characters.');
    const source=await file.text(); if(token!==revision) return;
    const next=readProject(source); loadProject(next,'Project opened locally. No data was uploaded.');
  } catch(error) { if(token===revision) announce(`Project not opened: ${error.message}`,true); }
  finally { event.target.value=''; }
});
installScenario();
loadProject(project,'Example loaded. Edit any segment to make it your own.');
