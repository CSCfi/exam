// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';
import { ExamTabService } from 'src/app/exam/editor/exam-tabs.service';
import type { Course, Exam, GradeScale } from 'src/app/exam/exam.model';
import { ExamService } from 'src/app/exam/exam.service';
import { SessionService } from 'src/app/session/session.service';
import { AttachmentService } from 'src/app/shared/attachment/attachment.service';
import { FileService } from 'src/app/shared/file/file.service';
import { ToastService } from 'src/app/shared/toast/toast.service';
import { vi } from 'vitest';
import { BasicExamInfoComponent } from './basic-exam-info.component';

describe('BasicExamInfoComponent', () => {
    let component: BasicExamInfoComponent;
    let fixture: ComponentFixture<BasicExamInfoComponent>;
    let http: HttpTestingController;
    let exam: ReturnType<typeof signal<Exam>>;
    let collaborative: boolean;
    const toast = { info: vi.fn(), error: vi.fn() };
    const saveExam$ = vi.fn(() => of({}));
    const attachments = { selectFile$: vi.fn(), removeExamAttachment$: vi.fn(() => of(undefined)) };
    const files = { upload$: vi.fn() };

    const examScale = { id: 1 } as GradeScale;
    const courseScale = { id: 2 } as GradeScale;
    const draft = () =>
        ({
            id: 7,
            name: 'Maths',
            executionType: { type: 'PUBLIC' },
            implementation: 'WHATEVER',
            gradeScale: examScale,
        }) as unknown as Exam;

    const create = (overridable = false, collab = false) => {
        exam = signal(draft());
        collaborative = collab;
        fixture = TestBed.createComponent(BasicExamInfoComponent);
        component = fixture.componentInstance;
        http.expectOne('/app/settings/byod').flush({ homeExaminationSupported: false, sebExaminationSupported: true });
        http.expectOne('/app/settings/gradescale').flush({ overridable });
        http.expectOne('/app/settings/anonymousReviewEnabled').flush({ anonymousReviewEnabled: true });
    };

    beforeEach(() => {
        vi.clearAllMocks();
        TestBed.configureTestingModule({
            imports: [BasicExamInfoComponent, TranslateModule.forRoot()],
            providers: [
                provideZonelessChangeDetection(),
                provideHttpClient(),
                provideHttpClientTesting(),
                { provide: ToastService, useValue: toast },
                { provide: Router, useValue: { navigate: vi.fn() } },
                { provide: ActivatedRoute, useValue: {} },
                { provide: SessionService, useValue: { getUser: () => ({ isAdmin: true }) } },
                { provide: ExamService, useValue: { isAllowedToUnpublishOrRemove: () => true } },
                { provide: AttachmentService, useValue: attachments },
                { provide: FileService, useValue: files },
                {
                    provide: ExamTabService,
                    useValue: {
                        get examSignal() {
                            return exam;
                        },
                        getExam: () => exam(),
                        setExam: (e: Exam) => exam.set(e),
                        saveExam$,
                        isCollaborative: () => collaborative,
                        notifyTabChange: vi.fn(),
                    },
                },
            ],
        });
        TestBed.overrideComponent(BasicExamInfoComponent, { set: { imports: [], template: '' } });
        http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => http.verify());

    it('should load the settings and the name', () => {
        create();
        expect(component.byodExaminationSupported()).toBe(true);
        expect(component.examNameForm.name().value()).toBe('Maths');
        expect(component.showAnonymousReview()).toBe(true);
        expect(component.getExaminationTypeName()).toBe('i18n_examination_type_home_exam');
    });

    it('should not save without a name', () => {
        create();
        component.examNameForm.name().value.set('');

        component.updateExam();

        expect(saveExam$).not.toHaveBeenCalled();
    });

    it('should save the anonymity change once', () => {
        create();

        component.onExamAnonymousChange({ target: { checked: true } } as unknown as Event);

        expect(exam().anonymous).toBe(true);
        expect(saveExam$).toHaveBeenCalledTimes(1);
    });

    describe('course grade scale', () => {
        const course = { id: 3, gradeScale: courseScale } as Course;

        it('should follow the course scale when it is enforced', () => {
            create(false);
            component.onCourseChange(course);
            expect(exam()).toMatchObject({ course, gradeScale: courseScale });
        });

        it('should keep the exam scale when it can be overridden', () => {
            create(true);
            component.onCourseChange(course);
            expect(exam().gradeScale).toBe(examScale);
        });

        it('should keep the exam scale in a collaborative exam', () => {
            create(false, true);
            component.onCourseChange(course);
            expect(exam().gradeScale).toBe(examScale);
        });
    });

    describe('attachment', () => {
        const file = new File([], 'a.pdf');
        beforeEach(() => attachments.selectFile$.mockReturnValue(of({ $value: { attachmentFile: file } })));

        it('should upload to the exam', () => {
            files.upload$.mockReturnValue(of({ id: 9, fileName: 'a.pdf' }));
            create();

            component.selectAttachmentFile();

            expect(files.upload$).toHaveBeenCalledWith('/app/attachment/exam', file, { examId: '7' });
            expect(exam().attachment).toEqual({ id: 9, fileName: 'a.pdf' });
        });

        it('should upload to IOP in a collaborative exam', () => {
            files.upload$.mockReturnValue(of({ id: 9 }));
            create(false, true);

            component.selectAttachmentFile();

            expect(files.upload$.mock.calls[0][0]).toBe('/app/iop/collab/attachment/exam');
        });

        it('should show why the upload failed', () => {
            files.upload$.mockReturnValue(throwError(() => 'i18n_error_access_forbidden'));
            create();

            component.selectAttachmentFile();

            expect(toast.error).toHaveBeenCalledWith('i18n_error_access_forbidden');
            expect(exam().attachment).toBeUndefined();
        });

        it('should remove it', () => {
            create();
            exam.set({ ...exam(), attachment: { id: 9 } } as Exam);

            component.removeExamAttachment();

            expect(exam().attachment).toBeUndefined();
        });
    });

    it('should save the language inspection choice and internal reference', () => {
        create();

        component.setSubjectToLanguageInspection(true);
        component.onInternalRefInput({ target: { value: 'REF-1' } } as unknown as Event);

        expect(exam()).toMatchObject({ subjectToLanguageInspection: true, internalRef: 'REF-1' });
        expect(saveExam$).toHaveBeenCalledTimes(2);
    });
});
