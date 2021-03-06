import 'package:flutter/material.dart';

import 'package:blogspot_reader/blogspot/feed.dart';
import 'package:blogspot_reader/firebase/firebase.dart';

part 'home_input.dart';
part 'home_list.dart';

class Home extends StatefulWidget {
  @override
  State<StatefulWidget> createState() => _HomeState();
}

class _HomeState extends State<Home> {
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
        body: Column(
          children: <Widget>[
            _HomeInput(controller: _tec, onSubmitted: (_) => __actionGo()),
            Flexible(child: _HomeList()),
          ],
        ),
        floatingActionButton: FloatingActionButton(
          onPressed: __actionGo,
          child: Icon(Icons.add),
        ),
      );

  Future<void> _fcmOnResume(Map<String, dynamic> message) async {
    debugPrint("_fcmOnResume: $message");
    if (!message.containsKey('data')) return;

    final data = message['data'] as Map<dynamic, dynamic>;
    if (!data.containsKey('hubTopic')) return;

    Navigator.of(context).popUntil((route) => route.isFirst);
    Navigator.of(context).push(MaterialPageRoute(
        builder: (_) => BlogspotFeed(
              data['hubTopic'],
              title: data.containsKey('site.title') ? data['site.title'] : null,
            )));
  }

  void __actionGo() {
    var input = _tec.text;
    if (input.isNotEmpty != true) return;
    _tec.clear();

    Navigator.of(context).push(MaterialPageRoute(
        builder: (_) => BlogspotFeed(
              Uri.tryParse(input)?.scheme?.isNotEmpty == true
                  ? input
                  : "https://$input/feeds/posts/default",
            )));
  }
}
