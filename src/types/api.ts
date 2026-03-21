export type AnyRecord = Record<string, unknown>;

export interface MatchBrief extends AnyRecord {
  id?: string | number;
  name?: string;
  status?: string;
  round?: string;
  stage?: string;
  team_a?: string;
  team_b?: string;
  start_time?: string;
  end_time?: string;
}

export interface LiveStreamCandidate extends AnyRecord {
  label?: string;
  res?: string;
  type?: string;
  src?: string;
}

export interface LiveZone extends AnyRecord {
  zoneId?: string | number;
  zoneName?: string;
  liveState?: number;
  matchState?: number;
  zoneLiveString?: LiveStreamCandidate[];
}

export interface LiveGameInfo extends AnyRecord {
  eventData?: LiveZone[];
  live_url?: string;
  hls_url?: string;
  stream_url?: string;
  room_name?: string;
  title?: string;
  status?: string;
}

export type CurrentAndNextMatches = AnyRecord[] | AnyRecord;

export interface GroupInfo extends AnyRecord {
  name?: string;
  teams?: string[];
}

export type GroupsOrder = GroupInfo[] | AnyRecord;

export interface RobotDataEntry extends AnyRecord {
  team?: string;
  robot?: string;
  score?: number;
  hp?: number;
  timestamp?: string;
}

export type RobotData = RobotDataEntry[] | AnyRecord;

export interface ScheduleEntry extends AnyRecord {
  id?: string | number;
  date?: string;
  time?: string;
  stage?: string;
  team_a?: string;
  team_b?: string;
  status?: string;
}

export type Schedule = ScheduleEntry[] | AnyRecord;
