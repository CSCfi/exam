// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';
import type { ExaminationQuestion } from 'src/app/examination/examination.model';
import { ExaminationService } from 'src/app/examination/examination.service';
import { vi } from 'vitest';
import { ExaminationLtiComponent } from './examination-lti-question.component';
import { LtiLaunchQueueService } from './lti-launch-queue.service';

const LoginUrl = 'https://exam.example.org/integration/lti/start-login';

@Component({
    selector: 'xm-lti-host',
    template: `
        @for (sq of questions(); track sq.id) {
            <xm-examination-lti-question [sq]="sq" [examHash]="examHash()" />
        }
    `,
    imports: [ExaminationLtiComponent],
})
class HostComponent {
    readonly questions = signal([{ id: 1 }, { id: 2 }] as unknown as ExaminationQuestion[]);
    readonly examHash = signal<string | undefined>('exam-hash');
}

/**
 * Two LTI questions in one exam section are shown at once. Their launches share the user's session
 * on the platform, so the second frame may only start once the first one's launch is through.
 */
describe('ExaminationLtiComponent', () => {
    let fixture: ComponentFixture<HostComponent>;

    const setUp = async (loginUrl: string | null) => {
        await TestBed.configureTestingModule({
            imports: [HostComponent, TranslateModule.forRoot()],
            providers: [
                provideZonelessChangeDetection(),
                { provide: ExaminationService, useValue: { getLtiLoginUrl$: () => of(loginUrl) } },
            ],
        }).compileComponents();
        fixture = TestBed.createComponent(HostComponent);
        fixture.detectChanges();
        await fixture.whenStable();
    };

    const frames = (): HTMLIFrameElement[] => Array.from(fixture.nativeElement.querySelectorAll('iframe'));

    const load = async (frame: HTMLIFrameElement) => {
        frame.dispatchEvent(new Event('load'));
        fixture.detectChanges();
        await fixture.whenStable();
    };

    it('should launch the questions one at a time', async () => {
        await setUp(LoginUrl);

        expect(frames()).toHaveLength(1);
        expect(frames()[0].getAttribute('src')).toBe(`${LoginUrl}?sectionQuestionId=1&examHash=exam-hash`);
        expect(fixture.nativeElement.querySelectorAll('.lti-frame-placeholder')).toHaveLength(1);

        await load(frames()[0]);

        expect(frames().map((f) => f.getAttribute('src'))).toEqual([
            `${LoginUrl}?sectionQuestionId=1&examHash=exam-hash`,
            `${LoginUrl}?sectionQuestionId=2&examHash=exam-hash`,
        ]);
    });

    it('should not take a frame loading about:blank for its launch', async () => {
        await setUp(LoginUrl);
        const frame = frames()[0];
        const src = frame.getAttribute('src');

        frame.removeAttribute('src');
        await load(frame);
        frame.setAttribute('src', src!);

        expect(frames()).toHaveLength(1);
    });

    it('should let the next question launch when one is removed mid-launch', async () => {
        await setUp(LoginUrl);

        fixture.componentInstance.questions.set([{ id: 2 } as unknown as ExaminationQuestion]);
        fixture.detectChanges();
        await fixture.whenStable();

        expect(frames().map((f) => f.getAttribute('src'))).toEqual([
            `${LoginUrl}?sectionQuestionId=2&examHash=exam-hash`,
        ]);
    });

    it('should show a notice instead of a frame when LTI is not in use', async () => {
        await setUp(null);

        expect(frames()).toHaveLength(0);
        expect(fixture.nativeElement.textContent).toContain('i18n_lti_not_available');
        // Nothing started, so nothing holds the queue.
        const started = vi.fn();
        TestBed.inject(LtiLaunchQueueService).enqueue(started);
        expect(started).toHaveBeenCalledOnce();
    });

    it('should show a notice where there is no exam to launch from', async () => {
        await setUp(LoginUrl);

        fixture.componentInstance.examHash.set(undefined);
        fixture.detectChanges();
        await fixture.whenStable();

        expect(frames()).toHaveLength(0);
        expect(fixture.nativeElement.textContent).toContain('i18n_lti_not_available');
    });
});
