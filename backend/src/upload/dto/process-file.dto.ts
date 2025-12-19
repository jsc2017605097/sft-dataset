import { IsOptional, IsBoolean, IsNumber, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';

/**
 * DTO cho process file request
 * Match với frontend UploadScreen settings
 * Note: FormData gửi string, cần transform sang boolean/number
 */
export class ProcessFileDto {
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  @IsBoolean()
  autoGenerate?: boolean = true;

  @IsOptional()
  @Transform(({ value }) => {
    const num = parseInt(value, 10);
    return isNaN(num) ? 5 : num;
  })
  @IsNumber()
  @Min(1)
  @Max(20)
  count?: number = 5;
}

