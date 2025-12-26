import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DocumentEntity } from './entities/document.entity';
import { QAPairEntity } from './entities/qa-pair.entity';
import { UserEntity } from '../auth/entities/user.entity';
import { Document, QAPair } from '../common/interfaces/frontend-types';
import { GeneratedQA } from '../common/interfaces/frontend-types';
import { OllamaService } from '../services/ollama.service';

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
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    private readonly ollamaService: OllamaService,
  ) {}

  /**
   * Tạo Document + QAPairs sau khi upload & generate
   * Dùng transaction để đảm bảo toàn vẹn
   */
  async createDocumentWithQAPairs(
    document: Document,
    generatedQAs: GeneratedQA[],
    extractedText?: string,
    userId?: string,
    username?: string,
  ): Promise<void> {
    const docEntity = this.documentRepo.create({
      ...document,
      extractedText: extractedText || null,
      userId: userId || null,
      createdBy: username || null,
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
   * Admin thấy tất cả, user thường chỉ thấy của mình
   */
  async findAllDocuments(userId?: string, userRole?: string): Promise<Document[]> {
    let docs: DocumentEntity[];

    // Admin xem tất cả, user thường chỉ xem của mình
    if (userRole === 'admin') {
      docs = await this.documentRepo.find({ relations: ['user'] });
    } else if (userId) {
      docs = await this.documentRepo.find({ 
        where: { userId },
        relations: ['user'],
      });
    } else {
      // Fallback: không có auth info → trả về rỗng (hoặc tất cả nếu muốn backward compatible)
      docs = [];
    }

    return docs.map((d) => ({
      id: d.id,
      name: this.normalizeFileName(d.name),
      size: d.size,
      uploadDate: d.uploadDate,
      totalSamples: d.totalSamples,
      reviewedSamples: d.reviewedSamples,
      status: d.status,
      createdBy: d.createdBy || undefined,
    }));
  }

  /**
   * Tìm Document theo filename (dùng cho RemoteFilesService)
   * Match logic: so sánh normalized filename (loại bỏ UUID prefix, normalize encoding)
   * @param fileName - Tên file cần tìm (có thể có UUID prefix)
   * @returns Document nếu tìm thấy, null nếu không
   */
  async findDocumentByFileName(fileName: string): Promise<Document | null> {
    // Normalize filename để match
    const normalizeForMatch = (name: string): string => {
      // Loại bỏ UUID prefix nếu có
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}_/i;
      let cleanName = name.replace(uuidPattern, '');
      
      // Normalize encoding
      try {
        const utf8 = Buffer.from(cleanName, 'latin1').toString('utf8');
        if (!utf8.includes('')) {
          cleanName = utf8;
        }
      } catch {
        // Giữ nguyên nếu decode fail
      }
      
      return cleanName.trim().toLowerCase();
    };

    const normalizedSearchName = normalizeForMatch(fileName);

    // Lấy tất cả documents và tìm match CHÍNH XÁC
    const docs = await this.documentRepo.find();
    
    for (const doc of docs) {
      const normalizedDocName = normalizeForMatch(doc.name);
      
      // Chỉ match chính xác tên file để tránh duplicate
      if (normalizedDocName === normalizedSearchName) {
        return {
          id: doc.id,
          name: this.normalizeFileName(doc.name),
          size: doc.size,
          uploadDate: doc.uploadDate,
          totalSamples: doc.totalSamples,
          reviewedSamples: doc.reviewedSamples,
          status: doc.status,
        };
      }
    }

    return null;
  }

  /**
   * Lấy Document + QAPairs theo docId
   * Check ownership: user chỉ xem được document của mình, admin xem được tất cả
   */
  async findDocumentWithQAPairs(
    docId: string,
    userId?: string,
    userRole?: string,
  ): Promise<{
    document: Document;
    qaPairs: QAPair[];
  }> {
    const doc = await this.documentRepo.findOne({
      where: { id: docId },
      relations: ['qaPairs', 'user'],
    });
    
    if (!doc) {
      throw new NotFoundException(`Document ${docId} không tồn tại`);
    }

    // Check ownership (nếu không phải admin)
    if (userRole !== 'admin' && doc.userId && doc.userId !== userId) {
      throw new NotFoundException(`Document ${docId} không tồn tại hoặc bạn không có quyền truy cập`);
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
      name: this.normalizeFileName(doc.name),
      size: doc.size,
      uploadDate: doc.uploadDate,
      totalSamples: doc.totalSamples,
      reviewedSamples: doc.reviewedSamples,
      status: doc.status,
      createdBy: doc.createdBy || undefined,
    };

    return { document, qaPairs };
  }

  /**
   * Normalize tên file để fix trường hợp tiếng Việt bị hiển thị sai (UTF-8 -> latin1)
   */
  private normalizeFileName(name: string): string {
    try {
      const utf8 = Buffer.from(name, 'latin1').toString('utf8');
      if (utf8.includes('�')) {
        return name;
      }
      return utf8;
    } catch {
      return name;
    }
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
   * Tạo Q&A pair thủ công (manual creation)
   * @param docId - ID của document
   * @param question - Câu hỏi
   * @param answer - Câu trả lời
   * @returns QAPair đã tạo
   */
  async createManualQAPair(
    docId: string,
    question: string,
    answer: string,
  ): Promise<QAPair> {
    // Kiểm tra document có tồn tại không
    const doc = await this.documentRepo.findOne({ where: { id: docId } });
    if (!doc) {
      throw new NotFoundException(`Document ${docId} không tồn tại`);
    }

    // Validate input
    if (!question || !question.trim()) {
      throw new BadRequestException('Câu hỏi không được để trống');
    }
    if (!answer || !answer.trim()) {
      throw new BadRequestException('Câu trả lời không được để trống');
    }

    // Tạo QAPair mới với ID unique
    const qaId = `qa-${docId}-${Date.now()}`;
    const qaEntity = this.qaRepo.create({
      id: qaId,
      docId,
      question: question.trim(),
      answer: answer.trim(),
      status: 'Pending',
    });

    await this.qaRepo.save(qaEntity);

    // Recalculate document stats
    await this.recalculateDocumentStats(docId);

    return {
      id: qaEntity.id,
      docId: qaEntity.docId,
      question: qaEntity.question,
      answer: qaEntity.answer,
      status: qaEntity.status,
    };
  }

  /**
   * Xóa 1 Document (và tất cả QAPairs liên quan - cascade)
   * Check ownership: user chỉ xóa được document của mình, admin xóa được tất cả
   */
  async deleteDocument(docId: string, userId?: string, userRole?: string): Promise<void> {
    const doc = await this.documentRepo.findOne({ where: { id: docId } });
    if (!doc) {
      // Xóa idempotent
      return;
    }

    // Check ownership (nếu không phải admin)
    if (userRole !== 'admin' && doc.userId && doc.userId !== userId) {
      throw new NotFoundException(`Document ${docId} không tồn tại hoặc bạn không có quyền xóa`);
    }

    // Xóa tất cả QAPairs trước (cascade)
    await this.qaRepo.delete({ docId });
    // Sau đó xóa Document
    await this.documentRepo.delete(docId);
  }

  /**
   * Gán lại document cho user khác (Admin only)
   * @param docId - ID của document
   * @param newUserId - ID của user mới
   * @returns Document đã update
   */
  async reassignDocument(docId: string, newUserId: string): Promise<Document> {
    // Tìm document
    const doc = await this.documentRepo.findOne({ where: { id: docId } });
    if (!doc) {
      throw new NotFoundException(`Document ${docId} không tồn tại`);
    }

    // Tìm user mới
    const newUser = await this.userRepo.findOne({ where: { id: newUserId } });
    if (!newUser) {
      throw new NotFoundException(`User ${newUserId} không tồn tại`);
    }

    // Update ownership
    doc.userId = newUser.id;
    doc.createdBy = newUser.username;

    await this.documentRepo.save(doc);

    return {
      id: doc.id,
      name: this.normalizeFileName(doc.name),
      size: doc.size,
      uploadDate: doc.uploadDate,
      totalSamples: doc.totalSamples,
      reviewedSamples: doc.reviewedSamples,
      status: doc.status,
      createdBy: doc.createdBy || undefined,
    };
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

  /**
   * Generate thêm Q&A pairs cho document đã có
   * @param docId - ID của document
   * @param count - Số lượng Q&A pairs cần tạo thêm
   * @param userId - ID của user hiện tại (để check ownership)
   * @param userRole - Role của user hiện tại
   * @returns Mảng các Q&A pairs mới được tạo
   */
  async generateMoreQAPairs(
    docId: string,
    count: number,
    userId?: string,
    userRole?: string,
  ): Promise<QAPair[]> {
    // Lấy document với extractedText
    const doc = await this.documentRepo.findOne({
      where: { id: docId },
      relations: ['qaPairs'],
    });

    if (!doc) {
      throw new NotFoundException(`Document ${docId} không tồn tại`);
    }

    // Check ownership (nếu không phải admin)
    if (userRole !== 'admin' && doc.userId && doc.userId !== userId) {
      throw new NotFoundException(`Document ${docId} không tồn tại hoặc bạn không có quyền thao tác`);
    }

    if (!doc.extractedText) {
      throw new BadRequestException(
        'Tài liệu này không có extracted text. Không thể generate thêm Q&A pairs. Vui lòng upload lại file.',
      );
    }

    // Lấy danh sách câu hỏi đã có để tránh trùng lặp
    const existingQuestions = doc.qaPairs.map((qa) => qa.question);

    // Generate Q&A pairs mới từ extractedText
    let newGeneratedQAs: GeneratedQA[];
    try {
      newGeneratedQAs = await this.ollamaService.generateQAPairs(
        doc.extractedText,
        count,
      );
    } catch (error) {
      // Nếu lỗi do nội dung quá ngắn, trả về message thân thiện
      if (error.status === 400 && error.message.includes('quá ngắn')) {
        throw new BadRequestException(
          'Nội dung tài liệu đã hết hoặc quá ngắn. Không thể tạo thêm Q&A pairs. Hãy thử với tài liệu khác.',
        );
      }
      // Lỗi khác, throw lại
      throw error;
    }

    if (newGeneratedQAs.length === 0) {
      // Nếu không tạo được Q&A mới nào, có thể đã hết nội dung
      return [];
    }

    // Lọc duplicates so với Q&A đã có
    const uniqueQAs = newGeneratedQAs.filter((newQA) => {
      return !existingQuestions.some((existingQ) => {
        const normalize = (str: string) => str.toLowerCase().trim().replace(/\s+/g, ' ');
        const n1 = normalize(newQA.question);
        const n2 = normalize(existingQ);
        return n1 === n2 || n1.includes(n2) || n2.includes(n1);
      });
    });

    if (uniqueQAs.length === 0) {
      // Tất cả đều bị trùng → có thể đã hết nội dung
      return [];
    }

    // Tạo QAPair entities mới
    const startIndex = doc.qaPairs.length;
    const newQAPairEntities: QAPairEntity[] = uniqueQAs.map((qa, index) =>
      this.qaRepo.create({
        id: `qa-${docId}-${startIndex + index}`,
        docId: docId,
        question: qa.question,
        answer: qa.answer,
        status: 'Pending',
      }),
    );

    // Lưu vào database
    await this.documentRepo.manager.transaction(async (manager) => {
      await manager.save(QAPairEntity, newQAPairEntities);
    });

    // Recalculate stats
    await this.recalculateDocumentStats(docId);

    // Return QAPair format cho FE
    return newQAPairEntities.map((qa) => ({
      id: qa.id,
      docId: qa.docId,
      question: qa.question,
      answer: qa.answer,
      status: qa.status,
      originalQuestion: qa.originalQuestion ?? undefined,
      originalAnswer: qa.originalAnswer ?? undefined,
    }));
  }
}


