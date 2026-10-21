export const MAX_SEGMENTS = 60;
export const MAX_FILE_CHARS = 100000;
export const KINDS = ['session', 'break', 'transition'];

function integer(value, min, max, label) {
  if (!Number.isInteger(value) || value < min || value > max) throw new Error(`${label} must be a whole number from ${min} to ${max}.`);
}
function text(value, max, label, required = false) {
  if (typeof value !== 'string' || value.length > max || (required && !value.trim())) throw new Error(`${label} must be ${required ? 'non-empty ' : ''}text of at most ${max} characters.`);
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)) throw new Error(`${label} contains unsupported control characters.`);
}
export function clockMinutes(value) {
  if (typeof value !== 'string' || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value)) throw new Error('Use a 24-hour clock time such as 09:00.');
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}
export function clockLabel(value) {
  integer(value, 0, 5000, 'Clock minutes');
  const day = Math.floor(value / 1440);
  const minute = value % 1440;
  return `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}${day ? ` (+${day}d)` : ''}`;
}

// Return a normalized allowlisted object; imported metadata never enters the app.
export function validateProject(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input) || input.version !== 1) throw new Error('Use a Runloom version 1 project.');
  text(input.title, 80, 'Event name', true);
  const start = clockMinutes(input.start);
  const stop = clockMinutes(input.stop);
  if (start === stop) throw new Error('Start and hard stop must differ; a full-day event is not supported.');
  if (!Array.isArray(input.segments) || input.segments.length < 1 || input.segments.length > MAX_SEGMENTS) throw new Error('Use 1 to 60 segments.');
  const ids = new Set();
  const segments = input.segments.map((segment, index) => {
    if (!segment || typeof segment !== 'object') throw new Error(`Segment ${index + 1} is invalid.`);
    if (typeof segment.id !== 'string' || !/^[A-Za-z0-9_-]{1,60}$/.test(segment.id) || ids.has(segment.id)) throw new Error('Segment IDs must be unique letters, digits, underscores or hyphens.');
    ids.add(segment.id);
    text(segment.title, 80, `Segment ${index + 1} name`, true);
    text(segment.owner, 60, `Segment ${index + 1} owner`);
    text(segment.cue, 240, `Segment ${index + 1} cue`);
    integer(segment.minutes, 1, 240, `Segment ${index + 1} duration`);
    if (!KINDS.includes(segment.kind)) throw new Error('Unknown segment type.');
    return { id: segment.id, title: segment.title, minutes: segment.minutes, kind: segment.kind, owner: segment.owner, cue: segment.cue };
  });
  const total = segments.reduce((sum, segment) => sum + segment.minutes, 0);
  if (total > 1440) throw new Error('Total segment duration must not exceed 1,440 minutes.');
  const scenario = input.scenario;
  if (!scenario || typeof scenario !== 'object') throw new Error('Scenario settings are missing.');
  integer(scenario.extra, 0, 120, 'Overrun minutes');
  if (scenario.segmentId !== null && !ids.has(scenario.segmentId)) throw new Error('The scenario segment does not exist.');
  if (scenario.extra > 0 && scenario.segmentId === null) throw new Error('Select a segment for the overrun.');
  return { version: 1, title: input.title.trim(), start: input.start, stop: input.stop, segments, scenario: { segmentId: scenario.segmentId, extra: scenario.extra } };
}

export function schedule(input) {
  const project = validateProject(input);
  const start = clockMinutes(project.start);
  let deadline = clockMinutes(project.stop);
  if (deadline < start) deadline += 1440;
  let baseline = start;
  let projected = start;
  const rows = project.segments.map(segment => {
    const extra = project.scenario.segmentId === segment.id ? project.scenario.extra : 0;
    const row = { ...segment, baselineStart: baseline, baselineEnd: baseline + segment.minutes, start: projected, end: projected + segment.minutes + extra, extra, drift: projected - baseline };
    baseline = row.baselineEnd;
    projected = row.end;
    return row;
  });
  return { project, rows, start, deadline, baselineEnd: baseline, end: projected, plannedMinutes: baseline - start, projectedMinutes: projected - start, remaining: deadline - projected, baselineRemaining: deadline - baseline, extraMinutes: projected - baseline, breakMinutes: rows.filter(row => row.kind === 'break').reduce((sum, row) => sum + row.minutes, 0), missingOwners: rows.filter(row => !row.owner.trim()).length };
}
