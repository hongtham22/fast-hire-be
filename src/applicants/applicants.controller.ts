// import {
//   Controller,
//   Get,
//   Param,
//   ParseUUIDPipe,
//   UseGuards,
// } from '@nestjs/common';
// import { ApplicantsService } from './applicants.service';
// import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
// import { RolesGuard } from '../auth/guards/roles.guard';
// import { Roles } from '../auth/decorators/roles.decorator';
// import { Role } from '../users/role.enum';

// @Controller('applicants')
// @UseGuards(JwtAuthGuard, RolesGuard)
// export class ApplicantsController {
//   constructor(private readonly applicantsService: ApplicantsService) {}

//   @Get()
//   @Roles(Role.ADMIN, Role.HR)
//   async findAll() {
//     return this.applicantsService.findAll();
//   }

//   @Get(':id')
//   @Roles(Role.ADMIN, Role.HR)
//   async findOne(@Param('id', ParseUUIDPipe) id: string) {
//     return this.applicantsService.findOne(id);
//   }
// }
