#!/usr/bin/env python3
"""Align a completed event log to a clip using a user-verified time offset.
clip_time = event_time - clip_start_in_session_seconds
"""
import argparse
import json
from pathlib import Path


def align(data, clip_start, clip_duration):
    if clip_duration <= 0 or clip_duration > 7200:
        raise ValueError('Clip duration must be between 0 and 7200 seconds.')
    events = []
    for event in data['events']:
        t = round(event['t'] - clip_start, 3)
        if 0 <= t <= clip_duration:
            events.append({**event, 't': t})
    return {**data, 'duration': clip_duration, 'events': events,
            'outcome': data.get('outcome', 'unknown') if any(e['kind'] == 'death' for e in events) else 'unknown',
            'alignment': {'offset_seconds': clip_start, 'verified_by': 'user'}}


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('input', type=Path)
    p.add_argument('output', type=Path)
    p.add_argument('--clip-start', type=float, required=True)
    p.add_argument('--clip-duration', type=float, required=True)
    a = p.parse_args()
    if a.input.resolve() == a.output.resolve():
        raise SystemExit('Choose a new output filename to preserve the original observations.')
    result = align(json.loads(a.input.read_text()), a.clip_start, a.clip_duration)
    with a.output.open('x') as f:
        json.dump(result, f, indent=2)
    print(f'Wrote {len(result["events"])} aligned observations to {a.output}')

if __name__ == '__main__':
    main()
