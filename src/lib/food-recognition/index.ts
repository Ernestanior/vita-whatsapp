export { ImageHandler, imageHandler } from './image-handler';
export type { ImageProcessingResult } from './image-handler';

export {
  buildFoodRecognitionPrompt,
  buildUserPrompt,
  detectMealContext,
} from './prompts';
export type { PromptContext } from './prompts';

export { FoodRecognizer, foodRecognizer } from './recognizer';
export type {
  RecognitionContext,
  RecognitionError,
  RecognitionResponse,
} from './recognizer';
