import { Document, Page, StyleSheet, Text, View, pdf } from "@react-pdf/renderer";
import { phases, globalDisclaimer } from "./constants";
import { formatDate, formatDeadlinePair, getComputedDueDate, getComputedStatutoryDate, parseLocalDate } from "./dateUtils";
import { getCompletionPercent, getOwnerPendingCounts, getPhaseTasks, getReadiness, getUpcomingDeadlines } from "./rules";
import { percent } from "./utils";
import type { Deal, Task } from "./types";

const closedStatuses = ["Completed", "Waived", "Converted to CS", "Not Applicable"];

const palette = {
  accent: "#0d9488",
  text: "#16201f",
  muted: "#5f6b69",
  line: "#dfe5e4",
  danger: "#c2410c",
  success: "#15803d",
  warning: "#b45309",
  panel: "#f4f7f6"
};

const styles = StyleSheet.create({
  page: { paddingTop: 40, paddingBottom: 56, paddingHorizontal: 44, fontSize: 9.5, color: palette.text, fontFamily: "Helvetica", lineHeight: 1.4 },
  eyebrow: { fontSize: 8, letterSpacing: 1.4, color: palette.accent, textTransform: "uppercase", fontFamily: "Helvetica-Bold" },
  h1: { fontSize: 22, fontFamily: "Helvetica-Bold", marginTop: 4 },
  coverMeta: { marginTop: 14, flexDirection: "row", flexWrap: "wrap" },
  metaItem: { width: "50%", marginBottom: 8 },
  metaLabel: { fontSize: 7.5, letterSpacing: 0.8, color: palette.muted, textTransform: "uppercase" },
  metaValue: { fontSize: 11, fontFamily: "Helvetica-Bold", marginTop: 1 },
  verdictBox: { marginTop: 16, borderRadius: 6, padding: 14, borderWidth: 1, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  verdictLabel: { fontSize: 13, fontFamily: "Helvetica-Bold" },
  verdictScore: { fontSize: 30, fontFamily: "Helvetica-Bold" },
  sectionTitle: { fontSize: 12, fontFamily: "Helvetica-Bold", marginTop: 22, marginBottom: 8, paddingBottom: 4, borderBottomWidth: 1, borderBottomColor: palette.line },
  kpiRow: { flexDirection: "row", marginTop: 2 },
  kpiCard: { flex: 1, marginRight: 8, borderWidth: 1, borderColor: palette.line, borderRadius: 5, padding: 9, backgroundColor: palette.panel },
  kpiValue: { fontSize: 17, fontFamily: "Helvetica-Bold" },
  kpiLabel: { fontSize: 7.5, color: palette.muted, marginTop: 2, textTransform: "uppercase", letterSpacing: 0.5 },
  paragraph: { marginTop: 2, color: palette.text },
  listItem: { flexDirection: "row", marginBottom: 3 },
  bullet: { width: 10, color: palette.accent },
  listText: { flex: 1 },
  muted: { color: palette.muted },
  tableHeader: { flexDirection: "row", backgroundColor: palette.panel, borderBottomWidth: 1, borderBottomColor: palette.line, paddingVertical: 4, paddingHorizontal: 4 },
  tableRow: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: palette.line, paddingVertical: 4, paddingHorizontal: 4 },
  th: { fontSize: 7.5, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 0.4, color: palette.muted },
  td: { fontSize: 8.5 },
  progressTrack: { height: 6, backgroundColor: palette.panel, borderRadius: 3, marginTop: 4, marginBottom: 8 },
  progressFill: { height: 6, borderRadius: 3, backgroundColor: palette.accent },
  footer: { position: "absolute", bottom: 24, left: 44, right: 44, borderTopWidth: 1, borderTopColor: palette.line, paddingTop: 6, fontSize: 7, color: palette.muted },
  disclaimerPage: { padding: 56, fontSize: 9.5, color: palette.text, fontFamily: "Helvetica", lineHeight: 1.5 }
});

function daysToClosing(closingDateX: string): number | null {
  const target = parseLocalDate(closingDateX);
  if (!target) return null;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.ceil((target.getTime() - today.getTime()) / 86_400_000);
}

