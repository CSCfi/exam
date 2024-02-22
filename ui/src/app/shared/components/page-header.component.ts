import { NgTemplateOutlet } from '@angular/common';
import { Component, Input, TemplateRef } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { HistoryBackComponent } from '../history/history-back.component';

@Component({
    selector: 'xm-page-header',
    standalone: true,
    imports: [NgTemplateOutlet, TranslateModule, HistoryBackComponent],
    template: `
        <div class="row ms-3 mt-4 mb-2 align-items-center">
            <div class="col-6">
                @if (history) {
                    <span class="pe-4"><xm-history-back xmAutoFocus></xm-history-back></span>
                }
                @if (prependTemplate) {
                    <ng-container [ngTemplateOutlet]="prependTemplate"></ng-container>
                }
                <span class="xm-page-header-title">{{ text | translate }}</span>
            </div>
            @if (appendTemplate) {
                <div class="col-6">
                    <ng-container [ngTemplateOutlet]="appendTemplate"></ng-container>
                </div>
            }
        </div>
    `,
})
export class PageHeaderComponent {
    @Input() text = '';
    @Input() history = false;
    @Input() prependTemplate!: TemplateRef<unknown>;
    @Input() appendTemplate!: TemplateRef<unknown>;
}
