import 'package:flutter/material.dart';
import 'package:flutter_widget_from_html/flutter_widget_from_html.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:webfeed/webfeed.dart';

import 'package:blogspot_reader/blogspot/feed.dart';

class BlogspotEntry extends StatelessWidget {
  final AtomItem entry;

  BlogspotEntry(this.entry);

  @override
  Widget build(BuildContext _) => Scaffold(
        appBar: AppBar(
          title: Text(entry.title),
          actions: <Widget>[
            IconButton(
              icon: Icon(Icons.open_in_browser),
              onPressed: __actionOpenInBrowser,
            )
          ],
        ),
        body: SingleChildScrollView(
          child: Column(
            children: <Widget>[
              HtmlWidget(
                entry.content,
                factoryBuilder: (c) => _WidgetFactory(c),
                webView: true,
              ),
              _CategoriesWidget(entry),
            ],
            crossAxisAlignment: CrossAxisAlignment.start,
          ),
        ),
      );

  __actionOpenInBrowser() async {
    String url;
    for (final link in entry.links) {
      if (link.rel == 'alternate') {
        url = link.href;
      }
    }
    if (url == null) return;

    if (await canLaunch(url)) {
      await launch(url);
    }
  }
}

class _CategoriesWidget extends StatelessWidget {
  final AtomItem entry;

  _CategoriesWidget(this.entry);

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.all(10),
        child: Wrap(
          children: entry.categories
              .map((c) => ActionChip(
                    label: Text(c.label ?? c.term),
                    onPressed: () => _pushCategoryFeed(context, c),
                  ))
              .toList(),
          spacing: 10,
        ),
      );

  void _pushCategoryFeed(BuildContext context, AtomCategory category) {
    for (final link in entry.links) {
      if (link.rel != 'self') continue;

      final m = new RegExp('^https://.+posts/default').matchAsPrefix(link.href);
      if (m == null) continue;

      // build category feed url from entry self link
      final categoryFeedUrl = "${m[0]}/-/${category.term}";
      Navigator.of(context).push(MaterialPageRoute(
          builder: (_) => BlogspotFeed(
                categoryFeedUrl,
                title: category.label ?? category.term,
              )));
    }
  }
}

class _WidgetFactory extends WidgetFactory {
  final imgBuildOp = BuildOp(defaultStyles: (meta, e) {
    final a = e.attributes;
    if (a.containsKey('data-original-height') &&
        a.containsKey('data-original-width')) {
      return [
        'height',
        "${a['data-original-height']}px",
        'width',
        "${a['data-original-width']}px",
      ];
    }

    return null;
  });

  _WidgetFactory(HtmlWidgetConfig c) : super(c);

  @override
  NodeMetadata parseLocalName(NodeMetadata meta, String localName) {
    switch (localName) {
      case 'img':
        meta = lazySet(meta, buildOp: imgBuildOp);
        break;
    }

    return super.parseLocalName(meta, localName);
  }
}
