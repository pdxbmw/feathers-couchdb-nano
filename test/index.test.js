import { expect } from 'chai';
import { createServer } from 'mock-couch';
import nano from 'nano';
import plugin from '../src';
import server from './test-app';

const DB_NAME = 'testdb';
const DB_PORT = 5985;

describe('feathers-couchdb-nano', () => {
  const cxn = nano('http://localhost:${DB_PORT}');
  let db;

  before(() => {
    let couchdb = createServer();

    couchdb.listen(DB_PORT);
    couchdb.addDB(DB_NAME, [
      {
        _id: '1',
        firstName: 'one name',
        lastName: 'one lastname',
        '$type': 'patients'
      },
      {
        _id: '2',
        firstName: 'second name',
        lastName: 'second lastname',
        '$type': 'patients'
      }
    ]);

    return new Promise((resolve) => {
      cxn.db.create(DB_NAME, () => {
        db = cxn.use(DB_NAME);
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
        expect(plugin.bind(null)).to.throw('You must provide an Apache CouchDB Nano database');
      });
    });

    describe('when missing options.name', () => {
      it('throws an error', () => {
        expect(plugin.bind(null, { db: db })).to.throw('You must provide a CouchDB document type name');
      });
    });

    describe('when missing options.id', () => {
      it('sets the default to _id', () => {
        expect(plugin({ db: db, name: 'tests' }).id).to.equal('_id');
      });
    });

    describe('when missing options.paginate', () => {
      it('sets the default to an empty object', () => {
        expect(plugin({ db: db, name: 'tests' }).paginate).to.deep.equal({});
      });
    });

    describe('when missing options.events', () => {
      it('sets the default to an empty array', () => {
        expect(plugin({ db: db, name: 'tests' }).events).to.deep.equal([]);
      });
    });
  });

  describe('CouchDB plugin test app', () => {
    before(() => server);
  });
});
