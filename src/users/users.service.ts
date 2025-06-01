import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async findAll(): Promise<User[]> {
    return this.usersRepository.find();
  }

  async findAllHRUsers(includeInactive: boolean = false): Promise<User[]> {
    const whereCondition: any = { role: 'hr' };
    
    // By default, only show active users unless specifically requested
    if (!includeInactive) {
      whereCondition.isActive = true;
    }
    
    return this.usersRepository.find({
      where: whereCondition,
    });
  }

  async findOne(id: string): Promise<User> {
    return this.usersRepository.findOneBy({ id });
  }

  async findByEmail(email: string): Promise<User> {
    return this.usersRepository.findOneBy({ email });
  }

  async create(userData: Partial<User>): Promise<User> {
    const newUser = this.usersRepository.create(userData);
    return this.usersRepository.save(newUser);
  }

  async update(id: string, user: User): Promise<User> {
    await this.usersRepository.update(id, user);
    return this.findOne(id);
  }

  async delete(id: string): Promise<void> {
    await this.usersRepository.delete(id);
  }

  async deactivate(id: string): Promise<void> {
    await this.usersRepository.update(id, { isActive: false });
  }

  async activate(id: string): Promise<void> {
    await this.usersRepository.update(id, { isActive: true });
  }
}
