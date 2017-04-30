import errors from 'feathers-errors';
import * as msgs from './msgs';

// https://github.com/feathersjs/feathers-errors
export function errorHandler (error) {
  switch (error.name) {
    case 'CouchError':
      if (error.code === 404 || error.headers.status === 404) {
        error = new errors.NotFound(error);
      } else {
        error = new errors.GeneralError(error);
      }
      break;
  }

  throw error;
}

export function getViewFromQuery (q) {
  const parts = q && q.split('/');
  const len = parts && parts.length;

  return [len > 0 && parts[0], len > 1 && parts[1]];
}

export function checkEditable (o, id = o.id || o._id) {
  const rev = o._rev;

  return new Promise((resolve, reject) => {
    if (!id) {
      return reject(new errors.BadRequest(msgs.DOC_ID_REQUIRED));
    }

    if (!rev) {
      return reject(new errors.BadRequest(msgs.DOC_REV_REQUIRED));
    }

    return resolve({ o, id, rev });
  });
}

export function isPlainObject (o) {
  return typeof o === 'object' && o.constructor === Object;
}
