import type { MatchView } from './matchView';

export type NotifyPolicy = 'all' | 'follow';

export type ScheduleNotifyEventType = 'match_start' | 'game_point' | 'match_end';

export interface MatchNotifySnapshot {
  id: string;
  statusRaw: string;
  redGames: number;
  blueGames: number;
  redTeamName: string;
  blueTeamName: string;
  zoneName: string;
}

export function parseScoreToGames(score: string): { red: number; blue: number } {
  const [a = '0', b = '0'] = score.split(':').map((s) => s.trim());
  return { red: Number(a) || 0, blue: Number(b) || 0 };
}

export function matchViewToNotifySnapshot(m: MatchView): MatchNotifySnapshot {
  const { red, blue } = parseScoreToGames(m.score);
  const id = String(m.id ?? '').trim();
  return {
    id: id && id !== '-' ? id : '',
    statusRaw: String(m.statusRaw ?? ''),
    redGames: red,
    blueGames: blue,
    redTeamName: String(m.redTeam?.teamName ?? ''),
    blueTeamName: String(m.blueTeam?.teamName ?? ''),
    zoneName: String(m.zoneName ?? ''),
  };
}

export function isInProgressStatus(raw: string): boolean {
  const u = raw.toUpperCase();
  return u === 'STARTED' || u === 'PLAYING';
}

export function isEndedStatus(raw: string): boolean {
  const u = raw.toUpperCase();
  return u === 'DONE' || u === 'FINISHED' || u === 'ENDED';
}

function shouldNotifyForPolicy(matchId: string, policy: NotifyPolicy, followedIds: Set<string>): boolean {
  if (!matchId) {
    return false;
  }
  if (policy === 'all') {
    return true;
  }
  return followedIds.has(matchId);
}

export interface DiffScheduleOptions {
  policy: NotifyPolicy;
  followedIds: Set<string>;
}

/**
 * Compare previous snapshots with the next list. First global load (empty previous map) yields no events.
 */
export function diffScheduleSnapshots(
  previousById: Map<string, MatchNotifySnapshot> | null,
  next: MatchNotifySnapshot[],
  opts: DiffScheduleOptions,
): Array<{ type: ScheduleNotifyEventType; snap: MatchNotifySnapshot }> {
  const out: Array<{ type: ScheduleNotifyEventType; snap: MatchNotifySnapshot }> = [];
  if (!previousById || previousById.size === 0) {
    return out;
  }

  for (const snap of next) {
    if (!snap.id) {
      continue;
    }

    const prev = previousById.get(snap.id);
    if (!prev) {
      continue;
    }

    if (!shouldNotifyForPolicy(snap.id, opts.policy, opts.followedIds)) {
      continue;
    }

    const wasEnded = isEndedStatus(prev.statusRaw);
    const nowEnded = isEndedStatus(snap.statusRaw);
    const wasProgress = isInProgressStatus(prev.statusRaw);
    const nowProgress = isInProgressStatus(snap.statusRaw);

    if (!wasEnded && nowEnded) {
      out.push({ type: 'match_end', snap });
      continue;
    }

    if (!wasProgress && nowProgress) {
      out.push({ type: 'match_start', snap });
      continue;
    }

    if (wasProgress && nowProgress && !nowEnded) {
      if (prev.redGames !== snap.redGames || prev.blueGames !== snap.blueGames) {
        out.push({ type: 'game_point', snap });
      }
    }
  }

  return out;
}
