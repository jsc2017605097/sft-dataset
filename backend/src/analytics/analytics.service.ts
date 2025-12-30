import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DocumentEntity } from '../documents/entities/document.entity';
import { QAPairEntity } from '../documents/entities/qa-pair.entity';
import { UserEntity } from '../auth/entities/user.entity';
import { Settings } from '../settings/entities/settings.entity';
import { StaffStats, StaffOverviewResponse } from './dto/staff-stats.dto';

/**
 * Analytics Service - Aggregated statistics for staff monitoring
 */
@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(DocumentEntity)
    private readonly documentRepo: Repository<DocumentEntity>,
    @InjectRepository(QAPairEntity)
    private readonly qaRepo: Repository<QAPairEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    @InjectRepository(Settings)
    private readonly settingsRepo: Repository<Settings>,
  ) {}

  /**
   * Get staff overview statistics
   * Calculate metrics from existing data without schema changes
   */
  async getStaffOverview(): Promise<StaffOverviewResponse> {
    // Get warning configuration from settings
    let settings = await this.settingsRepo.findOne({ where: { id: 1 } });
    if (!settings) {
      // Create default settings if not exists
      settings = this.settingsRepo.create({
        useDefaultPrompt: true,
        customPrompt: null,
        warningDaysThreshold: 7,
        warningIncompleteDocsThreshold: 5,
        enableZeroProgressWarning: true,
        enableOverdueWarning: true,
        enableTooManyIncompleteWarning: true,
        enableNoDocumentWarning: true,
      });
      await this.settingsRepo.save(settings);
    }

    // Get all users with role 'user' (exclude admins from monitoring)
    const users = await this.userRepo.find({ where: { role: 'user' } });

    const statsPromises = users.map((user) => this.calculateUserStats(user, settings));
    const stats = await Promise.all(statsPromises);

    // Calculate summary
    const summary = {
      totalUsers: stats.length,
      totalDocs: stats.reduce((sum, s) => sum + s.totalDocs, 0),
      avgCompletionRate:
        stats.length > 0
          ? stats.reduce((sum, s) => sum + s.avgCompletionRate, 0) / stats.length
          : 0,
      overdueUsers: stats.filter((s) => s.isOverdue).length,
    };

    return { stats, summary };
  }

  /**
   * Calculate statistics for a single user
   */
  private async calculateUserStats(user: UserEntity, settings: Settings): Promise<StaffStats> {
    // Get all documents for this user
    const docs = await this.documentRepo.find({
      where: { userId: user.id },
      order: { uploadDate: 'ASC' }, // Oldest first
    });

    const totalDocs = docs.length;
    const completedDocs = docs.filter(
      (d) => d.reviewedSamples === d.totalSamples,
    ).length;
    const incompleteDocs = totalDocs - completedDocs;

    // Calculate total QA pairs stats
    const totalQAPairs = docs.reduce((sum, d) => sum + d.totalSamples, 0);
    const reviewedQAPairs = docs.reduce((sum, d) => sum + d.reviewedSamples, 0);

    // Calculate average completion rate
    const avgCompletionRate =
      totalQAPairs > 0 ? (reviewedQAPairs / totalQAPairs) * 100 : 0;

    // Get edited QA pairs count (status === 'Edited')
    const editedQAPairs = await this.qaRepo.count({
      where: { docId: docs.map((d) => d.id) as any, status: 'Edited' },
    });

    // Find oldest pending document
    const oldestPendingDoc = docs.find(
      (d) => d.reviewedSamples < d.totalSamples,
    );

    let oldestPendingDocDate: string | null = null;
    let daysSinceOldestPending: number | null = null;
    let isOverdue = false;

    // Check conditions based on settings configuration
    const conditions: boolean[] = [];

    // Condition 0: No documents uploaded at all (if enabled)
    if (settings.enableNoDocumentWarning && totalDocs === 0) {
      conditions.push(true);
    }

    if (oldestPendingDoc) {
      oldestPendingDocDate = oldestPendingDoc.uploadDate;

      // Parse upload date (format: DD/MM/YYYY)
      const [day, month, year] = oldestPendingDoc.uploadDate.split('/');
      const uploadDate = new Date(
        parseInt(year),
        parseInt(month) - 1,
        parseInt(day),
      );
      const now = new Date();
      const diffTime = now.getTime() - uploadDate.getTime();
      daysSinceOldestPending = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      // 1. Oldest incomplete doc > threshold days (if enabled)
      if (settings.enableOverdueWarning) {
        conditions.push(daysSinceOldestPending > settings.warningDaysThreshold);
      }
      
      // 2. Has docs but 0% progress (if enabled)
      if (settings.enableZeroProgressWarning) {
        conditions.push(incompleteDocs > 0 && avgCompletionRate === 0);
      }
      
      // 3. Has too many incomplete docs (if enabled)
      if (settings.enableTooManyIncompleteWarning) {
        conditions.push(incompleteDocs > settings.warningIncompleteDocsThreshold);
      }
    }

    // isOverdue = true if ANY condition is met
    isOverdue = conditions.some(c => c);

    return {
      userId: user.id,
      username: user.username,
      totalDocs,
      completedDocs,
      incompleteDocs,
      totalQAPairs,
      reviewedQAPairs,
      editedQAPairs,
      avgCompletionRate: Math.round(avgCompletionRate * 10) / 10, // Round to 1 decimal
      oldestPendingDocDate,
      daysSinceOldestPending,
      isOverdue,
    };
  }
}

