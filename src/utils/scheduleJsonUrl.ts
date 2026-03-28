import { buildLiveJsonUrl } from './urlProxy';

export const SCHEDULE_JSON_PATH = '/live_json/schedule.json';

export function getScheduleJsonUrl(): string {
  return buildLiveJsonUrl(SCHEDULE_JSON_PATH);
}
