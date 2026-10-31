import { Routes } from '@angular/router';
import { DiaryStore } from './data-access/diary.store';
import { DiaryPageComponent } from './diary-page.component';

export const diaryRoutes: Routes = [
  { path: '', component: DiaryPageComponent, providers: [DiaryStore], title: 'Diary · Maxxing' },
];
