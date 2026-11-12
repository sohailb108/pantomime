import { ref } from 'vue';

/** Set by the service worker registration when a new version of the app has been downloaded. */
export const updateReady = ref(false);
