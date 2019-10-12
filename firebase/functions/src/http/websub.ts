import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import * as Parser from 'rss-parser';

import {
  Config,
  firestoreCollectionSubscriptions,
  firestoreFieldChallengeDate,
  firestoreFieldHubTopic,
  firestoreFieldLatestItemDate,
  firestoreFieldLeaseEndDate,
  firestoreFieldLeaseSeconds,
  generateFcmTopicForHubTopic,
  hubTopicPrefix,
} from '../common/config';
import { sha1Hmac } from '../common/crypto';

export const generateTopicMessage = async (hubTopic: string, xml: string): Promise<admin.messaging.Message> => {
  const parser = new Parser({
    customFields: {
      item: [
        ['media:thumbnail', 'thumbnail']
      ]
    }
  });
  const feed = await parser.parseString(xml);
  const fcmTopic = generateFcmTopicForHubTopic(hubTopic);
  const debugMessage = (debug: string) => ({ data: { hubTopic, debug }, topic: fcmTopic });
  if (!feed.title) return debugMessage('!feed.title');
  const { title } = feed;

  if (!feed.items || feed.items.length < 1) return debugMessage('feed.items.length < 1');
  const item = feed.items[0];

  if (!item.isoDate) return debugMessage('!item.date');
  if (!item.link) return debugMessage('!item.link');
  if (!item.title) return debugMessage('!item.title');

  const imageUrl = item.thumbnail && item.thumbnail.$ ?
    (item.thumbnail.$.url as string).replace(/\/s\d+-c\//, '/') :
    undefined;

  return {
    topic: fcmTopic,
    notification: {
      title,
      body: item.title,
    },
    data: {
      hubTopic,
      'item.date': Date.parse(item.isoDate).toString(),
      'item.link': item.link,
      'site.title': title,
    },
    android: {
      notification: {
        clickAction: 'FLUTTER_NOTIFICATION_CLICK',
        imageUrl,
        tag: fcmTopic,
      },
    },
  };
}

export default (config: Config) => functions.https.onRequest(async (req, resp) => {
  const {
    headers: {
      link,
      'x-hub-signature': signature,
    },
    method,
    rawBody,
  } = req;

  if (method !== 'POST' || !signature || !rawBody) return _websubChallenge(req, resp);

  const linkMatches = typeof link === 'string' ? RegExp('<([^>]+)>; rel=self').exec(link) : null;
  if (linkMatches === null) {
    console.error(`websub.callback: invalid link=${link}`);
    return resp.sendStatus(400);
  }

  const hubTopic = linkMatches[1];
  if (!hubTopic.startsWith(hubTopicPrefix)) {
    console.warn(`websub.hubTopic: invalid ${hubTopic}`);
    return resp.sendStatus(400);
  }

  const secret = config.generateWebsubSecretForHubTopic(hubTopic);
  const body = rawBody.toString();
  const bodySha1Hmac = sha1Hmac(body, secret);
  if (signature !== `sha1=${bodySha1Hmac}`) {
    console.error(`websub.callback:\n\thubTopic=${hubTopic}\n\tsignature=${signature}\n\tbodySha1Hmac=${bodySha1Hmac}`);
    return resp.status(401);
  }

  let message: admin.messaging.Message;
  try {
    message = await generateTopicMessage(hubTopic, body);
  } catch (e) {
    console.exception(e);
    return resp.sendStatus(500);
  }

  const { 'item.date': itemDateStr } = message.data!;
  if (!itemDateStr) {
    console.error(`websub.message: no \`item.date\` ${JSON.stringify(message)}`);
    return resp.sendStatus(500);
  }
  const itemDate = parseInt(itemDateStr, 10);

  const fcmTopic = (message as any).topic as string;
  let subscription: FirebaseFirestore.DocumentSnapshot;
  try {
    subscription = await _getSubscriptionDocRef(fcmTopic).get()
  } catch (e) {
    console.exception(e);
    return resp.sendStatus(500);
  }
  const subscriptionData = subscription.data();
  if (!subscriptionData) {
    console.error('websub.firestore: subscription data is undefined');
    return resp.sendStatus(500);
  }

  const latestItemDate = subscriptionData[firestoreFieldLatestItemDate] as admin.firestore.Timestamp | undefined;
  const itemDateTimestamp = admin.firestore.Timestamp.fromMillis(itemDate);
  if (latestItemDate && latestItemDate.toMillis() >= itemDate) {
    console.warn(`websub.firestore: skipped ${firestoreFieldLatestItemDate}=${latestItemDate.toDate()}, item.date=${itemDateTimestamp.toDate()}`);
    return resp.sendStatus(202);
  }

  try {
    await Promise.all([
      admin.messaging().send(message),
      _getSubscriptionDocRef(fcmTopic)
        .update({ [firestoreFieldLatestItemDate]: itemDateTimestamp })
    ]);
  } catch (e) {
    console.exception(e);
    return resp.sendStatus(500);
  }

  console.log(`websub.fcm: sent ${JSON.stringify(message)}`);

  return resp.sendStatus(202);
});

const _getSubscriptionDocRef = (fcmTopic: string): FirebaseFirestore.DocumentReference =>
  admin.firestore().collection(firestoreCollectionSubscriptions).doc(fcmTopic);

const _websubChallenge = async (req: functions.https.Request, resp: functions.Response) => {
  const {
    query: {
      'hub.challenge': challenge,
      'hub.lease_seconds': leaseSecondsStr,
      'hub.topic': hubTopic,
    },
  } = req;

  const leaseSeconds = parseInt(leaseSecondsStr, 10);
  if (!challenge || leaseSeconds === NaN || leaseSeconds < 1 || !hubTopic) {
    return resp.sendStatus(400);
  }

  try {
    const fcmTopic = generateFcmTopicForHubTopic(hubTopic);
    await admin.firestore().collection(firestoreCollectionSubscriptions).doc(fcmTopic).set({
      [firestoreFieldChallengeDate]: admin.firestore.FieldValue.serverTimestamp(),
      [firestoreFieldHubTopic]: hubTopic,
      [firestoreFieldLeaseEndDate]: admin.firestore.Timestamp.fromMillis(admin.firestore.Timestamp.now().toMillis() + leaseSeconds * 1000),
      [firestoreFieldLeaseSeconds]: leaseSeconds,
    }, { merge: true });
  } catch (e) {
    console.exception(e);
    return resp.sendStatus(500);
  }

  return resp.send(challenge)
}
