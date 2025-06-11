import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApplicantsService } from './applicants.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../users/enums/role.enum';

@Controller('applicants')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ApplicantsController {
  constructor(private readonly applicantsService: ApplicantsService) {}

  @Get('statistics')
  @Roles(Role.HR, Role.ADMIN)
  async getStatistics() {
    return this.applicantsService.getStatistics();
  }
}
