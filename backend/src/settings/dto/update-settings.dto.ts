import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateSettingsDto {
  @IsBoolean()
  useDefaultPrompt: boolean;

  @IsOptional()
  @IsString()
  customPrompt?: string | null;
}


