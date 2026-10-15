#!/usr/bin/env python3
"""Local OBS replay saver. No game inputs, network upload, or screen analysis.
OBS must already be configured and its replay buffer started by the user.
"""
import argparse
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import shutil
import time


def save_replay(client):
    if not client.get_replay_buffer_status().output_active:
        raise RuntimeError('Start the replay buffer in OBS first.')
    try:
        previous = client.get_last_replay_buffer_replay().saved_replay_path
    except Exception:
        previous = None
    client.save_replay_buffer()
    deadline = time.monotonic() + 15
    while time.monotonic() < deadline:
        try:
            filename = client.get_last_replay_buffer_replay().saved_replay_path
            if filename and filename != previous and Path(filename).is_file():
                return Path(filename)
        except Exception:
            pass
        time.sleep(0.25)
    raise RuntimeError('OBS did not report a new replay. Use unique replay filenames and check OBS output.')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--watch', type=Path, help='Watch newly finalized RuneLite logs for a player death')
    parser.add_argument('--output', type=Path, default=Path('nextplay-captures'))
    parser.add_argument('--port', type=int, default=4455)
    args = parser.parse_args()
    import obsws_python as obs
    password = os.environ.get('OBS_WEBSOCKET_PASSWORD')
    if not password:
        raise SystemExit('Set OBS_WEBSOCKET_PASSWORD to the password shown by OBS. Do not disable authentication.')
    client = obs.ReqClient(host='127.0.0.1', port=args.port, password=password, timeout=5)
    args.output.mkdir(parents=True, exist_ok=True)
    if not args.watch:
        print('Saved replay:', save_replay(client))
        return
    watch = args.watch.expanduser().resolve()
    if not watch.is_dir():
        raise SystemExit('The observation directory does not exist. Export a RuneLite test session first.')
    # Old logs are intentionally ignored: replay buffering cannot recreate an old death.
    seen = set(watch.glob('*.json'))
    print('Watching NEW completed logs. Ctrl+C to stop. Recordings stay on this computer.')
    try:
        while True:
            for path in sorted(set(watch.glob('*.json')) - seen):
                try:
                    session = json.loads(path.read_text(encoding='utf-8'))
                    seen.add(path)
                    if not any(e.get('kind') == 'death' for e in session.get('events', [])):
                        continue
                    replay = save_replay(client)
                    target = args.output / f'{path.stem}{replay.suffix}'
                    shutil.copy2(replay, target)
                    shutil.copy2(path, args.output / path.name)
                    (args.output / f'{path.stem}-capture-info.txt').write_text(
                        f'OBS replay: {target.name}\nSaved at: {datetime.now(timezone.utc).isoformat()}\n'
                        'The event log is session-relative and the replay is buffer-relative. They are NOT aligned.\n'
                        'Import the video on its own, or use align_events.py with an offset verified from a shared visual moment.\n', encoding='utf-8')
                    print('Saved:', target)
                except (OSError, ValueError, RuntimeError) as exc:
                    print('Could not save this event:', str(exc))
            time.sleep(0.5)
    except KeyboardInterrupt:
        print('\nStopped. OBS replay buffer is unchanged.')

if __name__ == '__main__':
    main()
