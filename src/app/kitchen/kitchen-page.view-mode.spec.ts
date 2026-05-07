import { resolveKitchenPageInitialView } from './kitchen-page.component';

describe('KitchenPage view mode', () => {
  it('falls back to config when stored view is costs and there is nothing to show', () => {
    expect(resolveKitchenPageInitialView('costs', false)).toBe('config');
  });

  it('keeps costs when stored view is costs and workspace already has content', () => {
    expect(resolveKitchenPageInitialView('costs', true)).toBe('costs');
  });

  it('defaults invalid stored values to config', () => {
    expect(resolveKitchenPageInitialView('unexpected', true)).toBe('config');
    expect(resolveKitchenPageInitialView(null, true)).toBe('config');
  });
});
