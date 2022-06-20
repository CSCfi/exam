import { NgModule } from '@angular/core';
import { Route, RouterModule } from '@angular/router';
import { CalendarHomeComponent } from './calendar-home.component';
import { CalendarComponent } from './calendar.component';

const routes: Route[] = [
    {
        path: '',
        component: CalendarHomeComponent,
        children: [
            {
                path: ':id',
                component: CalendarComponent,
                data: {
                    isExternal: false,
                    isCollaborative: false,
                },
            },
            {
                path: ':id/external',
                component: CalendarComponent,
                data: { isExternal: true },
            },
            {
                path: ':id/collaborative',
                component: CalendarComponent,
                data: { isExternal: false, isCollaborative: true },
            },
        ],
    },
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule],
})
export class CalendarRouterModule {}
