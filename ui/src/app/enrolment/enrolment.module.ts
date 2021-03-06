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
import { NgModule } from '@angular/core';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { UIRouterModule } from '@uirouter/angular';

import { UtilityModule } from '../utility/utility.module';
import { ActiveEnrolmentComponent } from './active/activeEnrolment.component';
import { AddEnrolmentInformationDialogComponent } from './active/dialogs/addEnrolmentInformationDialog.component';
import { SelectExaminationEventDialogComponent } from './active/dialogs/selectExaminationEventDialog.component';
import { ShowInstructionsDialogComponent } from './active/dialogs/showInstructionsDialog.component';
import { ActiveEnrolmentMenuComponent } from './active/helpers/activeEnrolmentMenu.component';
import { EnrolmentService } from './enrolment.service';
import { EnrolmentDetailsComponent } from './exams/examEnrolmentDetails.component';
import { ExamEnrolmentsComponent } from './exams/examEnrolments.component';
import { CollaborativeParticipationsComponent } from './finished/collaborativeExamParticipations.component';
import { ExamFeedbackComponent } from './finished/examFeedback.component';
import { ExamParticipationComponent } from './finished/examParticipation.component';
import { ExamParticipationsComponent } from './finished/examParticipations.component';
import { CollaborativeExamSearchComponent } from './search/collaborativeExamSearch.component';
import { ExamSearchComponent } from './search/examSearch.component';
import { ExamSearchResultComponent } from './search/examSearchResult.component';
import { WaitingRoomComponent } from './waiting-room/waitingRoom.component';
import { WrongLocationComponent } from './wrong-location/wrongLocation.component';
import { WrongLocationService } from './wrong-location/wrongLocation.service';

@NgModule({
    imports: [BrowserAnimationsModule, NgbModule, UIRouterModule, UtilityModule],
    exports: [ActiveEnrolmentComponent],
    declarations: [
        ActiveEnrolmentComponent,
        EnrolmentDetailsComponent,
        ExamEnrolmentsComponent,
        CollaborativeParticipationsComponent,
        ExamFeedbackComponent,
        ExamParticipationComponent,
        ExamParticipationsComponent,
        CollaborativeExamSearchComponent,
        ExamSearchComponent,
        ExamSearchResultComponent,
        WaitingRoomComponent,
        WrongLocationComponent,
        AddEnrolmentInformationDialogComponent,
        ActiveEnrolmentMenuComponent,
        SelectExaminationEventDialogComponent,
        ShowInstructionsDialogComponent,
    ],
    entryComponents: [
        ActiveEnrolmentComponent,
        EnrolmentDetailsComponent,
        ExamEnrolmentsComponent,
        CollaborativeParticipationsComponent,
        ExamFeedbackComponent,
        ExamParticipationComponent,
        ExamParticipationsComponent,
        CollaborativeExamSearchComponent,
        ExamSearchComponent,
        ExamSearchResultComponent,
        WaitingRoomComponent,
        WrongLocationComponent,
        AddEnrolmentInformationDialogComponent,
        SelectExaminationEventDialogComponent,
        ShowInstructionsDialogComponent,
    ],
    providers: [EnrolmentService, WrongLocationService],
})
export class EnrolmentModule {}
