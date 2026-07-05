// bugReports.ts - Writes a submission to bug_reports (see
// supabase/sql/bug_reports.sql). Unlike lib/progress.ts's writes, a failure
// here should be visible to the user (they're actively trying to report
// something and deserve to know it didn't go through), so this throws
// instead of swallowing errors - the report.tsx screen catches it and
// shows an inline error.

import { supabase } from './supabase';

export interface BugReportInput {
  title: string;
  description: string;
  email?: string | null;
  page?: string | null;
  userId?: string | null;
}

export async function submitBugReport(input: BugReportInput): Promise<void> {
  const { error } = await supabase.from('bug_reports').insert({
    title: input.title.trim(),
    description: input.description.trim(),
    email: input.email?.trim() || null,
    page: input.page ?? null,
    user_id: input.userId ?? null,
  });

  if (error) {
    throw new Error(error.message);
  }
}
