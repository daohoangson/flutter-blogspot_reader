# Blogspot Reader

Flutter app with heavy use of Firebase services to read Blogspot / Blogger blogs and get notified for new posts.

## Tech stack

- [Flutter](https://flutter.dev): cross platform app development. This project only builds iOS and Android apps but Flutter has support for desktop and web apps too. Alternatives: React Native, Xamarin.
  - [flutter_widget_from_html](https://pub.dev/packages/flutter_widget_from_html): render entry html
  - [pull_to_refresh](https://pub.dev/packages/pull_to_refresh): pull-down-to-refresh and pull-up-to-load gestures
  - [timeago](https://pub.dev/packages/timeago): relative time text (e.g. "5 minutes ago")
  - [webfeed](https://pub.dev/packages/webfeed): Atom feed parser
- [Firebase Functions](https://firebase.google.com/docs/functions/): FaaS / serverless platform. Alternative: AWS Lambda, Azure Functions.
  - [subscribe](/firebase/functions/src/http/subscribe.ts):
    - Params: device token, feed URL
    - [Subscribe to FCM topic](https://firebase.google.com/docs/cloud-messaging/manage-topics#suscribe_and_unsubscribe_using_the)
    - Start `hub.mode=subscribe` WebSub flow
  - [websub](/firebase/functions/src/http/subscribe.ts): implement WebSub protocol (challenge and callback only)
  - [resubscribe](/firebase/functions/src/cron/resubscribe.ts): cron, via [Cloud Scheduler](https://cloud.google.com/scheduler/), to refresh WebSub subscriptions
- [Firebase Messaging](https://firebase.google.com/docs/cloud-messaging/): push notification solution for iOS, Android and web. Alternative: APNS for iOS.
- [Cloud Firestore](https://firebase.google.com/docs/firestore): realtime database service
- [WebSub](https://www.w3.org/TR/websub/) (previously known as PubSubHubbub): subscription protocol for Blogspot feeds
