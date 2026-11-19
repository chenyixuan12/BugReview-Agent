import { describe, expect, it } from "vitest";
import type { BugReport } from "@/types/platform";
import { buildReviewDocument, filterBugReports } from "./review";

function report(overrides: Partial<BugReport> = {}): BugReport {
  return {
    id: "bug-001",
    title: "Upload request returns 500",
    repo_id: "repo-1",
    repo_name: "aiflow-studio",
    bug_category: "api_timeout",
    bug_category_label: "API 错误",
    status: "open",
    status_label: "待处理",
    review_status: "draft",
    created_at: "2026-11-18T00:00:00Z",
    agent_name: "review-agent",
    semantic_summary: "上传文件失败",
    source_type: "pr",
    ...overrides,
  };
}

const edits = {
  title: "修复上传接口 500",
  root_cause: "请求体为空时未做校验",
  fix_solution: "在服务端补充参数校验",
  prevention: "增加边界条件测试",
  severity: "P1",
  impact_scope: "上传功能用户",
  keywords: "upload, 500, validation",
};

describe("buildReviewDocument", () => {
  it("preserves source references from an existing document", () => {
    const existingSource = { type: "log" as const, location: "api.log:42", snippet: "HTTP 500" };
    const result = buildReviewDocument(
      report({
        review_document: {
          title: "旧标题",
          root_cause: { content: "旧原因", source: existingSource },
          impact: { scope: "部分用户", affected_users: "10%", severity: "P2" },
          fix_solution: "旧方案",
          prevention: "旧预防",
          related_modules: ["upload"],
          keywords: ["old"],
          confidence: 0.8,
          source_refs: [existingSource],
          review_status: "draft",
          reviewer_notes: "",
        },
      }),
      edits,
    );

    expect(result.root_cause.source).toEqual(existingSource);
    expect(result.keywords).toEqual(["upload", "500", "validation"]);
    expect(result.impact.severity).toBe("P1");
  });

  it("fills required fields when legacy documents are incomplete", () => {
    const result = buildReviewDocument(report(), edits);

    expect(result.root_cause.source.type).toBe("chat");
    expect(result.source_refs).toHaveLength(1);
    expect(result.impact.affected_users).toBeNull();
    expect(result.review_status).toBe("draft");
  });
});

describe("filterBugReports", () => {
  const reports = [
    report({ id: "bug-upload", title: "Upload 500", review_status: "draft", source_type: "pr" }),
    report({ id: "bug-chat", title: "Editor race condition", review_status: "approved", source_type: "chat" }),
  ];

  it("filters by case-insensitive keyword, status, and source", () => {
    expect(filterBugReports(reports, { keyword: "UPLOAD", review_status: "draft", source_type: "pr" })).toHaveLength(1);
    expect(filterBugReports(reports, { review_status: "approved" })[0].id).toBe("bug-chat");
  });

  it("returns all reports when filters are empty", () => {
    expect(filterBugReports(reports, {})).toHaveLength(2);
  });
});
