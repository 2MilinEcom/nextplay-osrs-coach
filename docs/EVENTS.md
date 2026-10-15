# Event contract v1

Import a JSON object with `version:1`, `game:"osrs"`, `title`, `mode`, `outcome`, `duration` (seconds), and an `events` array. Modes: `LMS`, `Wilderness`, `Duel practice`. Outcomes: `win`, `loss`, `unknown`.

Each event has a clip-relative `t`, a `kind`, and `source` (`observed`, `manual`, or `synthetic`). Optional `tick` is metadata; the UI uses seconds. The downloadable template has an empty event array and can be imported. Add only observations from your own replay. The separate on-screen demo is synthetic and cannot be saved to real history.

| Kind | Useful fields | Meaning |
|---|---|---|
| snapshot | hp, maxHp, prayerPoints, activeProtection, targetProtection | Your state after a game tick; target is only the player you were interacting with |
| prayer | activeProtection | A local protection prayer state change seen by the client |
| targetOverhead | targetProtection | Displayed overhead changes of the current interacting player at client-tick checks |
| inventory / equipment | items | Own item slots, item IDs and quantities at start and on change; empty array means empty |
| animation | actorRole, animationId | Changed animation of self or interacting target; raw ID has no inferred attack style |
| selfHit / targetHit | amount | A visible hitsplat amount; type, cause and attacker are not established |
| incoming | amount, style, protection | An incoming attack; style/protection only if actually established at attack evaluation |
| outgoing | style, opponentProtection | Your attack and opponent overhead at evaluation |
| heal | amount | A confirmed heal, not an inferred HP difference |
| death | none | Confirmed player death |
| note | text | A manual timestamped review note |

Styles and protections: `melee`, `ranged`, `magic`, `none`. Omit unknown values. `none` means observed absence, not missing data. `targetProtection` records the displayed overhead of the current interacting player, not their state at an attack's evaluation. Raw item and animation IDs require external interpretation. The RuneLite development logger does not infer attack styles from hitsplats, read hidden opponent state, or attribute target hits to the recorder.

An `items` value is an array of `{slot, id, quantity}` objects. The development recorder samples own HP, prayer points, active protection, and interacting target overhead on each game tick. It records local prayer changes, target overhead changes checked on client ticks, own inventory/equipment changes, animations, and hitsplats as additional events. An observed state transition still does not establish server-side attack evaluation timing. Sessions over 9,000 captured events end early; AI requests reject logs over 500,000 JSON characters instead of silently dropping observations.

Low-health candidates require at least two positive-HP snapshots spanning 0.6 seconds or more; a gap over 1.5 seconds or a heal ends a window. Timestamps are sorted without mutating inputs. These are heuristic review windows, not causal claims.

## Alignment

Recording and logging have different clocks. Find a shared visual event, compare its event timestamp with its clip timestamp, and subtract their difference from every event. `integrations/obs/align_events.py` crops and shifts a log using an explicitly supplied offset. It preserves the original file and does not pretend synchronization is automatic. If alignment cannot be verified, import video and events as separate sessions.
