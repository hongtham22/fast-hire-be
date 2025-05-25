import {
  Controller,
  Get,
  Param,
  Post,
  Body,
  Put,
  Delete,
  UseGuards,
  Request,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { User } from './user.entity';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/auth/guards/roles.guard';
import { Roles } from '@/auth/decorators/roles.decorator';
import { Role } from './enums/role.enum';
import * as bcrypt from 'bcrypt';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * Get all users - Only Admin can view all users
   */
  @Get()
  @Roles(Role.ADMIN)
  async findAll(): Promise<User[]> {
    return this.usersService.findAll();
  }

  /**
   * Get user by ID - Admin can view any user, HR can only view their own profile
   */
  @Get(':id')
  @Roles(Role.ADMIN, Role.HR)
  async findOne(@Param('id') id: string, @Request() req): Promise<User> {
    const user = await this.usersService.findOne(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // HR can only view their own profile
    if (req.user.role === Role.HR && req.user.id !== id) {
      throw new ForbiddenException('You can only view your own profile');
    }

    return user;
  }

  /**
   * Create new user - Only Admin can create users (HR accounts)
   */
  @Post()
  @Roles(Role.ADMIN)
  async create(
    @Body()
    createUserDto: {
      name: string;
      email: string;
      password: string;
      role: Role;
    },
  ): Promise<User> {
    // Only allow creating HR accounts through this endpoint
    if (createUserDto.role !== Role.HR) {
      throw new BadRequestException(
        'Can only create HR accounts through this endpoint',
      );
    }

    // Hash password before saving
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    const userData = {
      ...createUserDto,
      passwordHash: hashedPassword,
      isEmailVerified: true, // Auto-verify HR accounts created by admin
    };

    return this.usersService.create(userData);
  }

  /**
   * Update user - Admin can update any user, HR can only update their own profile
   */
  @Put(':id')
  @Roles(Role.ADMIN, Role.HR)
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: Partial<User>,
    @Request() req,
  ): Promise<User> {
    const existingUser = await this.usersService.findOne(id);
    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    // HR can only update their own profile
    if (req.user.role === Role.HR && req.user.id !== id) {
      throw new ForbiddenException('You can only update your own profile');
    }

    // HR cannot change their role
    if (
      req.user.role === Role.HR &&
      updateUserDto.role &&
      updateUserDto.role !== existingUser.role
    ) {
      throw new ForbiddenException('You cannot change your role');
    }

    return this.usersService.update(id, updateUserDto as User);
  }

  /**
   * Change password - HR can change their own password, Admin can change any password
   */
  @Put(':id/change-password')
  @Roles(Role.ADMIN, Role.HR)
  async changePassword(
    @Param('id') id: string,
    @Body()
    changePasswordDto: {
      currentPassword?: string;
      newPassword: string;
    },
    @Request() req,
  ): Promise<{ message: string }> {
    const user = await this.usersService.findOne(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // HR can only change their own password
    if (req.user.role === Role.HR && req.user.id !== id) {
      throw new ForbiddenException('You can only change your own password');
    }

    // HR must provide current password for verification
    if (req.user.role === Role.HR) {
      if (!changePasswordDto.currentPassword) {
        throw new BadRequestException('Current password is required');
      }

      const isCurrentPasswordValid = await bcrypt.compare(
        changePasswordDto.currentPassword,
        user.passwordHash,
      );

      if (!isCurrentPasswordValid) {
        throw new BadRequestException('Current password is incorrect');
      }
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(
      changePasswordDto.newPassword,
      10,
    );

    await this.usersService.update(id, {
      ...user,
      passwordHash: hashedNewPassword,
    });

    return { message: 'Password changed successfully' };
  }

  /**
   * Delete user - Only Admin can delete users (HR accounts)
   */
  @Delete(':id')
  @Roles(Role.ADMIN)
  async delete(@Param('id') id: string): Promise<{ message: string }> {
    const user = await this.usersService.findOne(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Prevent admin from deleting other admin accounts
    if (user.role === Role.ADMIN) {
      throw new ForbiddenException('Cannot delete admin accounts');
    }

    await this.usersService.delete(id);
    return { message: 'User deleted successfully' };
  }
}
