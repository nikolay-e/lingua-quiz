import type { Meta, StoryObj } from '@storybook/react-vite';
import { Input } from './Input';
import { Label } from './Label';

const meta = {
  title: 'UI/Input',
  component: Input,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    invalid: {
      control: 'boolean',
    },
    disabled: {
      control: 'boolean',
    },
    placeholder: {
      control: 'text',
    },
    type: {
      control: 'select',
      options: ['text', 'password', 'email', 'number', 'tel', 'url'],
    },
  },
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    placeholder: 'Enter text...',
  },
};

export const WithValue: Story = {
  args: {
    defaultValue: 'Hello World',
  },
};

export const Invalid: Story = {
  args: {
    invalid: true,
    defaultValue: 'Invalid input',
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
    defaultValue: 'Disabled input',
  },
};

export const Password: Story = {
  args: {
    type: 'password',
    placeholder: 'Enter password...',
  },
};

export const Email: Story = {
  args: {
    type: 'email',
    placeholder: 'name@example.com',
  },
};

export const WithLabel: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '300px' }}>
      <Label htmlFor="email">Email</Label>
      <Input id="email" type="email" placeholder="name@example.com" />
    </div>
  ),
};

export const WithLabelAndError: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '300px' }}>
      <Label htmlFor="email-error">Email</Label>
      <Input id="email-error" type="email" invalid defaultValue="invalid-email" />
      <span style={{ color: 'var(--color-error)', fontSize: '0.875rem' }}>Please enter a valid email address</span>
    </div>
  ),
};

export const AllStates: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '300px' }}>
      <div>
        <Label>Normal</Label>
        <Input placeholder="Normal input" />
      </div>
      <div>
        <Label>Focused (click to see)</Label>
        <Input placeholder="Focus me" />
      </div>
      <div>
        <Label>Invalid</Label>
        <Input invalid defaultValue="Error state" />
      </div>
      <div>
        <Label>Disabled</Label>
        <Input disabled defaultValue="Cannot edit" />
      </div>
    </div>
  ),
};
