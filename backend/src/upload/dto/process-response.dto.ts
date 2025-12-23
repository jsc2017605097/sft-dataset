import { GeneratedQA } from '../../common/interfaces/frontend-types';

/**
 * Response DTO cho process file
 * Match 100% với frontend expectation
 */
export class ProcessFileResponseDto {
  fileName: string;
  fileSize: string;
  qaPairs: GeneratedQA[];
}



