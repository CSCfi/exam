import { SessionService } from './session.service';

export function sessionServiceFactory(i: any) {
    return i.get('Session');
}

export const sessionServiceProvider = {
    provide: SessionService,
    useFactory: sessionServiceFactory,
    deps: ['$injector']
};
