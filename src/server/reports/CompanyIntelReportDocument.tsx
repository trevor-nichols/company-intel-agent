// ------------------------------------------------------------------------------------------------
//                CompanyIntelReportDocument.tsx - PDF layout for company intel snapshot exports - Dependencies: @react-pdf/renderer
// ------------------------------------------------------------------------------------------------

import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import type { ReactElement } from 'react';

export interface CompanyIntelReportDocumentProps {
  readonly companyName: string;
  readonly domain: string;
  readonly generatedAtLabel: string;
  readonly tagline: string | null;
  readonly overview: string | null;
  readonly stats: ReadonlyArray<{ readonly label: string; readonly value: string }>;
  readonly valueProps: readonly string[];
  readonly keyOfferings: ReadonlyArray<{
    readonly title: string;
    readonly description?: string;
  }>;
  readonly primaryIndustries: readonly string[];
}

const styles = StyleSheet.create({
  // ------------------------------------------------------------------------------------------------
  //                Layout containers
  // ------------------------------------------------------------------------------------------------
  page: {
    padding: 40,
    backgroundColor: '#f8f8f6',
    color: '#141414',
    fontFamily: 'Helvetica',
    fontSize: 11,
    lineHeight: 1.5,
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: '#e7e7e3',
    borderBottomStyle: 'solid',
    paddingBottom: 20,
    marginBottom: 22,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: '#7a7a76',
    marginBottom: 6,
  },
  sectionBody: {
    fontSize: 11,
    color: '#181818',
  },
  // ------------------------------------------------------------------------------------------------
  //                Header styles
  // ------------------------------------------------------------------------------------------------
  companyName: {
    fontSize: 26,
    fontWeight: 'bold',
    letterSpacing: 0.2,
    color: '#111111',
  },
  tagline: {
    fontSize: 14,
    color: '#474743',
    marginTop: 6,
    lineHeight: 1.4,
  },
  metaRow: {
    marginTop: 14,
    fontSize: 10,
    color: '#7d7d79',
  },
  // ------------------------------------------------------------------------------------------------
  //                Section specifics
  // ------------------------------------------------------------------------------------------------
  listItem: {
    marginBottom: 6,
  },
  listItemTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  listItemDescription: {
    fontSize: 10.5,
    color: '#323232',
  },
  sourceUrl: {
    fontSize: 10,
    color: '#5a5a56',
  },
  statRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 18,
  },
  statCard: {
    flexGrow: 1,
    minWidth: 110,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e7e7e3',
  },
  statLabel: {
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: '#868682',
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#141414',
    marginTop: 4,
  },
  overviewText: {
    fontSize: 11,
    color: '#242421',
    lineHeight: 1.55,
  },
  gridTwo: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 12,
  },
  gridColumn: {
    flex: 1,
    gap: 10,
  },
  chipList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  chip: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e0e0dc',
    backgroundColor: '#ffffff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    fontSize: 10,
    color: '#393935',
  },
  offeringCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ecece8',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  offeringTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1a1a18',
    marginBottom: 4,
  },
  offeringDescription: {
    fontSize: 10,
    color: '#4a4a46',
    lineHeight: 1.4,
  },
  listOverflowNote: {
    fontSize: 10,
    color: '#7a7a76',
    marginTop: 6,
  },
});

function renderKeyOfferings(
  keyOfferings: CompanyIntelReportDocumentProps['keyOfferings'],
): ReactElement | null {
  if (keyOfferings.length === 0) {
    return null;
  }

  const MAX_ITEMS = 3;
  const items = keyOfferings.slice(0, MAX_ITEMS);
  const remaining = keyOfferings.length - items.length;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionHeader}>Key Offerings</Text>
      <View style={styles.sectionBody}>
        {items.map(offering => (
          <View key={offering.title} style={styles.offeringCard}>
            <Text style={styles.offeringTitle}>{offering.title}</Text>
            {offering.description ? (
              <Text style={styles.offeringDescription}>{offering.description}</Text>
            ) : null}
          </View>
        ))}
        {remaining > 0 ? (
          <Text style={styles.listOverflowNote}>+{remaining} more offering{remaining > 1 ? 's' : ''}</Text>
        ) : null}
      </View>
    </View>
  );
}

function renderValueProps(valueProps: readonly string[]): ReactElement | null {
  if (valueProps.length === 0) {
    return null;
  }

  const MAX_ITEMS = 6;
  const items = valueProps.slice(0, MAX_ITEMS);
  const remaining = valueProps.length - items.length;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionHeader}>Value Propositions</Text>
      <View style={styles.sectionBody}>
        {items.map(value => (
          <View key={value} style={styles.listItem}>
            <Text>{value}</Text>
          </View>
        ))}
        {remaining > 0 ? (
          <Text style={styles.listOverflowNote}>+{remaining} more value prop{remaining > 1 ? 's' : ''}</Text>
        ) : null}
      </View>
    </View>
  );
}

function renderPrimaryIndustries(primaryIndustries: readonly string[]): ReactElement | null {
  if (primaryIndustries.length === 0) {
    return null;
  }

  const MAX_ITEMS = 6;
  const items = primaryIndustries.slice(0, MAX_ITEMS);
  const remaining = primaryIndustries.length - items.length;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionHeader}>Primary Industries</Text>
      <View style={styles.sectionBody}>
        <View style={styles.chipList}>
          {items.map(industry => (
            <Text key={industry} style={styles.chip}>
              {industry}
            </Text>
          ))}
        </View>
        {remaining > 0 ? (
          <Text style={styles.listOverflowNote}>+{remaining} more industr{remaining > 1 ? 'ies' : 'y'}</Text>
        ) : null}
      </View>
    </View>
  );
}

export function CompanyIntelReportDocument({
  companyName,
  domain,
  generatedAtLabel,
  tagline,
  overview,
  stats,
  valueProps,
  keyOfferings,
  primaryIndustries,
}: CompanyIntelReportDocumentProps): ReactElement {
  const valuePropsToDisplay = valueProps ?? [];
  const industriesToDisplay = primaryIndustries ?? [];
  const offeringsToDisplay = keyOfferings ?? [];

  return (
    <Document author="AgenAI" title={`${companyName} · Company Intel Snapshot`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.companyName}>{companyName}</Text>
              {tagline ? <Text style={styles.tagline}>{tagline}</Text> : null}
            </View>
            <View>
              <Text style={styles.metaRow}>{domain}</Text>
              <Text style={styles.metaRow}>Generated {generatedAtLabel}</Text>
            </View>
          </View>

          {stats.length > 0 ? (
            <View style={styles.statRow}>
              {stats.map(stat => (
                <View key={stat.label} style={styles.statCard}>
                  <Text style={styles.statLabel}>{stat.label}</Text>
                  <Text style={styles.statValue}>{stat.value}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>

        {overview ? (
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>Executive Overview</Text>
            <Text style={styles.overviewText}>{overview}</Text>
          </View>
        ) : null}

        <View style={styles.gridTwo}>
          <View style={styles.gridColumn}>
            {renderValueProps(valuePropsToDisplay)}
            {renderPrimaryIndustries(industriesToDisplay)}
          </View>
          <View style={styles.gridColumn}>{renderKeyOfferings(offeringsToDisplay)}</View>
        </View>
      </Page>
    </Document>
  );
}
