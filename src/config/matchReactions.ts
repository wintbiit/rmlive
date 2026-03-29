/** Preset match reactions: emoji label + stable id stored in `rmlive:reaction_id`. Image URL is for optional UI only; IM uses shared placeholder file. */
export interface MatchReactionPreset {
  id: string;
  emoji: string;
  label: string;
}

export const MATCH_REACTION_PRESETS: MatchReactionPreset[] = [
  { id: 'fire', emoji: '🔥', label: '燃' },
  { id: 'clap', emoji: '👏', label: '精彩' },
  { id: 'wow', emoji: '😮', label: '离谱' },
  { id: 'heart', emoji: '❤️', label: '爱了' },
  { id: 'think', emoji: '🤔', label: '下饭' },
];
