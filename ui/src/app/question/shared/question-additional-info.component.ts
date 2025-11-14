// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, effect, inject, input } from '@angular/core';
import { ControlContainer, FormControl, FormGroup, FormGroupDirective, ReactiveFormsModule } from '@angular/forms';
import { NgbPopover } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import type { Question, QuestionDraft, ReverseQuestion } from 'src/app/question/question.model';
import type { User } from 'src/app/session/session.model';

export interface QuestionAdditionalInfoConfig {
    // Attachment
    showWarning: boolean;
    onSelectFile: () => void;
    onDownloadAttachment: () => void;
    onRemoveAttachment: () => void;
    getFileSize: () => string | number;
    hasUploadedAttachment?: () => boolean;
    question: Question | ReverseQuestion | QuestionDraft;

    // Instructions
    instructionsValue: string;
    instructionsPlaceholder?: string;
    onInstructionsChange?: (value: string) => void;
    instructionsId?: string;
    instructionsName?: string;

    // Evaluation criteria (for Essay questions)
    evaluationCriteriaValue?: string;
    onEvaluationCriteriaChange?: (value: string) => void;
    showEvaluationCriteria?: boolean;

    // Owners
    owners?: User[];
    ownersReadOnly?: boolean;
    showOwners?: boolean;
    ownersDisplayFormat?: 'list' | 'detailed'; // 'list' for inline list, 'detailed' for email display

    // Tags
    tags?: Array<{ id: number; name: string }>;
    tagsReadOnly?: boolean;
    showTags?: boolean;
    onTagAdded?: (tag: { id: number; name: string }) => void;
    onTagRemoved?: (tag: { id: number; name: string }) => void;

    // Sections
    sectionNames?: string[];
    showSections?: boolean;
    sectionsDisplayFormat?: 'list' | 'comma'; // 'list' for exam-question, 'comma' for question-body
}