function statutoryCellText(task: Task, closingDateX: string): string {
  const date = getComputedStatutoryDate(task, closingDateX);
  if (date) return formatDate(date);
  if (task.statutoryDeadlineNote) return task.statutoryDeadlineNote;
  if (task.filing?.statutoryDays) return `${task.filing.statutoryDays}d / ${task.filing.statutoryTrigger ?? "trigger"}`;
  return "-";
}

function Bulleted({ items, emptyText }: { items: string[]; emptyText: string }) {
  if (!items.length) return <Text style={styles.paragraph}>{emptyText}</Text>;
  return (
    <View>
      {items.map((item, index) => (
        <View key={index} style={styles.listItem}>
          <Text style={styles.bullet}>•</Text>
          <Text style={styles.listText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

export function ClosingStatusReport({ deal }: { deal: Deal }) {
  const readiness = getReadiness(deal);
  const cpTasks = getPhaseTasks(deal.tasks, "Conditions Precedent");
  const cpPercent = percent(cpTasks.filter((task) => closedStatuses.includes(task.status)).length, cpTasks.length);
  const overall = getCompletionPercent(deal.tasks);
  const days = daysToClosing(deal.closingDateX);
  const upcoming = getUpcomingDeadlines(deal, 8);
  const ownerCounts = Object.entries(getOwnerPendingCounts(deal.tasks)).sort((a, b) => b[1] - a[1]);
  const postClosing = getPhaseTasks(deal.tasks, "Post-Closing Actions");
  const reportDate = formatDate(new Date());
  const verdictColor = readiness.ready ? palette.success : palette.danger;

  const whyNot = [
    ...readiness.blockers.map((task) => `Blocker open: ${task.serialNumber} ${task.action}`),
    ...readiness.mandatoryIncomplete.map((task) => `Mandatory item incomplete: ${task.serialNumber} ${task.action}`),
    ...readiness.missingEvidence.map((task) => `Evidence outstanding: ${task.serialNumber} ${task.action}`),
    ...readiness.missingAgreedForm.map((task) => `Not in agreed form: ${task.serialNumber} ${task.action}`)
  ];
  const dedupedWhyNot = Array.from(new Set(whyNot)).slice(0, 14);

  return (
    <Document title={`Closing Status Report - ${deal.name}`} author={deal.firmLabel}>
      <Page size="A4" style={styles.page}>
        <Text style={styles.eyebrow}>{deal.firmLabel} · Closing Status Report</Text>
        <Text style={styles.h1}>{deal.name}</Text>

        <View style={styles.coverMeta}>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Company</Text>
            <Text style={styles.metaValue}>{deal.companyName || "-"}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Investor</Text>
            <Text style={styles.metaValue}>{deal.investorName || "-"}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Closing Date X</Text>
            <Text style={styles.metaValue}>{deal.closingDateX ? formatDate(getComputedDueDate({ timeline: "X" }, deal.closingDateX)) : "Not set"}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Report date</Text>
            <Text style={styles.metaValue}>{reportDate}</Text>
          </View>
        </View>

        <View style={[styles.verdictBox, { borderColor: verdictColor }]}>
          <View>
            <Text style={styles.metaLabel}>Closing readiness</Text>
            <Text style={[styles.verdictLabel, { color: verdictColor }]}>{readiness.ready ? "Ready to close" : "Not ready to close"}</Text>
          </View>
          <Text style={[styles.verdictScore, { color: verdictColor }]}>{readiness.score}%</Text>
        </View>

        <Text style={styles.sectionTitle}>Executive summary</Text>
        <Text style={styles.paragraph}>
          {readiness.ready
            ? "Mandatory pre-closing items and conditions precedent are operationally satisfied on the tracker. Confirm signed evidence and statutory filings before relying on this status."
            : "Closing should not proceed until the items below are resolved, waived, or converted to CS where appropriate. This report reflects tracked status only."}
        </Text>
        <View style={styles.kpiRow}>
          <View style={styles.kpiCard}><Text style={styles.kpiValue}>{overall}%</Text><Text style={styles.kpiLabel}>Overall complete</Text></View>
          <View style={styles.kpiCard}><Text style={styles.kpiValue}>{cpPercent}%</Text><Text style={styles.kpiLabel}>CP complete</Text></View>
          <View style={styles.kpiCard}><Text style={styles.kpiValue}>{readiness.blockers.length}</Text><Text style={styles.kpiLabel}>Open blockers</Text></View>
          <View style={[styles.kpiCard, { marginRight: 0 }]}><Text style={styles.kpiValue}>{days === null ? "-" : days}</Text><Text style={styles.kpiLabel}>Days to X</Text></View>
        </View>

        <Text style={styles.sectionTitle}>Readiness detail</Text>
        <Bulleted items={dedupedWhyNot} emptyText="No outstanding readiness items. All mandatory and CP checks are operationally satisfied." />

        <Text style={styles.sectionTitle}>Upcoming deadlines</Text>
        <View style={styles.tableHeader}>
          <Text style={[styles.th, { width: "10%" }]}>S.No.</Text>
          <Text style={[styles.th, { width: "44%" }]}>Action</Text>
          <Text style={[styles.th, { width: "20%" }]}>Internal due</Text>
          <Text style={[styles.th, { width: "26%" }]}>Statutory limit</Text>
        </View>
        {upcoming.length ? (
          upcoming.map((task) => (
            <View key={task.id} style={styles.tableRow} wrap={false}>
              <Text style={[styles.td, { width: "10%" }]}>{task.serialNumber}</Text>
              <Text style={[styles.td, { width: "44%" }]}>{task.action}</Text>
              <Text style={[styles.td, { width: "20%" }]}>{formatDate(getComputedDueDate(task, deal.closingDateX))}</Text>
              <Text style={[styles.td, { width: "26%" }]}>{statutoryCellText(task, deal.closingDateX)}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.paragraph}>Set Closing Date X to compute deadlines.</Text>
        )}

        <Text style={styles.sectionTitle}>Owner-wise pending</Text>
        {ownerCounts.length ? (
          ownerCounts.map(([owner, count]) => (
            <View key={owner} style={styles.listItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.listText}>{owner}: {count} open</Text>
            </View>
          ))
        ) : (
          <Text style={styles.paragraph}>No pending items.</Text>
        )}

        <Text style={styles.sectionTitle}>Phase progress</Text>
        {phases.map((phase) => {
          const phaseTasks = getPhaseTasks(deal.tasks, phase);
          const value = getCompletionPercent(phaseTasks);
          return (
            <View key={phase}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={styles.td}>{phase}</Text>
                <Text style={[styles.td, { fontFamily: "Helvetica-Bold" }]}>{value}%</Text>
              </View>
              <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${value}%` }]} /></View>
            </View>
          );
        })}

        <Text style={styles.sectionTitle}>Post-closing tail</Text>
        {postClosing.map((task) => (
          <View key={task.id} style={styles.listItem} wrap={false}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.listText}>{task.serialNumber} ({task.status}): {formatDeadlinePair(task, deal.closingDateX)} - {task.action}</Text>
          </View>
        ))}

        <Text style={styles.footer} fixed>{globalDisclaimer}</Text>
      </Page>

      <Page size="A4" style={styles.disclaimerPage}>
        <Text style={styles.eyebrow}>Important notice</Text>
        <Text style={[styles.h1, { fontSize: 16 }]}>Status report - confidentiality & scope</Text>
        <Text style={{ marginTop: 12 }}>{globalDisclaimer}</Text>
        <Text style={{ marginTop: 10 }}>
          This report is generated from process and status metadata only. It does not contain, and must not be relied upon as, confidential client material, deal documents, financials, or legal advice. Statutory deadlines shown are tracking aids and must be confirmed against the current Companies Act 2013, FEMA/RBI rules, and applicable stamp laws by qualified counsel.
        </Text>
        <Text style={{ marginTop: 10, color: palette.muted }}>Prepared by {deal.firmLabel} · {reportDate}</Text>
      </Page>
    </Document>
  );
}

export async function downloadPdfReport(deal: Deal): Promise<void> {
  const blob = await pdf(<ClosingStatusReport deal={deal} />).toBlob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `closing-status-report-${deal.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.pdf`;
  anchor.click();
  URL.revokeObjectURL(url);
}
