import { NgTemplateOutlet } from '@angular/common';
import { Component, Input, TemplateRef } from '@angular/core';

@Component({
    selector: 'xm-page-content',
    standalone: true,
    imports: [NgTemplateOutlet],
    template: `
        <div class="row mx-3">
            <div class="col-md-12 my-4">
                <ng-container [ngTemplateOutlet]="content"></ng-container>
            </div>
        </div>
    `,
})
export class PageContentComponent {
    @Input() content!: TemplateRef<unknown>;
}
