import { createHash, createHmac } from 'crypto';
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as request from 'request-promise-native';

admin.initializeApp();

const registrationTokenParamKey = 'br.registration_token';
const secretHashParamKey = 'br.secret_hash';

const config = functions.config().websub || {
  secrets: process.env.WEBSUB_SECRETS,
  url: process.env.WEBSUB_URL,
};
const secrets = (config.secrets as string).split(',');
const websubUrl = config.url as string;

const _cryptoMd5Hash = (text: string) => createHash('md5').update(text).digest('hex');
const _cryptoSha1Hmac = (text: string, key: string) => createHmac('sha1', key).update(text).digest('hex');

const _extractSecret = (req: functions.https.Request, resp: functions.Response): string | undefined => {
  const { query: { [secretHashParamKey]: secretHash } } = req;
  if (!secretHash) {
    console.error('extractSecret: hash is missing');
    resp.sendStatus(403);
    return undefined;
  }

  const secret = secrets.filter((s) => _cryptoMd5Hash(s) === secretHash)[0];
  if (!secret) {
    console.error(`extractSecret: unrecognized secretHash=${secretHash}`);
    resp.sendStatus(404);
    return undefined;
  }

  return secret;
}

const _fcmTopic = (topic: string): string => topic.replace(/[^a-zA-Z0-9-_.~%]/g, '');

const _websubChallenge = (req: functions.https.Request, resp: functions.Response) => {
  const {
    query: {
      'hub.challenge': challenge,
      'hub.lease_seconds': leaseSeconds,
      'hub.topic': topic,
    },
  } = req;

  const secret = _extractSecret(req, resp);
  if (secret === undefined) return;

  console.log(`websub.challenge[${secret}]:\n\ttopic=${topic}\n\tlease_seconds=${leaseSeconds}`);
  return resp.send(challenge)
}

export const subscribe = functions.https.onRequest(async (req, resp) => {
  const {
    query: {
      'hub.topic': topic,
      [registrationTokenParamKey]: registrationToken,
    },
  } = req;

  if (!topic || !registrationToken) return resp.sendStatus(400);
  const secret = secrets[0];
  const callback = `${websubUrl}?${secretHashParamKey}=${_cryptoMd5Hash(secret)}`;

  const statusCode = await Promise.all([
    admin.messaging().subscribeToTopic([registrationToken], _fcmTopic(topic)),
    request.post(
      'https://pubsubhubbub.appspot.com/subscribe',
      {
        form: {
          'hub.callback': callback,
          'hub.topic': topic,
          'hub.mode': 'subscribe',
          'hub.secret': secret,
        },
        resolveWithFullResponse: true,
      }
    ) as Promise<request.FullResponse>,
  ]).then<number, number>(
    ([fcmResp, hubResp]) => {
      if (fcmResp.successCount !== 1) {
        console.error(`subscribe.fcm[${registrationToken}]: ${fcmResp.errors[0].error.message}`);
        return 500;
      }

      if (hubResp.statusCode !== 202) {
        console.error(`subscribe.hub[${registrationToken}]: hubResp.statusCode=${hubResp.statusCode}`);
        return hubResp.statusCode;
      }

      return 202;
    },
    (reason) => {
      console.error(`subscribe[${registrationToken}]: ${JSON.stringify(reason)}`);
      return 500;
    },
  );

  return resp.sendStatus(statusCode);
});

export const websub = functions.https.onRequest(async (req, resp) => {
  const {
    headers: {
      link,
      'x-hub-signature': signature,
    },
    method,
    rawBody,
  } = req;

  if (method !== 'POST' || !signature || !rawBody) return _websubChallenge(req, resp);

  const secret = _extractSecret(req, resp);
  if (secret === undefined) return;

  const linkMatches = typeof link === 'string' ? RegExp('<([^>]+)>; rel=self').exec(link) : null;
  if (linkMatches === null) {
    console.error(`websub.callback[${secret}]: invalid link=${link}`);
    return resp.sendStatus(500);
  }

  const callbackTopic = linkMatches[1];
  const body = rawBody.toString();
  const bodySha1Hmac = _cryptoSha1Hmac(body, secret);
  if (signature !== `sha1=${bodySha1Hmac}`) {
    console.error(`websub.callback[${secret}]:\n\tcallbackTopic=${callbackTopic}\n\tsignature=${signature}\n\tbodySha1Hmac=${bodySha1Hmac}`);
    return resp.status(401);
  }

  try {
    await admin.messaging().sendToTopic(
      _fcmTopic(callbackTopic),
      {
        notification: {
          title: 'Topic has been updated',
          body: callbackTopic,
        },
      }
    );
  } catch (e) {
    console.error(`websub.fcm[${secret}]: ${JSON.stringify(e)}`);
    return resp.sendStatus(500);
  }

  return resp.sendStatus(202);
});
