import Proto from 'uberproto';
import errors from 'feathers-errors';
import filter from 'feathers-query-filters';
import * as msgs from './msgs';
import * as utils from './utils';

// import makeDebug from 'debug';
// const debug = makeDebug('feathers-couchdb-nano');

const DEFAULT_LIMIT = 100;
const DEFAULT_SKIP = 0;
const TYPE_KEY = '$type';

class Service {
  constructor (options = {}) {
    if (!options.db || !options.db.insert) {
      throw new Error(msgs.DB_REQUIRED);
    }

    if (!options.name) {
      throw new Error(msgs.NAME_REQUIRED);
    }

    this.db = options.db;
    this.name = options.name.toString().toLowerCase();
    this.events = options.events || [];
    this.id = options.id || '_id';
    this.paginate = options.paginate || {};
  }

  extend (obj) {
    return Proto.extend(obj, this);
  }

  _find (params, getFilter = filter) {
    const db = this.db;
    const { filters, query } = getFilter(params.query || {});
    const [design, view] = this._getDesignView(query.q);
    const options = {
      limit: filters.$limit || (query.paginate || {}).default || DEFAULT_LIMIT,
      skip: filters.$skip || DEFAULT_SKIP
    };

    if (!design || !view) {
      throw new Error(msgs.VIEW_REQUIRED);
    }

    return new Promise((resolve, reject) => {
      return db.view(design, view, options, (err, body) => {
        const rows = body.rows;
        const n = rows.length;
        let data = [];

        if (err) {
          return reject(err);
        }

        for (let i = 0; i < n; i++) {
          const item = rows[i].key;
          const sel = filters.$select;
          let j = sel && Array.isArray(sel) && sel.length;
          let tmp = {};

          // Filtered select query.
          if (j && j.length > 0) {
            while (j--) {
              tmp[sel[j]] = rows[i][sel[j]];
            }
          } else {
            tmp = Object.assign(tmp, item);
          }

          data[i] = this._formatForFeathers(tmp);
        }

        resolve({
          data,
          /* jshint camelcase: false */
          total: body.total_rows,
          skip: body.offset,
          limit: options.limit
        });
      });
    });
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

  _get (id, params) {
    const db = this.db;

    return new Promise((resolve, reject) => {
      return db.get(id, (err, body) => {
        let data = Object.assign({}, body);

        if (err) {
          return reject(err);
        }

        resolve(data);
      });
    });
  }

  get (id, params) {
    return this._get(id)
      .then(this._formatForFeathers)
      .catch(utils.errorHandler);
  }

  _insert (data) {
    const db = this.db;

    return new Promise((resolve, reject) => {
      return db.insert(this._formatForCouch(data), (err, body) => {
        if (err) {
          return reject(err);
        }

        resolve(body);
      });
    });
  }

  create (data, params) {
    return this._insert(data)
      .catch(utils.errorHandler);
  }

  update (id, data, params) {
    if (!Array.isArray(data)) {
      return Promise.reject(new errors.BadRequest(msgs.UPDATE_ARRAY_REQUIRED));
    }
  }

  patch (id, data, params) {
    if (!data._rev || !data[this.id]) {
      return Promise.reject(new errors.BadRequest(msgs.ID_OR_REV_REQUIRED));
    }

    return this._insert(data)
      .catch(utils.errorHandler);
  }

  _remove (data, params) {
    const db = this.db;
    const id = data._id;
    const rev = data._rev;

    if (!id || !rev) {
      return Promise.reject(new errors.BadRequest(msgs.ID_OR_REV_REQUIRED));
    }

    return new Promise((resolve, reject) => {
      return db.destroy(id, rev, (err, body) => {
        if (err) {
          return reject(err);
        }

        resolve(body);
      });
    });
  }

  remove (id, params) {
    return this._get(id)
      .then(this._remove)
      .catch(utils.errorHandler);
  }

  setup (app, path) {}

  /// //////////////////
  // Helpers

  _getDesignView (q) {
    const parts = q && q.split('/');
    const len = parts && parts.length;

    return [
      len > 0 && parts[0],
      len > 1 && parts[1]
    ];
  }

  _formatForFeathers (obj) {
    const id = obj._id;

    delete obj.id;
    delete obj._id;
    delete obj[TYPE_KEY];

    obj[this.id] = id;

    return obj;
  }

  _formatForCouch (obj) {
    const id = obj[this.id];

    delete obj.id;

    obj[TYPE_KEY] = this.name;
    obj._id = id;

    return obj;
  }
}

export default function init (options) {
  return new Service(options);
}

init.Service = Service;
