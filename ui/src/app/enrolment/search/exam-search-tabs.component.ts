// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { NgbNav, NgbNavItem, NgbNavLink } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { PageContentComponent } from 'src/app/shared/components/page-content.component';
import { PageHeaderComponent } from 'src/app/shared/components/page-header.component';
import { CollaborativeExamSearchComponent } from './collaborative-exam-search.component';
import { ExamSearchComponent } from './exam-search.component';

interface ExamTab {
    id: number;
    key: string;
    labelKey: string;
}

const EXAM_TABS: ExamTab[] = [
    { id: 1, key: 'regular', labelKey: 'i18n_exams' },
    { id: 2, key: 'collaborative', labelKey: 'i18n_collaborative_exams' },
];

@Component({
    selector: 'xm-exam-search-tabs',
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <xm-page-header text="i18n_exams" />
        <xm-page-content [content]="content" />
        <ng-template #content>
            @if (collaborationSupported()) {
                <div class="row">
                    <div class="col-12">
                        <ul
                            ngbNav
                            #nav="ngbNav"
                            [activeId]="activeTab()"
                            (activeIdChange)="activeTab.set($event)"
                            class="nav-tabs"
                            [keyboard]="false"
                            (navChange)="onTabChange()"
                        >
                            @for (tab of availableTabs(); track tab.id) {
                                <li [ngbNavItem]="tab.id">
                                    <a ngbNavLink>{{ tab.labelKey | translate }}</a>
                                </li>
                            }
                        </ul>
                    </div>
                </div>
                @if (activeTab() === 1) {
                    <xm-exam-search></xm-exam-search>
                }
                @if (activeTab() === 2) {
                    <xm-collaborative-exam-search></xm-collaborative-exam-search>
                }
            } @else {
                <xm-exam-search></xm-exam-search>
            }
        </ng-template>
    `,
    styleUrls: ['./exam-search-tabs.component.scss'],
    imports: [
        NgbNav,
        NgbNavItem,
        NgbNavLink,
        TranslateModule,
        PageHeaderComponent,
        PageContentComponent,
        ExamSearchComponent,
        CollaborativeExamSearchComponent,
    ],
})
export class ExamSearchTabsComponent {
    availableTabs = signal<ExamTab[]>(EXAM_TABS);
    activeTab = signal(1);
    collaborationSupported = signal(false);

    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private http = inject(HttpClient);
    private title = inject(Title);
    private translate = inject(TranslateService);

    constructor() {
        this.loadCollaborationConfiguration();
    }

    onTabChange() {
        // activeTab is already updated via (activeIdChange) binding
        const tabParam = this.activeTab() === 2 ? 'collaborative' : null;
        this.router.navigate([], {
            queryParams: tabParam ? { tab: 'collaborative' } : {},
            queryParamsHandling: 'merge',
        });
        this.updateBrowserTitle();
    }

    private setupTabFromUrl() {
        const tabParam = this.route.snapshot.queryParamMap.get('tab');

        if (tabParam === 'collaborative' && this.collaborationSupported()) {
            this.activeTab.set(2);
        } else {
            this.activeTab.set(1);

            // If requested tab is not available, update URL to reflect actual tab
            if (tabParam === 'collaborative' && !this.collaborationSupported()) {
                this.router.navigate([], { queryParams: {}, queryParamsHandling: 'merge' });
            }
        }
        this.updateBrowserTitle();
    }

    private loadCollaborationConfiguration() {
        this.http
            .get<{ isExamCollaborationSupported: boolean }>('/app/settings/iop/examCollaboration')
            .subscribe((config) => {
                this.collaborationSupported.set(config.isExamCollaborationSupported);
                this.updateAvailableTabs();
                this.setupTabFromUrl();
            });
    }

    private updateAvailableTabs() {
        this.availableTabs.set(this.collaborationSupported() ? EXAM_TABS : [EXAM_TABS[0]]);
    }

    private updateBrowserTitle() {
        const titleKey = this.activeTab() === 2 ? 'i18n_collaborative_exams_title' : 'i18n_exams_title';
        const titleText = `${this.translate.instant(titleKey)} - EXAM`;
        this.title.setTitle(titleText);
    }
}
