import Proto from 'uberproto';
import errors from 'feathers-errors';
import filter from 'feathers-query-filters';
import * as msgs from './msgs';
import * as utils from './utils';

// import makeDebug from 'debug';
// const debug = makeDebug('feathers-couchdb-nano');

const DEFAULT_LIMIT = 100;
const DEFAULT_SKIP = 0;

class Service {
  constructor ({ connection, db, name, id = '_id', paginate = {}, events = [], includeDocs = false } = {}) {
    if (!connection || !connection.use) {
      throw new Error(msgs.NANO_INSTANCE_REQUIRED);
    }

    if (!db) {
      throw new Error(msgs.DB_NAME_REQUIRED);
    }

    if (!name) {
      throw new Error(msgs.DOC_NAME_REQUIRED);
    }

    this.nano = connection;
    this.db = this.nano.use(db);
    this.events = events;
    this.paginate = paginate;
    this.docType = name.toString().toLowerCase();
    this.idField = id;
    this.includeDocs = !!(includeDocs);
  }

  extend (obj) {
    return Proto.extend(obj, this);
  }

  find (params = {}) {
    const paginate = params.paginate || this.paginate;
    const result = this._find(params, where => filter(where, paginate));

    return result
      .then(page => {
        if (paginate.default) {
          return page;
        }

        return page.data;
      })
      .catch(utils.errorHandler);
  }

  get (id, params) {
    return this._get(id)
      .then(data => this._toFeathersFormat(data))
      .catch(utils.errorHandler);
  }

  create (data, params) {
    return this._getUuid()
      .then(uuid => this._addDocId(data, uuid))
      .then(data => this._insert(this._toCouchFormat(data)))
      .catch(utils.errorHandler);
  }

  patch (id, data, params) {
    const rev = data._rev;

    if (!id) {
      return Promise.reject(new errors.BadRequest(msgs.DOC_ID_REQUIRED));
    }

    if (!rev) {
      return Promise.reject(new errors.BadRequest(msgs.DOC_REV_REQUIRED));
    }

    return this._insert(this._toCouchFormat(data))
      .catch(utils.errorHandler);
  }

  update (id, data, params) {
    if (!Array.isArray(data)) {
      return Promise.reject(new errors.BadRequest(msgs.UPDATE_ARRAY_REQUIRED));
    }
  }

  remove (id, params) {
    return this._get(id)
      .then(data => this._remove(data))
      .catch(utils.errorHandler);
  }

  setup (app, path) {}

  /// //////////////////
  // Internal methods

  _find (params, getFilter = filter) {
    const { filters, query } = getFilter(params.query || {});
    const [design, view] = utils.getViewFromQuery(query.q);

    const options = {
      include_docs: query.include_docs || this.includeDocs,
      limit: filters.$limit || (query.paginate || {}).default || DEFAULT_LIMIT,
      skip: filters.$skip || DEFAULT_SKIP
    };

    return new Promise((resolve, reject) => {
      const callback = (err, body) => {
        const rows = body && body.rows;
        let data = [];

        if (err) {
          return reject(err);
        }

        for (let i = 0, n = rows.length; i < n; i++) {
          data[i] = this._toFeathersFormat(rows[i]);
        }

        resolve({
          data,
          limit: options.limit,
          skip: body.offset,
          total: data.length
        });
      };

      // Use design doc.
      if (design && view) {
        return this.db.view(design, view, options, callback);
      }

      options.startkey = this.docType;

      return this.db.list(options, callback);
    });
  }

  _get (id, params) {
    return new Promise((resolve, reject) => {
      return this.db.get(id, (err, body) => {
        if (err) {
          return reject(err);
        }

        resolve(body);
      });
    });
  }

  _insert (data) {
    return new Promise((resolve, reject) => {
      return this.db.insert(data, (err, body) => {
        if (err) {
          return reject(err);
        }

        resolve(body);
      });
    });
  }

  _remove (data, params) {
    const id = data._id;
    const rev = data._rev;

    return new Promise((resolve, reject) => {
      if (!id) {
        return reject(new errors.BadRequest(msgs.DOC_ID_REQUIRED));
      }

      if (!rev) {
        return reject(new errors.BadRequest(msgs.DOC_REV_REQUIRED));
      }

      return this.db.destroy(id, rev, (err, body) => {
        if (err) {
          return reject(err);
        }

        resolve(body);
      });
    });
  }

  /// //////////////////
  // Instance helpers

  // Construct doc id for doc filtering and type determination.
  _addDocId (data, uuid) {
    data._id = `${this.docType}-${uuid}`;

    return Promise.resolve(data);
  }

  // Generate and return single doc uuid.
  _getUuid () {
    return Promise.resolve(this._uuids().then(ids => ids[0]));
  }

  // Format data for Feathers.
  _toFeathersFormat (item) {
    const obj = item.doc || item.value || (utils.isPlainObject(item.key) && item.key) || item;
    let data = Object.assign({}, obj.data || obj);

    data._rev = obj._rev;
    data[this.idField] = item._id || item.id;

    return data;
  }

  // Format data for CouchDB.
  _toCouchFormat (item) {
    const id = item[this.idField] || item._id || item.id;
    let data = Object.assign({}, item);

    delete data.id;
    delete data._id;

    return { data, _id: id, _rev: item._rev };
  }

  // Get one or more CouchDB uuids.
  //
  // Note: Included in future versions nano library.
  // https://github.com/apache/couchdb-nano/blob/master/lib/nano.js#L366
  _uuids (count = 1) {
    const nano = this.nano;

    return new Promise((resolve, reject) => {
      const callback = (err, body) => {
        if (err) {
          return reject(err);
        }

        resolve(body.uuids);
      };

      nano.relax({
        method: 'GET',
        path: '_uuids',
        qs: { count: count }
      }, callback);
    });
  }
}

export default function init (options) {
  return new Service(options);
}

init.Service = Service;
