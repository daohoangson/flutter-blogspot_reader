import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:pull_to_refresh/pull_to_refresh.dart';
import 'package:timeago/timeago.dart' as timeago;
import 'package:webfeed/webfeed.dart';
import 'package:webfeed/domain/media/thumbnail.dart';

import 'package:blogspot_reader/blogspot/entry.dart';

class BlogspotFeed extends StatefulWidget {
  final String atomFeedUrl;
  final String title;

  BlogspotFeed(
    this.atomFeedUrl, {
    this.title,
  }) : assert(atomFeedUrl != null);

  @override
  State<StatefulWidget> createState() => _BlogspotFeedState();
}

class _BlogspotFeedState extends State<BlogspotFeed> {
  final _entries = <AtomItem>[];
  String _nextUrl;
  static int _fetchCount = 0;
  RefreshController _refreshController =
      RefreshController(initialRefresh: true);
  final _scaffoldKey = GlobalKey<ScaffoldState>();
  String _title;

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(
          title: Text(
            widget.title ?? _title ?? Uri.parse(widget.atomFeedUrl).host,
          ),
        ),
        body: SmartRefresher(
          child: ListView.builder(
            itemBuilder: _itemBuilder,
            itemCount: _entries.length,
          ),
          controller: _refreshController,
          enablePullDown: true,
          enablePullUp: _fetchCount == 0 || _nextUrl != null,
          onRefresh: () => _fetchNext(widget.atomFeedUrl, clearEntries: true)
              .then((_) => _refreshController.refreshCompleted()),
          onLoading: () => _fetchNext(_nextUrl)
              .then((_) => _refreshController.loadComplete()),
        ),
        key: _scaffoldKey,
      );

  Future<void> _fetchNext(String url, {bool clearEntries = false}) async {
    _fetchCount++;
    debugPrint("[_fetchNext#$_fetchCount] fetching $url");

    http.Response resp;
    try {
      resp = await http.get(url);
    } catch (e) {
      debugPrint("[_fetchNext#$_fetchCount] http exception: $e");
      return _showSnackbar(e);
    }

    AtomFeed atomFeed;
    debugPrint("[_fetchNext#$_fetchCount] parsing $url");
    try {
      atomFeed = AtomFeed.parse(resp.body);
    } catch (e) {
      debugPrint("[_fetchNext#$_fetchCount] parser exception: $e");
      return _showSnackbar(e);
    }

    if (!mounted) return;
    setState(() {
      _nextUrl = null;
      for (final link in atomFeed.links) {
        if (link.rel == 'next') _nextUrl = link.href;
      }
      debugPrint("[_fetchNext#$_fetchCount] _nextUrl=$_nextUrl");

      _title = atomFeed.title;

      if (_nextUrl != null) {
        // workaround for blogspot feed url having duplicated category paths
        final regExp = new RegExp(r'posts/default((/-/[^/]+){2,})\?');
        final m = regExp.firstMatch(_nextUrl);
        if (m != null) {
          _nextUrl = _nextUrl.replaceFirst(m[1], m[2]);
          debugPrint("[_fetchNext#$_fetchCount] _nextUrl=$_nextUrl");
        }
      }

      if (clearEntries) _entries.clear();
      _entries.addAll(atomFeed.items);
      debugPrint("[_fetchNext#$_fetchCount] _entries=${_entries.length}");
    });
  }

  Widget _itemBuilder(BuildContext context, int index) {
    final entry = _entries[index];

    final updated = DateTime.tryParse(entry.updated);
    final updatedTimeago = updated != null ? timeago.format(updated) : null;

    return Card(
      child: ListTile(
        leading: entry.media.thumbnails.isNotEmpty
            ? __buildThumbnail(entry.media.thumbnails.first)
            : null,
        title: Text(entry.title),
        subtitle: updatedTimeago != null ? Text(updatedTimeago) : null,
        onTap: () => Navigator.of(context)
            .push(MaterialPageRoute(builder: (_) => BlogspotEntry(entry))),
      ),
    );
  }

  void _showSnackbar(Exception e) => _scaffoldKey.currentState
      .showSnackBar(SnackBar(content: Text(e.toString())));

  Widget __buildThumbnail(Thumbnail thumbnail) => CachedNetworkImage(
        height: double.tryParse(thumbnail.height),
        imageUrl: thumbnail.url,
        width: double.tryParse(thumbnail.width),
      );
}
