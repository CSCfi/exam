// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { AfterViewInit, ChangeDetectionStrategy, Component, inject, input, OnInit } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import {
    ControlContainer,
    FormControl,
    FormGroup,
    FormGroupDirective,
    ReactiveFormsModule,
    Validators,
} from '@angular/forms';
import { NgbPopover } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { skip } from 'rxjs';
import type { QuestionDraft, ReverseQuestion } from 'src/app/question/question.model';

@Component({
    selector: 'xm-lti',
    templateUrl: './lti.component.html',
    viewProviders: [{ provide: ControlContainer, useExisting: FormGroupDirective }],
    imports: [ReactiveFormsModule, TranslateModule, NgbPopover],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LtiComponent implements OnInit, AfterViewInit {
    readonly question = input.required<ReverseQuestion | QuestionDraft>();
    readonly lotteryOn = input(false);

    readonly ltiForm: FormGroup;

    private readonly parentForm = inject(FormGroupDirective);

    constructor() {
        this.ltiForm = new FormGroup({
            ltiId: new FormControl<string | null>(null, [Validators.required]),
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
    }

    ngOnInit() {
        const questionValue = this.question();
        this.ltiForm.patchValue(
            {
                ltiId: questionValue.ltiId ?? null,
                defaultEvaluationType: questionValue.defaultEvaluationType || 'Points',
            },
            { emitEvent: false },
        );
        if (this.lotteryOn()) {
            this.ltiForm.get('defaultEvaluationType')?.disable({ emitEvent: false });
        }
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
}
