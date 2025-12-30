/**
 * DTO cho Staff Statistics
 */

export interface StaffStats {
  userId: string;
  username: string;
  totalDocs: number;
  completedDocs: number;
  incompleteDocs: number;
  totalQAPairs: number;
  reviewedQAPairs: number;
  editedQAPairs: number;
  avgCompletionRate: number; // Percentage
  oldestPendingDocDate: string | null; // Upload date of oldest incomplete doc
  daysSinceOldestPending: number | null;
  isOverdue: boolean; // True if has docs > 7 days without completion
}

export interface StaffOverviewResponse {
  stats: StaffStats[];
  summary: {
    totalUsers: number;
    totalDocs: number;
    avgCompletionRate: number;
    overdueUsers: number;
  };
}

