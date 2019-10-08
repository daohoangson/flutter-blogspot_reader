part of 'firebase.dart';

final _firebaseMessaging = FirebaseMessaging();

MessageHandler _printMessage(String event) => (Map<String, dynamic> message) {
      debugPrint("$event: $message");
      return null;
    };

void configureFcm({
  MessageHandler onLaunch,
  MessageHandler onMessage,
  MessageHandler onResume,
}) =>
    _firebaseMessaging
      ..configure(
        onLaunch: onLaunch ?? _printMessage('onLaunch'),
        onMessage: onMessage ?? _printMessage('onMessage'),
        onResume: onResume ?? _printMessage('onResume'),
      )
      ..getToken()
          .then((t) => debugPrint("For serve.sh:\nexport FCM_TOKEN=$t"));
