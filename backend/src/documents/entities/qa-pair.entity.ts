import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { DocumentEntity } from './document.entity';

/**
 * QAPair Entity - Lưu thông tin Q&A, tương thích với FE `QAPair` type
 */
@Entity('qa_pairs')
export class QAPairEntity {
  @PrimaryColumn()
  id: string; // qa-${docId}-${index}

  @Column()
  docId: string;

  @ManyToOne(() => DocumentEntity, (document) => document.qaPairs, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'docId' })
  document: DocumentEntity;

  @Column({ type: 'text' })
  question: string;

  @Column({ type: 'text' })
  answer: string;

  @Column()
  status: 'Pending' | 'Reviewed' | 'Edited';

  @Column({ type: 'text', nullable: true })
  originalQuestion?: string;

  @Column({ type: 'text', nullable: true })
  originalAnswer?: string;
}



