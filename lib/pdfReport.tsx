import React from "react";
import { Document, Font, Page, StyleSheet, Text, View, pdf } from "@react-pdf/renderer";
import { phases, globalDisclaimer, statutoryVerificationDisclaimer } from "./constants";
import { formatDate, formatDeadlinePair, getComputedDueDate, getComputedStatutoryDate, parseLocalDate } from "./dateUtils";
import { getCompletionPercent, getOwnerPendingCounts, getPhaseTasks, getReadiness, getUpcomingDeadlines } from "./rules";
import { percent } from "./utils";
import type { Deal, Task } from "./types";

type PdfReportOptions = {
  includeNotes?: boolean;
};

type TypefaceStyle = {
  fontFamily: string;
  fontWeight?: 400 | 500 | 600 | 700;
};

type PdfTypefaces = {
  body: TypefaceStyle;
  bodyBold: TypefaceStyle;
  serif: TypefaceStyle;
  serifBold: TypefaceStyle;
  mono: TypefaceStyle;
  monoBold: TypefaceStyle;
};

type PdfFontSourceSet = {
  serifRegular: string;
  serifBold: string;
  sansRegular: string;
  sansBold: string;
  monoRegular: string;
  monoBold: string;
};

const closedStatuses = ["Completed", "Waived", "Converted to CS", "Not Applicable"];

const fallbackTypefaces: PdfTypefaces = {
  body: { fontFamily: "Helvetica" },
  bodyBold: { fontFamily: "Helvetica-Bold" },
  serif: { fontFamily: "Times-Roman" },
  serifBold: { fontFamily: "Times-Bold" },
  mono: { fontFamily: "Courier" },
  monoBold: { fontFamily: "Courier-Bold" }
};

const registeredTypefaces: PdfTypefaces = {
  body: { fontFamily: "PdfEditorialSans", fontWeight: 400 },
  bodyBold: { fontFamily: "PdfEditorialSans", fontWeight: 700 },
  serif: { fontFamily: "PdfEditorialSerif", fontWeight: 400 },
  serifBold: { fontFamily: "PdfEditorialSerif", fontWeight: 700 },
  mono: { fontFamily: "PdfEditorialMono", fontWeight: 400 },
  monoBold: { fontFamily: "PdfEditorialMono", fontWeight: 700 }
};

const localFontSourceSet: PdfFontSourceSet = {
  serifRegular: "/fonts/source-serif-4-regular.ttf",
  serifBold: "/fonts/source-serif-4-bold.ttf",
  sansRegular: "/fonts/inter-regular.ttf",
  sansBold: "/fonts/inter-bold.ttf",
  monoRegular: "/fonts/roboto-mono-regular.ttf",
  monoBold: "/fonts/roboto-mono-bold.ttf"
};

let activeTypefaces = fallbackTypefaces;
let fontPreparation: Promise<void> | null = null;

export function getPdfTypefaces(): PdfTypefaces {
  return activeTypefaces;
}

export function preparePdfFonts(): Promise<void> {
  if (fontPreparation) return fontPreparation;

  fontPreparation = (async () => {
    const sourceSet = await findAvailableFontSourceSet();
    if (!sourceSet) return;

    try {
      Font.register({
        family: "PdfEditorialSerif",
        fonts: [
          { src: sourceSet.serifRegular, fontWeight: 400 },
          { src: sourceSet.serifBold, fontWeight: 700 }
        ]
      });
      Font.register({
        family: "PdfEditorialSans",
        fonts: [
          { src: sourceSet.sansRegular, fontWeight: 400 },
          { src: sourceSet.sansBold, fontWeight: 700 }
        ]
      });
      Font.register({
        family: "PdfEditorialMono",
        fonts: [
          { src: sourceSet.monoRegular, fontWeight: 400 },
          { src: sourceSet.monoBold, fontWeight: 700 }
        ]
      });
      activeTypefaces = registeredTypefaces;
    } catch {
      activeTypefaces = fallbackTypefaces;
    }
  })();

  return fontPreparation;
}

