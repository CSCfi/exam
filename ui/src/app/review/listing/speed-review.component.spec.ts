// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';
import { ExamService } from 'src/app/exam/exam.service';
import { errorInterceptor } from 'src/app/interceptors/error.interceptor';
import type { User } from 'src/app/session/session.model';
import { AttachmentService } from 'src/app/shared/attachment/attachment.service';
import { ConfirmationDialogService } from 'src/app/shared/dialogs/confirmation-dialog.service';
import { ModalService } from 'src/app/shared/dialogs/modal.service';
import { FileService } from 'src/app/shared/file/file.service';
import { CourseCodeService } from 'src/app/shared/miscellaneous/course-code.service';
import { ToastService } from 'src/app/shared/toast/toast.service';
import { vi } from 'vitest';
import { SpeedReviewComponent } from './speed-review.component';

describe('SpeedReviewComponent', () => {
    let component: SpeedReviewComponent;
    let fixture: ComponentFixture<SpeedReviewComponent>;
    let http: HttpTestingController;
    const toast = { info: vi.fn(), warning: vi.fn(), error: vi.fn(), success: vi.fn() };
    const router = { navigate: vi.fn() };
    const files = { downloadBlob: vi.fn(), upload$: vi.fn() };

    const scale = {
        grades: [
            { id: 1, name: '0', marksRejection: true },
            { id: 2, name: '1', marksRejection: false },
        ],
    };
    const participation = (id: number, state = 'REVIEW', exam: object = {}) => ({
        id,
        user: { firstName: 'Maija', lastName: `Meikäläinen ${id}`, userIdentifier: `s${id}` },
        duration: '1970-01-01T01:30:00Z',
        exam: {
            id,
            state,
            gradeScale: scale,
            creditType: { type: 'FINAL' },
            examLanguages: [{ code: 'fi' }],
            totalScore: 7,
            maxScore: 10,
            ...exam,
        },
    });

    beforeEach(() => {
        vi.clearAllMocks();
        TestBed.configureTestingModule({
            imports: [SpeedReviewComponent, TranslateModule.forRoot()],
            providers: [
                provideZonelessChangeDetection(),
                provideHttpClient(withInterceptors([errorInterceptor])),
                provideHttpClientTesting(),
                { provide: ToastService, useValue: toast },
                { provide: Router, useValue: router },
                { provide: ActivatedRoute, useValue: { snapshot: { params: { id: 3 } } } },
                { provide: ConfirmationDialogService, useValue: { open$: vi.fn(() => of(true)) } },
                { provide: ModalService, useValue: { openRef: vi.fn() } },
                { provide: FileService, useValue: files },
                { provide: AttachmentService, useValue: { selectFile$: vi.fn() } },
                { provide: ExamService, useValue: { isOwnerOrAdmin: () => true } },
                { provide: CourseCodeService, useValue: { formatCode: (c: string) => c } },
            ],
        });
        TestBed.overrideComponent(SpeedReviewComponent, { set: { imports: [], template: '' } });
        http = TestBed.inject(HttpTestingController);
        fixture = TestBed.createComponent(SpeedReviewComponent);
        component = fixture.componentInstance;
        http.expectOne('/app/exams/3').flush({
            examOwners: [],
            name: 'Maths',
            anonymous: false,
            course: { code: 'MA1' },
        });
        http.expectOne('/app/reviews/3').flush([
            participation(1),
            participation(2, 'REVIEW_STARTED'),
            participation(3, 'GRADED'),
        ]);
    });

    afterEach(() => http.verify());

    const select = (index: number, key: string) => {
        const review = component.examReviews()[index];
        component.onGradeSelect(review, { target: { value: key } } as unknown as Event);
        return review;
    };

    it('should list the reviews still to be graded', () => {
        expect(component.examInfo()?.title).toBe('MA1 Maths');
        expect(component.examReviews().map((r) => [r.displayName, r.duration])).toEqual([
            ['Meikäläinen 1 Maija', '01:30'],
            ['Meikäläinen 2 Maija', '01:30'],
        ]);
    });

    it('should list the exam owners without a gap before the separator', () => {
        component.examInfo.set({
            title: 'MA1 Maths',
            anonymous: false,
            examOwners: [
                { firstName: 'Maija', lastName: 'Meikäläinen' },
                { firstName: 'Matti', lastName: 'Meikäläinen' },
            ] as User[],
        });
        expect(component.ownerNames()).toBe('Maija Meikäläinen, Matti Meikäläinen');
    });

    it('should offer the scale grades and the non-grade options', () => {
        expect(component.examReviews()[0].grades.map((g) => g.type)).toEqual(['0', '1', 'POINT_GRADED', 'NOT_GRADED']);
    });

    it('should have modifications once a grade is chosen', () => {
        expect(component.hasModifications()).toBe(false);
        select(0, '2');
        expect(component.hasModifications()).toBe(true);
    });

    it('should grade the chosen reviews and drop them from the list', () => {
        select(0, '2');
        select(1, 'NOT_GRADED');

        component.gradeExams();
        const [graded, ungraded] = [http.expectOne('/app/review/1'), http.expectOne('/app/review/2')];
        expect(graded.request.body).toMatchObject({
            state: 'GRADED',
            grade: 2,
            gradingType: 'GRADED',
            creditType: 'FINAL',
            answerLanguage: 'fi',
        });
        expect(ungraded.request.body).toMatchObject({ grade: undefined, gradingType: 'NOT_GRADED' });
        graded.flush(null);
        ungraded.flush(null);

        expect(component.examReviews()).toEqual([]);
        expect(toast.info).toHaveBeenCalledWith('i18n_saved');
        expect(router.navigate).toHaveBeenCalledWith(['/staff/exams', 3, '5']);
    });

    it('should show why grading failed', () => {
        select(0, '2');

        component.gradeExams();
        http.expectOne('/app/review/1').flush('i18n_error_access_forbidden', { status: 403, statusText: 'Forbidden' });

        expect(toast.error).toHaveBeenCalledWith('i18n_error_access_forbidden');
        expect(component.examReviews()).toHaveLength(2);
    });

    it('should build a grading template', async () => {
        component.createGradingTemplate();

        const [blob, name] = files.downloadBlob.mock.calls[0];
        expect(name).toBe('grading.csv');
        // jsdom's Blob has no text()
        const text = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.readAsText(blob as Blob);
        });
        expect(text.split('\n')).toEqual([
            'exam id,grade,feedback,total score,student,student id',
            '1,,,7 / 10,Meikäläinen 1 Maija,s1',
            '2,,,7 / 10,Meikäläinen 2 Maija,s2',
            '',
        ]);
    });
});
