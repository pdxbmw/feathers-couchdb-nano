import { expect } from 'chai';
import { createServer } from 'mock-couch';
import { DOC_NAME, DB_NAME, DB_URI, DB_PORT } from './constants';
import feathers from 'feathers';
import nano from 'nano';
import plugin from '../src';
import msgs from '../src/msgs';
import server from './test-app';

describe('feathers-couchdb-nano', () => {
  const app = feathers();
  const cxn = nano(DB_URI);

  let db;

  before(() => {
    let couchdb = createServer();

    couchdb.listen(DB_PORT);
    couchdb.addDB(DB_NAME, [
      {
        _id: '1',
        firstName: 'one name',
        lastName: 'one lastname',
        '$type': DOC_NAME
      },
      {
        _id: '2',
        firstName: 'second name',
        lastName: 'second lastname',
        '$type': DOC_NAME
      }
    ]);

    return new Promise((resolve) => {
      cxn.db.create(DB_NAME, () => {
        db = cxn.use(DB_NAME);
        app.service(DOC_NAME, plugin({ db: db, name: DOC_NAME }));

        resolve();
      });
    });
  });

  after(() => {
    cxn.db.destroy(DB_NAME);
  });

  it('is CommonJS compatible', () => {
    expect(typeof require('../lib')).to.equal('function');
  });

  describe('initialization', () => {
    describe('when missing options.db', () => {
      it('throws an error', () => {
        expect(plugin.bind(null)).to.throw(msgs.DB_REQUIRED);
      });
    });

    describe('when missing options.name', () => {
      it('throws an error', () => {
        expect(plugin.bind(null, { db: db })).to.throw(msgs.NAME_REQUIRED);
      });
    });

    describe('when missing options.id', () => {
      it('sets the default to _id', () => {
        expect(plugin({ db: db, name: 'tests' }).id).to.equal('_id');
      });
    });

    describe('when missing options.paginate', () => {
      it('sets the default to an empty object', () => {
        expect(plugin({ db: db, name: DOC_NAME }).paginate).to.deep.equal({});
      });
    });

    describe('when missing options.events', () => {
      it('sets the default to an empty array', () => {
        expect(plugin({ db: db, name: DOC_NAME }).events).to.deep.equal([]);
      });
    });

    describe('when options.db provided', () => {
      it('should be equal to db', () => {
        expect(plugin({ db: db, name: DOC_NAME }).db).to.deep.equal(db);
      });
    });

    describe('when options.name provided', () => {
      it('should be equal to DOC_NAME', () => {
        expect(plugin({ db: db, name: DOC_NAME }).name).to.equal(DOC_NAME);
      });
    });
  });

  describe('example CouchDB service app', () => {
    before(() => server);

    after(done => {
      server.then(s => s.close(() => done()));
    });

    describe('finds all documents', () => {
      describe('when missing document design view params.query.q', () => {
        it('throws an error', () => {
          const svc = app.service(DOC_NAME);
          expect(svc.find.bind(svc)).to.throw(msgs.VIEW_REQUIRED);
        });
      });
    });
  });
});
