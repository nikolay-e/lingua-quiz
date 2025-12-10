<script lang="ts">
  import type { HTMLInputAttributes, HTMLInputTypeAttribute } from 'svelte/elements';
  import { cn, type WithElementRef } from '$lib/utils.js';

  type InputType = Exclude<HTMLInputTypeAttribute, 'file'>;

  type Props = WithElementRef<
    Omit<HTMLInputAttributes, 'type'> &
      ({ type: 'file'; files?: FileList } | { type?: InputType; files?: undefined })
  >;

  let {
    ref = $bindable(null),
    value = $bindable(),
    type,
    files = $bindable(),
    class: className,
    'data-slot': dataSlot = 'input',
    ...restProps
  }: Props = $props();

  const baseClasses =
    'flex w-full rounded-lg border bg-background px-3 py-2.5 text-base leading-tight outline-none transition-all';
  const stateClasses =
    'border-input placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50';
  const focusClasses = 'focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20';
  const invalidClasses = 'aria-invalid:border-destructive aria-invalid:ring-destructive/20';
</script>

{#if type === 'file'}
  <input
    bind:this={ref}
    data-slot={dataSlot}
    class={cn(baseClasses, stateClasses, focusClasses, invalidClasses, 'pt-2', className)}
    type="file"
    bind:files
    bind:value
    {...restProps}
  />
{:else}
  <input
    bind:this={ref}
    data-slot={dataSlot}
    class={cn(baseClasses, stateClasses, focusClasses, invalidClasses, className)}
    {type}
    bind:value
    {...restProps}
  />
{/if}
