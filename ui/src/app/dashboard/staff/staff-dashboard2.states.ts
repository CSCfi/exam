import { NgModule } from '@angular/core';
import { Route, RouterModule } from '@angular/router';
import { BasicExamInfoComponent } from 'src/app/exam/editor/basic/basic-exam-info.component';
import { ExamResolverService } from 'src/app/exam/editor/basic/exam-resolver.service';
import { ExamTabsComponent } from 'src/app/exam/editor/exam-tabs.component';
import { ExamPublicationComponent } from 'src/app/exam/editor/publication/exam-publication.component';
import { SectionsComponent } from 'src/app/exam/editor/sections/sections.component';
import { PrintoutComponent } from 'src/app/exam/printout/printout.component';
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
import { SoftwareComponent } from '../../software/software.component';
import { AdminDashboardComponent } from './admin/admin-dashboard.component';
import { StaffDashboardComponent } from './staff-dashboard.component';
import { TeacherDashboardComponent } from './teacher/teacher-dashboard.component';

const routes: Route[] = [
    {
        path: '',
        component: StaffDashboardComponent,
        children: [
            { path: 'dashboard/teacher', component: TeacherDashboardComponent },
            { path: 'dashboard/admin', component: AdminDashboardComponent },

            { path: 'questions', component: LibraryComponent },
            {
                path: 'questions/:id/edit',
                component: QuestionComponent,
                data: {
                    newQuestion: false,
                    nextState: 'questions',
                },
            },
            {
                path: 'questions/new',
                component: QuestionComponent,
                data: { newQuestion: true },
            },

            { path: 'exams', component: NewExamComponent },
            {
                path: 'exams/:id',
                component: ExamTabsComponent,
                resolve: { exam: ExamResolverService },
                children: [
                    { path: '1', component: BasicExamInfoComponent },
                    { path: '2', component: SectionsComponent },
                    { path: '3', component: ExamPublicationComponent },
                    {
                        path: '4',
                        component: ReviewListComponent,
                        resolve: { reviews: ReviewListResolverService },
                    },
                    { path: '5', component: QuestionReviewsComponent },
                    {
                        path: '6',
                        component: ExamSummaryComponent,
                        resolve: { reviews: ReviewListResolverService },
                    },
                ],
            },
            { path: 'exams/:id/select/course', component: CourseSelectionComponent },
            {
                path: 'exams/:id/view/preview', // Hox tab qp
                component: ExaminationComponent,
                data: { isPreview: true },
            },
            {
                path: 'exams/collaborative/:id/view/preview', // HOX! tab qp
                component: ExaminationComponent,
                data: { isPreview: true, isCollaborative: true },
            },
            {
                // HOX! tab qp
                path: 'exams/:id/view/printout',
                component: PrintoutComponent,
            },
            { path: 'printouts', component: PrintoutListingComponent },
            { path: 'collaborative', component: CollaborativeExamListingComponent },
            { path: 'exams/byod', component: ExaminationEventSearchComponent },
            {
                path: 'assessments/:id',
                component: AssessmentComponent,
                data: { collaborative: false },
            },
            {
                path: 'assessments/collaborative/:id/:ref',
                component: AssessmentComponent,
                data: { collaborative: true },
            },
            { path: 'speedreview/:id', component: SpeedReviewComponent },
            {
                path: 'print/exam/:id',
                component: PrintedAssessmentComponent,
                data: { collaborative: false },
            },
            {
                path: 'print/exam/:id/:ref',
                component: PrintedAssessmentComponent,
                data: { collaborative: true },
            },
            {
                path: 'assessment/:id/questions', // HOX! q qp
                component: QuestionAssessmentComponent,
            },
            { path: 'reservations', component: TeacherReservationComponent },
            { path: 'reservations/:eid', component: TeacherReservationComponent },
            { path: 'exams', component: ExamListingComponent },
            { path: 'softwares', component: SoftwareComponent },
            { path: 'settings', component: SettingsComponent },
            { path: 'users', component: UsersComponent },
            { path: 'inspections', component: LanguageInspectionsComponent },
            { path: 'inspections/reports', component: MaturityReportingComponent },
            { path: 'rooms', component: FacilityComponent },
            { path: 'machines/:id', component: MachineComponent },
            { path: 'rooms/:id', component: RoomComponent },
            { path: 'rooms/:id/availability', component: AvailabilityComponent },
            { path: 'rooms_edit/edit_multiple', component: MultiRoomComponent },
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
