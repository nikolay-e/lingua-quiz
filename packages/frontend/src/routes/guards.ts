import { get } from 'svelte/store';
import { push } from 'svelte-spa-router';
import { authStore } from '../stores';

export function authGuard(): boolean {
  const auth = get(authStore);
  if (!auth.isAuthenticated) {
    void push('/login');
    return false;
  }
  return true;
}
