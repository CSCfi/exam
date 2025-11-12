// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import type { Examination, ExaminationSection, NavigationPage } from 'src/app/examination/examination.model';

@Component({
    selector: 'xm-examination-navigation',
    template: `<!-- SECTION NAVIGATION ARROWS AND LABELS -->
        <div class="row pt-2 mb-3">
            <span class="col-md-12 ms-2">
                <!-- PREVIOUS SECTION BUTTON -->
                @if (prev().valid) {
                    <button class="btn btn-outline-secondary" (click)="previousPage()">
                        <img
                            class="arrow_icon sitnet-black"
                            style="filter: invert()"
                            alt=""
                            src="/assets/images/icon_left_white.png"
                        />
                        {{ prev()?.index ? ('i18n_move_to_section' | translate) : ('i18n_open_it' | translate) }}
                        {{ prev()?.index ? prev().index + '.' : '' }} {{ prev().text || '' | translate }}
                    </button>
                }
                <!-- NEXT SECTION BUTTON -->
                @if (next().valid) {
                    <button class="btn btn-outline-secondary float-end me-2" (click)="nextPage()">
                        {{ next()?.index ? ('i18n_move_to_section' | translate) : ('i18n_open_it' | translate) }}
                        {{ next()?.index ? next().index + '.' : '' }} {{ next().text || '' | translate }}
                        <img
                            class="arrow_icon"
                            style="filter: invert()"
                            alt=""
                            src="/assets/images/icon_right_white.png"
                        />
                    </button>
                }
            </span>
        </div>`,
    imports: [TranslateModule],
    styles: [
        `
            .arrow_icon {
                vertical-align: baseline;
                padding-left: 13px;
                padding-right: 13px;
            }
        `,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExaminationNavigationComponent {
    exam = input.required<Examination>();
    activeSection = input<ExaminationSection | undefined>(undefined);
    selected = output<{ page: Partial<NavigationPage> }>();

    pages = computed(() => {
        const currentExam = this.exam();
        const pages: Partial<NavigationPage>[] = currentExam.examSections.map((es, i) => ({
            index: i + 1,
            id: es.id,
            text: es.name,
            type: 'section',
            valid: true,
        }));
        // Add guide page
        pages.unshift({ text: 'i18n_exam_guide', type: 'guide', valid: true });
        return pages;
    });

    next = computed(() => {
        const currentActiveSection = this.activeSection();
        const currentPages = this.pages();

        if (!currentActiveSection) {
            return currentPages[1] || { valid: false };
        }

        const nextIndex = this.nextPageIndex(currentPages, currentActiveSection);
        return nextIndex > -1 ? currentPages[nextIndex] : { valid: false };
    });

    prev = computed(() => {
        const currentActiveSection = this.activeSection();
        const currentPages = this.pages();

        if (!currentActiveSection) {
            return { valid: false };
        }

        const prevIndex = this.prevPageIndex(currentPages, currentActiveSection);
        return prevIndex > -1 ? currentPages[prevIndex] : { valid: false };
    });

    nextPage() {
        this.selected.emit({ page: this.next() });
    }

    previousPage() {
        this.selected.emit({ page: this.prev() });
    }

    private activePageIndex(pages: Partial<NavigationPage>[], activeSection: ExaminationSection | undefined): number {
        if (!activeSection) {
            return 0; // Guide page
        }
        const page = pages.filter((p) => activeSection.id === p.id)[0];
        return pages.indexOf(page);
    }

    private nextPageIndex(pages: Partial<NavigationPage>[], activeSection: ExaminationSection | undefined): number {
        const activeIndex = this.activePageIndex(pages, activeSection);
        return activeIndex + 1 === pages.length ? -1 : activeIndex + 1;
    }

    private prevPageIndex(pages: Partial<NavigationPage>[], activeSection: ExaminationSection | undefined): number {
        return this.activePageIndex(pages, activeSection) - 1;
    }
}
