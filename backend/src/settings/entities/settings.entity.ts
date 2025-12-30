import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('settings')
export class Settings {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ default: true })
  useDefaultPrompt: boolean;

  @Column({ type: 'text', nullable: true })
  customPrompt: string | null;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;

  // Warning configuration for staff monitoring
  @Column({ type: 'integer', default: 7 })
  warningDaysThreshold: number; // Số ngày cảnh báo quá hạn (default: 7)

  @Column({ type: 'integer', default: 5 })
  warningIncompleteDocsThreshold: number; // Số tài liệu dở dang cảnh báo (default: 5)

  @Column({ type: 'boolean', default: true })
  enableZeroProgressWarning: boolean; // Cảnh báo khi có tài liệu nhưng 0% progress

  @Column({ type: 'boolean', default: true })
  enableOverdueWarning: boolean; // Cảnh báo tài liệu quá hạn

  @Column({ type: 'boolean', default: true })
  enableTooManyIncompleteWarning: boolean; // Cảnh báo quá nhiều tài liệu dở dang

  @Column({ type: 'boolean', default: true })
  enableNoDocumentWarning: boolean; // Cảnh báo cán bộ chưa upload tài liệu nào
}


