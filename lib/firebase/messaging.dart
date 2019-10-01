part of 'firebase.dart';

final _firebaseMessaging = FirebaseMessaging();

MessageHandler _printMessage(String event) => (Map<String, dynamic> message) {
      debugPrint("$event: $message");
      return null;
    };

void configureFcm() => _firebaseMessaging.configure(
      // onBackgroundMessage: _printMessage('onBackgroundMessage'),
      onLaunch: _printMessage('onLaunch'),
      onMessage: _printMessage('onMessage'),
      onResume: _printMessage('onResume'),
    );
