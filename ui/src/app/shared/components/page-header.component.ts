import { NgClass, NgTemplateOutlet } from '@angular/common';
import { Component, Input, TemplateRef } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { HistoryBackComponent } from '../history/history-back.component';

@Component({
    selector: 'xm-page-header',
    standalone: true,
    imports: [NgTemplateOutlet, NgClass, TranslateModule, HistoryBackComponent],
    template: `
        <div class="row mx-3 mt-4 mb-2 align-items-center">
            <div [ngClass]="appendWide ? 'col-md-6' : 'col-md-9'" class="col-s-3">
                @if (history) {
                    <span class="pe-4"><xm-history-back></xm-history-back></span>
                }
                @if (prependTemplate) {
                    <ng-container [ngTemplateOutlet]="prependTemplate"></ng-container>
                }
                <span class="xm-page-header-title">{{ text | translate }}</span>
            </div>
            @if (appendTemplate) {
                <div [ngClass]="appendWide ? 'col-md-6' : 'col-md-3'">
                    <ng-container [ngTemplateOutlet]="appendTemplate"></ng-container>
                </div>
            }
        </div>
    `,
    styles: [
        `
            .xm-page-header-title {
                font-size: 1.75rem;
                color: #2c2c2c;
                border-bottom: 2px solid #2c7639;
                padding-bottom: 7px;
            }
        `,
    ],
})
export class PageHeaderComponent {
    @Input() text = ''; // header title text
    @Input() history = false; // show history back component
    @Input() appendWide = false; // reserve extra horizontal space for appendTemplate
    @Input() prependTemplate!: TemplateRef<unknown>; // template to appear before title text
    @Input() appendTemplate!: TemplateRef<unknown>; // template to appear after title text
}
