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

export function adminGuard(): boolean {
  const auth = get(authStore);
  console.log('[GUARD] adminGuard - isAdmin:', auth.isAdmin, 'username:', auth.username, 'token:', auth.token ? 'exists' : 'missing');
  console.error('[GUARD ERROR] adminGuard called - isAdmin:', auth.isAdmin);
  if (!auth.isAdmin) {
    console.log('[GUARD] adminGuard BLOCKING ACCESS');
    console.error('[GUARD ERROR] adminGuard BLOCKING - isAdmin is false');
    return false;
  }
  console.log('[GUARD] adminGuard ALLOWING ACCESS');
  console.error('[GUARD ERROR] adminGuard ALLOWING - isAdmin is true');
  return true;
}
