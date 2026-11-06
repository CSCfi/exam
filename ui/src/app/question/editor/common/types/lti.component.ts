// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { AfterViewInit, Component, DestroyRef, inject, input, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import {
    AbstractControl,
    ControlContainer,
    FormControl,
    FormGroup,
    FormGroupDirective,
    ReactiveFormsModule,
    ValidationErrors,
    ValidatorFn,
    Validators,
} from '@angular/forms';
import { NgbPopover } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { filter, skip, switchMap, tap } from 'rxjs';
import type { LtiTool, QuestionDraft, ReverseQuestion } from 'src/app/question/question.model';
import { QuestionService } from 'src/app/question/question.service';

/** Parameters given without the ones they require, e.g. an A+ exercise without its module. */
const requiresValidator =
    (tool: LtiTool): ValidatorFn =>
    (group: AbstractControl): ValidationErrors | null => {
        const given = (name: string) => !!(group.get(name)?.value as string | null)?.trim();
        const missing = tool.parameters
            .filter((p) => given(p.name))
            .flatMap((p) => p.requires)
            .filter((name, i, all) => !given(name) && all.indexOf(name) === i);
        return missing.length > 0 ? { requires: missing } : null;
    };

@Component({
    selector: 'xm-lti',
    templateUrl: './lti.component.html',
    viewProviders: [{ provide: ControlContainer, useExisting: FormGroupDirective }],
    imports: [ReactiveFormsModule, TranslateModule, NgbPopover],
})
export class LtiComponent implements OnInit, AfterViewInit {
    readonly question = input.required<ReverseQuestion | QuestionDraft>();
    readonly lotteryOn = input(false);

    readonly ltiForm: FormGroup;
    readonly tools = signal<LtiTool[]>([]);
    readonly selectedTool = signal<LtiTool | undefined>(undefined);
    // The question's tool is not (or no longer) registered with this installation.
    readonly unknownTool = signal(false);
    // LTI, an optional integration, is not in use on this installation.
    readonly inactive = signal(false);

    private readonly parentForm = inject(FormGroupDirective);
    private readonly questionService = inject(QuestionService);
    private readonly translate = inject(TranslateService);
    private readonly destroyRef = inject(DestroyRef);

    constructor() {
        this.ltiForm = new FormGroup({
            ltiTool: new FormControl<string | null>(null, [Validators.required]),
            ltiCustom: new FormGroup({}),
            // LTI answers are always point-scored; the control exists so the value is
            // carried through the same form plumbing as the other question types.
            defaultEvaluationType: new FormControl<string>('Points', [Validators.required]),
        });

        toObservable(this.lotteryOn)
            .pipe(skip(1), takeUntilDestroyed())
            .subscribe((lotteryOn) => {
                const evaluationTypeControl = this.ltiForm.get('defaultEvaluationType');
                if (lotteryOn) {
                    evaluationTypeControl?.disable({ emitEvent: false });
                } else {
                    evaluationTypeControl?.enable({ emitEvent: false });
                }
            });

        this.ltiForm
            .get('ltiTool')
            ?.valueChanges.pipe(takeUntilDestroyed())
            .subscribe((key: string | null) => this.selectTool(key, this.currentParameters()));
    }

    get customForm(): FormGroup {
        return this.ltiForm.get('ltiCustom') as FormGroup;
    }

    ngOnInit() {
        const questionValue = this.question();
        this.ltiForm.patchValue(
            { defaultEvaluationType: questionValue.defaultEvaluationType || 'Points' },
            { emitEvent: false },
        );
        if (this.lotteryOn()) {
            this.ltiForm.get('defaultEvaluationType')?.disable({ emitEvent: false });
        }
        this.questionService
            .isLtiActive$()
            .pipe(
                tap((active) => {
                    this.inactive.set(!active);
                    if (!active) {
                        // Nothing to check the tool against: the question keeps it as it is.
                        this.ltiForm.get('ltiTool')?.disable({ emitEvent: false });
                        this.customForm.disable({ emitEvent: false });
                    }
                }),
                filter((active) => active),
                switchMap(() => this.questionService.getLtiTools$()),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe((tools) => {
                this.tools.set(tools);
                const saved = questionValue.ltiTool;
                // A new question gets the only tool there is; a saved one keeps its own.
                const key = saved ?? (tools.length === 1 ? tools[0].key : null);
                this.unknownTool.set(!!saved && !tools.some((t) => t.key === saved));
                this.ltiForm.get('ltiTool')?.setValue(this.unknownTool() ? null : key, { emitEvent: false });
                this.selectTool(this.unknownTool() ? null : key, questionValue.ltiCustom ?? {});
            });
    }

    ngAfterViewInit() {
        this.parentForm.form.addControl('lti', this.ltiForm);

        this.ltiForm.valueChanges.subscribe(() => {
            if (this.ltiForm.dirty) {
                this.parentForm.form.markAsDirty();
            }
        });

        this.ltiForm.statusChanges.subscribe(() => {
            if (this.ltiForm.invalid) {
                this.parentForm.form.markAsTouched();
            }
        });
    }

    /** Shows the tool picker only when there is a choice to make, or the saved tool is gone. */
    showToolSelect = () => !this.inactive() && (this.tools().length !== 1 || this.unknownTool());

    parameterLabel(name: string): string {
        const key = `i18n_lti_parameter_${name}`;
        const label = this.translate.instant(key) as string;
        return label === key ? name : label;
    }

    missingRequirements(): string {
        const missing = (this.customForm.errors?.['requires'] as string[] | undefined) ?? [];
        return missing.map((name) => this.parameterLabel(name)).join(', ');
    }

    private currentParameters(): Record<string, string> {
        return Object.fromEntries(
            Object.entries(this.customForm.getRawValue() as Record<string, string | null>).filter(
                (entry): entry is [string, string] => !!entry[1],
            ),
        );
    }

    /** Rebuilds the parameter inputs for the tool, keeping the values of parameters it shares. */
    private selectTool(key: string | null, values: Record<string, string>) {
        const tool = this.tools().find((t) => t.key === key);
        this.selectedTool.set(tool);
        const controls = Object.fromEntries(
            (tool?.parameters ?? []).map((p) => [
                p.name,
                new FormControl<string | null>(values[p.name] ?? null, p.required ? [Validators.required] : []),
            ]),
        );
        const custom = new FormGroup(controls, tool ? [requiresValidator(tool)] : []);
        this.ltiForm.setControl('ltiCustom', custom, { emitEvent: false });
        this.ltiForm.updateValueAndValidity();
    }
}
