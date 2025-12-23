export class SettingsResponseDto {
  useDefaultPrompt: boolean;
  customPrompt: string | null;
  defaultPromptTemplate: string; // Trả về default template để FE hiển thị
  updatedAt: Date;
}