@Component({
    selector: 'xm-question-additional-info',
    standalone: true,
    viewProviders: [{ provide: ControlContainer, useExisting: FormGroupDirective }],
    imports: [ReactiveFormsModule, NgbPopover, TranslateModule, NgClass],
    template: `
        <!-- Additional info title -->
        <div class="row mt-2">
            <div class="col-md-12 mt-2 pe-0">
                <div class="xm-paragraph-title">{{ 'i18n_additional_info' | translate }}</div>
            </div>
        </div>

        <!-- Owners -->
        @if (config().showOwners !== false && config().owners) {
            <div class="row mt-2">
                <div class="col-md-3">
                    {{ 'i18n_question_owners' | translate }}
                    <sup
                        ngbPopover="{{ 'i18n_question_owners_description' | translate }}"
                        popoverTitle="{{ 'i18n_instructions' | translate }}"
                        triggers="mouseenter:mouseleave"
                    >
                        <img src="/assets/images/icon_tooltip.svg" alt="" />
                    </sup>
                </div>
                <div class="col-md-9">
                    @if (config().ownersReadOnly) {
                        @if (config().ownersDisplayFormat === 'detailed') {
                            @for (user of config().owners; track user.id) {
                                <div class="ms-1 row">
                                    <div class="row col-8">
                                        {{ user.firstName }} {{ user.lastName }} ({{ user.email }})
                                    </div>
                                </div>
                            }
                        } @else {
                            <ul class="list-inline ps-2">
                                @for (user of config().owners; track user.id) {
                                    <li class="list-inline-item">{{ user.firstName }} {{ user.lastName }}</li>
                                }
                            </ul>
                        }
                    } @else {
                        <!-- Editable owners - handled by parent component -->
                        <ng-content select="[owners-content]"></ng-content>
                    }
                </div>
            </div>
        }

        <!-- Attachment -->
        <div class="row" [ngClass]="{ 'mt-3': config().showOwners !== false, 'align-items-center': true }">
            <div class="col-md-3">
                {{ 'i18n_question_attachment' | translate }}
                <sup
                    ngbPopover="{{ 'i18n_attachment_description' | translate }}"
                    popoverTitle="{{ 'i18n_instructions' | translate }}"
                    triggers="mouseenter:mouseleave"
                >
                    <img src="/assets/images/icon_tooltip.svg" alt="" />
                </sup>
            </div>
            <div class="col-md-9" id="attachment">
                @if (config().showWarning) {
                    <div class="mt-1 mb-2 edit-warning-container">
                        <i class="bi-exclamation-circle text-danger"></i>
                        <span class="warning-text-small ps-2">{{
                            'i18n_shared_question_property_info' | translate
                        }}</span>
                    </div>
                }
                <button class="btn btn-success" (click)="config().onSelectFile?.()">
                    {{ 'i18n_attach_file' | translate }}
                </button>

                @if (config().question?.attachment && !config().question.attachment?.removed) {
                    <div class="make-inline ps-2">
                        @if (
                            config().hasUploadedAttachment
                                ? config().hasUploadedAttachment?.()
                                : config().question.attachment?.id
                        ) {
                            <!-- Uploaded -->
                            <a class="pointer attachment-link" (click)="config().onDownloadAttachment?.()">
                                <i class="bi-paperclip"></i> {{ config().question.attachment?.fileName }}
                            </a>
                        } @else {
                            <!-- Not yet uploaded -->
                            <span class="attachment-link">
                                <i class="bi-paperclip"></i> {{ config().question.attachment?.fileName }}
                                <small> ({{ config().getFileSize() }})</small>
                            </span>
                        }
                        <span class="pointer remove-attachment" (click)="config().onRemoveAttachment?.()">
                            <img
                                src="/assets/images/icon_remove.svg"
                                alt="{{ 'i18n_remove_attachment' | translate }}"
                            />
                        </span>
                    </div>
                }
            </div>
        </div>

        <!-- Instructions -->
        <div class="row mt-2" [formGroup]="additionalInfoForm">
            <div class="col-md-3">
                {{ 'i18n_question_instruction' | translate }}
                <sup
                    ngbPopover="{{ 'i18n_question_instruction_description' | translate }}"
                    popoverTitle="{{ 'i18n_instructions' | translate }}"
                    triggers="mouseenter:mouseleave"
                >
                    <img src="/assets/images/icon_tooltip.svg" alt="" />
                </sup>
            </div>
            <div class="col-md-9" [ngClass]="{ 'pe-0': !config().instructionsId }">
                <textarea
                    [id]="config().instructionsId || 'instruction'"
                    [name]="config().instructionsName || 'instruction'"
                    class="form-control"
                    rows="3"
                    formControlName="instructions"
                    [placeholder]="config().instructionsPlaceholder || ('i18n_question_instruction' | translate)"
                >
                </textarea>
            </div>
        </div>

        <!-- Evaluation criteria (for Essay questions) -->
        @if (config().showEvaluationCriteria && config().evaluationCriteriaValue !== undefined) {
            <div class="row mt-3" [formGroup]="additionalInfoForm">
                <div class="col-md-3">
                    {{ 'i18n_exam_evaluation_criteria' | translate }}
                    <sup
                        ngbPopover="{{ 'i18n_question_evaluation_criteria_description' | translate }}"
                        popoverTitle="{{ 'i18n_instructions' | translate }}"
                        triggers="mouseenter:mouseleave"
                    >
                        <img src="/assets/images/icon_tooltip.svg" alt="" />
                    </sup>
                </div>
                <div class="col-md-9 pe-0">
                    <textarea
                        id="defaultEvaluationCriteria"
                        name="defaultEvaluationCriteria"
                        class="form-control"
                        rows="3"
                        formControlName="evaluationCriteria"
                        [placeholder]="'i18n_exam_evaluation_criteria' | translate"
                    >
                    </textarea>
                </div>
            </div>
        }

        <!-- Tags -->
        @if (config().showTags !== false && config().tags) {
            <div class="row mt-2">
                <div class="col-md-3">
                    {{ 'i18n_added_to_categories' | translate }}
                    <sup
                        ngbPopover="{{ 'i18n_question_tag_question_description' | translate }}"
                        popoverTitle="{{ 'i18n_instructions' | translate }}"
                        triggers="mouseenter:mouseleave"
                    >
                        <img src="/assets/images/icon_tooltip.svg" alt="" />
                    </sup>
                </div>
                <div class="col-md-9">
                    @if (config().tagsReadOnly) {
                        <ul class="list-inline">
                            @for (tag of config().tags; track tag.id) {
                                <li class="list-inline-item">{{ tag.name }}</li>
                            }
                        </ul>
                    } @else {
                        <!-- Editable tags - handled by parent component -->
                        <ng-content select="[tags-content]"></ng-content>
                    }
                </div>
            </div>
        }

        <!-- Section names -->
        @if (config().showSections !== false && config().sectionNames && config().sectionNames!.length > 0) {
            <div class="row mt-2">
                <div class="col-md-3">
                    {{ 'i18n_added_to_sections' | translate }}
                </div>
                <div class="col-md-9">
                    @if (config().sectionsDisplayFormat === 'comma') {
                        {{ config().sectionNames!.join(', ') }}
                    } @else {
                        <ul class="list-inline">
                            @for (name of config().sectionNames; track $index) {
                                <li class="list-inline-item">{{ name }}</li>
                            }
                        </ul>
                    }
                </div>
            </div>
        }
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuestionAdditionalInfoComponent {
    config = input.required<QuestionAdditionalInfoConfig>();
    additionalInfoForm: FormGroup;
    private parentForm = inject(FormGroupDirective, { optional: true });

    constructor() {
        // Create nested form group for additional info fields
        this.additionalInfoForm = new FormGroup({
            instructions: new FormControl(''),
            evaluationCriteria: new FormControl(''),
        });

        // Add to parent form if available
        // Check both parentForm and its form property to avoid null errors
        if (this.parentForm?.form && !this.parentForm.form.get('additionalInfo')) {
            this.parentForm.form.addControl('additionalInfo', this.additionalInfoForm);
        }

        // Sync form with config values
        effect(() => {
            const cfg = this.config();
            if (cfg) {
                this.additionalInfoForm.patchValue(
                    {
                        instructions: cfg.instructionsValue || '',
                        evaluationCriteria: cfg.evaluationCriteriaValue || '',
                    },
                    { emitEvent: false },
                );
            }
        });

        // Sync form changes back to config callbacks
        this.additionalInfoForm.get('instructions')?.valueChanges.subscribe((value) => {
            const cfg = this.config();
            if (cfg?.onInstructionsChange) {
                cfg.onInstructionsChange(value);
            }
        });

        this.additionalInfoForm.get('evaluationCriteria')?.valueChanges.subscribe((value) => {
            const cfg = this.config();
            if (cfg?.onEvaluationCriteriaChange) {
                cfg.onEvaluationCriteriaChange(value);
            }
        });
    }
}
