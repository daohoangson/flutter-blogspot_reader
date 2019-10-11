# Blogspot Reader

Flutter app with heavy use of Firebase services to read blogs and get notified for new posts.
**Note: Only [Blogger](https://blogger.com) sites.**

## Tech stack


- [Flutter](https://flutter.dev): cross platform app development. This project only builds iOS and Android apps but Flutter has support for desktop and web apps too. Alternatives: React Native, Xamarin.
  - [flutter_widget_from_html](https://pub.dev/packages/flutter_widget_from_html): render entry html
  - [pull_to_refresh](https://pub.dev/packages/pull_to_refresh): pull-down-to-refresh and pull-up-to-load gestures
  - [timeago](https://pub.dev/packages/timeago): relative time description (e.g. "5 minutes ago")
  - [webfeed](https://pub.dev/packages/webfeed): Atom feed parser
- [WebSub](https://www.w3.org/TR/websub/) (previously known as PubSubHubbub): subscription protocol for Blogspot feeds
- [Firebase Messaging](https://firebase.google.com/docs/cloud-messaging/): push notification solution for iOS, Android and web. Alternative: APNS for iOS. No alternative for Android.
- [Firebase Functions](https://firebase.google.com/docs/functions/): FaaS / serverless platform. Alternatives: AWS Lambda, Azure Functions.
  - `subscribe`: [subscribe to FCM topic](https://firebase.google.com/docs/cloud-messaging/manage-topics#suscribe_and_unsubscribe_using_the) and start [hub.mode=subscribe](https://www.w3.org/TR/websub/#subscriber-sends-subscription-request) flow
  - `websub`: implement WebSub protocol [challenge](https://www.w3.org/TR/websub/#hub-verifies-intent) and [callback](https://www.w3.org/TR/websub/#content-distribution) flows
  - `resubscribe`: cron, via [Cloud Scheduler](https://cloud.google.com/scheduler/), to refresh WebSub subscriptions
- [Cloud Firestore](https://firebase.google.com/docs/firestore): realtime database service
  - `subscriptions` collection: WebSub data
  - `users` collection: user data (saved anonymously, via [Firebase Auth](https://firebase.google.com/docs/auth/))
    - `users/{userId}/sites`: sites list
