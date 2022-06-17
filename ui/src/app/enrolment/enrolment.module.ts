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
import { NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { UIRouterModule } from '@uirouter/angular';
import { SharedModule } from '../shared/shared.module';
import { ActiveEnrolmentComponent } from './active/active-enrolment.component';
import { AddEnrolmentInformationDialogComponent } from './active/dialogs/add-enrolment-information-dialog.component';
import { SelectExaminationEventDialogComponent } from './active/dialogs/select-examination-event-dialog.component';
import { ShowInstructionsDialogComponent } from './active/dialogs/show-instructions-dialog.component';
import { ActiveEnrolmentMenuComponent } from './active/helpers/active-enrolment-menu.component';
import { EnrolmentService } from './enrolment.service';
import { EnrolmentDetailsComponent } from './exams/exam-enrolment-details.component';
import { ExamEnrolmentsComponent } from './exams/exam-enrolments.component';
import { CollaborativeParticipationsComponent } from './finished/collaborative-exam-participations.component';
import { ExamFeedbackComponent } from './finished/exam-feedback.component';
import { ExamParticipationComponent } from './finished/exam-participation.component';
import { ExamParticipationsComponent } from './finished/exam-participations.component';
import { CollaborativeExamSearchComponent } from './search/collaborative-exam-search.component';
import { ExamSearchResultComponent } from './search/exam-search-result.component';
import { ExamSearchComponent } from './search/exam-search.component';
import { ExamSearchService } from './search/exam-search.service';
import { WaitingRoomComponent } from './waiting-room/waiting-room.component';
import { WrongLocationComponent } from './wrong-location/wrong-location.component';
import { WrongLocationService } from './wrong-location/wrong-location.service';

@NgModule({
    imports: [BrowserAnimationsModule, UIRouterModule, NgbDropdownModule, SharedModule],
    exports: [ActiveEnrolmentComponent, ExamSearchResultComponent],
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
    bootstrap: [
        AddEnrolmentInformationDialogComponent,
        SelectExaminationEventDialogComponent,
        ShowInstructionsDialogComponent,
    ],
    providers: [EnrolmentService, ExamSearchService, WrongLocationService],
})
export class EnrolmentModule {}
