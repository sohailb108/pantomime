import { defineBoot } from '#q-app';
import { unlockAudioOnGesture } from '@/services/feedback';

export default defineBoot(() => {
  unlockAudioOnGesture();
});
