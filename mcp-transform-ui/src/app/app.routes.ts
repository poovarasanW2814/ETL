import { Routes } from '@angular/router';

import { DashboardComponent } from './pages/dashboard.component';
import { DataTransferPanelComponent } from './pages/data-transfer-panel.component';
import { JobAnalyticsComponent } from './pages/job-analytics.component';
import { JobDetailsComponent } from './pages/job-details.component';
import { MongoTransferComponent } from './pages/mongo-transfer.component';
import { PipelineHistoryComponent } from './pages/pipeline-history.component';
import { PromptTesterComponent } from './pages/prompt-tester.component';

export const appRoutes: Routes = [
  { path: '', component: DashboardComponent },
  { path: 'analytics', component: JobAnalyticsComponent },
  { path: 'dtp', component: DataTransferPanelComponent },
  { path: 'mongo-transfer', component: MongoTransferComponent },
  { path: 'jobs/:jobId', component: JobDetailsComponent },
  { path: 'pipelines/:pipelineId', component: PipelineHistoryComponent },
  { path: 'prompt-tester', component: PromptTesterComponent },
];
