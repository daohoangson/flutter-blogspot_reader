const firebase = require("@firebase/rules-unit-testing");
const fs = require("fs");

const projectId = "blogspot-reader";
const rules = fs.readFileSync("firestore.rules", "utf8");

const _ = auth => firebase.initializeTestApp({ projectId, auth }).firestore();

beforeEach(() => firebase.clearFirestoreData({ projectId: projectId }));
before(() => firebase.loadFirestoreRules({ projectId: projectId, rules }));
after(() => Promise.all(firebase.apps().map(app => app.delete())));

describe("users", () => {
  describe("sites", () => {
    it("should accept write from user", () =>
      firebase.assertSucceeds(
        _({ uid: "1" })
          .collection("users/1/sites")
          .doc("xxx")
          .set({ foo: "bar" })
      ));

    it("shouldn't accept write from guest", () =>
      firebase.assertFails(
        _(null)
          .collection("users/1/sites")
          .doc("xxx")
          .set({ foo: "bar" })
      ));

    it("shouldn't accept write from other user", () =>
      firebase.assertFails(
        _({ uid: "other" })
          .collection("users/1/sites")
          .doc("xxx")
          .set({ foo: "bar" })
      ));

    it("should accept read from user", () =>
      firebase.assertSucceeds(
        _({ uid: "1" })
          .collection("users/1/sites")
          .doc("xxx")
          .get()
      ));

    it("shouldn't accept read from guest", () =>
      firebase.assertFails(
        _(null)
          .collection("users/1/sites")
          .doc("xxx")
          .get()
      ));

    it("shouldn't accept read from other user", () =>
      firebase.assertFails(
        _({ uid: "other" })
          .collection("users/1/sites")
          .doc("xxx")
          .get()
      ));
  });
});
