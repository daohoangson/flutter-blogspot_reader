import config from './common/config';
import httpSubscribe from './http/subscribe';
import httpSubscription from './http/subscription';
import httpWebsub from './http/websub';

export const subscribe = httpSubscribe(config);
export const subscription = httpSubscription(config);
export const websub = httpWebsub(config);
