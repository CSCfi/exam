import { downgradeComponent } from '@angular/upgrade/static';

import { ExamTabsComponent } from './editor/examTabs.component';

export default angular
    .module('app.exam.editor', [])
    .directive('examTabs', downgradeComponent({ component: ExamTabsComponent })).name;
