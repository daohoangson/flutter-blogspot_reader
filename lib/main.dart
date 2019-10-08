import 'package:flutter/material.dart';

import 'package:blogspot_reader/blogspot/feed.dart';
import 'package:blogspot_reader/firebase/firebase.dart';

void main() => runApp(MyApp());

class MyApp extends StatelessWidget {
  // This widget is the root of your application.
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Blogspot Reader',
      theme: ThemeData.dark(),
      home: _Setting(),
    );
  }
}

class _Setting extends StatefulWidget {
  @override
  State<StatefulWidget> createState() => _SettingState();
}

class _SettingState extends State<_Setting> {
  final _tec = TextEditingController();

  @override
  void initState() {
    super.initState();
    configureFcm(onLaunch: _fcmOnResume, onResume: _fcmOnResume);
  }

  @override
  void dispose() {
    super.dispose();
    _tec.dispose();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: Text('Blogspot Reader')),
        body: Padding(
          padding: const EdgeInsets.all(16.0),
          child: TextField(
            autocorrect: false,
            autofocus: true,
            controller: _tec,
            decoration: InputDecoration(
              hintText: 'Enter domain name or feed url',
            ),
            keyboardType: TextInputType.url,
            onSubmitted: (_) => __actionGo(),
          ),
        ),
        floatingActionButton: FloatingActionButton(
          onPressed: __actionGo,
          child: Icon(Icons.add),
        ),
      );

  Future<void> _fcmOnResume(Map<String, dynamic> message) async {
    if (!message.containsKey('data')) return;

    final data = message['data'] as Map<dynamic, dynamic>;
    if (!data.containsKey('hubTopic')) return;

    final hubTopic = data['hubTopic'] as String;

    Navigator.of(context).popUntil((route) => route.isFirst);
    Navigator.of(context)
        .push(MaterialPageRoute(builder: (_) => BlogspotFeed(hubTopic)));
  }

  void __actionGo() {
    final input = _tec.text;
    if (input.isNotEmpty != true) return;

    String atomFeedUrl = input;
    final m = new RegExp(r'^https?://');
    if (m.matchAsPrefix(input) == null) {
      atomFeedUrl = "https://$input/feeds/posts/default";
    }

    Navigator.of(context)
        .push(MaterialPageRoute(builder: (_) => BlogspotFeed(atomFeedUrl)));
  }
}
