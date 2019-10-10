import 'package:flutter/material.dart';

import 'package:blogspot_reader/home/home.dart';

void main() => runApp(MyApp());

class MyApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Blogspot Reader',
      theme: ThemeData.dark(),
      home: Home(),
    );
  }
}
