// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, Route } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { map, Observable } from 'rxjs';
import { ReportsComponent } from 'src/app/administrative/reports/reports.component';
import { SettingsComponent } from 'src/app/administrative/settings/settings.component';
import { StatisticsComponent } from 'src/app/administrative/statistics/statistics.component';
import { UsersComponent } from 'src/app/administrative/users/users.component';
import { CollaborativeExamListingComponent } from 'src/app/exam/collaborative/collaborative-exam-listing.component';
import { CollaborativeExamService } from 'src/app/exam/collaborative/collaborative-exam.service';
import { ExamAssessmentComponent } from 'src/app/exam/editor/assessment/exam-assessment.component';
import { BasicExamInfoComponent } from 'src/app/exam/editor/basic/basic-exam-info.component';
import { CourseSelectionComponent } from 'src/app/exam/editor/creation/course-selection.component';
import { NewExamComponent } from 'src/app/exam/editor/creation/new-exam.component';
import { ExaminationEventSearchComponent } from 'src/app/exam/editor/events/examination-event-search.component';
import { ExamTabsComponent } from 'src/app/exam/editor/exam-tabs.component';
import { ExamTabService } from 'src/app/exam/editor/exam-tabs.service';
import { ExamPublicationComponent } from 'src/app/exam/editor/publication/exam-publication.component';
import { SectionsComponent } from 'src/app/exam/editor/sections/sections.component';
import { ExamService } from 'src/app/exam/exam.service';
import { ExamListingComponent } from 'src/app/exam/listing/exam-list.component';
import { PrintoutComponent } from 'src/app/exam/printout/printout.component';
import { PrintoutListingComponent } from 'src/app/exam/printout/printouts.component';
import { ExaminationComponent } from 'src/app/examination/examination.component';
import { FacilityComponent } from 'src/app/facility/facility.component';
import { MachineComponent } from 'src/app/facility/machines/machine.component';
import { AvailabilityComponent } from 'src/app/facility/rooms/availability.component';
import { MultiRoomComponent } from 'src/app/facility/rooms/room-mass-edit.component';
import { RoomComponent } from 'src/app/facility/rooms/room.component';
import { LanguageInspectionsComponent } from 'src/app/maturity/language-inspections.component';
import { MaturityReportingComponent } from 'src/app/maturity/reporting/maturity-reporting.component';
import { QuestionComponent } from 'src/app/question/editor/base/question.component';
import { hasUnsavedChangesGuard } from 'src/app/question/editor/common/tools/has-unsaved-changes.guard';
import { LibraryComponent } from 'src/app/question/library/library.component';
import { ReservationsComponent } from 'src/app/reservation/reservations.component';
import { AssessmentComponent } from 'src/app/review/assessment/assessment.component';
import { PrintedAssessmentComponent } from 'src/app/review/assessment/print/printed-assessment.component';
import { ReviewListComponent } from 'src/app/review/listing/review-list.component';
import { ReviewListService } from 'src/app/review/listing/review-list.service';
import { SpeedReviewComponent } from 'src/app/review/listing/speed-review.component';
import { QuestionAssessmentComponent } from 'src/app/review/questions/assessment/question-assessment.component';
import { QuestionReviewsComponent } from 'src/app/review/questions/listing/question-reviews.component';
import { AdminDashboardComponent } from './admin/admin-dashboard.component';
import { StaffDashboardComponent } from './staff-dashboard.component';
import { TeacherDashboardComponent } from './teacher/teacher-dashboard.component';

const buildTitle = (key: string, extraPart = ''): Observable<string> => {
    const tx = inject(TranslateService);
    const extra = extraPart ? ` ${extraPart}` : '';
    return tx.get(key).pipe(map(() => `${tx.instant(key)}${extra} - EXAM`));
};

const reviewListResolver = (route: ActivatedRouteSnapshot) => {
    const id = route.pathFromRoot[3].params.id; // hacky yes
    const isCollab = inject(ExamTabService).isCollaborative() || route.queryParamMap.get('collaborative') === 'true';
    return inject(ReviewListService).getReviews$(id, isCollab);
};

