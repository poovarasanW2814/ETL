import { Routes } from '@angular/router';

import { DashboardComponent } from './pages/dashboard.component';
import { JobAnalyticsComponent } from './pages/job-analytics.component';
import { JobDetailsComponent } from './pages/job-details.component';
import { PipelineHistoryComponent } from './pages/pipeline-history.component';
import { PromptTesterComponent } from './pages/prompt-tester.component';

export const appRoutes: Routes = [
  { path: '', component: DashboardComponent },
  { path: 'analytics', component: JobAnalyticsComponent },
  { path: 'jobs/:jobId', component: JobDetailsComponent },
  { path: 'pipelines/:pipelineId', component: PipelineHistoryComponent },
  { path: 'prompt-tester', component: PromptTesterComponent },
];
