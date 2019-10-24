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

import { ActiveEnrolmentComponent } from './active/activeEnrolment.component';
import { EnrolmentService } from './enrolment.service';
import { EnrolmentDetailsComponent } from './exams/examEnrolmentDetails.component';
import { ExamEnrolmentsComponent } from './exams/examEnrolments.component';
import { CollaborativeExamParticipationsComponent } from './finished/collaborativeExamParticipations.component';
import { ExamFeedbackComponent } from './finished/examFeedback.component';
import { ExamParticipationComponent } from './finished/examParticipation.component';
import { ExamParticipationsComponent } from './finished/examParticipations.component';
import { CollaborativeExamSearchComponent } from './search/collaborativeExamSearch.component';
import { ExamSearchComponent } from './search/examSearch.component';
import { ExamSearchResultComponent } from './search/examSearchResult.component';
import { WaitingRoomComponent } from './waiting-room/waitingRoom.component';
import { WrongLocationComponent } from './wrong-location/wrongLocation.component';
import { WrongLocationService } from './wrong-location/wrongLocation.service';

require('../common');
require('../exam'); // TODO: refactor
require('../calendar/calendar.module.ajs.ts');

export default angular
    .module('app.enrolment', ['app.common', 'app.exam', 'app.calendar'])
    .service('Enrolment', downgradeInjectable(EnrolmentService))
    .service('WrongLocation', downgradeInjectable(WrongLocationService))
    .directive('activeEnrolment', downgradeComponent({ component: ActiveEnrolmentComponent }))
    .directive('enrolmentDetails', downgradeComponent({ component: EnrolmentDetailsComponent }))
    .directive('examEnrolments', downgradeComponent({ component: ExamEnrolmentsComponent }))
    .directive(
        'collaborativeExamParticipations',
        downgradeComponent({ component: CollaborativeExamParticipationsComponent }),
    )
    .directive('examFeedback', downgradeComponent({ component: ExamFeedbackComponent }))
    .directive('examParticipation', downgradeComponent({ component: ExamParticipationComponent }))
    .directive('examParticipations', downgradeComponent({ component: ExamParticipationsComponent }))
    .directive('collaborativeExamSearch', downgradeComponent({ component: CollaborativeExamSearchComponent }))
    .directive('examSearch', downgradeComponent({ component: ExamSearchComponent }))
    .directive('examSearchResult', downgradeComponent({ component: ExamSearchResultComponent }))
    .directive('waitingRoom', downgradeComponent({ component: WaitingRoomComponent }))
    .directive('wrongLocation', downgradeComponent({ component: WrongLocationComponent })).name;
