import { describe, expect, it } from 'vitest';
import {
  diffScheduleSnapshots,
  type MatchNotifySnapshot,
} from '../scheduleNotifyDiff';

function snap(partial: Partial<MatchNotifySnapshot> & { id: string }): MatchNotifySnapshot {
  return {
    statusRaw: '',
    redGames: 0,
    blueGames: 0,
    redTeamName: 'R',
    blueTeamName: 'B',
    zoneName: 'Z',
    ...partial,
  };
}

describe('diffScheduleSnapshots', () => {
  it('returns no events on first load (empty previous map)', () => {
    const prev = new Map<string, MatchNotifySnapshot>();
    const next = [snap({ id: '1', statusRaw: 'WAITING' })];
    expect(diffScheduleSnapshots(prev, next, { policy: 'all', followedIds: new Set() })).toEqual([]);
  });

  it('returns no events when previous map is null', () => {
    const next = [snap({ id: '1', statusRaw: 'STARTED' })];
    expect(diffScheduleSnapshots(null, next, { policy: 'all', followedIds: new Set() })).toEqual([]);
  });

  it('detects match_start', () => {
    const prev = new Map([
      ['1', snap({ id: '1', statusRaw: 'PENDING', redGames: 0, blueGames: 0 })],
    ]);
    const next = [snap({ id: '1', statusRaw: 'STARTED', redGames: 0, blueGames: 0 })];
    const r = diffScheduleSnapshots(prev, next, { policy: 'all', followedIds: new Set() });
    expect(r).toHaveLength(1);
    expect(r[0].type).toBe('match_start');
  });

  it('detects game_point while in progress', () => {
    const prev = new Map([
      ['1', snap({ id: '1', statusRaw: 'STARTED', redGames: 0, blueGames: 0 })],
    ]);
    const next = [snap({ id: '1', statusRaw: 'STARTED', redGames: 1, blueGames: 0 })];
    const r = diffScheduleSnapshots(prev, next, { policy: 'all', followedIds: new Set() });
    expect(r).toHaveLength(1);
    expect(r[0].type).toBe('game_point');
  });

  it('detects match_end', () => {
    const prev = new Map([
      ['1', snap({ id: '1', statusRaw: 'STARTED', redGames: 1, blueGames: 1 })],
    ]);
    const next = [snap({ id: '1', statusRaw: 'DONE', redGames: 2, blueGames: 1 })];
    const r = diffScheduleSnapshots(prev, next, { policy: 'all', followedIds: new Set() });
    expect(r).toHaveLength(1);
    expect(r[0].type).toBe('match_end');
  });

  it('prefers match_end over game_point when transitioning to done', () => {
    const prev = new Map([
      ['1', snap({ id: '1', statusRaw: 'STARTED', redGames: 0, blueGames: 0 })],
    ]);
    const next = [snap({ id: '1', statusRaw: 'DONE', redGames: 1, blueGames: 0 })];
    const r = diffScheduleSnapshots(prev, next, { policy: 'all', followedIds: new Set() });
    expect(r).toHaveLength(1);
    expect(r[0].type).toBe('match_end');
  });

  it('filters by follow policy', () => {
    const prev = new Map([
      ['1', snap({ id: '1', statusRaw: 'PENDING' })],
      ['2', snap({ id: '2', statusRaw: 'PENDING' })],
    ]);
    const next = [
      snap({ id: '1', statusRaw: 'STARTED' }),
      snap({ id: '2', statusRaw: 'STARTED' }),
    ];
    const r = diffScheduleSnapshots(prev, next, {
      policy: 'follow',
      followedIds: new Set(['1']),
    });
    expect(r).toHaveLength(1);
    expect(r[0].snap.id).toBe('1');
  });
});
