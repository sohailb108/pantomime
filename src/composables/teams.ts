import { useI18n } from 'vue-i18n';
import { teamHex } from '@/config/teamColors';

/** Display helpers for teams, which are identified by their palette color. */
export function useTeamDisplay() {
  const { t } = useI18n();
  /** Localized color name, for example "Red team". */
  const teamName = (color: string | undefined) => (color ? t(`teamColors.${color}`) : '');
  return { teamName, teamHex };
}
