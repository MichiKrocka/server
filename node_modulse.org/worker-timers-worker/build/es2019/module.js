import { clearScheduledInterval, clearScheduledTimeout, scheduleInterval, scheduleTimeout } from './helpers/timer';
/*
 * @todo Explicitly referencing the barrel file seems to be necessary when enabling the
 * isolatedModules compiler option.
 */
export * from './interfaces/index';
export * from './types/index';
addEventListener('message', ({ data }) => {
    try {
        if (data.method === 'clear') {
            const { id, params: { timerId, timerType } } = data;
            if (timerType === 'interval') {
                clearScheduledInterval(timerId);
                postMessage({ error: null, id });
            }
            else if (timerType === 'timeout') {
                clearScheduledTimeout(timerId);
                postMessage({ error: null, id });
            }
            else {
                throw new Error(`The given type "${timerType}" is not supported`);
            }
        }
        else if (data.method === 'set') {
            const { params: { delay, now, timerId, timerType } } = data;
            if (timerType === 'interval') {
                scheduleInterval(delay, timerId, now);
            }
            else if (timerType === 'timeout') {
                scheduleTimeout(delay, timerId, now);
            }
            else {
                throw new Error(`The given type "${timerType}" is not supported`);
            }
        }
        else {
            throw new Error(`The given method "${data.method}" is not supported`);
        }
    }
    catch (err) {
        postMessage({
            error: {
                message: err.message
            },
            id: data.id,
            result: null
        });
    }
});
//# sourceMappingURL=module.js.map