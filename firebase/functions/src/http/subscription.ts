import * as functions from 'firebase-functions';
import { get, FullResponse } from 'request-promise-native';

import { Config } from '../common/config';

export default (config: Config) => functions.https.onRequest(async (req, resp) => {
  const {
    query: {
      'hub.topic': hubTopic,
    },
  } = req;

  if (!hubTopic) return resp.sendStatus(400);

  const hubResp = await get(
    `${config.getHub()}/subscription-details`,
    {
      qs: {
        'hub.callback': config.generateWebsubCallbackForHubTopic(hubTopic),
        'hub.topic': hubTopic,
        'hub.secret': config.generateWebsubSecretForHubTopic(hubTopic),
      },
      resolveWithFullResponse: true,
    }
  ) as FullResponse;

  return resp.status(hubResp.statusCode).send(hubResp.body);
});
