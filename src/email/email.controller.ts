import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  UseGuards,
} from '@nestjs/common';
import { EmailService } from './email.service';
import { CreateEmailTemplateDto } from './dto/create-email-template.dto';
import { UpdateEmailTemplateDto } from './dto/update-email-template.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../users/enums/role.enum';
import { RolesGuard } from '@/auth/guards/roles.guard';

@Controller('email')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  // Email templates endpoints
  @Get('templates')
  @Roles(Role.ADMIN, Role.HR)
  findAllTemplates() {
    return this.emailService.findAllTemplates();
  }

  @Get('templates/:id')
  @Roles(Role.ADMIN, Role.HR)
  findTemplateById(@Param('id') id: string) {
    return this.emailService.findTemplateById(id);
  }

  @Post('templates')
  @Roles(Role.ADMIN)
  createTemplate(@Body() createEmailTemplateDto: CreateEmailTemplateDto) {
    return this.emailService.createTemplate(createEmailTemplateDto);
  }

  @Put('templates/:id')
  @Roles(Role.ADMIN)
  updateTemplate(
    @Param('id') id: string,
    @Body() updateEmailTemplateDto: UpdateEmailTemplateDto,
  ) {
    return this.emailService.updateTemplate(id, updateEmailTemplateDto);
  }

  @Delete('templates/:id')
  @Roles(Role.ADMIN)
  deleteTemplate(@Param('id') id: string) {
    return this.emailService.deleteTemplate(id);
  }

  // Mail logs endpoints
  @Get('logs')
  @Roles(Role.ADMIN, Role.HR)
  findAllMailLogs() {
    return this.emailService.findAllMailLogs();
  }

  @Get('logs/:id')
  @Roles(Role.ADMIN, Role.HR)
  findMailLogById(@Param('id') id: string) {
    return this.emailService.findMailLogById(id);
  }

  @Get('logs/application/:applicationId')
  @Roles(Role.ADMIN, Role.HR)
  findMailLogsByApplicationId(@Param('applicationId') applicationId: string) {
    return this.emailService.findMailLogsByApplicationId(applicationId);
  }

  @Delete('logs/:id')
  @Roles(Role.ADMIN)
  deleteMailLog(@Param('id') id: string) {
    return this.emailService.deleteMailLog(id);
  }

  @Post('send-application-email')
  @Roles(Role.ADMIN, Role.HR)
  sendApplicationEmail(
    @Body()
    data: {
      applicationId: string;
      templateId: string;
      context: Record<string, any>;
      createdBy: string;
    },
  ) {
    return this.emailService.sendApplicationEmail(
      data.applicationId,
      data.templateId,
      data.context,
      data.createdBy,
    );
  }
}
