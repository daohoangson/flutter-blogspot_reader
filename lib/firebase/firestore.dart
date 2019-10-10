part of 'firebase.dart';

const _kFirestoreUsers = 'users';
const _kFirestoreUsersSites = 'sites';
const _kFirestoreUsersSitesDomain = 'domain';
const _kFirestoreUsersSitesLayout = 'layout';
const _kFirestoreUsersSitesLayoutGrid = 'grid';
const _kFirestoreUsersSitesViewDateFirst = 'first_view_date';
const _kFirestoreUsersSitesViewDateLast = 'last_view_date';
const _kFirestoreUsersSitesTitle = 'title';

Stream<List<Site>> getUserSites(String uid) => Firestore.instance
        .collection(_kFirestoreUsers)
        .document(uid)
        .collection(_kFirestoreUsersSites)
        .orderBy(_kFirestoreUsersSitesViewDateLast, descending: true)
        .limit(20)
        .snapshots()
        .transform(
      StreamTransformer.fromHandlers(
        handleData: (qs, sink) {
          final sites = List<Site>(qs.documents.length);

          int i = 0;
          for (final doc in qs.documents) {
            sites[i] = Site._(uid, doc.documentID, doc.data);
            i++;
          }

          sink.add(sites);
        },
      ),
    );

Future<Site> getUserSiteByDomain(String uid, String domain) async {
  final ss = await Firestore.instance
      .collection(_kFirestoreUsers)
      .document(uid)
      .collection(_kFirestoreUsersSites)
      .where(_kFirestoreUsersSitesDomain, isEqualTo: domain)
      .getDocuments();
  if (ss.documents.length < 1) return null;
  final doc = ss.documents.first;
  return Site._(uid, doc.documentID, doc.data);
}

class Site {
  Map<String, dynamic> _data;
  String _id;
  final String _uid;

  Site._(this._uid, this._id, this._data);

  Site({
    String domain,
    String title,
    String uid,
  })  : assert(domain != null),
        assert(title != null),
        assert(uid != null),
        _data = Map.unmodifiable({
          _kFirestoreUsersSitesDomain: domain,
          _kFirestoreUsersSitesTitle: title,
        }),
        _id = null,
        _uid = uid;

  String get domain => _getString(_kFirestoreUsersSitesDomain);

  bool get isGrid =>
      _getString(_kFirestoreUsersSitesLayout) ==
      _kFirestoreUsersSitesLayoutGrid;

  String get title => _getString(_kFirestoreUsersSitesTitle);

  void markAsViewed() async {
    final sitesRef = Firestore.instance
        .collection(_kFirestoreUsers)
        .document(_uid)
        .collection(_kFirestoreUsersSites);

    if (_id != null) {
      await sitesRef.document(_id).updateData(
          {_kFirestoreUsersSitesViewDateLast: FieldValue.serverTimestamp()});
      debugPrint("Site#$_id: marked as viewed");
      return;
    }

    _data = Map<String, dynamic>.from(_data);
    _data[_kFirestoreUsersSitesViewDateFirst] = FieldValue.serverTimestamp();
    _data[_kFirestoreUsersSitesViewDateLast] = FieldValue.serverTimestamp();
    final docRef = sitesRef.document();

    await docRef.setData(_data);
    _id = docRef.documentID;
    debugPrint("Site#$_id: created");
  }

  void setGrid(bool grid) async {
    if (_id == null) return;

    _data = Map<String, dynamic>.from(_data);
    _data[_kFirestoreUsersSitesLayout] =
        grid ? _kFirestoreUsersSitesLayoutGrid : '';

    await Firestore.instance
        .collection(_kFirestoreUsers)
        .document(_uid)
        .collection(_kFirestoreUsersSites)
        .document(_id)
        .updateData(
            {_kFirestoreUsersSitesLayout: _data[_kFirestoreUsersSitesLayout]});
    debugPrint(
        "Site#$_id: $_kFirestoreUsersSitesLayout=${_data[_kFirestoreUsersSitesLayout]}");
  }

  String _getString(String key) {
    if (!_data.containsKey(key)) return null;
    final value = _data[key];
    if (!(value is String)) return null;
    return value;
  }
}
