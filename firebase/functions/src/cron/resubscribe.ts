import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { post, FullResponse } from 'request-promise-native';

import {
  Config,
  firestoreCollectionSubscriptions,
  firestoreFieldHubTopic,
  firestoreFieldLeaseEndDate,
  hubTopicPrefix,
} from '../common/config';

export default (config: Config) => functions.pubsub.schedule('every 2 hours').onRun(async (_) => {
  const snapshot = await admin.firestore().collection(firestoreCollectionSubscriptions)
    .where(firestoreFieldLeaseEndDate, '<', admin.firestore.Timestamp.fromMillis(admin.firestore.Timestamp.now().toMillis() + 86400000))
    .orderBy(firestoreFieldLeaseEndDate, 'asc')
    .limit(10)
    .get();

  await Promise.all(snapshot.docs.map((doc) => {
    const subscription = doc.data();

    const hubTopic = subscription[firestoreFieldHubTopic];
    if (!hubTopic.startsWith(hubTopicPrefix)) {
      return doc.ref.delete().then(
        (__) => console.warn(`resubscribe[${hubTopic}]: deleted`),
        (reason) => console.exception(reason)
      );
    }

    const hubSubscribeUrl = `${config.getHub()}/subscribe`;
    const websubCallback = config.generateWebsubCallbackForHubTopic(hubTopic);

    return post(
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
    ).then(
      (hubResp: FullResponse) => {
        if (hubResp.statusCode !== 202) {
          console.error(`resubscribe[${hubTopic}]: hubResp.statusCode=${hubResp.statusCode}`);
        } else {
          console.log(`resubscribe[${hubTopic}]:\n\thubSubscribeUrl=${hubSubscribeUrl}\n\twebsubCallback=${websubCallback}\n\thubTopic=${hubTopic}`);
        }
      },
      (reason) => console.exception(reason)
    );
  }));
});
