// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { NgbCollapse } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { forkJoin, of } from 'rxjs';
import { ExaminationStatusService } from 'src/app/examination/examination-status.service';
import { SessionService } from 'src/app/session/session.service';
import type { Link } from './navigation.model';
import { NavigationService } from './navigation.service';

/** Collapsed state keyed by parent route; avoids mutating link graphs from computed `links()` (they may be recreated). */
type SubmenuCollapsedMap = Readonly<Record<string, boolean>>;

@Component({
    selector: 'xm-navigation',
    templateUrl: './navigation.component.html',
    imports: [RouterLinkActive, RouterLink, NgbCollapse, TranslateModule],
    styleUrl: './navigation.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavigationComponent {
    readonly appVersion = signal('');
    readonly mobileMenuOpen = signal(false);
    readonly featureFlags = signal({ iop: false, byod: false });
    readonly links = computed(() => {
        // Track a bunch of signals to establish reactive dependencies
        this.user();
        this.ExaminationStatus.combinedStatusSignal();
        const { iop, byod } = this.featureFlags();
        return this.Navigation.getLinks(iop, byod);
    });

    private readonly submenuCollapsedByRoute = signal<SubmenuCollapsedMap>({});

    private readonly toast = inject(ToastrService);
    private readonly router = inject(Router);
    private readonly Navigation = inject(NavigationService);
    private readonly Session = inject(SessionService);
    private readonly ExaminationStatus = inject(ExaminationStatusService);

    constructor() {
        // Load app version for admins
        const currentUser = this.user();
        if (currentUser?.isAdmin) {
            this.Navigation.getAppVersion$().subscribe({
                next: (resp) => this.appVersion.set(resp.appVersion),
                error: (err) => this.toast.error(err),
            });
        }

        // Load feature flags if user exists (links computed will react to user changes)
        if (currentUser) {
            this.loadLinksWithFeatures(true, currentUser.isAdmin);
        }
    }

    // Use SessionService's user signal directly
    get user() {
        return this.Session.userChange;
    }

    isActive(link: Link) {
        return window.location.href.includes(link.route);
    }

    getSkipLinkPath(skipTarget: string) {
        return window.location.toString().includes(skipTarget) ? window.location : window.location + skipTarget;
    }

    openMenu() {
        this.mobileMenuOpen.update((v) => !v);
    }

    /** `true` when submenu should be collapsed (ngbCollapse input). */
    submenuCollapsed(link: Link): boolean {
        if (link.submenu.items.length === 0) {
            return false;
        }
        const map = this.submenuCollapsedByRoute();
        return link.route in map ? map[link.route] : link.submenu.hidden;
    }

    toggleSubmenu(link: Link): void {
        if (link.submenu.items.length === 0) {
            return;
        }
        const key = link.route;
        this.submenuCollapsedByRoute.update((m) => {
            const collapsed = key in m ? m[key] : link.submenu.hidden;
            return { ...m, [key]: !collapsed };
        });
    }

    /** Parents with submenus: avoid RouterLink on the same control as toggle (ordering/CD conflicts with reopen). */
    onParentNavClick(link: Link): void {
        if (link.submenu.items.length === 0) {
            return;
        }
        this.toggleSubmenu(link);
        const path = link.route.startsWith('/') ? link.route : `/${link.route}`;
        void this.router.navigateByUrl(path);
    }

    parentAriaExpanded(link: Link): boolean | null {
        return link.submenu.items.length > 0 ? !this.submenuCollapsed(link) : null;
    }

    switchLanguage(key: string) {
        this.Session.switchLanguage(key);
    }

    private loadLinksWithFeatures(checkInteroperability: boolean, checkByod = false) {
        if (!checkInteroperability && !checkByod) return;

        const interoperability$ = checkInteroperability
            ? this.Navigation.getInteroperability$()
            : of({ isExamCollaborationSupported: false });

        const byod$ = checkByod
            ? this.Navigation.getByodSupport$()
            : of({ sebExaminationSupported: false, homeExaminationSupported: false });

        forkJoin([interoperability$, byod$]).subscribe({
            next: ([iop, byod]) => {
                this.featureFlags.set({
                    iop: iop.isExamCollaborationSupported,
                    byod: byod.sebExaminationSupported || byod.homeExaminationSupported,
                });
            },
            error: (err) => this.toast.error(err),
        });
    }
}
