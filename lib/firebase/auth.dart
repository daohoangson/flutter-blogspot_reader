part of 'firebase.dart';

final FirebaseAuth _firebaseAuth = FirebaseAuth.instance;

Future<String> getFirebaseUserId() async {
  final result = await _firebaseAuth.signInAnonymously();
  return result.user.uid;
}
