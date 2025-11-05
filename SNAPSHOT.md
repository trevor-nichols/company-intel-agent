.
├── client/                                  # Contains all front-end code for the company intel feature.
│   ├── company-intel/                       # Main module for the company intel user interface.
│   │   ├── CompanyIntelPanel.tsx            # The main React component assembling the company intel UI panel.
│   │   ├── components/                      # Contains all React components used on the CompanyIntelPanel.
│   │   │   ├── Common/                      # Contains simple, reusable UI components.
│   │   │   │   ├── EmptyPlaceholder.tsx     # A component to display a message when there is no content.
│   │   │   │   ├── SectionTitle.tsx         # A styled heading component for UI sections.
│   │   │   │   └── index.ts                 # Barrel file for common components.
│   │   │   ├── HeaderCard/                  # Component for the main header of the company profile page.
│   │   │   │   ├── HeaderCard.tsx           # Displays company identity, status, and key statistics.
│   │   │   │   ├── components/              # Sub-components for the HeaderCard.
│   │   │   │   │   ├── EditableIdentity.tsx # An inline editable component for the company name and tagline.
│   │   │   │   │   └── index.ts             # Barrel file for HeaderCard sub-components.
│   │   │   │   └── index.ts                 # Barrel file for the HeaderCard component.
│   │   │   ├── OverviewPanel/               # Component for displaying the company overview and structured data.
│   │   │   │   ├── OverviewPanel.tsx        # Main panel for displaying AI-generated company overview and details.
│   │   │   │   ├── components/              # Editable sub-sections for the OverviewPanel.
│   │   │   │   │   ├── EditableIndustriesSection.tsx # Inline editor for the primary industries list.
│   │   │   │   │   ├── EditableOfferingsSection.tsx # Inline editor for the key offerings list.
│   │   │   │   │   ├── EditableOverviewSection.tsx # Inline editor for the main company overview narrative.
│   │   │   │   │   ├── EditableValuePropsSection.tsx # Inline editor for the value propositions list.
│   │   │   │   │   └── index.ts             # Barrel file for OverviewPanel sub-components.
│   │   │   │   └── index.ts                 # Barrel file for the OverviewPanel component.
│   │   │   ├── RunIntelForm/                # Form component to trigger and manage intel collection runs.
│   │   │   │   ├── RunIntelForm.tsx         # Main form for inputting a domain and managing the run process.
│   │   │   │   ├── components/              # Sub-components for the run intel form.
│   │   │   │   │   ├── ManualEntryRow.tsx   # A row for manually adding a URL to the scrape list.
│   │   │   │   │   ├── SelectionList.tsx    # Renders the list of recommended and manually added URLs.
│   │   │   │   │   └── SelectionRow.tsx     # A single selectable URL row in the selection list.
│   │   │   │   └── index.ts                 # Barrel file for the RunIntelForm component.
│   │   │   ├── Skeletons/                   # Loading skeleton components for a better user experience.
│   │   │   │   ├── OverviewSkeleton.tsx     # A loading placeholder for the OverviewPanel content.
│   │   │   │   └── index.ts                 # Barrel file for skeleton components.
│   │   │   └── SnapshotsPanel/              # Panel for displaying the history of intel collection runs.
│   │   │       ├── SnapshotsPanel.tsx       # Component that lists past company intel snapshots.
│   │   │       ├── components/              # Sub-components for the SnapshotsPanel.
│   │   │       │   └── SnapshotCard.tsx     # A card representing a single snapshot in the history list.
│   │   │       └── index.ts                 # Barrel file for the SnapshotsPanel component.
│   │   ├── context/                         # React Context for providing client-side dependencies.
│   │   │   ├── CompanyIntelClientContext.tsx # Provides an API client via React Context for making requests.
│   │   │   └── index.ts                     # Barrel file for the context module.
│   │   ├── hooks/                           # Custom React hooks for managing state and data fetching.
│   │   │   ├── index.ts                     # Barrel file for React hooks.
│   │   │   ├── useCompanyIntel.ts           # Hook to fetch the main company intel profile and snapshots.
│   │   │   ├── useCompanyIntelPreview.ts    # Hook to trigger the URL mapping/preview step of an intel run.
│   │   │   ├── useCompanyIntelWorkflow.ts   # Central state management hook for the entire company intel UI.
│   │   │   ├── useTriggerCompanyIntel.ts    # Hook to trigger a full company intel scrape and analysis job.
│   │   │   └── useUpdateCompanyIntelProfile.ts # Hook for submitting manual updates to the company profile.
│   │   ├── index.ts                         # Barrel file for the company-intel UI module.
│   │   ├── types/                           # TypeScript type definitions for the client-side.
│   │   │   └── index.ts                     # Exports all client-side data types.
│   │   └── utils/                           # Utility functions for the client-side.
│   │       ├── errors.ts                    # Custom HTTP error classes and utilities.
│   │       ├── formatters.ts                # Helper functions for formatting dates, status labels, etc.
│   │       └── serialization.ts             # Functions to safely parse and type-cast API response payloads.
│   ├── components/                          # Top-level client component exports for the feature package.
│   │   └── index.ts                         # Barrel file re-exporting all major UI components.
│   ├── hooks/                               # Top-level client hook exports for the feature package.
│   │   └── index.ts                         # Barrel file re-exporting all client-side hooks.
│   ├── index.ts                             # Barrel file for the entire client-side bundle.
│   ├── types/                               # Directory for client-side type definitions.
│   └── utils/                               # Directory for client-side utility functions.
├── index.ts                                 # Top-level barrel file for the entire company-intel feature package.
├── server/                                  # Contains all back-end logic for the company intel feature.
│   ├── agents/                              # Contains AI agents that process scraped data into insights.
│   │   ├── overview/                        # Agent for generating the narrative company overview.
│   │   │   ├── client.ts                    # Orchestrates calls to the OpenAI API for the overview agent.
│   │   │   ├── index.ts                     # Barrel file for the overview agent.
│   │   │   ├── prompts.ts                   # Contains prompt templates for the overview agent.
│   │   │   └── schema.ts                    # Zod schema for the overview agent's structured output.
│   │   ├── shared/                          # Shared utilities for all AI agents.
│   │   │   ├── openai.ts                    # Helper utilities for working with the OpenAI client.
│   │   │   └── response.ts                  # Helpers for extracting data from OpenAI API responses.
│   │   └── structured-profile/              # Agent for extracting structured data (industries, offerings, etc.).
│   │       ├── client.ts                    # Orchestrates calls to the OpenAI API for the structured profile agent.
│   │       ├── index.ts                     # Barrel file for the structured profile agent.
│   │       ├── prompts.ts                   # Contains prompt templates for the structured profile agent.
│   │       └── schema.ts                    # Zod schema for the structured profile agent's output.
│   ├── bridge/                              # Defines contracts and configuration interfaces for server-side logic.
│   │   └── index.ts                         # Exports server configuration types and service interfaces.
│   ├── handlers/                            # API route handlers (e.g., for Next.js).
│   │   └── index.ts                         # Provides a factory for creating placeholder API handlers.
│   ├── index.ts                             # Barrel file for the server-side bundle.
│   ├── server.ts                            # Factory function to instantiate the company intel server logic.
│   ├── services/                            # Core business logic and orchestration services.
│   │   ├── index.ts                         # Barrel file for server-side services.
│   │   ├── persistence.ts                   # Defines the interfaces for the data persistence layer.
│   │   ├── profileUpdates.ts                # Service for handling manual updates to a company profile.
│   │   └── runCollection.ts                 # Service that orchestrates the entire intel collection process.
│   ├── tavily/                              # Module for interacting with the Tavily API for web scraping.
│   │   ├── collect.ts                       # Orchestrates site mapping and scraping via the Tavily API.
│   │   ├── index.ts                         # Barrel file for the Tavily module.
│   │   ├── selectors.ts                     # URL ranking heuristics to select relevant pages for scraping.
│   │   └── types.ts                         # TypeScript types related to the Tavily API and orchestration.
│   └── transformers/                        # Functions for transforming data between different formats.
│       ├── favicon.ts                       # Helper to extract a favicon URL from scrape results.
│       ├── index.ts                         # Barrel file for data transformers.
│       └── pages.ts                         # Formats scraped page content into XML for AI agent consumption.
└── shared/                                  # Code shared between the client and server.
    ├── constants/                           # Shared constant values.
    │   └── index.ts                         # Exports shared constants like rate limits and allowlists.
    ├── index.ts                             # Barrel file for the shared module.
    ├── mappers/                             # Shared functions for mapping data structures.
    │   └── index.ts                         # Contains a function to build a snapshot preview object.
    └── types/                               # Shared TypeScript type definitions.
        └── index.ts                         # Exports core data types used by both client and server.
