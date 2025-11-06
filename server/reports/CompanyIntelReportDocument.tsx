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
    borderBottomColor: '#e4e4df',
    borderBottomStyle: 'solid',
    paddingBottom: 20,
    marginBottom: 26,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerMeta: {
    alignItems: 'flex-end',
  },
  section: {
    marginBottom: 26,
  },
  sectionTitle: {
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: '#7a7a76',
  },
  sectionDescription: {
    marginTop: 2,
    fontSize: 10,
    color: '#7f7f7b',
  },
  sectionCard: {
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e4e4df',
    backgroundColor: '#ffffff',
    padding: 16,
  },
  sectionCardSoft: {
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e4e4df',
    backgroundColor: '#fcfcfb',
    padding: 18,
  },
  sectionBody: {
    fontSize: 11,
    color: '#181818',
  },
  emptyText: {
    fontSize: 10,
    color: '#8a8a85',
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
    textAlign: 'right',
  },
  statRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 18,
  },
  statCard: {
    flexGrow: 1,
    flexBasis: '45%',
    minWidth: 120,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e7e7e3',
    marginRight: 10,
    marginBottom: 10,
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
  chipList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
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
    marginRight: 6,
    marginBottom: 6,
  },
  offeringList: {
    display: 'flex',
    flexDirection: 'column',
  },
  offeringCard: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ecece8',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
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
  valuePropList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginRight: -10,
  },
  valuePropCard: {
    flexGrow: 1,
    flexBasis: '45%',
    minWidth: 140,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e7e7e3',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginRight: 10,
    marginBottom: 10,
  },
  valuePropText: {
    fontSize: 10.5,
    color: '#3a3a37',
    lineHeight: 1.4,
  },
});

function renderPrimaryIndustries(primaryIndustries: readonly string[]): ReactElement {
  const hasIndustries = primaryIndustries.length > 0;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Primary industries</Text>
      <Text style={styles.sectionDescription}>Sectors most frequently referenced across your content.</Text>
      <View style={styles.sectionCard}>
        {hasIndustries ? (
          <View style={styles.chipList}>
            {primaryIndustries.map(industry => (
              <Text key={industry} style={styles.chip}>
                {industry}
              </Text>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyText}>No industries identified yet.</Text>
        )}
      </View>
    </View>
  );
}

function renderKeyOfferings(keyOfferings: CompanyIntelReportDocumentProps['keyOfferings']): ReactElement {
  const hasOfferings = keyOfferings.length > 0;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Key offerings</Text>
      <Text style={styles.sectionDescription}>Products and services highlighted on your site.</Text>
      <View style={styles.sectionCard}>
        {hasOfferings ? (
          <View style={styles.offeringList}>
            {keyOfferings.map((offering, index) => (
              <View key={`${offering.title}-${index}`} style={styles.offeringCard}>
                <Text style={styles.offeringTitle}>{offering.title}</Text>
                {offering.description ? (
                  <Text style={styles.offeringDescription}>{offering.description}</Text>
                ) : null}
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyText}>Run a collection to capture product highlights.</Text>
        )}
      </View>
    </View>
  );
}

function renderValueProps(valueProps: readonly string[]): ReactElement {
  const hasValueProps = valueProps.length > 0;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Value propositions</Text>
      <Text style={styles.sectionDescription}>Core differentiators surfaced across your public pages.</Text>
      <View style={styles.sectionCard}>
        {hasValueProps ? (
          <View style={styles.valuePropList}>
            {valueProps.map((value, index) => (
              <View key={`${value}-${index}`} style={styles.valuePropCard}>
                <Text style={styles.valuePropText}>{value}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyText}>No distinct value props captured yet.</Text>
        )}
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
            <View style={styles.headerMeta}>
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
            <Text style={styles.sectionTitle}>Executive overview</Text>
            <Text style={styles.sectionDescription}>AI-generated narrative from the latest run.</Text>
            <View style={styles.sectionCardSoft}>
              <Text style={styles.overviewText}>{overview}</Text>
            </View>
          </View>
        ) : null}

        {renderPrimaryIndustries(industriesToDisplay)}
        {renderKeyOfferings(offeringsToDisplay)}
        {renderValueProps(valuePropsToDisplay)}
      </Page>
    </Document>
  );
}
