import { NgModule } from '@angular/core';
import { Route, RouterModule } from '@angular/router';
import { ExamAssessmentComponent } from 'src/app/exam/editor/assessment/exam-assessment.component';
import { BasicExamInfoComponent } from 'src/app/exam/editor/basic/basic-exam-info.component';
import { ExamResolverService } from 'src/app/exam/editor/basic/exam-resolver.service';
import { ExamTabsComponent } from 'src/app/exam/editor/exam-tabs.component';
import { ExamPublicationComponent } from 'src/app/exam/editor/publication/exam-publication.component';
import { SectionsComponent } from 'src/app/exam/editor/sections/sections.component';
import { PrintoutComponent } from 'src/app/exam/printout/printout.component';
import { QuestionEditQuard } from 'src/app/question/question-edit-guard';
import { ReviewListResolverService } from 'src/app/review/listing/review-list-resolver.service';
import { ReviewListComponent } from 'src/app/review/listing/review-list.component';
import { ExamSummaryComponent } from 'src/app/review/listing/summary/exam-summary.component';
import { QuestionReviewsComponent } from 'src/app/review/questions/listing/question-reviews.component';
import { ReportsComponent } from '../../administrative/reports/reports.component';
import { SettingsComponent } from '../../administrative/settings/settings.component';
import { StatisticsComponent } from '../../administrative/statistics/statistics.component';
import { UsersComponent } from '../../administrative/users/users.component';
import { CollaborativeExamListingComponent } from '../../exam/collaborative/collaborative-exam-listing.component';
import { CourseSelectionComponent } from '../../exam/editor/creation/course-selection.component';
import { NewExamComponent } from '../../exam/editor/creation/new-exam.component';
import { ExaminationEventSearchComponent } from '../../exam/editor/events/examination-event-search.component';
import { ExamListingComponent } from '../../exam/listing/exam-list.component';
import { PrintoutListingComponent } from '../../exam/printout/printouts.component';
import { ExaminationComponent } from '../../examination/examination.component';
import { FacilityComponent } from '../../facility/facility.component';
import { MachineComponent } from '../../facility/machines/machine.component';
import { AvailabilityComponent } from '../../facility/rooms/availability.component';
import { MultiRoomComponent } from '../../facility/rooms/room-mass-edit.component';
import { RoomComponent } from '../../facility/rooms/room.component';
import { LanguageInspectionsComponent } from '../../maturity/language-inspections.component';
import { MaturityReportingComponent } from '../../maturity/reporting/maturity-reporting.component';
import { QuestionComponent } from '../../question/basequestion/question.component';
import { LibraryComponent } from '../../question/library/library.component';
import { TeacherReservationComponent } from '../../reservation/teacher/teacher-reservations.component';
import { AssessmentComponent } from '../../review/assessment/assessment.component';
import { PrintedAssessmentComponent } from '../../review/assessment/print/printed-assessment.component';
import { SpeedReviewComponent } from '../../review/listing/speed-review.component';
import { QuestionAssessmentComponent } from '../../review/questions/assessment/question-assessment.component';
import { AdminDashboardComponent } from './admin/admin-dashboard.component';
import { StaffDashboardComponent } from './staff-dashboard.component';
import { TeacherDashboardComponent } from './teacher/teacher-dashboard.component';

const routes: Route[] = [
    {
        path: '',
        component: StaffDashboardComponent,
        children: [
            { path: 'teacher', component: TeacherDashboardComponent },
            { path: 'admin', component: AdminDashboardComponent },

            { path: 'questions', component: LibraryComponent },
            {
                path: 'questions/:id/edit',
                component: QuestionComponent,
                data: {
                    newQuestion: false,
                    nextState: 'questions',
                },
                canDeactivate: [QuestionEditQuard],
            },
            {
                path: 'questions/new',
                component: QuestionComponent,
                data: { newQuestion: true },
                canDeactivate: [QuestionEditQuard],
            },

            { path: 'exams', component: NewExamComponent },
            {
                path: 'exams/:id',
                component: ExamTabsComponent,
                resolve: { exam: ExamResolverService },
                children: [
                    { path: '1', component: BasicExamInfoComponent },
                    { path: '2', component: SectionsComponent },
                    { path: '3', component: ExamAssessmentComponent },
                    { path: '4', component: ExamPublicationComponent },
                    {
                        path: '5',
                        component: ReviewListComponent,
                        resolve: { reviews: ReviewListResolverService },
                    },
                    { path: '6', component: QuestionReviewsComponent },
                    {
                        path: '7',
                        component: ExamSummaryComponent,
                        resolve: { reviews: ReviewListResolverService },
                    },
                ],
            },
            { path: 'exams/:id/course', component: CourseSelectionComponent },
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
            { path: 'printouts', component: PrintoutListingComponent },
            { path: 'collaborative', component: CollaborativeExamListingComponent },
            { path: 'examinationevents', component: ExaminationEventSearchComponent },
            {
                path: 'assessments/:id',
                component: AssessmentComponent,
                data: { collaborative: false },
            },
            {
                path: 'assessments/:id/collaborative/:ref',
                component: AssessmentComponent,
                data: { collaborative: true },
            },
            {
                path: 'assessments/:id/questions',
                component: QuestionAssessmentComponent,
            },
            { path: 'assessments/:id/speedreview', component: SpeedReviewComponent },
            {
                path: 'assessments/:id/print',
                component: PrintedAssessmentComponent,
                data: { collaborative: false },
            },
            {
                path: 'assessments/:id/print/:ref',
                component: PrintedAssessmentComponent,
                data: { collaborative: true },
            },
            { path: 'inspections', component: LanguageInspectionsComponent },
            { path: 'inspections/reports', component: MaturityReportingComponent },
            { path: 'adminexams', component: ExamListingComponent },
            { path: 'reservations', component: TeacherReservationComponent },
            { path: 'reservations/:eid', component: TeacherReservationComponent },
            { path: 'rooms', component: FacilityComponent },
            { path: 'rooms/:id', component: RoomComponent },
            { path: 'rooms/:id/availability', component: AvailabilityComponent },
            { path: 'settings', component: SettingsComponent },
            { path: 'users', component: UsersComponent },
            { path: 'multiroom', component: MultiRoomComponent },
            { path: 'machines/:id', component: MachineComponent },
            { path: 'reports', component: ReportsComponent },
            { path: 'statistics', component: StatisticsComponent },
        ],
    },
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule],
})
export class StaffRoutingModule {}
