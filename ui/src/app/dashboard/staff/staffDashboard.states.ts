import { Transition } from '@uirouter/angular';

import { ReportsComponent } from '../../administrative/reports/reports.component';
import { SettingsComponent } from '../../administrative/settings/settings.component';
import { StatisticsComponent } from '../../administrative/statistics/statistics.component';
import { UsersComponent } from '../../administrative/users/users.component';
import { CollaborativeExamService } from '../../exam/collaborative/collaborativeExam.service';
import { CollaborativeExamListingComponent } from '../../exam/collaborative/collaborativeExamListing.component';
import { BasicExamInfoComponent } from '../../exam/editor/basic/basicExamInfo.component';
import { CourseSelectionComponent } from '../../exam/editor/creation/courseSelection.component';
import { NewExamComponent } from '../../exam/editor/creation/newExam.component';
import { ExamTabsComponent } from '../../exam/editor/examTabs.component';
import { ExamPublicationComponent } from '../../exam/editor/publication/examPublication.component';
import { SectionsListComponent } from '../../exam/editor/sections/sectionsList.component';
import { ExamService } from '../../exam/exam.service';
import { ExamListingComponent } from '../../exam/listing/examList.component';
import { PrintoutComponent } from '../../exam/printout/printout.component';
import { PrintoutListingComponent } from '../../exam/printout/printoutListing.component';
import { ExaminationComponent } from '../../examination/examination.component';
import { ExamRoomsAdminTabsComponent } from '../../facility/examRoomsAdminTabs.component';
import { MachineComponent } from '../../facility/machines/machine.component';
import { AvailabilityComponent } from '../../facility/rooms/availability.component';
import { MultiRoomComponent } from '../../facility/rooms/multiRoom.component';
import { RoomComponent } from '../../facility/rooms/room.component';
import { LanguageInspectionsComponent } from '../../maturity/languageInspections.component';
import { MaturityReportingComponent } from '../../maturity/reporting/maturityReporting.component';
import { QuestionComponent } from '../../question/basequestion/question.component';
import { LibraryComponent } from '../../question/library/library.component';
import { TeacherReservationComponent } from '../../reservation/teacher/teacherReservations.component';
import { AssessmentComponent } from '../../review/assessment/assessment.component';
import { PrintedAssessmentComponent } from '../../review/assessment/print/printedAssessment.component';
import { ReviewListComponent } from '../../review/listing/reviewList.component';
import { ReviewListService } from '../../review/listing/reviewList.service';
import { SpeedReviewComponent } from '../../review/listing/speedReview.component';
import { ExamSummaryComponent } from '../../review/listing/summary/examSummary.component';
import { QuestionAssessmentComponent } from '../../review/questions/assessment/questionAssessment.component';
import { QuestionReviewsComponent } from '../../review/questions/listing/questionReviews.component';
import { SoftwareComponent } from '../../software/software.component';
import { AdminDashboardComponent } from './admin/adminDashboard.component';
import { StaffDashboardComponent } from './staffDashboard.component';
import { TeacherDashboardComponent } from './teacher/teacherDashboard.component';
import { ByodExamEventSearchComponent } from '../../exam/search/byodExamEventSearch.component';

