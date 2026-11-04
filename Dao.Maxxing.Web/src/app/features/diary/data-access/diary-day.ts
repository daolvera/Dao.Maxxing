import { Nutrition, PortionUnit } from '../../../nutrition/nutrition';
import { Food } from '../../foods/data-access/food';

/** A logged portion. Its nutrition is a snapshot, so later edits to the food don't change it. */
export interface DiaryEntry extends Nutrition {
  id: string;
  foodId: string;
  name: string;
  serving: string;
  grams?: number;
  quantity: number;
  unit: PortionUnit;
  /** Per-serving nutrition at the time it was logged, used to re-scale on edit. */
  base: Nutrition;
  section: string;
}

export interface DiaryDay {
  date: string;
  sections: string[];
  entries: DiaryEntry[];
  complete: boolean;
}

export interface NewDiaryEntry {
  food: Food;
  quantity: number;
  unit: PortionUnit;
  section: string;
}

export type DiaryEntryChange = Pick<DiaryEntry, 'quantity' | 'unit' | 'section'>;
