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
