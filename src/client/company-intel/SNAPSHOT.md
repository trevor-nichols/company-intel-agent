.
├── CompanyIntelPanel.stories.tsx    # Storybook stories for the main company intel panel.
├── CompanyIntelPanel.tsx            # Main component that assembles the company intel UI.
├── components                       # Contains all UI components for the Company Intel feature.
│   ├── Common                     # Small, reusable components shared across the feature.
│   │   ├── EmptyPlaceholder.tsx # A component to display a message in an empty state.
│   │   ├── SectionTitle.tsx   # A styled heading component for sections.
│   │   └── index.ts           # Exports common components.
│   ├── HeaderCard                 # The main header card component and its sub-components.
│   │   ├── HeaderCard.stories.tsx # Storybook stories for the HeaderCard.
│   │   ├── HeaderCard.tsx       # Displays company identity, status, and key stats.
│   │   ├── components           # Sub-components used within HeaderCard.
│   │   │   ├── EditableIdentity.tsx # An inline editor for the company name and tagline.
│   │   │   └── index.ts         # Exports HeaderCard sub-components.
│   │   └── index.ts             # Exports the HeaderCard component.
│   ├── OverviewPanel              # The panel displaying the AI-generated company overview.
│   │   ├── OverviewPanel.stories.tsx # Storybook stories for the OverviewPanel.
│   │   ├── OverviewPanel.tsx    # Displays the executive overview and editable structured intel.
│   │   ├── components           # Editable sections for the OverviewPanel.
│   │   │   ├── EditableIndustriesSection.tsx # Inline editor for the primary industries list.
│   │   │   ├── EditableOfferingsSection.tsx # Inline editor for the key offerings list.
│   │   │   ├── EditableOverviewSection.tsx # Inline editor for the narrative overview.
│   │   │   ├── EditableValuePropsSection.tsx # Inline editor for the value propositions list.
│   │   │   └── index.ts         # Exports editable section components.
│   │   └── index.ts             # Exports the OverviewPanel component.
│   ├── RunIntelForm               # Form for triggering and managing intel collection runs.
│   │   ├── RunIntelForm.stories.tsx # Storybook stories for the RunIntelForm.
│   │   ├── RunIntelForm.tsx     # Form to input a domain, select pages, and start a scrape.
│   │   ├── components           # Sub-components for the RunIntelForm.
│   │   │   ├── ManualEntryRow.tsx # An input row for manually adding a URL.
│   │   │   ├── SelectionList.tsx # Displays the list of URLs to be scraped.
│   │   │   └── SelectionRow.tsx # A single selectable URL row in the SelectionList.
│   │   └── index.ts             # Exports the RunIntelForm component.
│   ├── Skeletons                  # Loading skeleton components.
│   │   ├── OverviewSkeleton.tsx # Loading state placeholder for the OverviewPanel.
│   │   └── index.ts           # Exports skeleton components.
│   ├── SnapshotDetailsDialog      # Dialog for viewing the details of a single intel run.
│   │   ├── SnapshotDetailsDialog.stories.tsx # Storybook stories for the snapshot details dialog.
│   │   ├── SnapshotDetailsDialog.tsx # The dialog component for viewing snapshot results.
│   │   ├── components           # Sub-components for the SnapshotDetailsDialog.
│   │   │   ├── ScrapeResults    # Components for displaying page scrape results.
│   │   │   │   ├── ScrapeCard.tsx # Displays the result of a single page scrape.
│   │   │   │   ├── ScrapeFailureDetails.tsx # Displays error details for a failed scrape.
│   │   │   │   ├── ScrapeResults.tsx # Container for listing all scrape result cards.
│   │   │   │   ├── ScrapeSuccessContent.tsx # Displays the content from a successful scrape.
│   │   │   │   └── index.ts     # Exports the ScrapeResults component.
│   │   │   ├── SnapshotSummary.tsx # Displays high-level metadata for a snapshot.
│   │   │   ├── SummariesSection # Components for displaying AI-generated summaries.
│   │   │   │   ├── MetadataBlock.tsx # Renders AI agent metadata (model, usage, etc.).
│   │   │   │   ├── StructuredProfileSummary.tsx # Renders the structured profile data.
│   │   │   │   ├── SummariesSection.tsx # Aggregates and displays all AI summaries.
│   │   │   │   └── index.ts     # Exports the SummariesSection component.
│   │   │   ├── SummaryMetadataPanel.tsx # Panel displaying AI agent telemetry.
│   │   │   └── index.ts         # Exports SnapshotDetailsDialog sub-components.
│   │   ├── hooks                # Hooks specific to the snapshot details dialog.
│   │   │   └── useSnapshotDetails.ts # Hook to process and prepare snapshot data for display.
│   │   └── index.ts             # Exports the SnapshotDetailsDialog component.
│   └── SnapshotsPanel             # Panel for displaying the history of intel runs.
│       ├── SnapshotsPanel.tsx   # Displays a chronological list of past intel runs (snapshots).
│       ├── components           # Sub-components for the SnapshotsPanel.
│       │   └── SnapshotCard.tsx # A card representing a single snapshot in the history list.
│       └── index.ts             # Exports the SnapshotsPanel component.
├── context                        # React context providers for dependency injection.
│   ├── CompanyIntelClientContext.tsx # Context provider for the API client.
│   └── index.ts                   # Exports the context provider and hook.
├── hooks                          # Custom React hooks for logic and data fetching.
│   ├── index.ts                   # Main entry point for exporting hooks.
│   ├── useCompanyIntel.ts         # Hook to fetch the main company intel profile and snapshots.
│   ├── useCompanyIntelPreview.ts  # Hook to map a domain and get recommended pages.
│   ├── useCompanyIntelWorkflow.ts # Central hook managing the entire UI state and logic.
│   ├── useTriggerCompanyIntel.ts  # Hook to trigger an intel collection run.
│   └── useUpdateCompanyIntelProfile.ts # Hook to update editable fields of the company profile.
├── index.ts                       # Main entry point for the Company Intel module.
├── types                          # TypeScript type definitions.
│   └── index.ts                   # Defines all TypeScript types and interfaces for the feature.
└── utils                          # Utility functions.
    ├── errors.ts                  # Helper for creating custom HTTP error objects.
    ├── formatters.ts              # Functions for formatting data for display (dates, statuses).
    └── serialization.ts           # Helpers to map API payloads to client-side types.
