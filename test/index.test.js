import { expect } from 'chai';
import nano from 'nano';
import plugin from '../src';
import server from './test-app';

describe('feathers-couchdb-nano', () => {
  const cxn = nano('http://localhost:5984');
  let db;

  before(() => {
    return new Promise((resolve) => {
      const callback = () => {
        db = cxn.use('test');
        resolve();
      };

      cxn.db.create('test', callback);
    });
  });

  after(() => {
    cxn.db.destroy('test');
  });

  it('is CommonJS compatible', () => {
    expect(typeof require('../lib')).to.equal('function');
  });

  describe('Initialization', () => {
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

    describe('CouchDB plugin example test', () => {
      before(() => server);
    });
  });
});
