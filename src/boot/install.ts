import { defineBoot } from '#q-app';
import { listenForInstall } from '@/services/install';

export default defineBoot(() => {
  listenForInstall();
});
