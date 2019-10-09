import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import * as Parser from 'rss-parser';

import { Config, generateFcmTopicForHubTopic } from '../common/config';
import { sha1Hmac } from '../common/crypto';

export const generateTopicMessage = async (hubTopic: string): Promise<admin.messaging.Message> => {
  const parser = new Parser({
    customFields: {
      item: [
        ['media:thumbnail', 'thumbnail']
      ]
    }
  });
  const feed = await parser.parseURL(hubTopic);
  const fcmTopic = generateFcmTopicForHubTopic(hubTopic);
  const debugMessage = (debug: string) => ({ data: { hubTopic, debug }, topic: fcmTopic });
  if (!feed.title) return debugMessage('!feed.title');

  if (!feed.items) return debugMessage('!feed.items');
  if (feed.items.length < 1) return debugMessage('feed.items.length < 1');

  const item = feed.items[0];
  if (!item.title) return debugMessage('!item.title');

  const imageUrl = item.thumbnail && item.thumbnail.$ ?
    (item.thumbnail.$.url as string).replace(/\/s\d+-c\//, '/') :
    undefined;

  return {
    topic: fcmTopic,
    notification: {
      title: feed.title,
      body: item.title,
    },
    data: { hubTopic },
    android: {
      notification: {
        clickAction: 'FLUTTER_NOTIFICATION_CLICK',
        imageUrl
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
    return resp.sendStatus(500);
  }

  const hubTopic = linkMatches[1];
  const secret = config.generateWebsubSecretForHubTopic(hubTopic);
  const body = rawBody.toString();
  const bodySha1Hmac = sha1Hmac(body, secret);
  if (signature !== `sha1=${bodySha1Hmac}`) {
    console.error(`websub.callback:\n\thubTopic=${hubTopic}\n\tsignature=${signature}\n\tbodySha1Hmac=${bodySha1Hmac}`);
    return resp.status(401);
  }

  let message: admin.messaging.Message;
  try {
    message = await generateTopicMessage(hubTopic);
  } catch (e) {
    console.error(`websub.payload: ${JSON.stringify(e)}`);
    return resp.sendStatus(500);
  }

  console.log(`websub.fcm: message=${JSON.stringify(message)}`);
  try {
    await admin.messaging().send(message);
  } catch (e) {
    console.error(`websub.fcm: ${JSON.stringify(e)}`);
    return resp.sendStatus(500);
  }

  return resp.sendStatus(202);
});

const _websubChallenge = (req: functions.https.Request, resp: functions.Response) => {
  const {
    query: {
      'hub.challenge': challenge,
      'hub.lease_seconds': leaseSeconds,
      'hub.topic': topic,
    },
  } = req;

  console.log(`websub.challenge:\n\ttopic=${topic}\n\tchallenge=${challenge}\n\tlease_seconds=${leaseSeconds}`);
  return resp.send(challenge)
}
