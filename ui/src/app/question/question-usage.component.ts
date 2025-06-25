// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { Component, input, signal } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

@Component({
    imports: [TranslateModule],
    selector: 'xm-question-usage',
    template: `
        <div class="xm-study-item-container--warning mt-3">
            <!-- Exam contexts -->
            <div class="row">
                <div class="col-auto p-1">
                    <img src="/assets/images/icon_warning.png" />
                </div>
                <div class="col warning-text">
                    @if (examNames().length > 1) {
                        <div class="col warning-text">
                            {{ 'i18n_exam_question_edit_instructions' | translate }}
                        </div>
                    }
                    @if (examNames().length === 1) {
                        <div class="col warning-text">
                            {{ 'i18n_exam_question_edit_instructions_for_one' | translate }}
                        </div>
                    }
                    @if (examNames().length < 1) {
                        <div class="col warning-text">
                            {{ 'i18n_exam_question_edit_instructions_for_none' | translate }}
                        </div>
                    }
                    @if (examNames().length > 0) {
                        <div class="col-12 justify-content-center m-4">
                            <ul class="list-inline row">
                                <li class="list-inline-item relation-text mb-3 col-12">
                                    <span class="text-nowrap">
                                        {{ 'i18n_exam_question_in_use' | translate }}: {{ examNames().length }}
                                    </span>
                                </li>

                                @for (name of examNames().slice(0, 5); track name) {
                                    <li class="list-inline-item relation-text col-12">
                                        <span class="text-nowrap">
                                            {{ name }}
                                        </span>
                                    </li>
                                }

                                @for (name of examNames().slice(5); track name) {
                                    <li [hidden]="limitNames()" class="list-inline-item relation-text col-12">
                                        <span class="text-nowrap">
                                            {{ name }}
                                        </span>
                                    </li>
                                }

                                @if (examNames().length > 5 && limitNames()) {
                                    <li>
                                        <i
                                            class="bi-three-dots"
                                            alt=""
                                            [attr.aria-label]="'i18n_more_hidden' | translate"
                                        ></i>
                                    </li>
                                }

                                @if (examNames().length > 5) {
                                    <li>
                                        <button (click)="limitNames.set(!limitNames())" class="btn btn-secondary">
                                            {{
                                                !limitNames()
                                                    ? ('i18n_hide' | translate)
                                                    : ('i18n_open_list_of_exams' | translate)
                                            }}
                                        </button>
                                    </li>
                                }
                            </ul>
                        </div>
                    }
                </div>
            </div>
        </div>

        <!-- Question editor -->
        <div class="row mt-3">
            <div class="col-md-12">
                @if (showWarning()) {
                    <div class="xm-paragraph-title edit-warning-container">
                        {{ 'i18n_exam_basic_information_tab' | translate }}
                        <i class="bi-exclamation-circle ps-4 text-danger"></i>
                        <span class="warning-text-small ps-2">
                            {{ 'i18n_shared_question_property_info' | translate }}
                        </span>
                    </div>
                } @else {
                    <div class="xm-paragraph-title">
                        {{ 'i18n_exam_basic_information_tab' | translate }}
                    </div>
                }
            </div>
        </div>
    `,
})
export class QuestionUsageComponent {
    examNames = input.required<string[]>();
    showWarning = input(false);
    limitNames = signal(false);
}