async function findAvailableFontSourceSet(): Promise<PdfFontSourceSet | null> {
  const nodeSourceSet = getNodeFontSourceSet();
  if (nodeSourceSet) return nodeSourceSet;

  if (typeof fetch !== "function") return null;

  const sources = [
    localFontSourceSet.serifRegular,
    localFontSourceSet.serifBold,
    localFontSourceSet.sansRegular,
    localFontSourceSet.sansBold,
    localFontSourceSet.monoRegular,
    localFontSourceSet.monoBold
  ];

  try {
    const available = await Promise.all(
      sources.map(async (source) => {
        const response = await fetch(source, { method: "HEAD" });
        return response.ok;
      })
    );
    if (available.every(Boolean)) return localFontSourceSet;
  } catch {
    return null;
  }

  return null;
}

function getNodeFontSourceSet(): PdfFontSourceSet | null {
  if (typeof window !== "undefined" || typeof process === "undefined" || typeof process.cwd !== "function") return null;

  const fontRoot = `${process.cwd().replaceAll("\\", "/")}/public/fonts`;
  return {
    serifRegular: `${fontRoot}/source-serif-4-regular.ttf`,
    serifBold: `${fontRoot}/source-serif-4-bold.ttf`,
    sansRegular: `${fontRoot}/inter-regular.ttf`,
    sansBold: `${fontRoot}/inter-bold.ttf`,
    monoRegular: `${fontRoot}/roboto-mono-regular.ttf`,
    monoBold: `${fontRoot}/roboto-mono-bold.ttf`
  };
}

const palette = {
  paper: "#fbfaf7",
  ink: "#16201f",
  muted: "#60706d",
  line: "#d9ded9",
  wash: "#f0f4f1",
  teal: "#0f766e",
  oxblood: "#9f2d20",
  danger: "#b42318",
  success: "#157347",
  warning: "#a35b12"
};

const internalMarkText = "INTERNAL - contains status notes - not for external distribution";

const styles = StyleSheet.create({
  page: {
    paddingTop: 44,
    paddingBottom: 58,
    paddingHorizontal: 44,
    fontSize: 9.5,
    color: palette.ink,
    lineHeight: 1.38,
    backgroundColor: palette.paper
  },
  internalPage: { paddingTop: 62 },
  disclaimerPage: {
    paddingTop: 58,
    paddingBottom: 58,
    paddingHorizontal: 54,
    fontSize: 9.5,
    color: palette.ink,
    lineHeight: 1.5,
    backgroundColor: palette.paper
  },
  internalMark: {
    position: "absolute",
    top: 20,
    left: 44,
    right: 44,
    textAlign: "center",
    fontSize: 7.5,
    letterSpacing: 1.1,
    color: palette.oxblood,
    textTransform: "uppercase"
  },
  eyebrow: { fontSize: 8, letterSpacing: 1.4, color: palette.teal, textTransform: "uppercase" },
  h1: { fontSize: 25, marginTop: 5, lineHeight: 1.1 },
  memoSubhead: { marginTop: 6, fontSize: 10.5, color: palette.muted },
  rule: { marginTop: 16, borderTopWidth: 1.2, borderTopColor: palette.ink },
  coverMeta: { marginTop: 16, flexDirection: "row", flexWrap: "wrap" },
  metaItem: { width: "50%", marginBottom: 9 },
  metaLabel: { fontSize: 7.5, letterSpacing: 0.8, color: palette.muted, textTransform: "uppercase" },
  metaValue: { fontSize: 11.2, marginTop: 2 },
  verdictBox: {
    marginTop: 17,
    borderRadius: 5,
    padding: 14,
    borderWidth: 1.1,
    backgroundColor: "#fffdf8",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  verdictLabel: { fontSize: 14 },
  verdictScore: { fontSize: 34, lineHeight: 1 },
  sectionTitle: {
    fontSize: 13,
    marginTop: 23,
    marginBottom: 8,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: palette.line
  },
  sectionKicker: { fontSize: 7.5, letterSpacing: 1, textTransform: "uppercase", color: palette.muted, marginBottom: 3 },
  kpiRow: { flexDirection: "row", marginTop: 9 },
  kpiCard: { flex: 1, marginRight: 8, borderWidth: 1, borderColor: palette.line, borderRadius: 4, padding: 9, backgroundColor: palette.wash },
  kpiValue: { fontSize: 18 },
  kpiLabel: { fontSize: 7.3, color: palette.muted, marginTop: 2, textTransform: "uppercase", letterSpacing: 0.5 },
  paragraph: { marginTop: 2, color: palette.ink },
  noteParagraph: { marginTop: 5, color: palette.oxblood },
  listItem: { flexDirection: "row", marginBottom: 3.5 },
  bullet: { width: 10, color: palette.teal },
  statutoryBullet: { width: 10, color: palette.oxblood },
  listText: { flex: 1 },
  muted: { color: palette.muted },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: palette.wash,
    borderTopWidth: 1,
    borderTopColor: palette.line,
    borderBottomWidth: 1,
    borderBottomColor: palette.line,
    paddingVertical: 5,
    paddingHorizontal: 4
  },
  tableRow: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: palette.line, paddingVertical: 4.5, paddingHorizontal: 4 },
  th: { fontSize: 7.4, textTransform: "uppercase", letterSpacing: 0.4, color: palette.muted },
  td: { fontSize: 8.3 },
  tdSmall: { fontSize: 7.7, color: palette.muted },
  statutoryText: { color: palette.oxblood },
  progressTrack: { height: 6, backgroundColor: palette.wash, borderRadius: 3, marginTop: 4, marginBottom: 8 },
  progressFill: { height: 6, borderRadius: 3, backgroundColor: palette.teal },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 44,
    right: 44,
    borderTopWidth: 1,
    borderTopColor: palette.line,
    paddingTop: 6,
    fontSize: 7,
    color: palette.muted
  }
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
  if (task.filing?.statutoryDays) return `${task.filing.statutoryDays} days from ${task.filing.statutoryTrigger ?? "trigger"}`;
  if (task.filing) return `${task.filing.form} - ${task.filing.authority}`;
  return "-";
}

