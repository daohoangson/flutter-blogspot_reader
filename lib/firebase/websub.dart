part of 'firebase.dart';

class SubscribeButton extends StatefulWidget {
  final IconData icon;
  final String hubTopic;

  SubscribeButton({this.hubTopic, this.icon, Key key})
      : assert(hubTopic != null),
        assert(icon != null),
        super(key: key);

  @override
  State<StatefulWidget> createState() => _SubscribeButtonState();
}

class _SubscribeButtonState extends State<SubscribeButton> {
  @override
  Widget build(BuildContext context) => IconButton(
        icon: Icon(Icons.favorite),
        onPressed: __actionSubscribe,
      );

  void __actionSubscribe() async {
    debugPrint("[__actionSubscribe] hubTopic=${widget.hubTopic}");

    _firebaseMessaging.requestNotificationPermissions();

    final token = await _firebaseMessaging.getToken();
    debugPrint("[__actionSubscribe] token=$token");

    final url = "$kSubscribeUrl?"
        "hub.topic=${Uri.encodeQueryComponent(widget.hubTopic)}&"
        "br.registration_token=${Uri.encodeQueryComponent(token)}";
    final resp = await http.post(url);
    final statusCode = resp.statusCode;
    debugPrint("[__actionSubscribe] $url -> $statusCode");

    Scaffold.of(context).showSnackBar(SnackBar(
      content: Text(statusCode == 202
          ? 'Subscribed OK'
          : "Unable to subscribe (code $statusCode)"),
    ));
  }
}
