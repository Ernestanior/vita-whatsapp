/**
 * Food Record Module
 * Exports food record management functionality
 */

export { FoodRecordManager, foodRecordManager } from './food-record-manager';
export { HistoryManager, historyManager } from './history-manager';

export type {
  SaveRecordParams,
  FoodRecord,
} from './food-record-manager';

export type {
  HistoryQueryParams,
  HistoryResult,
  DateRangeStats,
} from './history-manager';
