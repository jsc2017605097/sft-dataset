import { IsBoolean, IsOptional, IsString, IsNumber, Min, Max } from 'class-validator';

export class UpdateSettingsDto {
  @IsBoolean()
  useDefaultPrompt: boolean;

  @IsOptional()
  @IsString()
  customPrompt?: string | null;

  // Warning configuration (optional)
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(30)
  warningDaysThreshold?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  warningIncompleteDocsThreshold?: number;

  @IsOptional()
  @IsBoolean()
  enableZeroProgressWarning?: boolean;

  @IsOptional()
  @IsBoolean()
  enableOverdueWarning?: boolean;

  @IsOptional()
  @IsBoolean()
  enableTooManyIncompleteWarning?: boolean;

  @IsOptional()
  @IsBoolean()
  enableNoDocumentWarning?: boolean;
}


