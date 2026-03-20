// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { ExamTabService } from 'src/app/exam/editor/exam-tabs.service';
import type { Exam } from 'src/app/exam/exam.model';
import type { User } from 'src/app/session/session.model';
import { SessionService } from 'src/app/session/session.service';
import { vi } from 'vitest';
import { CollaborativeExamOwnerSelectorComponent } from './collaborative-exam-owner-picker.component';

describe('CollaborativeExamOwnerSelectorComponent (IOP exam JSON edge cases)', () => {
    let fixture: ComponentFixture<CollaborativeExamOwnerSelectorComponent>;
    let component: CollaborativeExamOwnerSelectorComponent;
    let httpMock: HttpTestingController;
    let setExam: ReturnType<typeof vi.fn>;

    const adminUser = { id: 1, isAdmin: true, email: 'admin@test.fi' } as User;

    beforeEach(async () => {
        setExam = vi.fn();
        await TestBed.configureTestingModule({
            imports: [CollaborativeExamOwnerSelectorComponent, TranslateModule.forRoot()],
            providers: [
                provideZonelessChangeDetection(),
                provideHttpClient(),
                provideHttpClientTesting(),
                { provide: ExamTabService, useValue: { setExam } },
                { provide: SessionService, useValue: { getUser: () => adminUser } },
                { provide: ToastrService, useValue: { error: vi.fn() } },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(CollaborativeExamOwnerSelectorComponent);
        component = fixture.componentInstance;
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => httpMock.verify());

    it('should create', () => {
        fixture.componentRef.setInput('exam', { id: 1, examOwners: [] } as unknown as Exam);
        fixture.detectChanges();
        expect(component).toBeTruthy();
    });

    describe('addOwner', () => {
        beforeEach(() => {
            fixture.componentRef.setInput('exam', { id: 42, examOwners: [] } as unknown as Exam);
            fixture.detectChanges();
        });

        it('should POST to IOP owners endpoint and call ExamTabService.setExam with new owner', () => {
            component.ownerForm.email().value.set('new.owner@test.fi');
            component.addOwner();

            const req = httpMock.expectOne((r) => r.url === '/app/iop/exams/42/owners' && r.method === 'POST');
            expect(req.request.body).toEqual({ email: 'new.owner@test.fi' });
            const newOwner = { id: 99, email: 'new.owner@test.fi' } as User;
            req.flush(newOwner);

            expect(setExam).toHaveBeenCalledWith({
                id: 42,
                examOwners: [newOwner],
            });
            expect(component.ownerForm.email().value()).toBe('');
        });

        it('should treat null examOwners like an empty list (IOP documents missing the array)', () => {
            fixture.componentRef.setInput('exam', { id: 7, examOwners: null as unknown as User[] } as unknown as Exam);
            fixture.detectChanges();

            component.ownerForm.email().value.set('first@owner.fi');
            component.addOwner();

            const req = httpMock.expectOne('/app/iop/exams/7/owners');
            req.flush({ id: 1, email: 'first@owner.fi' } as User);

            expect(setExam).toHaveBeenCalledWith({
                id: 7,
                examOwners: [{ id: 1, email: 'first@owner.fi' }],
            });
        });
    });

    describe('removeOwner', () => {
        const owners = [
            { id: 10, email: 'a@test.fi' },
            { id: 20, email: 'b@test.fi' },
        ] as User[];

        it('should DELETE and call setExam without the removed owner', () => {
            fixture.componentRef.setInput('exam', { id: 3, examOwners: owners } as unknown as Exam);
            fixture.detectChanges();

            component.removeOwner(10);

            const req = httpMock.expectOne('/app/iop/exams/3/owners/10');
            expect(req.request.method).toBe('DELETE');
            req.flush(null);

            expect(setExam).toHaveBeenCalledWith({
                id: 3,
                examOwners: [owners[1]],
            });
        });

        it('should work when examOwners was null in the loaded document', () => {
            fixture.componentRef.setInput('exam', { id: 8, examOwners: null as unknown as User[] } as unknown as Exam);
            fixture.detectChanges();

            component.removeOwner(99);

            httpMock.expectOne('/app/iop/exams/8/owners/99').flush(null);

            expect(setExam).toHaveBeenCalledWith({
                id: 8,
                examOwners: [],
            });
        });
    });
});
