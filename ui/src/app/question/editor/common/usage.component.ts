// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { Component, input, signal } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

@Component({
    imports: [TranslateModule],
    selector: 'xm-question-usage',
    template: `
        <div class="xm-stack">
            <!-- Exam contexts -->
            <div class="xm-study-item-container--warning xm-icon-text usage">
                <img src="/assets/images/icon_warning.png" alt="" />
                <div class="xm-stack">
                    <p>
                        @if (examNames().length > 1) {
                            {{ 'i18n_exam_question_edit_instructions' | translate }}
                        } @else if (examNames().length === 1) {
                            {{ 'i18n_exam_question_edit_instructions_for_one' | translate }}
                        } @else {
                            {{ 'i18n_exam_question_edit_instructions_for_none' | translate }}
                        }
                    </p>
                    @if (examNames().length > 0) {
                        <div class="xm-stack exam-list">
                            <p>{{ 'i18n_exam_question_in_use' | translate }}: {{ examNames().length }}</p>
                            <ul>
                                @for (name of examNames().slice(0, 5); track name) {
                                    <li>{{ name }}</li>
                                }
                                @for (name of examNames().slice(5); track name) {
                                    <li [hidden]="limitNames()">{{ name }}</li>
                                }
                                @if (examNames().length > 5 && limitNames()) {
                                    <li>
                                        <i class="bi-three-dots" [ariaLabel]="'i18n_more_hidden' | translate"></i>
                                    </li>
                                }
                            </ul>
                            @if (examNames().length > 5) {
                                <div>
                                    <button (click)="limitNames.set(!limitNames())" class="btn btn-secondary">
                                        {{
                                            !limitNames()
                                                ? ('i18n_hide' | translate)
                                                : ('i18n_open_list_of_exams' | translate)
                                        }}
                                    </button>
                                </div>
                            }
                        </div>
                    }
                </div>
            </div>

            <!-- Question editor -->
            @if (showWarning()) {
                <div class="xm-paragraph-title edit-warning-container">
                    {{ 'i18n_exam_basic_information_tab' | translate }}
                    <i class="bi-exclamation-circle ps-4 xm-text-danger"></i>
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
    `,
    styles: `
        .usage {
            overflow-wrap: anywhere;
        }
        // The exam names indented under the instructions, one per line
        .exam-list {
            margin: var(--xm-space-2) var(--xm-space-4) var(--xm-space-4);

            ul {
                margin: 0;
                padding: 0;
                list-style: none;
            }
        }
    `,
})
export class UsageComponent {
    readonly examNames = input.required<string[]>();
    readonly showWarning = input(false);

    readonly limitNames = signal(false);
}
