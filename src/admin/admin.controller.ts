import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../users/enums/role.enum';
import { AdminService } from './admin.service';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  /**
   * Get dashboard statistics
   */
  @Get('dashboard/stats')
  async getDashboardStats() {
    return await this.adminService.getDashboardStats();
  }

  /**
   * Get recent applications for dashboard
   */
  @Get('dashboard/recent-applications')
  async getRecentApplications() {
    return await this.adminService.getRecentApplications();
  }

  /**
   * Get job matching scores for dashboard
   */
  @Get('dashboard/job-matching-scores')
  async getJobMatchingScores() {
    return await this.adminService.getJobMatchingScores();
  }

  /**
   * Get applications chart data
   */
  @Get('dashboard/applications-chart')
  async getApplicationsChartData() {
    return await this.adminService.getApplicationsChartData();
  }
}
