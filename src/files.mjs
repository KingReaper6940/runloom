import { validateProject, schedule, clockLabel, MAX_FILE_CHARS } from './core.mjs';

export function readProject(source) {
  if (typeof source !== 'string' || source.length > MAX_FILE_CHARS) throw new Error('Project files must be at most 100,000 characters.');
  let data;
  try { data = JSON.parse(source.replace(/^\uFEFF/, '')); }
  catch { throw new Error('Invalid JSON. Load a Runloom project exported by Save project.'); }
  return validateProject(data);
}
export function writeProject(project) {
  return JSON.stringify(validateProject(project), null, 2) + '\n';
}
function csvCell(value) {
  let text = String(value);
  // Prefix formula-like cells; quotes alone do not prevent spreadsheet formulas.
  if (/^[\s]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text)) text = "'" + text;
  return '"' + text.replaceAll('"', '""') + '"';
}
export function scheduleCsv(project) {
  const result = schedule(project);
  const lines = [['Order', 'Segment', 'Type', 'Owner', 'Baseline start', 'Baseline end', 'Projected start', 'Projected end', 'Planned minutes', 'Added minutes', 'Cue']];
  result.rows.forEach((row, index) => lines.push([
    index + 1, row.title, row.kind, row.owner,
    clockLabel(row.baselineStart), clockLabel(row.baselineEnd), clockLabel(row.start), clockLabel(row.end),
    row.minutes, row.extra, row.cue
  ]));
  return lines.map(line => line.map(csvCell).join(',')).join('\r\n') + '\r\n';
}
