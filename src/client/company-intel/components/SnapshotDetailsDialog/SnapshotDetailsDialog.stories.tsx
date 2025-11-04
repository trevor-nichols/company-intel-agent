// ------------------------------------------------------------------------------------------------
//                SnapshotDetailsDialog.stories.tsx - Storybook coverage for snapshot viewer
// ------------------------------------------------------------------------------------------------

// ------------------------------------------------------------------------------------------------
//                Story Metadata & Helpers
// ------------------------------------------------------------------------------------------------

import { useEffect, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';

import { SnapshotDetailsDialog } from './SnapshotDetailsDialog';
import type { CompanyProfileSnapshot } from '../../types';
import {
  companyIntelSuccessfulSnapshotFixture,
  companyIntelFailedSnapshotFixture,
} from '../../../../storybook/fixtures/companyIntel';
import { withHandlers, companyIntelEmptyHandlers } from '../../../../storybook/msw/handlers';

const SnapshotDetailsDialogStory = ({ snapshot }: SnapshotDetailsDialogStoryProps) => {
  const [open, setOpen] = useState(true);

  useEffect(() => {
    setOpen(true);
  }, [snapshot?.id]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 p-8 dark:bg-gray-950">
      <SnapshotDetailsDialog snapshot={snapshot} open={open} onOpenChange={setOpen} />
    </div>
  );
};

type SnapshotDetailsDialogStoryProps = {
  readonly snapshot: CompanyProfileSnapshot | null;
};

const meta: Meta<SnapshotDetailsDialogStoryProps> = {
  title: 'Company Intel/Snapshot/SnapshotDetailsDialog',
  parameters: {
    layout: 'fullscreen',
    backgrounds: {
      default: 'Surface',
    },
  },
  render: (args) => <SnapshotDetailsDialogStory snapshot={args.snapshot} />,
  argTypes: {
    snapshot: {
      control: false,
    },
  },
};

export default meta;

type Story = StoryObj<SnapshotDetailsDialogStoryProps>;

export const CompletedSnapshot: Story = {
  args: {
    snapshot: companyIntelSuccessfulSnapshotFixture,
  },
  parameters: {
    msw: {
      handlers: withHandlers(),
    },
  },
};

export const FailedSnapshot: Story = {
  args: {
    snapshot: companyIntelFailedSnapshotFixture,
  },
  parameters: {
    msw: {
      handlers: withHandlers(...companyIntelEmptyHandlers),
    },
  },
};
