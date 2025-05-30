import { TTimerType } from '../types';
export interface ICallNotification {
    id: null;
    method: 'call';
    params: {
        timerId: number;
        timerType: TTimerType;
    };
}
//# sourceMappingURL=call-notification.d.ts.map