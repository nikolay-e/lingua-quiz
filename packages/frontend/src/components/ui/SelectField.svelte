<script lang="ts">
  import * as Select from '$lib/components/ui/select';

  interface Props {
    value: string | undefined;
    options: Array<{ value: string; label: string }>;
    placeholder?: string;
    id?: string;
    ariaLabel?: string;
  }

  /* eslint-disable prefer-const */
  let { value = $bindable(), options, placeholder = 'Select', id, ariaLabel }: Props = $props();
  /* eslint-enable prefer-const */
</script>

<Select.Root type="single" bind:value>
  <Select.Trigger {id} aria-label={ariaLabel}>
    {options.find((o) => o.value === value)?.label || placeholder}
  </Select.Trigger>
  <Select.Content>
    {#each options as option (option.value)}
      <Select.Item value={option.value}>{option.label}</Select.Item>
    {/each}
  </Select.Content>
</Select.Root>
