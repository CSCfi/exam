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
import { Transition, UIRouterModule } from '@uirouter/angular';

import { ReportsComponent } from './administrative/reports/reports.component';
import { SettingsComponent } from './administrative/settings/settings.component';
import { StatisticsComponent } from './administrative/statistics/statistics.component';
import { UsersComponent } from './administrative/users/users.component';
import { AppComponent } from './app.component';
import { CalendarComponent } from './calendar/calendar.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { ExamEnrolmentsComponent } from './enrolment/exams/examEnrolments.component';
import { CollaborativeParticipationsComponent } from './enrolment/finished/collaborativeExamParticipations.component';
import { ExamParticipationsComponent } from './enrolment/finished/examParticipations.component';
import { CollaborativeExamSearchComponent } from './enrolment/search/collaborativeExamSearch.component';
import { ExamSearchComponent } from './enrolment/search/examSearch.component';
import { WaitingRoomComponent } from './enrolment/waiting-room/waitingRoom.component';
import { WrongLocationComponent } from './enrolment/wrong-location/wrongLocation.component';
import { CollaborativeExamService } from './exam/collaborative/collaborativeExam.service';
import { CollaborativeExamListingComponent } from './exam/collaborative/collaborativeExamListing.component';
import { BasicExamInfoComponent } from './exam/editor/basic/basicExamInfo.component';
import { CourseSelectionComponent } from './exam/editor/creation/courseSelection.component';
import { NewExamComponent } from './exam/editor/creation/newExam.component';
import { ExamTabsComponent } from './exam/editor/examTabs.component';
import { ExamPublicationComponent } from './exam/editor/publication/examPublication.component';
import { SectionsListComponent } from './exam/editor/sections/sectionsList.component';
import { ExamService } from './exam/exam.service';
import { ExamListingComponent } from './exam/listing/examList.component';
import { PrintoutComponent } from './exam/printout/printout.component';
import { PrintoutListingComponent } from './exam/printout/printoutListing.component';
import { ExaminationComponent } from './examination/examination.component';
import { ExaminationLogoutComponent } from './examination/logout/examinationLogout.component';
import { ExamRoomsAdminTabsComponent } from './facility/examRoomsAdminTabs.component';
import { MachineComponent } from './facility/machines/machine.component';
import { AvailabilityComponent } from './facility/rooms/availability.component';
import { MultiRoomComponent } from './facility/rooms/multiRoom.component';
import { RoomComponent } from './facility/rooms/room.component';
import { LanguageInspectionsComponent } from './maturity/languageInspections.component';
import { MaturityReportingComponent } from './maturity/reporting/maturityReporting.component';
import { QuestionComponent } from './question/basequestion/question.component';
import { LibraryComponent } from './question/library/library.component';
import { TeacherReservationComponent } from './reservation/teacher/teacherReservations.component';
import { AssessmentComponent } from './review/assessment/assessment.component';
import { PrintedAssessmentComponent } from './review/assessment/print/printedAssessment.component';
import { ReviewListComponent } from './review/listing/reviewList.component';
import { ReviewListService } from './review/listing/reviewList.service';
import { SpeedReviewComponent } from './review/listing/speedReview.component';
import { ExamSummaryComponent } from './review/listing/summary/examSummary.component';
import { QuestionAssessmentComponent } from './review/questions/assessment/questionAssessment.component';
import { QuestionReviewsComponent } from './review/questions/listing/questionReviews.component';
import { LogoutComponent } from './session/logout/logout.component';
import { SoftwareComponent } from './software/software.component';

import type { RootModule, UIRouter } from '@uirouter/angular';
import type { Exam } from './exam/exam.model';
function uiRouterConfigFn(router: UIRouter) {
    // Configure the initial state
    // If the browser URL doesn't matches any state when the router starts,
    // go to the `dashboard` state by default
    router.urlService.rules.initial({ state: 'app' });

    // Use @uirouter/visualizer to show the states and transitions
    // visualizer(router);
}

