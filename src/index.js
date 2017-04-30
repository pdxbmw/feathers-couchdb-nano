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
  constructor ({ connection, db, name, id = '_id', paginate = {}, events = [] } = {}) {
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

  // Private methods

  _dbCmd (method, ...args) {
    return new Promise((resolve, reject) => {
      return this.db[method](...args, (err, body) => {
        if (err) {
          return reject(err);
        }

        resolve(body);
      });
    });
  }

  _find (params, getFilter = filter) {
    const { filters, query } = getFilter(params.query || {});
    const [design, view] = utils.getViewFromQuery(query.q);

    const options = {
      ...query,
      limit: filters.$limit || (query.paginate || {}).default || DEFAULT_LIMIT,
      skip: filters.$skip || DEFAULT_SKIP
    };

    const paginate = (result) => {
      const rows = result.rows;
      let data = [];

      for (let item of rows) {
        data.push(this._toFeathersFormat(item));
      }

      return Promise.resolve({
        data,
        limit: options.limit,
        skip: result.offset,
        total: data.length
      });
    };

    let result;

    // Use design doc.
    if (design && view) {
      result = this._dbCmd('view', design, view, options);
    } else {
      result = this._dbCmd('list', { ...options, startkey: this.docType });
    }

    return result.then(paginate);
  }

  _get (id, params) {
    return this._dbCmd('get', id);
  }

  _insert (data) {
    return this._dbCmd('insert', data);
  }

  _remove (data, params) {
    const id = data._id;
    const rev = data._rev;

    if (!id) {
      return Promise.reject(new errors.BadRequest(msgs.DOC_ID_REQUIRED));
    }

    if (!rev) {
      return Promise.reject(new errors.BadRequest(msgs.DOC_REV_REQUIRED));
    }

    return this._dbCmd('destroy', id, rev);
  }

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
