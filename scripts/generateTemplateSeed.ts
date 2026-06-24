/**
 * Generates db/seed-template.sql from the TypeScript seed (lib/checklistSeed.ts)
 * so the database template tables stay a faithful, drift-free copy of the
 * legally-reviewed seed content.
 *
 * Run with:  npx tsx scripts/generateTemplateSeed.ts
 *
 * The output is a global seed template (organization_id IS NULL, is_seed = true)
 * that must be applied with a privileged connection (Supabase SQL editor or
 * service role) because RLS blocks clients from writing null-org templates.
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { seedTasks } from "../lib/checklistSeed";
import type { Task } from "../lib/types";

const TEMPLATE_ID = "00000000-0000-4000-8000-000000000001";
const TEMPLATE_NAME = "India Seed Financing - Private Placement";
const TEMPLATE_VERSION = 1;

function sqlString(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function sqlBool(value: boolean): string {
  return value ? "true" : "false";
}

function sqlJson(value: unknown): string {
  return `${sqlString(JSON.stringify(value))}::jsonb`;
}

function sqlNullableString(value: string | undefined | null): string {
  return value === undefined || value === null ? "null" : sqlString(value);
}

/** Template tasks store the clean baseline: no progress, nothing satisfied. */
function templateTaskValues(task: Task): string {
  const evidence = { ...task.evidence, satisfied: false };
  const cols = [
    sqlString(TEMPLATE_ID), // template_id
    "null", // organization_id (global seed)
    sqlString(task.id), // source_task_id
    sqlString(task.serialNumber),
    sqlString(task.phase),
    sqlString(task.timeline),
    sqlString(task.action),
    sqlJson(task.parties),
    sqlString(task.comments),
    sqlString(task.priority),
    sqlBool(false), // blocker (clean baseline)
    sqlJson(evidence),
    sqlString(task.riskCategory),
    sqlString(task.owner),
    sqlString(task.reviewer),
    sqlString(task.sourceReference),
    sqlString(task.documentCategory),
    sqlString("Not Started"), // document_status (clean baseline)
    task.filing ? sqlJson(task.filing) : "null",
    sqlNullableString(task.statutoryDeadlineNote),
    sqlBool(task.agreedFormRequired ?? false),
    sqlBool(task.mandatoryForClosing ?? false)
  ];
  return `  (${cols.join(", ")})`;
}

/** task.dependencies[].taskId is the prerequisite; the task itself is the child. */
function dependencyRows(): string[] {
  const rows: string[] = [];
  for (const task of seedTasks) {
    for (const dependency of task.dependencies) {
      rows.push(`  (${sqlString(task.id)}, ${sqlString(dependency.taskId)}, ${sqlString(dependency.label)})`);
    }
  }
  return rows;
}

function build(): string {
  const taskColumns = [
    "template_id",
    "organization_id",
    "source_task_id",
    "serial_number",
    "phase",
    "timeline",
    "action",
    "parties",
    "comments",
    "priority",
    "blocker",
    "evidence",
    "risk_category",
    "owner_label",
    "reviewer_label",
    "source_reference",
    "document_category",
    "document_status",
    "filing",
    "statutory_deadline_note",
    "agreed_form_required",
    "mandatory_for_closing"
  ].join(",\n  ");

  const taskValues = seedTasks.map(templateTaskValues).join(",\n");
  const deps = dependencyRows().join(",\n");

  return `-- GENERATED FILE - do not edit by hand.
-- Source: lib/checklistSeed.ts via scripts/generateTemplateSeed.ts
-- Regenerate with: npx tsx scripts/generateTemplateSeed.ts
--
-- Apply with a privileged connection (Supabase SQL editor / service role):
-- RLS blocks clients from writing a global (null-org) seed template.
-- Run db/schema.sql first; this seed is idempotent (re-running replaces the
-- existing global seed of the same name + version).

begin;

delete from template
where organization_id is null
  and name = ${sqlString(TEMPLATE_NAME)}
  and version = ${TEMPLATE_VERSION};

insert into template (id, organization_id, name, version, jurisdiction, is_seed)
values (${sqlString(TEMPLATE_ID)}, null, ${sqlString(TEMPLATE_NAME)}, ${TEMPLATE_VERSION}, 'IN', true);

insert into template_task (
  ${taskColumns}
)
values
${taskValues};

insert into template_dependency (template_id, organization_id, template_task_id, prerequisite_template_task_id, label)
select ${sqlString(TEMPLATE_ID)}, null, child.id, prereq.id, d.label
from (values
${deps}
) as d(child_source, prereq_source, label)
join template_task child
  on child.template_id = ${sqlString(TEMPLATE_ID)} and child.source_task_id = d.child_source
join template_task prereq
  on prereq.template_id = ${sqlString(TEMPLATE_ID)} and prereq.source_task_id = d.prereq_source;

commit;
`;
}

const outPath = join(dirname(fileURLToPath(import.meta.url)), "..", "db", "seed-template.sql");
writeFileSync(outPath, build(), "utf8");
console.log(`Wrote ${outPath} (${seedTasks.length} template tasks, ${dependencyRows().length} dependencies).`);
