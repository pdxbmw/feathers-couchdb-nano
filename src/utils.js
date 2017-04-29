import errors from 'feathers-errors';

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

export function isPlainObject (o) {
  return typeof o == 'object' && o.constructor == Object;
}