export const STAFF_ROUTES: Route[] = [
    {
        path: '',
        component: StaffDashboardComponent,
        children: [
            { path: 'teacher', component: TeacherDashboardComponent, title: () => buildTitle('i18n_dashboard_title') },
            { path: 'admin', component: AdminDashboardComponent, title: () => buildTitle('i18n_dashboard_title') },

            { path: 'questions', component: LibraryComponent, title: () => buildTitle('i18n_question_bank_title') },
            {
                path: 'questions/:id/edit',
                component: QuestionComponent,
                data: {
                    newQuestion: false,
                    nextState: 'questions',
                },
                canDeactivate: [hasUnsavedChangesGuard],
                title: () => buildTitle('i18n_edit_question_title'),
            },
            {
                path: 'questions/new',
                component: QuestionComponent,
                data: { newQuestion: true },
                canDeactivate: [hasUnsavedChangesGuard],
                title: () => buildTitle('i18n_new_question_title'),
            },

            { path: 'exams', component: NewExamComponent, title: () => buildTitle('i18n_create_exam_title') },
            {
                path: 'exams/:id',
                component: ExamTabsComponent,
                resolve: {
                    exam: (route: ActivatedRouteSnapshot) => {
                        const id = Number(route.paramMap.get('id'));
                        const isCollab = route.queryParamMap.get('collaborative') === 'true';
                        return isCollab
                            ? inject(CollaborativeExamService).download$(id)
                            : inject(ExamService).downloadExam$(id);
                    },
                },
                children: [
                    {
                        path: '1',
                        component: BasicExamInfoComponent,
                        title: () => buildTitle('i18n_exam_basic_info_title'),
                    },
                    {
                        path: '2',
                        component: SectionsComponent,
                        title: () => buildTitle('i18n_exam_sections_title'),
                    },
                    {
                        path: '3',
                        component: ExamAssessmentComponent,
                        title: () => buildTitle('i18n_exam_assessment_settings_title'),
                    },
                    {
                        path: '4',
                        component: ExamPublicationComponent,
                        title: () => buildTitle('i18n_exam_publication_settings_title'),
                    },
                    {
                        path: '5',
                        component: ReviewListComponent,
                        resolve: { reviews: reviewListResolver },
                        title: () => buildTitle('i18n_exam_reviews_title'),
                    },
                    {
                        path: '6',
                        component: QuestionReviewsComponent,
                        title: () => buildTitle('i18n_exam_question_reviews_title'),
                    },
                    {
                        path: '7',
                        loadComponent: () =>
                            import('../../review/listing/summary/exam-summary.component').then(
                                (mod) => mod.ExamSummaryComponent,
                            ),
                        resolve: { reviews: reviewListResolver },
                        title: () => buildTitle('i18n_exam_summary_title'),
                    },
                ],
            },
            {
                path: 'exams/:id/course',
                component: CourseSelectionComponent,
                title: () => buildTitle('i18n_create_exam_title'),
            },
            {
                path: 'exams/:id/preview', // Hox tab qp
                component: ExaminationComponent,
                data: { isPreview: true },
            },
            {
                path: 'exams/:id/preview/collaborative', // HOX! tab qp
                component: ExaminationComponent,
                data: { isPreview: true, isCollaborative: true },
            },
            {
                // HOX! tab qp
                path: 'exams/:id/printout',
                component: PrintoutComponent,
            },
            {
                path: 'printouts',
                component: PrintoutListingComponent,
                title: () => buildTitle('i18n_printouts_title'),
            },
            {
                path: 'collaborative',
                component: CollaborativeExamListingComponent,
                title: () => buildTitle('i18n_collaborative_exams_title'),
            },
            {
                path: 'examinationevents',
                component: ExaminationEventSearchComponent,
                title: () => buildTitle('i18n_examination_events_title'),
            },
            {
                path: 'assessments/:id',
                component: AssessmentComponent,
                data: { collaborative: false },
                title: () => buildTitle('i18n_assessment_title'),
            },
            {
                path: 'assessments/:id/collaborative/:ref',
                component: AssessmentComponent,
                data: { collaborative: true },
                title: () => buildTitle('i18n_collaborative_assessment_title'),
            },
            {
                path: 'assessments/:id/questions',
                component: QuestionAssessmentComponent,
                title: () => buildTitle('i18n_assessment_questions_title'),
            },
            {
                path: 'assessments/:id/speedreview',
                component: SpeedReviewComponent,
                title: () => buildTitle('i18n_speed_review_title'),
            },
            {
                path: 'assessments/:id/print',
                component: PrintedAssessmentComponent,
                data: { collaborative: false },
                title: () => buildTitle('i18n_assessment_print_title'),
            },
            {
                path: 'assessments/:id/print/:ref',
                component: PrintedAssessmentComponent,
                data: { collaborative: true },
                title: () => buildTitle('i18n_collaborative_assessment_print_title'),
            },
            {
                path: 'inspections',
                component: LanguageInspectionsComponent,
                title: () => buildTitle('i18n_language_inspections_title'),
            },
            {
                path: 'inspections/reports',
                component: MaturityReportingComponent,
                title: () => buildTitle('i18n_language_inspection_reports_title'),
            },
            {
                path: 'admin/exams',
                component: ExamListingComponent,
                title: () => buildTitle('i18n_admin_exams_title'),
            },
            {
                path: 'reservations',
                component: ReservationsComponent,
                title: () => buildTitle('i18n_reservations_title'),
            },
            { path: 'reservations/:eid', component: ReservationsComponent },
            { path: 'rooms', component: FacilityComponent, title: () => buildTitle('i18n_exam_rooms_title') },
            { path: 'rooms/:id', component: RoomComponent, title: () => buildTitle('i18n_exam_room_title') },
            {
                path: 'rooms/:id/availability',
                component: AvailabilityComponent,
                title: () => buildTitle('i18n_room_availability_title'),
            },
            { path: 'settings', component: SettingsComponent, title: () => buildTitle('i18n_settings_title') },
            { path: 'users', component: UsersComponent, title: () => buildTitle('i18n_users_title') },
            { path: 'multiroom', component: MultiRoomComponent, title: () => buildTitle('i18n_multiroom_title') },
            { path: 'machines/:id', component: MachineComponent, title: () => buildTitle('i18n_machine_title') },
            { path: 'reports', component: ReportsComponent, title: () => buildTitle('i18n_reports_title') },
            { path: 'statistics', component: StatisticsComponent, title: () => buildTitle('i18n_statistics_title') },
        ],
    },
];
