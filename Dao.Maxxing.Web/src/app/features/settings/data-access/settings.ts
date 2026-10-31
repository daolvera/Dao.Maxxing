import { Nutrition, WeightUnit } from '../../../nutrition/nutrition';

/** Daily targets that apply from `from` until the next goal starts. */
export interface Goal extends Nutrition {
  from: string;
}

export interface MealSection {
  name: string;
  visible: boolean;
}

export interface Preferences {
  timeZone: string;
  weightUnit: WeightUnit;
}
