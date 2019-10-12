const firebase = require("@firebase/testing");
const fs = require("fs");

const projectId = "blogspot-reader";
const rules = fs.readFileSync("firestore.rules", "utf8");

const _ = auth => firebase.initializeTestApp({ projectId, auth }).firestore();

beforeEach(() => firebase.clearFirestoreData({ projectId }));
before(() => firebase.loadFirestoreRules({ projectId, rules }));
after(() => Promise.all(firebase.apps().map(app => app.delete())));

describe("subscriptions", () => {
  it("shouldn't accept write from guest", () =>
    firebase.assertFails(
      _(null)
        .collection("subscriptions")
        .doc("xxx")
        .set({ foo: "bar" })
    ));

  it("shouldn't accept write from user", () =>
    firebase.assertFails(
      _({ uid: "user" })
        .collection("subscriptions")
        .doc("xxx")
        .set({ foo: "bar" })
    ));

  it("shouldn't accept read from guest", () =>
    firebase.assertFails(
      _(null)
        .collection("subscriptions")
        .doc("xxx")
        .get()
    ));

  it("shouldn't accept read from user", () =>
    firebase.assertFails(
      _({ uid: "user" })
        .collection("subscriptions")
        .doc("xxx")
        .get()
    ));
});
