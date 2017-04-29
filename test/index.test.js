import { expect } from 'chai';
import { createServer } from 'mock-couch';
import { DOC_NAME, DB_NAME, DB_URI, DB_PORT } from './constants';
import { omit, pick } from 'lodash';
import feathers from 'feathers';
import nano from 'nano';
import plugin from '../src';
import * as msgs from '../src/msgs';
import server from './test-app';

describe('feathers-couchdb-nano', () => {
  const app = feathers();
  const cxn = nano(DB_URI);

  let options = { connection: cxn, db: DB_NAME, name: DOC_NAME, id: 'foo' };
  let db;

  before(() => {
    let couchdb = createServer();

    couchdb.listen(DB_PORT);
    couchdb.addDB(DB_NAME, [
      {
        _id: '1',
        firstName: 'one name',
        lastName: 'one lastname'
      },
      {
        _id: '2',
        firstName: 'second name',
        lastName: 'second lastname'
      }
    ]);

    return new Promise((resolve) => {
      cxn.db.create(DB_NAME, () => {
        db = cxn.use(DB_NAME);
        app.service(DOC_NAME, plugin(options));
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
    describe('when missing options.connection', () => {
      it('throws an error', () => {
        expect(plugin.bind(null)).to.throw(msgs.NANO_INSTANCE_REQUIRED);
      });
    });

    describe('when missing options.db', () => {
      it('throws an error', () => {
        expect(plugin.bind(null, pick(options, 'connection'))).to.throw(msgs.DB_NAME_REQUIRED);
      });
    });

    describe('when missing options.name', () => {
      it('throws an error', () => {
        expect(plugin.bind(null, pick(options, ['connection', 'db']))).to.throw(msgs.DOC_NAME_REQUIRED);
      });
    });

    describe('when missing options.id', () => {
      it('sets the default to _id', () => {
        expect(plugin(omit(options, 'id')).idField).to.equal('_id');
      });
    });

    describe('when missing options.paginate', () => {
      it('sets the default to an empty object', () => {
        expect(plugin(options).paginate).to.deep.equal({});
      });
    });

    describe('when missing options.events', () => {
      it('sets the default to an empty array', () => {
        expect(plugin(options).events).to.deep.equal([]);
      });
    });

    describe('when missing options.includeDocs', () => {
      it('sets the default to false', () => {
        expect(plugin(options).includeDocs).to.equal(false);
      });
    });

    describe('when options.connection provided', () => {
      it('should be equal to nano', () => {
        expect(plugin(options).nano).to.deep.equal(cxn);
      });
    });

    describe('when options.db provided', () => {
      it('should be equal to db', () => {
        expect(plugin(options).db.config).to.deep.equal(db.config);
      });
    });

    describe('when options.name provided', () => {
      it(`should be equal to ${DOC_NAME}`, () => {
        expect(plugin(options).docType).to.equal(DOC_NAME);
      });
    });

    describe('when options.id provided', () => {
      it('should be equal to id', () => {
        expect(plugin(options).idField).to.equal(options.id);
      });
    });
  });

  describe('example CouchDB service app', () => {
    before(() => server);

    after(done => {
      server.then(s => s.close(() => done()));
    });

    describe('query all documents', () => {
      describe('without pagination', () => {
        it('returns an array of data', () => {
          return app.service(DOC_NAME).find().then(
            obj => expect(Array.isArray(obj)).to.equal(true)
          );
        });
      });

      describe('with pagination', () => {
        it('returns an array of data', () => {
          options.paginate = { default: 10 };
          app.service(DOC_NAME, plugin(options));
          return app.service(DOC_NAME).find().then(
            obj => expect(obj).to.have.all.keys(['data', 'limit', 'skip', 'total'])
          );
        });
      });
    });
  });
});
