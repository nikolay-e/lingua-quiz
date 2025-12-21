import { initI18n } from '$lib/i18n';

export const ssr = true;
export const prerender = false;

export const load = async () => {
  await initI18n();
  return {};
};
