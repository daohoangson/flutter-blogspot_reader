import config from './common/config';
import httpSubscribe from './http/subscribe';
import httpWebsub from './http/websub';

export const subscribe = httpSubscribe(config);
export const websub = httpWebsub(config);
