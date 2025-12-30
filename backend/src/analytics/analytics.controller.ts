import { Controller, Get, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { StaffOverviewResponse } from './dto/staff-stats.dto';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

/**
 * Analytics Controller - Admin-only analytics endpoints
 * Require authentication (via global JwtAuthGuard)
 */
@Controller('analytics')
@UseGuards(RolesGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  /**
   * GET /api/analytics/staff-overview
   * Get aggregated statistics for all staff members
   * Admin-only endpoint
   */
  @Get('staff-overview')
  @Roles('admin')
  async getStaffOverview(): Promise<StaffOverviewResponse> {
    return this.analyticsService.getStaffOverview();
  }
}

