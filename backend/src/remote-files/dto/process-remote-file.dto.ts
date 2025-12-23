import { IsOptional, IsBoolean, IsNumber, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';

/**
 * DTO cho request xử lý file từ xa
 */
export class ProcessRemoteFileDto {
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
    const num = Number(value);
    return isNaN(num) ? value : num;
  })
  @IsNumber()
  @Min(1)
  @Max(20)
  count?: number = 5;
}

