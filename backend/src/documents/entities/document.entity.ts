import { Entity, PrimaryColumn, Column, OneToMany, ManyToOne, JoinColumn } from 'typeorm';
import { QAPairEntity } from './qa-pair.entity';
import { UserEntity } from '../../auth/entities/user.entity';

/**
 * Document Entity - Lưu thông tin tài liệu, tương thích với FE `Document` type
 */
@Entity('documents')
export class DocumentEntity {
  @PrimaryColumn()
  id: string; // doc-${timestamp}

  @Column()
  name: string;

  @Column()
  size: string;

  @Column()
  uploadDate: string; // giữ nguyên format string như FE

  @Column({ type: 'integer' })
  totalSamples: number;

  @Column({ type: 'integer' })
  reviewedSamples: number;

  @Column()
  status: 'Ready' | 'Processing' | 'Failed';

  @Column({ type: 'text', nullable: true })
  extractedText: string | null; // Lưu text từ Tika để có thể generate thêm Q&A sau này

  // Auth & Authorization fields
  @Column({ nullable: true })
  userId: string; // Foreign key to users table

  @Column({ nullable: true })
  createdBy: string; // Username snapshot (for display)

  @ManyToOne(() => UserEntity, (user) => user.documents, { nullable: true })
  @JoinColumn({ name: 'userId' })
  user: UserEntity;

  @OneToMany(() => QAPairEntity, (qa) => qa.document, {
    cascade: true,
  })
  qaPairs: QAPairEntity[];
}


