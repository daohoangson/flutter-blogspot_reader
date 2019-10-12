import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { post, FullResponse } from 'request-promise-native';

import {
  Config,
  firestoreCollectionSubscriptions,
  firestoreFieldHubTopic,
  firestoreFieldSubscribeDate,
  generateFcmTopicForHubTopic,
  hubTopicPrefix,
  registrationTokenParamKey,
} from '../common/config';

export default (config: Config) => functions.https.onRequest(async (req, resp) => {
  const {
    query: {
      'hub.topic': hubTopic,
      [registrationTokenParamKey]: registrationToken,
    },
  } = req;

  if (!hubTopic || !registrationToken) return resp.sendStatus(400);
  if (!hubTopic.startsWith(hubTopicPrefix)) {
    console.warn(`subscribe.hubTopic: invalid ${hubTopic}`);
    return resp.sendStatus(400);
  }

  const fcmTopic = generateFcmTopicForHubTopic(hubTopic);
  const hubSubscribeUrl = `${config.getHub()}/subscribe`;
  const websubCallback = config.generateWebsubCallbackForHubTopic(hubTopic);
  const statusCode = await Promise.all([
    admin.messaging().subscribeToTopic([registrationToken], fcmTopic),
    post(
      hubSubscribeUrl,
      {
        form: {
          'hub.callback': websubCallback,
          'hub.topic': hubTopic,
          'hub.mode': 'subscribe',
          'hub.secret': config.generateWebsubSecretForHubTopic(hubTopic),
        },
        resolveWithFullResponse: true,
      }
    ) as Promise<FullResponse>,
    admin.firestore().collection(firestoreCollectionSubscriptions).doc(fcmTopic).set({
      [firestoreFieldHubTopic]: hubTopic,
      [firestoreFieldSubscribeDate]: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true })
  ]).then<number, number>(
    ([fcmResp, hubResp]) => {
      if (fcmResp.successCount !== 1) {
        console.error(`subscribe.fcm[${registrationToken}]: ${fcmResp.errors[0].error.message}`);
        return 500;
      } else {
        console.log(`subscribe.fcm[${registrationToken}]: fcmTopic=${fcmTopic}`);
      }

      if (hubResp.statusCode !== 202) {
        console.error(`subscribe.hub[${registrationToken}]: hubResp.statusCode=${hubResp.statusCode}`);
        return hubResp.statusCode;
      } else {
        console.log(`subscribe.hub[${registrationToken}]:\n\thubSubscribeUrl=${hubSubscribeUrl}\n\twebsubCallback=${websubCallback}\n\thubTopic=${hubTopic}`);
      }

      return 202;
    },
    (reason) => {
      console.exception(reason);
      return 500;
    },
  );

  return resp.sendStatus(statusCode);
});
