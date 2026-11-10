// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';
import { QuestionService } from 'src/app/question/question.service';
import type { User } from 'src/app/session/session.model';
import { SessionService } from 'src/app/session/session.service';
import { ToastService } from 'src/app/shared/toast/toast.service';
import { vi } from 'vitest';
import { QuestionComponent } from './question.component';

/** The question types a teacher can pick, with LTI in use on this installation. */
describe('QuestionComponent question types', () => {
    let fixture: ComponentFixture<QuestionComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [QuestionComponent],
            providers: [
                provideZonelessChangeDetection(),
                { provide: Router, useValue: { navigate: vi.fn() } },
                {
                    provide: ActivatedRoute,
                    useValue: {
                        snapshot: { paramMap: { get: () => null }, queryParamMap: { get: () => null }, data: {} },
                    },
                },
                { provide: ToastService, useValue: { error: vi.fn() } },
                { provide: QuestionService, useValue: { getQuestion: vi.fn(), isLtiActive$: () => of(true) } },
                { provide: SessionService, useValue: { getUser: () => ({ id: 1 }) as User } },
            ],
        })
            .overrideComponent(QuestionComponent, { set: { template: '', imports: [TranslateModule] } })
            .compileComponents();

        fixture = TestBed.createComponent(QuestionComponent);
    });

    const types = () => fixture.componentInstance.questionTypes().map((t) => t.type);

    it('should offer LTI questions where LTI is in use', () => {
        expect(types()).toContain('LtiQuestion');
    });

    // Other installations taking a collaborative exam cannot launch this installation's tools
    it('should not offer LTI questions in a collaborative exam', () => {
        fixture.componentRef.setInput('collaborative', true);

        expect(types()).not.toContain('LtiQuestion');
        expect(types()).toContain('EssayQuestion');
    });
});
