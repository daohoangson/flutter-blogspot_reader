part of 'home.dart';

class _HomeList extends StatelessWidget {
  @override
  Widget build(BuildContext context) => FutureBuilder(
        future: getFirebaseUserId(),
        builder: __buildUser,
      );

  Widget __buildList(BuildContext context, AsyncSnapshot<List<Site>> ss) {
    if (ss.hasError) return Text("Firestore error: ${ss.error}");
    if (!ss.hasData) return Text('Loading sites...');

    return ListView(
      children: ss.data
          .map((site) => ListTile(
              title: Text(site.title),
              subtitle: Text(site.domain),
              leading: Icon(
                site.isGrid ? Icons.grid_on : Icons.list,
                size: Theme.of(context).textTheme.title.fontSize * 2,
              ),
              onTap: () => Navigator.of(context).push(MaterialPageRoute(
                  builder: (_) => BlogspotFeed(
                        "https://${site.domain}/feeds/posts/default",
                        site: site,
                        title: site.title,
                      )))))
          .toList(),
    );
  }

  Widget __buildUser(BuildContext _, AsyncSnapshot<String> ss) {
    if (ss.hasError) return Text("Sign-in error: ${ss.error}");
    if (!ss.hasData) return Text('Signing in anonymously...');

    return StreamBuilder<List<Site>>(
      stream: getUserSites(ss.data),
      builder: __buildList,
    );
  }
}
