import type { BugReport, BugReviewDocument, SourceRef } from "@/types/platform";

export interface ReviewEditFields {
  title: string;
  root_cause: string;
  fix_solution: string;
  prevention: string;
  severity: string;
  impact_scope: string;
  keywords: string;
}

export interface BugReportFilters {
  keyword?: string;
  review_status?: string;
  source_type?: string;
}

const severities = new Set(["P0", "P1", "P2", "P3"]);

function fallbackSource(): SourceRef {
  return {
    type: "chat",
    location: "manual review",
    snippet: "人工审核补充",
  };
}

/** Build a complete review document before sending an edited report to the API. */
export function buildReviewDocument(report: BugReport, edits: ReviewEditFields): BugReviewDocument {
  const existing = report.review_document;
  const source = existing?.root_cause?.source ?? existing?.source_refs?.[0] ?? fallbackSource();
  const severity = severities.has(edits.severity)
    ? (edits.severity as BugReviewDocument["impact"]["severity"])
    : (existing?.impact?.severity ?? "P2");

  return {
    ...existing,
    title: edits.title || report.title,
    root_cause: {
      content: edits.root_cause,
      source,
    },
    impact: {
      scope: edits.impact_scope,
      affected_users: existing?.impact?.affected_users ?? null,
      severity,
    },
    fix_solution: edits.fix_solution,
    prevention: edits.prevention,
    related_modules: existing?.related_modules ?? [],
    keywords: edits.keywords.split(",").map((keyword) => keyword.trim()).filter(Boolean),
    confidence: existing?.confidence ?? 0,
    source_refs: existing?.source_refs?.length ? existing.source_refs : [source],
    review_status: existing?.review_status ?? report.review_status,
    reviewer_notes: existing?.reviewer_notes ?? "",
  };
}

export function filterBugReports(reports: BugReport[], filters: BugReportFilters): BugReport[] {
  const keyword = filters.keyword?.trim().toLowerCase() ?? "";
  return reports.filter((report) => {
    const matchesKeyword =
      !keyword ||
      report.id.toLowerCase().includes(keyword) ||
      report.repo_name?.toLowerCase().includes(keyword) ||
      report.title?.toLowerCase().includes(keyword);
    const matchesStatus = !filters.review_status || report.review_status === filters.review_status;
    const matchesSource = !filters.source_type || report.source_type === filters.source_type;
    return Boolean(matchesKeyword && matchesStatus && matchesSource);
  });
}
