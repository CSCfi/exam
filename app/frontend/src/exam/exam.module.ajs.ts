/*
 * Copyright (c) 2017 Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */
import { downgradeComponent, downgradeInjectable } from '@angular/upgrade/static';
import * as angular from 'angular';

import { CollaborativeExamListingComponent } from './collaborative/collaborativeExamListing.component';
import { ExamTabsComponent } from './editor/examTabs.component';
import { ExamService } from './exam.service';
import { ExamListingComponent } from './listing/examList.component';
import { PrintoutComponent } from './printout/printout.component';
import { PrintoutListingComponent } from './printout/printoutListing.component';

require('../review/review.module.ajs');
require('../question/question.module.ajs');

export default angular
    .module('app.exam', ['app.review', 'app.question'])
    .directive('examTabs', downgradeComponent({ component: ExamTabsComponent }))
    .directive('examList', downgradeComponent({ component: ExamListingComponent }))
    .directive('printout', downgradeComponent({ component: PrintoutComponent }))
    .directive('printoutListing', downgradeComponent({ component: PrintoutListingComponent }))
    .directive('collaborativeExamListing', downgradeComponent({ component: CollaborativeExamListingComponent }))
    .service('Exam', downgradeInjectable(ExamService)).name;
