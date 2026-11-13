// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { defineComponent } from 'vue';
import { createMemoryHistory, createRouter } from 'vue-router';
import { useLeaveGuard } from '@/composables/leaveGuard';

async function setup(active: () => boolean) {
  let guard!: ReturnType<typeof useLeaveGuard>;
  const Guarded = defineComponent({
    setup() {
      guard = useLeaveGuard(active);
      return () => null;
    },
  });
  const Other = defineComponent({ render: () => null });
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: Guarded },
      { path: '/other', component: Other },
    ],
  });
  await router.push('/');
  mount({ template: '<router-view />' }, { global: { plugins: [router] } });
  await flushPromises();
  return { guard, router };
}

describe('useLeaveGuard', () => {
  it('cancels leaving while active and opens the dialog', async () => {
    const { guard, router } = await setup(() => true);
    await router.push('/other');
    expect(router.currentRoute.value.path).toBe('/');
    expect(guard.open.value).toBe(true);
  });

  it('lets the page leave when not active', async () => {
    const { guard, router } = await setup(() => false);
    await router.push('/other');
    expect(router.currentRoute.value.path).toBe('/other');
    expect(guard.open.value).toBe(false);
  });

  it('lets a deliberate navigation through after allow()', async () => {
    const { guard, router } = await setup(() => true);
    await router.push('/other');
    guard.allow();
    expect(guard.open.value).toBe(false);
    await router.push('/other');
    expect(router.currentRoute.value.path).toBe('/other');
  });
});
