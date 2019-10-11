import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:pull_to_refresh/pull_to_refresh.dart';
import 'package:timeago/timeago.dart' as timeago;
import 'package:webfeed/webfeed.dart';
import 'package:webfeed/domain/media/thumbnail.dart';

import 'package:blogspot_reader/blogspot/entry.dart';
import 'package:blogspot_reader/firebase/firebase.dart';

class BlogspotFeed extends StatefulWidget {
  final String atomFeedUrl;
  final String domain;
  final Site site;
  final String title;

  BlogspotFeed(
    this.atomFeedUrl, {
    this.domain,
    this.site,
    this.title,
  }) : assert(atomFeedUrl != null);

  @override
  State<StatefulWidget> createState() => _BlogspotFeedState();
}

class _BlogspotFeedState extends State<BlogspotFeed> {
  String _atomFeedUrlCanonical;
  final _entries = <AtomItem>[];
  bool _firestoreSaved = false;
  bool _gridView = false;
  double _gridMaxCrossAxisExtent = 200;
  double _gridSpacing = 5;
  String _nextUrl;
  static int _fetchCount = 0;
  RefreshController _refreshController =
      RefreshController(initialRefresh: true);
  final _scaffoldKey = GlobalKey<ScaffoldState>();
  Site _site;
  String _title;

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(
          title: Text(
            widget.title ?? _title ?? Uri.parse(widget.atomFeedUrl).host,
          ),
          actions: <Widget>[
            _atomFeedUrlCanonical != null
                ? SubscribeButton(
                    hubTopic: _atomFeedUrlCanonical,
                    icon: Icons.favorite,
                  )
                : SizedBox.shrink(),
            IconButton(
              icon: Icon(_gridView ? Icons.grid_off : Icons.grid_on),
              onPressed: () => setState(() {
                _gridView = !_gridView;
                _site?.setGrid(_gridView);
              }),
            ),
          ],
        ),
        body: SmartRefresher(
          child: _gridView
              ? GridView.builder(
                  gridDelegate: SliverGridDelegateWithMaxCrossAxisExtent(
                    mainAxisSpacing: _gridSpacing,
                    maxCrossAxisExtent: _gridMaxCrossAxisExtent,
                    crossAxisSpacing: _gridSpacing,
                  ),
                  itemBuilder: _itemBuilderForGrid,
                  itemCount: _entries.length,
                )
              : ListView.builder(
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
    final debugTag = "_fetchNext#$_fetchCount";
    debugPrint("[$debugTag] fetching $url");

    http.Response resp;
    try {
      resp = await http.get(url);
    } catch (e) {
      debugPrint("[$debugTag] http exception: $e");
      return _showSnackbar(e);
    }

    AtomFeed atomFeed;
    debugPrint("[$debugTag] parsing $url");
    try {
      atomFeed = AtomFeed.parse(resp.body);
    } catch (e) {
      debugPrint("[$debugTag] parser exception: $e");
      return _showSnackbar(e);
    }

    String altUrl, nextUrl;
    for (final link in atomFeed.links) {
      switch (link.rel) {
        case 'alternate':
          altUrl = link.href;
          break;
        case 'next':
          nextUrl = link.href;

          // workaround for blogspot feed url having duplicated category paths
          final regExp = new RegExp(r'posts/default((/-/[^/]+){2,})\?');
          final m = regExp.firstMatch(nextUrl);
          if (m != null) nextUrl = nextUrl.replaceFirst(m[1], m[2]);
          break;
      }
    }

    if (!_firestoreSaved) {
      _firestoreSaved = true;
      _firestoreSave(atomFeed);
    }

    if (!mounted) return;
    setState(() {
      // workaround to get canonical url for https://pubsubhubbub.appspot.com/
      if (altUrl != null && nextUrl != null) {
        final altUri = Uri.parse(altUrl);
        if (altUri.path == '/') {
          _atomFeedUrlCanonical = "https://${altUri.host}/feeds/posts/default";
        }
      }

      _nextUrl = nextUrl;
      _title = atomFeed.title;

      if (clearEntries) _entries.clear();
      _entries.addAll(atomFeed.items);
      debugPrint("[$debugTag] _entries=${_entries.length}");
    });
  }

  void _firestoreSave(AtomFeed atomFeed) async {
    final uid = await getFirebaseUserId();
    _site = widget.site ??
        (widget.domain != null
            ? (await getUserSiteByDomain(uid, widget.domain) ??
                Site(
                  domain: widget.domain,
                  title: atomFeed.title,
                  uid: uid,
                ))
            : null);
    _site?.markAsViewed();

    if (_site != null) setState(() => _gridView = _site.isGrid);
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

  Widget _itemBuilderForGrid(BuildContext context, int index) {
    final entry = _entries[index];

    final thumbnail = entry.media.thumbnails.isNotEmpty
        ? __buildThumbnailSquare(entry.media.thumbnails.first,
            _gridMaxCrossAxisExtent * MediaQuery.of(context).devicePixelRatio)
        : null;

    return GestureDetector(
      child: thumbnail ??
          Padding(
            padding: EdgeInsets.only(left: _gridSpacing),
            child: Text(
              entry.title,
              overflow: TextOverflow.fade,
              style: Theme.of(context).textTheme.title,
            ),
          ),
      onTap: () => Navigator.of(context)
          .push(MaterialPageRoute(builder: (_) => BlogspotEntry(entry))),
    );
  }

  void _showSnackbar(error) => _scaffoldKey.currentState
      ?.showSnackBar(SnackBar(content: Text("$error")));

  Widget __buildThumbnail(Thumbnail thumbnail) => CachedNetworkImage(
        height: double.tryParse(thumbnail.height),
        imageUrl: thumbnail.url,
        width: double.tryParse(thumbnail.width),
      );

  Widget __buildThumbnailSquare(Thumbnail thumbnail, num size) {
    final height = int.tryParse(thumbnail.height);
    final width = int.tryParse(thumbnail.width);
    if (height == null || width == null || height != width) return null;

    // workaround to generate thumbnail in specified size
    final sizeUrl = thumbnail.url.replaceAll(
      "s$height-c",
      "s${size.toInt()}-c",
    );
    if (sizeUrl == thumbnail.url) return null;

    return AspectRatio(
      aspectRatio: 1,
      child: CachedNetworkImage(imageUrl: sizeUrl),
    );
  }
}
