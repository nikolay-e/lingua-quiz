import { wrap } from 'svelte-spa-router/wrap';
import type { WrappedComponent, RouteDefinition } from 'svelte-spa-router';
import Login from '../views/Login.svelte';
import Register from '../views/Register.svelte';
import Quiz from '../views/Quiz.svelte';
import { authGuard, adminGuard } from './guards';

// Type assertion needed for Svelte 5 compatibility with svelte-spa-router
// svelte-spa-router expects Svelte 4 class components, but Svelte 5 uses function components
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const asComponent = <T>(component: T): any => component;

export const routes: RouteDefinition = {
  '/': wrap({
    component: asComponent(Quiz),
    conditions: [authGuard],
  }) as WrappedComponent,

  '/login': asComponent(Login),

  '/register': asComponent(Register),

  '/quiz': wrap({
    component: asComponent(Quiz),
    conditions: [authGuard],
  }) as WrappedComponent,

  '/admin': wrap({
    asyncComponent: () => import('../views/Admin.svelte').then((m) => ({ default: asComponent(m.default) })),
    conditions: [authGuard, adminGuard],
  }) as WrappedComponent,

  '*': asComponent(Login),
};