import type { Ng2StateDeclaration } from '@uirouter/angular';
import type { Exam } from '../../exam/exam.model';
export const STAFF_STATES: Ng2StateDeclaration[] = [
    { name: 'staff', url: '/staff', component: StaffDashboardComponent },
    { name: 'staff.teacher', url: '/dashboard/teacher', component: TeacherDashboardComponent },
    { name: 'staff.admin', url: '/dashboard/admin', component: AdminDashboardComponent },
    { name: 'staff.library', url: '/questions', component: LibraryComponent },
    {
        name: 'staff.question',
        url: '/questions/:id',
        component: QuestionComponent,
        resolve: {
            newQuestion: () => false,
            nextState: () => 'staff.library',
        },
    },
    {
        name: 'staff.newQuestion',
        url: '/questions/newQuestion/:nextState',
        component: QuestionComponent,
        resolve: {
            newQuestion: () => true,
        },
    },
    {
        name: 'staff.newExam',
        url: '/exams/new',
        component: NewExamComponent,
    },

    // exam editor and its children
    {
        name: 'staff.examEditor',
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
        name: 'staff.examEditor.basic',
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
        name: 'staff.examEditor.sections',
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
        name: 'staff.examEditor.publication',
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
        name: 'staff.examEditor.assessments',
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
                    reviewList.getReviews$(transition.params().id, collaborative),
            },
        ],
    },
    {
        name: 'staff.examEditor.questionReview',
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
        name: 'staff.examEditor.summary',
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
                    reviewList.getReviews$(transition.params().id, collaborative),
            },
        ],
    },

    {
        name: 'staff.courseSelector',
        url: '/exams/:id/select/course',
        component: CourseSelectionComponent,
    },
    {
        // What to do with these two?
        name: 'staff.examPreview',
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
        name: 'staff.collaborativePreview',
        url: '/exams/collaborative/:id/view/preview?{tab}',
        component: ExaminationComponent,
        resolve: {
            isPreview: () => true,
            isCollaborative: () => true,
        },
    },
    {
        name: 'staff.printout',
        url: '/exams/:id/view/printout?{tab}',
        component: PrintoutComponent,
    },
    {
        name: 'staff.printouts',
        url: '/printouts',
        component: PrintoutListingComponent,
    },
    {
        name: 'staff.collaborativeExams',
        url: '/exams/collaborative',
        component: CollaborativeExamListingComponent,
    },
    {
        name: 'staff.byodExams',
        url: '/exams/byod',
        component: ByodExamEventSearchComponent,
    },
    {
        name: 'staff.assessment',
        url: '/assessments/:id',
        component: AssessmentComponent,
        resolve: {
            collaborative: () => false,
        },
    },
    {
        name: 'staff.collaborativeAssessment',
        url: '/assessments/collaborative/:id/:ref',
        component: AssessmentComponent,
        resolve: {
            collaborative: () => true,
        },
    },
    {
        name: 'staff.speedReview',
        url: '/speedreview/:id',
        component: SpeedReviewComponent,
    },
    {
        name: 'staff.printedAssessment',
        url: '/print/exam/:id',
        component: PrintedAssessmentComponent,
        resolve: {
            collaborative: () => false,
        },
    },
    {
        name: 'staff.collaborativePrintedAssessment',
        url: '/print/exam/:id/:ref',
        component: PrintedAssessmentComponent,
        resolve: {
            collaborative: () => true,
        },
    },
    {
        name: 'staff.questionAssessment',
        url: '/assessment/:id/questions?{q}',
        component: QuestionAssessmentComponent,
    },
    {
        name: 'staff.reservations',
        url: '/reservations',
        component: TeacherReservationComponent,
    },
    {
        name: 'staff.examReservations',
        url: '/reservations/:eid',
        component: TeacherReservationComponent,
    },
    { name: 'staff.exams', url: '/exams', component: ExamListingComponent },
    { name: 'staff.software', url: '/softwares', component: SoftwareComponent },
    { name: 'staff.settings', url: '/settings', component: SettingsComponent },
    { name: 'staff.users', url: '/users', component: UsersComponent },
    {
        name: 'staff.languageInspections',
        url: '/inspections',
        component: LanguageInspectionsComponent,
    },
    {
        name: 'staff.languageInspectionReports',
        url: '/inspections/reports',
        component: MaturityReportingComponent,
    },
    {
        name: 'staff.rooms',
        url: '/rooms',
        component: ExamRoomsAdminTabsComponent,
    },
    {
        name: 'staff.machine',
        url: '/machines/:id',
        component: MachineComponent,
    },
    {
        name: 'staff.room',
        url: '/rooms/:id',
        component: RoomComponent,
    },
    {
        name: 'staff.availability',
        url: '/rooms/:id/availability',
        component: AvailabilityComponent,
    },
    {
        name: 'staff.multiRoom',
        url: '/rooms_edit/edit_multiple',
        component: MultiRoomComponent,
    },
    {
        name: 'staff.reports',
        url: '/reports',
        component: ReportsComponent,
    },
    {
        name: 'staff.statistics',
        url: '/statistics',
        component: StatisticsComponent,
    },
];
