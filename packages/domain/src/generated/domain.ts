// Auto-generated from OpenAPI schema (lingua-quiz-schema.json). Do not edit manually.
/**
 * This interface was referenced by `DomainTypes`'s JSON-Schema
 * via the `definition` "BulkProgressUpdateRequest".
 */
export interface BulkProgressUpdateRequest {
  /**
   * @minItems 1
   * @maxItems 1000
   */
  items: [ProgressUpdateRequest, ...ProgressUpdateRequest[]];
}
/**
 * This interface was referenced by `DomainTypes`'s JSON-Schema
 * via the `definition` "ProgressUpdateRequest".
 */
export interface ProgressUpdateRequest {
  vocabularyItemId: string;
  level: number;
  queuePosition: number;
  correctCount: number;
  incorrectCount: number;
}
/**
 * This interface was referenced by `DomainTypes`'s JSON-Schema
 * via the `definition` "ContentVersionResponse".
 */
export interface ContentVersionResponse {
  versionId: number;
  versionName: string;
  isActive: boolean;
}
/**
 * This interface was referenced by `DomainTypes`'s JSON-Schema
 * via the `definition` "HTTPValidationError".
 */
export interface HTTPValidationError {
  detail?: ValidationError[];
}
/**
 * This interface was referenced by `DomainTypes`'s JSON-Schema
 * via the `definition` "ValidationError".
 */
export interface ValidationError {
  loc: (string | number)[];
  msg: string;
  type: string;
}
/**
 * This interface was referenced by `DomainTypes`'s JSON-Schema
 * via the `definition` "HealthResponse".
 */
export interface HealthResponse {
  status: string;
  database: string;
  timestamp: string;
}
/**
 * This interface was referenced by `DomainTypes`'s JSON-Schema
 * via the `definition` "RefreshTokenRequest".
 */
export interface RefreshTokenRequest {
  refresh_token: string;
}
/**
 * This interface was referenced by `DomainTypes`'s JSON-Schema
 * via the `definition` "TTSLanguagesResponse".
 */
export interface TTSLanguagesResponse {
  available: boolean;
  supportedLanguages: string[];
}
/**
 * This interface was referenced by `DomainTypes`'s JSON-Schema
 * via the `definition` "TTSRequest".
 */
export interface TTSRequest {
  text: string;
  language: string;
}
/**
 * This interface was referenced by `DomainTypes`'s JSON-Schema
 * via the `definition` "TTSResponse".
 */
export interface TTSResponse {
  audioData: string;
  contentType?: string | null;
  text: string;
  language: string;
}
/**
 * This interface was referenced by `DomainTypes`'s JSON-Schema
 * via the `definition` "TokenResponse".
 */
export interface TokenResponse {
  token: string;
  refresh_token: string;
  expires_in?: string | null;
  user: UserResponse;
}
/**
 * This interface was referenced by `DomainTypes`'s JSON-Schema
 * via the `definition` "UserResponse".
 */
export interface UserResponse {
  id: number;
  username: string;
  is_admin?: boolean | null;
}
/**
 * This interface was referenced by `DomainTypes`'s JSON-Schema
 * via the `definition` "UserLogin".
 */
export interface UserLogin {
  username: string;
  password: string;
}
/**
 * This interface was referenced by `DomainTypes`'s JSON-Schema
 * via the `definition` "UserProgressResponse".
 */
export interface UserProgressResponse {
  vocabularyItemId: string;
  sourceText: string;
  sourceLanguage: string;
  targetLanguage: string;
  level: number;
  queuePosition: number;
  correctCount: number;
  incorrectCount: number;
  consecutiveCorrect: number;
  lastPracticed: string | null;
}
/**
 * This interface was referenced by `DomainTypes`'s JSON-Schema
 * via the `definition` "UserRegistration".
 */
export interface UserRegistration {
  username: string;
  password: string;
}
/**
 * This interface was referenced by `DomainTypes`'s JSON-Schema
 * via the `definition` "VersionResponse".
 */
export interface VersionResponse {
  version: string;
}
/**
 * This interface was referenced by `DomainTypes`'s JSON-Schema
 * via the `definition` "VocabularyItemCreate".
 */
export interface VocabularyItemCreate {
  sourceText: string;
  sourceLanguage: string;
  targetText: string;
  targetLanguage: string;
  listName: string;
  difficultyLevel?: string | null;
  sourceUsageExample?: string | null;
  targetUsageExample?: string | null;
}
/**
 * This interface was referenced by `DomainTypes`'s JSON-Schema
 * via the `definition` "VocabularyItemDetailResponse".
 */
export interface VocabularyItemDetailResponse {
  id: string;
  sourceText: string;
  sourceLanguage: string;
  targetText: string;
  targetLanguage: string;
  listName: string;
  difficultyLevel: string | null;
  sourceUsageExample: string | null;
  targetUsageExample: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
/**
 * This interface was referenced by `DomainTypes`'s JSON-Schema
 * via the `definition` "VocabularyItemResponse".
 */
export interface VocabularyItemResponse {
  id: string;
  sourceText: string;
  sourceLanguage: string;
  targetText: string;
  targetLanguage: string;
  listName: string;
  difficultyLevel: string | null;
  sourceUsageExample: string | null;
  targetUsageExample: string | null;
}
/**
 * This interface was referenced by `DomainTypes`'s JSON-Schema
 * via the `definition` "VocabularyItemUpdate".
 */
export interface VocabularyItemUpdate {
  sourceText?: string | null;
  targetText?: string | null;
  sourceUsageExample?: string | null;
  targetUsageExample?: string | null;
  isActive?: boolean | null;
  listName?: string | null;
  difficultyLevel?: string | null;
}
/**
 * This interface was referenced by `DomainTypes`'s JSON-Schema
 * via the `definition` "WordListResponse".
 */
export interface WordListResponse {
  listName: string;
  wordCount: number;
}

