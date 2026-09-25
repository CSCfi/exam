// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormGroup, FormGroupDirective } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';
import type { ReverseQuestion } from 'src/app/question/question.model';
import type { Attachment } from 'src/app/shared/attachment/attachment.model';
import { AttachmentService } from 'src/app/shared/attachment/attachment.service';
import { vi } from 'vitest';
import { AdditionalInfoComponent } from './additional-info.component';

/**
 * A picked file is only sent to the server when the question itself is saved, so the editor has to
 * tell apart a saved attachment from one that is merely staged, in both directions.
 */
describe('AdditionalInfoComponent attachment states', () => {
    let fixture: ComponentFixture<AdditionalInfoComponent>;
    let component: AdditionalInfoComponent;
    let selectFile$: ReturnType<typeof vi.fn>;

    const savedAttachment = (): Attachment => ({
        id: 42,
        fileName: 'saved.pdf',
        size: 1000,
        removed: false,
        modified: false,
    });

    const makeQuestion = (attachment?: Attachment): ReverseQuestion =>
        ({
            id: 1,
            type: 'EssayQuestion',
            question: 'Text',
            options: [],
            tags: [],
            questionOwners: [],
            examSectionQuestions: [],
            state: 'DRAFT',
            defaultNegativeScoreAllowed: false,
            defaultOptionShufflingOn: false,
            attachment,
        }) as unknown as ReverseQuestion;

    const pick = (name: string) =>
        selectFile$.mockReturnValue(of({ $value: { attachmentFile: new File(['x'], name) } }));

    const init = (question: ReverseQuestion) => {
        fixture.componentRef.setInput('question', question);
        fixture.detectChanges();
        component = fixture.componentInstance;
    };

    beforeEach(async () => {
        selectFile$ = vi.fn();
        await TestBed.configureTestingModule({
            imports: [AdditionalInfoComponent, TranslateModule.forRoot()],
            providers: [
                provideZonelessChangeDetection(),
                { provide: FormGroupDirective, useValue: { form: new FormGroup({}) } },
                {
                    provide: AttachmentService,
                    useValue: {
                        selectFile$,
                        getFileSize: (size: number) => `${size} B`,
                        downloadQuestionAttachment: vi.fn(),
                    },
                },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(AdditionalInfoComponent);
    });

    it('should treat a newly picked file as pending, not as a downloadable attachment', () => {
        const question = makeQuestion();
        init(question);
        pick('new.pdf');

        component.selectFile();

        expect(component.hasPendingUpload()).toBe(true);
        expect(component.isDownloadable()).toBe(false);
        expect(question.attachment?.fileName).toBe('new.pdf');
    });

    it('should treat a replacement file as pending even though it inherits the saved id', () => {
        const question = makeQuestion(savedAttachment());
        init(question);
        expect(component.isDownloadable()).toBe(true);

        pick('replacement.pdf');
        component.selectFile();

        // The old file is about to be overwritten, so it must not be offered for download.
        expect(component.hasPendingUpload()).toBe(true);
        expect(component.isDownloadable()).toBe(false);
    });

    it('should forget a staged pick entirely when it is removed before saving', () => {
        const question = makeQuestion();
        init(question);
        pick('new.pdf');
        component.selectFile();

        component.removeQuestionAttachment();

        // Nothing ever reached the server, so there is nothing to upload and nothing to erase.
        expect(question.attachment).toBeUndefined();
        expect(component.attachment()).toBeUndefined();
    });

    it('should stage a saved attachment for removal and drop any pending replacement', () => {
        const question = makeQuestion(savedAttachment());
        init(question);
        pick('replacement.pdf');
        component.selectFile();

        component.removeQuestionAttachment();

        expect(question.attachment?.removed).toBe(true);
        expect(question.attachment?.id).toBe(42);
        expect(question.attachment?.file).toBeUndefined();
        expect(question.attachment?.modified).toBe(false);
        expect(component.hasPendingUpload()).toBe(false);
    });

    it('should restore a saved attachment when the removal is undone', () => {
        const question = makeQuestion(savedAttachment());
        init(question);
        component.removeQuestionAttachment();
        expect(component.attachment()?.removed).toBe(true);

        component.undoRemoveQuestionAttachment();

        expect(question.attachment?.removed).toBe(false);
        expect(component.isDownloadable()).toBe(true);
    });

    it('should not resurrect a staged pick that was already forgotten', () => {
        const question = makeQuestion();
        init(question);
        pick('new.pdf');
        component.selectFile();
        component.removeQuestionAttachment();

        component.undoRemoveQuestionAttachment();

        expect(question.attachment).toBeUndefined();
        expect(component.attachment()).toBeUndefined();
    });

    it('should render a pending pick as plain text and a saved one as a download link', () => {
        const question = makeQuestion(savedAttachment());
        init(question);
        expect(fixture.nativeElement.querySelector('#attachment .btn-link')).toBeTruthy();

        pick('new.pdf');
        component.selectFile();
        fixture.detectChanges();

        const attachmentArea = fixture.nativeElement.querySelector('#attachment');
        expect(attachmentArea.querySelector('.btn-link')).toBeNull();
        expect(attachmentArea.textContent).toContain('new.pdf');
        expect(attachmentArea.textContent).toContain('i18n_attachment_pending_save');
    });

    it('should show the pending removal hint with an undo action', () => {
        const question = makeQuestion(savedAttachment());
        init(question);

        component.removeQuestionAttachment();
        fixture.detectChanges();

        const attachmentArea = fixture.nativeElement.querySelector('#attachment');
        expect(attachmentArea.textContent).toContain('i18n_attachment_pending_removal');
        expect(attachmentArea.textContent).toContain('i18n_undo_attachment_removal');
        expect(attachmentArea.textContent).not.toContain('saved.pdf');
    });
});