function sourceCellText(task: Task): string {
  if (task.filing) return `${task.filing.form} - ${task.filing.authority}`;
  return task.sourceReference;
}

function taskLine(task: Task): string {
  return `${task.serialNumber} ${task.action}`;
}

function slugify(value: string): string {
  const slug = value.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();
  return slug || "deal";
}

function Bulleted({ items, emptyText }: { items: string[]; emptyText: string }) {
  const typefaces = getPdfTypefaces();
  if (!items.length) return <Text style={[styles.paragraph, typefaces.body]}>{emptyText}</Text>;
  return (
    <View>
      {items.map((item, index) => (
        <View key={index} style={styles.listItem}>
          <Text style={[styles.bullet, typefaces.bodyBold]}>-</Text>
          <Text style={[styles.listText, typefaces.body]}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

function InternalMark({ includeNotes }: { includeNotes: boolean }) {
  const typefaces = getPdfTypefaces();
  if (!includeNotes) return null;
  return <Text style={[styles.internalMark, typefaces.bodyBold]} fixed>{internalMarkText}</Text>;
}

export function ClosingStatusReport({ deal, includeNotes = false }: { deal: Deal; includeNotes?: boolean }) {
  const typefaces = getPdfTypefaces();
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
  const closingDate = parseLocalDate(deal.closingDateX);
  const notedTasks = includeNotes ? deal.tasks.filter((task) => task.notes.trim().length > 0) : [];

  const whyNot = [
    ...readiness.blockers.map((task) => `Blocker open: ${taskLine(task)}`),
    ...readiness.mandatoryIncomplete.map((task) => `Mandatory item incomplete: ${taskLine(task)}`),
    ...readiness.missingEvidence.map((task) => `Evidence outstanding: ${taskLine(task)}`),
    ...readiness.missingAgreedForm.map((task) => `Not in agreed form: ${taskLine(task)}`)
  ];
  const dedupedWhyNot = Array.from(new Set(whyNot)).slice(0, 14);

  return (
    <Document title={`Closing Status Memo - ${deal.name}${includeNotes ? " (Internal)" : ""}`} author={deal.firmLabel}>
      <Page size="A4" style={includeNotes ? [styles.page, styles.internalPage] : styles.page}>
        <InternalMark includeNotes={includeNotes} />
        <Text style={[styles.eyebrow, typefaces.bodyBold]}>{deal.firmLabel} - Closing Status Memo</Text>
        <Text style={[styles.h1, typefaces.serifBold]}>{deal.name}</Text>
        <Text style={[styles.memoSubhead, typefaces.body]}>
          A closing-day status memo generated from structured tracker signals{includeNotes ? " with internal status notes included." : "."}
        </Text>
        <View style={styles.rule} />

        <View style={styles.coverMeta}>
          <View style={styles.metaItem}>
            <Text style={[styles.metaLabel, typefaces.bodyBold]}>Company</Text>
            <Text style={[styles.metaValue, typefaces.serifBold]}>{deal.companyName || "-"}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={[styles.metaLabel, typefaces.bodyBold]}>Investor</Text>
            <Text style={[styles.metaValue, typefaces.serifBold]}>{deal.investorName || "-"}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={[styles.metaLabel, typefaces.bodyBold]}>Closing Date X</Text>
            <Text style={[styles.metaValue, typefaces.monoBold]}>{closingDate ? formatDate(closingDate) : "Not set"}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={[styles.metaLabel, typefaces.bodyBold]}>Memo date</Text>
            <Text style={[styles.metaValue, typefaces.monoBold]}>{reportDate}</Text>
          </View>
        </View>

        <View style={[styles.verdictBox, { borderColor: verdictColor }]}>
          <View>
            <Text style={[styles.metaLabel, typefaces.bodyBold]}>Closing readiness</Text>
            <Text style={[styles.verdictLabel, typefaces.serifBold, { color: verdictColor }]}>{readiness.ready ? "Ready to close" : "Not ready to close"}</Text>
          </View>
          <Text style={[styles.verdictScore, typefaces.monoBold, { color: verdictColor }]}>{readiness.score}%</Text>
        </View>

        <Text style={[styles.sectionTitle, typefaces.serifBold]}>Executive summary</Text>
        <Text style={[styles.paragraph, typefaces.body]}>
          {readiness.ready
            ? "Mandatory pre-closing items and conditions precedent are operationally satisfied on the tracker. Confirm signed evidence and statutory filings before relying on this status."
            : "Closing should not proceed until the items below are resolved, waived, or converted to CS where appropriate. This memo reflects tracked status only."}
        </Text>
        <View style={styles.kpiRow}>
          <View style={styles.kpiCard}><Text style={[styles.kpiValue, typefaces.monoBold]}>{overall}%</Text><Text style={[styles.kpiLabel, typefaces.bodyBold]}>Overall complete</Text></View>
          <View style={styles.kpiCard}><Text style={[styles.kpiValue, typefaces.monoBold]}>{cpPercent}%</Text><Text style={[styles.kpiLabel, typefaces.bodyBold]}>CP complete</Text></View>
          <View style={styles.kpiCard}><Text style={[styles.kpiValue, typefaces.monoBold]}>{readiness.blockers.length}</Text><Text style={[styles.kpiLabel, typefaces.bodyBold]}>Open blockers</Text></View>
          <View style={[styles.kpiCard, { marginRight: 0 }]}><Text style={[styles.kpiValue, typefaces.monoBold]}>{days === null ? "-" : days}</Text><Text style={[styles.kpiLabel, typefaces.bodyBold]}>Days to X</Text></View>
        </View>

        <Text style={[styles.sectionTitle, typefaces.serifBold]}>Readiness detail</Text>
        <Bulleted items={dedupedWhyNot} emptyText="No outstanding readiness items. All mandatory and CP checks are operationally satisfied." />

        <Text style={[styles.sectionTitle, typefaces.serifBold]}>Upcoming deadlines</Text>
        <View style={styles.tableHeader}>
          <Text style={[styles.th, typefaces.bodyBold, { width: "10%" }]}>S.No.</Text>
          <Text style={[styles.th, typefaces.bodyBold, { width: "44%" }]}>Action</Text>
          <Text style={[styles.th, typefaces.bodyBold, { width: "20%" }]}>Internal due</Text>
          <Text style={[styles.th, typefaces.bodyBold, { width: "26%" }]}>Statutory limit</Text>
        </View>
        {upcoming.length ? (
          upcoming.map((task) => (
            <View key={task.id} style={styles.tableRow} wrap={false}>
              <Text style={[styles.td, typefaces.monoBold, { width: "10%" }]}>{task.serialNumber}</Text>
              <Text style={[styles.td, typefaces.body, { width: "44%" }]}>{task.action}</Text>
              <Text style={[styles.td, typefaces.mono, { width: "20%" }]}>{formatDate(getComputedDueDate(task, deal.closingDateX))}</Text>
              <Text
                style={
                  task.filing || task.statutoryDeadlineNote
                    ? [styles.td, typefaces.monoBold, styles.statutoryText, { width: "26%" }]
                    : [styles.td, typefaces.monoBold, { width: "26%" }]
                }
              >
                {statutoryCellText(task, deal.closingDateX)}
              </Text>
            </View>
          ))
        ) : (
          <Text style={[styles.paragraph, typefaces.body]}>Set Closing Date X to compute deadlines.</Text>
        )}

        <Text style={[styles.sectionTitle, typefaces.serifBold]}>Owner-wise pending</Text>
        {ownerCounts.length ? (
          ownerCounts.map(([owner, count]) => (
            <View key={owner} style={styles.listItem}>
              <Text style={[styles.bullet, typefaces.bodyBold]}>-</Text>
              <Text style={[styles.listText, typefaces.body]}>{owner}: {count} open</Text>
            </View>
          ))
        ) : (
          <Text style={[styles.paragraph, typefaces.body]}>No pending items.</Text>
        )}

        <Text style={[styles.sectionTitle, typefaces.serifBold]}>Phase progress</Text>
        {phases.map((phase) => {
          const phaseTasks = getPhaseTasks(deal.tasks, phase);
          const value = getCompletionPercent(phaseTasks);
          return (
            <View key={phase}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={[styles.td, typefaces.body]}>{phase}</Text>
                <Text style={[styles.td, typefaces.monoBold]}>{value}%</Text>
              </View>
              <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${value}%` }]} /></View>
            </View>
          );
        })}

        <Text style={[styles.sectionTitle, typefaces.serifBold]}>Post-closing tail</Text>
        {postClosing.map((task) => (
          <View key={task.id} style={styles.listItem} wrap={false}>
            <Text style={[task.filing || task.statutoryDeadlineNote ? styles.statutoryBullet : styles.bullet, typefaces.bodyBold]}>-</Text>
            <Text style={[styles.listText, typefaces.body]}>
              <Text style={typefaces.monoBold}>{task.serialNumber}</Text> ({task.status}): {formatDeadlinePair(task, deal.closingDateX)} - {task.action}
            </Text>
          </View>
        ))}

        {includeNotes ? (
          <>
            <Text style={[styles.sectionTitle, typefaces.serifBold]}>Internal status notes</Text>
            <Text style={[styles.noteParagraph, typefaces.bodyBold]}>Included only for this internal copy. Do not distribute externally.</Text>
            {notedTasks.length ? (
              notedTasks.map((task) => (
                <View key={task.id} style={styles.listItem} wrap={false}>
                  <Text style={[styles.statutoryBullet, typefaces.bodyBold]}>-</Text>
                  <Text style={[styles.listText, typefaces.body]}>
                    <Text style={typefaces.monoBold}>{task.serialNumber}</Text>: {task.notes.trim()}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={[styles.paragraph, typefaces.body]}>No status notes recorded.</Text>
            )}
          </>
        ) : null}

        <Text style={[styles.sectionTitle, typefaces.serifBold]}>Full task register</Text>
        <View style={styles.tableHeader}>
          <Text style={[styles.th, typefaces.bodyBold, { width: "8%" }]}>S.No.</Text>
          <Text style={[styles.th, typefaces.bodyBold, { width: "34%" }]}>Task</Text>
          <Text style={[styles.th, typefaces.bodyBold, { width: "14%" }]}>Status</Text>
          <Text style={[styles.th, typefaces.bodyBold, { width: "14%" }]}>Owner</Text>
          <Text style={[styles.th, typefaces.bodyBold, { width: "14%" }]}>Due</Text>
          <Text style={[styles.th, typefaces.bodyBold, { width: "16%" }]}>Source</Text>
        </View>
        {deal.tasks.map((task) => (
          <View key={task.id} style={styles.tableRow} wrap={false}>
            <Text style={[styles.td, typefaces.monoBold, { width: "8%" }]}>{task.serialNumber}</Text>
            <Text style={[styles.td, typefaces.body, { width: "34%" }]}>
              {task.action}
              {task.filing || task.statutoryDeadlineNote ? ` Verify with counsel. ${statutoryVerificationDisclaimer}` : ""}
            </Text>
            <Text style={[styles.td, typefaces.body, { width: "14%" }]}>{task.status}</Text>
            <Text style={[styles.td, typefaces.body, { width: "14%" }]}>{task.owner}</Text>
            <Text style={[styles.tdSmall, typefaces.mono, { width: "14%" }]}>{formatDeadlinePair(task, deal.closingDateX)}</Text>
            <Text style={task.filing ? [styles.tdSmall, typefaces.body, styles.statutoryText, { width: "16%" }] : [styles.tdSmall, typefaces.body, { width: "16%" }]}>{sourceCellText(task)}</Text>
          </View>
        ))}

        <Text style={[styles.footer, typefaces.body]} fixed>{globalDisclaimer}</Text>
      </Page>

      <Page size="A4" style={includeNotes ? [styles.disclaimerPage, styles.internalPage] : styles.disclaimerPage}>
        <InternalMark includeNotes={includeNotes} />
        <Text style={[styles.eyebrow, typefaces.bodyBold]}>Important notice</Text>
        <Text style={[styles.h1, typefaces.serifBold, { fontSize: 16 }]}>Closing Status Memo - confidentiality and scope</Text>
        <Text style={[{ marginTop: 12 }, typefaces.body]}>{globalDisclaimer}</Text>
        {includeNotes ? (
          <Text style={[{ marginTop: 10 }, typefaces.body]}>
            This internal copy includes capped task status notes from the tracker. It is for internal firm coordination only and must not be shared with clients, counterparties, investors, or external advisers unless separately cleared. Statutory deadlines shown are tracking aids and must be confirmed against the current Companies Act 2013, FEMA/RBI rules, and applicable stamp laws by qualified counsel.
          </Text>
        ) : (
          <Text style={[{ marginTop: 10 }, typefaces.body]}>
            This memo is generated from process and status metadata only. It does not contain, and must not be relied upon as, confidential client material, deal documents, financials, status notes, or legal advice. Statutory deadlines shown are tracking aids and must be confirmed against the current Companies Act 2013, FEMA/RBI rules, and applicable stamp laws by qualified counsel.
          </Text>
        )}
        <Text style={[{ marginTop: 10, color: palette.muted }, typefaces.body]}>Prepared by {deal.firmLabel} - {reportDate}</Text>
      </Page>
    </Document>
  );
}

export async function downloadPdfReport(deal: Deal, options: PdfReportOptions = {}): Promise<void> {
  const includeNotes = options.includeNotes ?? false;
  await preparePdfFonts();

  let blob: Blob;
  try {
    blob = await pdf(<ClosingStatusReport deal={deal} includeNotes={includeNotes} />).toBlob();
  } catch {
    activeTypefaces = fallbackTypefaces;
    blob = await pdf(<ClosingStatusReport deal={deal} includeNotes={includeNotes} />).toBlob();
  }

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `closing-status-memo-${slugify(deal.name)}${includeNotes ? "-internal" : ""}.pdf`;
  anchor.click();
  URL.revokeObjectURL(url);
}