const rootModule: RootModule = {
    states: [
        { name: 'dashboard', url: '/dashboard', component: DashboardComponent },
        { name: 'library', url: '/questions', component: LibraryComponent },
        {
            name: 'question',
            url: '/questions/:id',
            component: QuestionComponent,
            resolve: {
                newQuestion: () => false,
                nextState: () => 'library',
            },
        },
        {
            name: 'newQuestion',
            url: '/questions/newQuestion/:nextState',
            component: QuestionComponent,
            resolve: {
                newQuestion: () => true,
            },
        },
        {
            name: 'newExam',
            url: '/exams/new',
            component: NewExamComponent,
        },

        // exam editor and its children
        {
            name: 'examEditor',
            url: '/exams/:id/:collaborative',
            component: ExamTabsComponent,
            params: {
                collaborative: {
                    value: 'regular',
                },
            },
            resolve: [
                {
                    token: 'exam',
                    deps: [ExamService, CollaborativeExamService, Transition],
                    resolveFn: (
                        examService: ExamService,
                        collabService: CollaborativeExamService,
                        transition: Transition,
                    ) => {
                        const id = transition.params().id;
                        const isCollab = transition.params().collaborative == 'collaborative';
                        return isCollab ? collabService.download$(id) : examService.downloadExam(id);
                    },
                },
                {
                    token: 'collaborative',
                    deps: [Transition],
                    resolveFn: (transition: Transition) => transition.params().collaborative == 'collaborative',
                },
            ],
        },
        {
            name: 'examEditor.basic',
            url: '/1',
            component: BasicExamInfoComponent,
            resolve: [
                {
                    token: 'exam',
                    deps: ['exam'],
                    resolveFn: (exam: Exam) => exam,
                },
                {
                    token: 'collaborative',
                    deps: ['collaborative'],
                    resolveFn: (collaborative: boolean) => collaborative,
                },
            ],
        },
        {
            name: 'examEditor.sections',
            url: '/2',
            component: SectionsListComponent,
            resolve: [
                {
                    token: 'exam',
                    deps: ['exam'],
                    resolveFn: (exam: Exam) => exam,
                },
                {
                    token: 'collaborative',
                    deps: ['collaborative'],
                    resolveFn: (collaborative: boolean) => collaborative,
                },
            ],
        },
        {
            name: 'examEditor.publication',
            url: '/3',
            component: ExamPublicationComponent,
            resolve: [
                {
                    token: 'exam',
                    deps: ['exam'],
                    resolveFn: (exam: Exam) => exam,
                },
                {
                    token: 'collaborative',
                    deps: ['collaborative'],
                    resolveFn: (collaborative: boolean) => collaborative,
                },
            ],
        },
        {
            name: 'examEditor.assessments',
            url: '/4',
            component: ReviewListComponent,
            resolve: [
                {
                    token: 'exam',
                    deps: ['exam'],
                    resolveFn: (exam: Exam) => exam,
                },
                {
                    token: 'collaborative',
                    deps: ['collaborative'],
                    resolveFn: (collaborative: boolean) => collaborative,
                },
                {
                    token: 'reviews',
                    deps: [ReviewListService, Transition, 'collaborative'],
                    resolveFn: (reviewList: ReviewListService, transition: Transition, collaborative: boolean) =>
                        reviewList.getReviews(transition.params().id, collaborative),
                },
            ],
        },
        {
            name: 'examEditor.questionReview',
            url: '/5',
            component: QuestionReviewsComponent,
            resolve: [
                {
                    token: 'examId',
                    deps: ['exam'],
                    resolveFn: (exam: Exam) => exam.id,
                },
            ],
        },
        {
            name: 'examEditor.summary',
            url: '/6',
            component: ExamSummaryComponent,
            resolve: [
                {
                    token: 'exam',
                    deps: ['exam'],
                    resolveFn: (exam: Exam) => exam,
                },
                {
                    token: 'collaborative',
                    deps: ['collaborative'],
                    resolveFn: (collaborative: boolean) => collaborative,
                },
                {
                    token: 'reviews',
                    deps: [ReviewListService, Transition, 'collaborative'],
                    resolveFn: (reviewList: ReviewListService, transition: Transition, collaborative: boolean) =>
                        reviewList.getReviews(transition.params().id, collaborative),
                },
            ],
        },

        {
            name: 'courseSelector',
            url: '/exams/:id/select/course',
            component: CourseSelectionComponent,
        },
        {
            name: 'examPreview',
            url: '/exams/:id/view/preview?{tab}',
            component: ExaminationComponent,
            resolve: [
                {
                    token: 'isPreview',
                    resolveFn: () => true,
                },
            ],
        },
        {
            name: 'collaborativePreview',
            url: '/exams/collaborative/:id/view/preview?{tab}',
            component: ExaminationComponent,
            resolve: {
                isPreview: () => true,
                isCollaborative: () => true,
            },
        },
        {
            name: 'printout',
            url: '/exams/:id/view/printout?{tab}',
            component: PrintoutComponent,
        },
        {
            name: 'printouts',
            url: '/printouts',
            component: PrintoutListingComponent,
        },
        {
            name: 'collaborativeExams',
            url: '/exams/collaborative',
            component: CollaborativeExamListingComponent,
        },
        {
            name: 'calendar',
            url: '/calendar/:id?{selected}',
            component: CalendarComponent,
            resolve: [
                {
                    token: 'isExternal',
                    resolveFn: () => false,
                },
                {
                    token: 'isCollaborative',
                    resolveFn: () => false,
                },
            ],
        },
        {
            name: 'externalCalendar',
            url: '/iop/calendar/:id?{selected}&{isCollaborative}',
            component: CalendarComponent,
            resolve: {
                isExternal: () => true,
            },
        },
        {
            name: 'collaborativeCalendar',
            url: 'collaborative/calendar/:id',
            component: CalendarComponent,
            resolve: {
                isExternal: () => false,
                isCollaborative: () => true,
            },
        },
        {
            name: 'logout',
            url: '/logout',
            component: LogoutComponent,
        },
        {
            name: 'examination',
            url: '/student/exam/:hash',
            component: ExaminationComponent,
            resolve: {
                isPreview: () => false,
            },
        },
        {
            name: 'waitingRoom',
            url: '/student/waiting-room/:id',
            component: WaitingRoomComponent,
        },
        {
            name: 'waitingRoomNoExam',
            url: '/student/waiting-room',
            component: WaitingRoomComponent,
        },
        {
            name: 'wrongRoom',
            url: '/student/wrong-room/:eid/:mid',
            component: WrongLocationComponent,
            resolve: {
                cause: () => 'room',
            },
        },
        {
            name: 'wrongMachine',
            url: '/student/wrong-room/:eid/:mid',
            component: WrongLocationComponent,
            resolve: {
                cause: () => 'machine',
            },
        },
        {
            name: 'examSearch',
            url: '/student/exams',
            component: ExamSearchComponent,
        },
        {
            name: 'collaborativeExamSearch',
            url: '/student/exams/collaborative',
            component: CollaborativeExamSearchComponent,
        },
        {
            name: 'participations',
            url: '/student/participations',
            component: ExamParticipationsComponent,
        },
        {
            name: 'collaborativeParticipations',
            url: '/student/participations/collaborative',
            component: CollaborativeParticipationsComponent,
        },
        {
            name: 'examinationLogout',
            url: '/student/logout?{reason}&{quitLinkEnabled}',
            component: ExaminationLogoutComponent,
        },
        {
            name: 'enrolments',
            url: '/enroll/exam/:id?{code}',
            component: ExamEnrolmentsComponent,
        },
        {
            name: 'assessment',
            url: '/assessments/:id',
            component: AssessmentComponent,
            resolve: {
                collaborative: () => false,
            },
        },
        {
            name: 'collaborativeAssessment',
            url: '/assessments/collaborative/:id/:ref',
            component: AssessmentComponent,
            resolve: {
                collaborative: () => true,
            },
        },
        {
            name: 'speedReview',
            url: '/speedreview/:id',
            component: SpeedReviewComponent,
        },
        {
            name: 'printedAssessment',
            url: '/print/exam/:id',
            component: PrintedAssessmentComponent,
            resolve: {
                collaborative: () => false,
            },
        },
        {
            name: 'collaborativePrintedAssessment',
            url: '/print/exam/:id/:ref',
            component: PrintedAssessmentComponent,
            resolve: {
                collaborative: () => true,
            },
        },
        {
            name: 'questionAssessment',
            url: '/assessment/:id/questions?{q}',
            component: QuestionAssessmentComponent,
        },
        {
            name: 'reservations',
            url: '/reservations',
            component: TeacherReservationComponent,
        },
        {
            name: 'examReservations',
            url: '/reservations/:eid',
            component: TeacherReservationComponent,
        },
        { name: 'exams', url: '/exams', component: ExamListingComponent },
        { name: 'software', url: '/softwares', component: SoftwareComponent },
        { name: 'settings', url: '/settings', component: SettingsComponent },
        { name: 'users', url: '/users', component: UsersComponent },
        {
            name: 'languageInspections',
            url: '/inspections',
            component: LanguageInspectionsComponent,
        },
        {
            name: 'languageInspectionReports',
            url: '/inspections/reports',
            component: MaturityReportingComponent,
        },
        {
            name: 'app',
            url: '/',
            component: AppComponent,
        },
        {
            name: 'rooms',
            url: '/rooms',
            component: ExamRoomsAdminTabsComponent,
        },
        {
            name: 'machine',
            url: '/machines/:id',
            component: MachineComponent,
        },
        {
            name: 'room',
            url: '/rooms/:id',
            component: RoomComponent,
        },
        {
            name: 'availability',
            url: '/rooms/:id/availability',
            component: AvailabilityComponent,
        },
        {
            name: 'multiRoom',
            url: '/rooms_edit/edit_multiple',
            component: MultiRoomComponent,
        },
        {
            name: 'reports',
            url: '/reports',
            component: ReportsComponent,
        },
        {
            name: 'statistics',
            url: '/statistics',
            component: StatisticsComponent,
        },
    ],
    useHash: false,
    //otherwise: 'dashboard',
    config: uiRouterConfigFn,
};

@NgModule({
    imports: [UIRouterModule.forRoot(rootModule)],
    exports: [UIRouterModule],
})
export class AppRoutingModule {}
