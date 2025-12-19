import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DocumentEntity } from './entities/document.entity';
import { QAPairEntity } from './entities/qa-pair.entity';
import { Document, QAPair } from '../common/interfaces/frontend-types';
import { GeneratedQA } from '../common/interfaces/frontend-types';

/**
 * Documents Service - Quản lý lưu trữ và truy vấn Document & QAPair
 */
@Injectable()
export class DocumentsService {
  constructor(
    @InjectRepository(DocumentEntity)
    private readonly documentRepo: Repository<DocumentEntity>,
    @InjectRepository(QAPairEntity)
    private readonly qaRepo: Repository<QAPairEntity>,
  ) {}

  /**
   * Tạo Document + QAPairs sau khi upload & generate
   * Dùng transaction để đảm bảo toàn vẹn
   */
  async createDocumentWithQAPairs(
    document: Document,
    generatedQAs: GeneratedQA[],
  ): Promise<void> {
    const docEntity = this.documentRepo.create({
      ...document,
    });

    const qaEntities: QAPairEntity[] = generatedQAs.map((qa, index) =>
      this.qaRepo.create({
        id: `qa-${document.id}-${index}`,
        docId: document.id,
        question: qa.question,
        answer: qa.answer,
        status: 'Pending',
      }),
    );

    await this.documentRepo.manager.transaction(async (manager) => {
      await manager.save(DocumentEntity, docEntity);
      if (qaEntities.length > 0) {
        await manager.save(QAPairEntity, qaEntities);
      }
    });
  }

  /**
   * Lấy danh sách Documents (cho Dashboard)
   */
  async findAllDocuments(): Promise<Document[]> {
    const docs = await this.documentRepo.find();
    return docs.map((d) => ({
      id: d.id,
      name: d.name,
      size: d.size,
      uploadDate: d.uploadDate,
      totalSamples: d.totalSamples,
      reviewedSamples: d.reviewedSamples,
      status: d.status,
    }));
  }

  /**
   * Lấy Document + QAPairs theo docId
   */
  async findDocumentWithQAPairs(docId: string): Promise<{
    document: Document;
    qaPairs: QAPair[];
  }> {
    const doc = await this.documentRepo.findOne({
      where: { id: docId },
      relations: ['qaPairs'],
    });
    if (!doc) {
      throw new NotFoundException(`Document ${docId} không tồn tại`);
    }

    const qaPairs: QAPair[] = doc.qaPairs.map((qa) => ({
      id: qa.id,
      docId: qa.docId,
      question: qa.question,
      answer: qa.answer,
      status: qa.status,
      originalQuestion: qa.originalQuestion ?? undefined,
      originalAnswer: qa.originalAnswer ?? undefined,
    }));

    const document: Document = {
      id: doc.id,
      name: doc.name,
      size: doc.size,
      uploadDate: doc.uploadDate,
      totalSamples: doc.totalSamples,
      reviewedSamples: doc.reviewedSamples,
      status: doc.status,
    };

    return { document, qaPairs };
  }

  /**
   * Cập nhật 1 QAPair (edit / review)
   * Đồng thời update lại reviewedSamples của Document
   */
  async updateQAPair(
    qaId: string,
    updates: Partial<Pick<QAPair, 'question' | 'answer' | 'status' | 'originalQuestion' | 'originalAnswer'>>,
  ): Promise<QAPair> {
    const qa = await this.qaRepo.findOne({ where: { id: qaId } });
    if (!qa) {
      throw new NotFoundException(`QAPair ${qaId} không tồn tại`);
    }

    // Nếu sửa question/answer lần đầu, lưu original*
    if ((updates.question && updates.question !== qa.question) ||
        (updates.answer && updates.answer !== qa.answer)) {
      if (!qa.originalQuestion) {
        qa.originalQuestion = qa.question;
      }
      if (!qa.originalAnswer) {
        qa.originalAnswer = qa.answer;
      }
    }

    Object.assign(qa, updates);
    await this.qaRepo.save(qa);

    await this.recalculateDocumentStats(qa.docId);

    return {
      id: qa.id,
      docId: qa.docId,
      question: qa.question,
      answer: qa.answer,
      status: qa.status,
      originalQuestion: qa.originalQuestion ?? undefined,
      originalAnswer: qa.originalAnswer ?? undefined,
    };
  }

  /**
   * Xóa 1 QAPair
   */
  async deleteQAPair(qaId: string): Promise<void> {
    const qa = await this.qaRepo.findOne({ where: { id: qaId } });
    if (!qa) {
      // Xóa idempotent
      return;
    }

    const docId = qa.docId;
    await this.qaRepo.delete(qaId);
    await this.recalculateDocumentStats(docId);
  }

  /**
   * Xóa 1 Document (và tất cả QAPairs liên quan - cascade)
   */
  async deleteDocument(docId: string): Promise<void> {
    const doc = await this.documentRepo.findOne({ where: { id: docId } });
    if (!doc) {
      // Xóa idempotent
      return;
    }

    // Xóa tất cả QAPairs trước (cascade)
    await this.qaRepo.delete({ docId });
    // Sau đó xóa Document
    await this.documentRepo.delete(docId);
  }

  /**
   * Recalculate totalSamples & reviewedSamples cho Document
   * để Dashboard luôn up-to-date
   */
  private async recalculateDocumentStats(docId: string): Promise<void> {
    const doc = await this.documentRepo.findOne({
      where: { id: docId },
      relations: ['qaPairs'],
    });
    if (!doc) return;

    const totalSamples = doc.qaPairs.length;
    const reviewedSamples = doc.qaPairs.filter(
      (q) => q.status === 'Reviewed',
    ).length;

    doc.totalSamples = totalSamples;
    doc.reviewedSamples = reviewedSamples;

    await this.documentRepo.save(doc);
  }
}


