import { register } from 'register-service-worker';
import { setRegistration, updateReady } from '@/services/update';

// The ready(), registered(), cached(), updatefound() and updated()
// events passes a ServiceWorkerRegistration instance in their arguments.
// ServiceWorkerRegistration: https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerRegistration

register(import.meta.env.QUASAR_SERVICE_WORKER_FILE, {
  // The registrationOptions object will be passed as the second argument
  // to ServiceWorkerContainer.register()
  // https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerContainer/register#Parameter

  // registrationOptions: { scope: './' },

  ready(/* registration */) {
    // console.log('Service worker is active.')
  },

  registered(registration) {
    setRegistration(registration);
  },

  cached(/* registration */) {
    // console.log('Content has been cached for offline use.')
  },

  updatefound(/* registration */) {
    console.info('[sw] New version found, downloading.');
  },

  // The new service worker is already active. This page still runs the old code until it reloads.
  updated(/* registration */) {
    updateReady.value = true;
  },

  offline() {
    // console.log('No internet connection found. App is running in offline mode.')
  },

  error(err) {
    console.error('[sw] Service worker registration or update failed:', err);
  },
});
