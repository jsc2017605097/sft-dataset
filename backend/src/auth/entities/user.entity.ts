import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { DocumentEntity } from '../../documents/entities/document.entity';

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  username: string;

  @Column({ nullable: true })
  email: string;

  @Column()
  passwordHash: string;

  @Column({ default: 'user' })
  role: 'user' | 'admin';

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => DocumentEntity, (document) => document.user)
  documents: DocumentEntity[];
}

