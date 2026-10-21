export function exampleProject() {
  return { version: 1, title: 'Community makers morning', start: '09:00', stop: '11:00',
    segments: [
      { id: 'doors', title: 'Doors & coffee', minutes: 15, kind: 'break', owner: 'Welcome desk', cue: 'Open doors; music low.' },
      { id: 'welcome', title: 'Welcome & housekeeping', minutes: 10, kind: 'session', owner: 'Host', cue: 'Handheld mic; title slide.' },
      { id: 'talk', title: 'Build something small', minutes: 30, kind: 'session', owner: 'Speaker', cue: 'Switch to demo laptop.' },
      { id: 'reset', title: 'Room reset', minutes: 5, kind: 'transition', owner: 'Stage lead', cue: 'Move chairs into small groups.' },
      { id: 'workshop', title: 'Hands-on workshop', minutes: 35, kind: 'session', owner: 'Facilitator', cue: 'Share worksheet; call a five-minute warning.' },
      { id: 'close', title: 'Show & tell / close', minutes: 15, kind: 'session', owner: 'Host', cue: 'Two demos, then thank the room.' }
    ], scenario: { segmentId: 'talk', extra: 0 } };
}
