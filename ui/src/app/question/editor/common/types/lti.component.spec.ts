// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormGroup, FormGroupDirective } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';
import type { LtiTool, ReverseQuestion } from 'src/app/question/question.model';
import { QuestionService } from 'src/app/question/question.service';
import { ToastService } from 'src/app/shared/toast/toast.service';
import { vi } from 'vitest';
import { LtiComponent } from './lti.component';

/**
 * The LTI question editor asks for whatever the question's tool needs: Moodle takes one resource
 * id, A+ a course instance and optionally a module and an exercise in it.
 */
describe('LtiComponent', () => {
    let fixture: ComponentFixture<LtiComponent>;
    let component: LtiComponent;

    const moodle: LtiTool = {
        key: 'moodle',
        name: 'Moodle',
        parameters: [{ name: 'id', required: true, requires: [] }],
        deepLinking: true,
    };
    const aplus: LtiTool = {
        key: 'aplus',
        name: 'A+',
        parameters: [
            { name: 'course_slug', required: true, requires: [] },
            { name: 'instance_slug', required: true, requires: [] },
            { name: 'module_slug', required: false, requires: [] },
            { name: 'exercise_path', required: false, requires: ['module_slug'] },
        ],
        deepLinking: false,
    };

    const makeQuestion = (ltiTool?: string, ltiCustom?: Record<string, string>): ReverseQuestion =>
        ({
            id: 1,
            type: 'LtiQuestion',
            question: 'Text',
            options: [],
            tags: [],
            questionOwners: [],
            examSectionQuestions: [],
            state: 'SAVED',
            defaultNegativeScoreAllowed: false,
            defaultOptionShufflingOn: false,
            defaultEvaluationType: 'Points',
            ltiTool,
            ltiCustom,
        }) as unknown as ReverseQuestion;

    const PickUrl = 'https://exam.example.org/integration/lti/deep-link/dl-1/start';
    let startLtiDeepLink$: ReturnType<typeof vi.fn>;
    let getLtiDeepLink$: ReturnType<typeof vi.fn>;
    let toastError: ReturnType<typeof vi.fn>;
    let popup: { location: { href: string }; closed: boolean; close: ReturnType<typeof vi.fn> };

    beforeEach(() => {
        startLtiDeepLink$ = vi.fn(() => of({ id: 'dl-1', url: PickUrl }));
        getLtiDeepLink$ = vi.fn(() => of({ status: 'done', title: 'Week 1 quiz', custom: { id: 'r-9' } }));
        toastError = vi.fn();
        popup = { location: { href: '' }, closed: false, close: vi.fn() };
        vi.spyOn(window, 'open').mockReturnValue(popup as unknown as Window);
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.useRealTimers();
    });

    const toolSays = (data: unknown, origin = 'https://exam.example.org') =>
        window.dispatchEvent(new MessageEvent('message', { data, origin }));

    const init = async (tools: LtiTool[], question: ReverseQuestion, ltiActive = true) => {
        await TestBed.configureTestingModule({
            imports: [LtiComponent, TranslateModule.forRoot()],
            providers: [
                provideZonelessChangeDetection(),
                { provide: FormGroupDirective, useValue: { form: new FormGroup({}) } },
                {
                    provide: QuestionService,
                    useValue: {
                        isLtiActive$: () => of(ltiActive),
                        getLtiTools$: () => of(tools),
                        startLtiDeepLink$,
                        getLtiDeepLink$,
                    },
                },
                { provide: ToastService, useValue: { error: toastError } },
            ],
        }).compileComponents();
        fixture = TestBed.createComponent(LtiComponent);
        fixture.componentRef.setInput('question', question);
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();
        component = fixture.componentInstance;
    };

    const parameterInputs = (): string[] =>
        Array.from(
            fixture.nativeElement.querySelectorAll('input[id^="ltiParameter-"]') as NodeListOf<HTMLInputElement>,
        ).map((input) => input.id.replace('ltiParameter-', ''));

    it('should pick the only tool for a new question and not ask which one', async () => {
        await init([moodle], makeQuestion());

        expect(component.ltiForm.get('ltiTool')?.value).toBe('moodle');
        expect(fixture.nativeElement.querySelector('#ltiTool')).toBeNull();
        expect(parameterInputs()).toEqual(['id']);
    });

    it('should require a tool to be chosen when there are several', async () => {
        await init([moodle, aplus], makeQuestion());

        expect(fixture.nativeElement.querySelector('#ltiTool')).toBeTruthy();
        expect(component.ltiForm.get('ltiTool')?.value).toBeNull();
        expect(component.ltiForm.valid).toBe(false);
    });

    it('should show the parameters of a saved question with their values', async () => {
        await init([moodle, aplus], makeQuestion('aplus', { course_slug: 'cs-101', instance_slug: '2026' }));

        expect(parameterInputs()).toEqual(['course_slug', 'instance_slug', 'module_slug', 'exercise_path']);
        expect(component.customForm.getRawValue()).toEqual({
            course_slug: 'cs-101',
            instance_slug: '2026',
            module_slug: null,
            exercise_path: null,
        });
        expect(component.ltiForm.valid).toBe(true);
    });

    it('should switch the parameters when another tool is chosen', async () => {
        await init([moodle, aplus], makeQuestion('moodle', { id: 'r-1' }));

        component.ltiForm.get('ltiTool')?.setValue('aplus');
        fixture.detectChanges();

        expect(parameterInputs()).toEqual(['course_slug', 'instance_slug', 'module_slug', 'exercise_path']);
        expect(component.ltiForm.valid).toBe(false);
    });

    it('should require the parameters the tool requires', async () => {
        await init([moodle], makeQuestion('moodle', {}));

        expect(component.ltiForm.valid).toBe(false);
        component.customForm.get('id')?.setValue('r-1');
        expect(component.ltiForm.valid).toBe(true);
    });

    // A+ cannot open an exercise without the module it is in.
    it('should require a parameter that another given parameter depends on', async () => {
        await init([aplus], makeQuestion('aplus', { course_slug: 'cs-101', instance_slug: '2026' }));

        component.customForm.get('exercise_path')?.setValue('hello');
        fixture.detectChanges();

        expect(component.ltiForm.valid).toBe(false);
        expect(component.missingRequirements()).toBe('module_slug');
        expect(fixture.nativeElement.textContent).toContain('i18n_lti_parameter_requires');

        component.customForm.get('module_slug')?.setValue('week1');
        expect(component.ltiForm.valid).toBe(true);
    });

    it('should flag a saved tool that is no longer configured', async () => {
        await init([moodle], makeQuestion('removed-tool', { id: 'r-1' }));

        expect(component.unknownTool()).toBe(true);
        expect(fixture.nativeElement.querySelector('#ltiTool')).toBeTruthy();
        expect(fixture.nativeElement.textContent).toContain('i18n_lti_tool_not_configured');
        expect(component.ltiForm.valid).toBe(false);
    });

    // A question created while LTI was in use stays editable, keeping its tool as it is.
    it('should leave the tool alone and say so when LTI is not in use', async () => {
        await init([], makeQuestion('moodle', { id: 'r-1' }), false);

        expect(component.inactive()).toBe(true);
        expect(fixture.nativeElement.querySelector('#ltiTool')).toBeNull();
        expect(parameterInputs()).toEqual([]);
        expect(fixture.nativeElement.textContent).toContain('i18n_lti_not_active_kept');
        expect(component.ltiForm.valid).toBe(true);
        expect(component.ltiForm.value.ltiTool).toBeUndefined();
    });

    it('should offer choosing from the tool only for a tool that supports it', async () => {
        await init([moodle, aplus], makeQuestion('moodle', {}));
        expect(fixture.nativeElement.querySelector('#ltiChooseFromTool')).toBeTruthy();

        component.ltiForm.get('ltiTool')?.setValue('aplus');
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('#ltiChooseFromTool')).toBeNull();
    });

    it('should fill in what was picked in the tool once the tool is done', async () => {
        await init([moodle], makeQuestion('moodle', {}));

        component.chooseFromTool();
        expect(window.open).toHaveBeenCalledOnce();
        expect(startLtiDeepLink$).toHaveBeenCalledWith('moodle');
        expect(popup.location.href).toBe(PickUrl);
        expect(component.picking()).toBe(true);

        toolSays({ type: 'exam-lti-deep-link', id: 'dl-1' });
        fixture.detectChanges();

        expect(getLtiDeepLink$).toHaveBeenCalledWith('dl-1');
        expect(component.customForm.get('id')?.value).toBe('r-9');
        expect(component.ltiForm.valid).toBe(true);
        expect(component.ltiForm.dirty).toBe(true);
        expect(component.picking()).toBe(false);
        expect(fixture.nativeElement.textContent).toContain('i18n_lti_chosen');
    });

    it('should not listen to messages from elsewhere', async () => {
        await init([moodle], makeQuestion('moodle', {}));
        component.chooseFromTool();

        toolSays({ type: 'exam-lti-deep-link', id: 'dl-1' }, 'https://evil.example.org');
        toolSays({ type: 'exam-lti-deep-link', id: 'another-request' });

        expect(getLtiDeepLink$).not.toHaveBeenCalled();
        expect(component.picking()).toBe(true);
    });

    // The popup may lose touch with the editor on its way through the tool.
    it('should ask for the pick anyway when the popup is closed', async () => {
        vi.useFakeTimers();
        await init([moodle], makeQuestion('moodle', {}));
        component.chooseFromTool();

        popup.closed = true;
        vi.advanceTimersByTime(500);

        expect(getLtiDeepLink$).toHaveBeenCalledWith('dl-1');
        expect(component.customForm.get('id')?.value).toBe('r-9');
    });

    it('should leave the parameters alone when nothing was picked', async () => {
        getLtiDeepLink$.mockReturnValue(of({ status: 'pending' }));
        await init([moodle], makeQuestion('moodle', { id: 'r-1' }));
        component.chooseFromTool();

        toolSays({ type: 'exam-lti-deep-link', id: 'dl-1' });

        expect(component.customForm.get('id')?.value).toBe('r-1');
        expect(component.picking()).toBe(false);
    });

    it('should say so when the browser blocks the popup', async () => {
        vi.mocked(window.open).mockReturnValue(null);
        await init([moodle], makeQuestion('moodle', {}));

        component.chooseFromTool();

        expect(toastError).toHaveBeenCalledWith('i18n_lti_popup_blocked');
        expect(startLtiDeepLink$).not.toHaveBeenCalled();
    });
});
