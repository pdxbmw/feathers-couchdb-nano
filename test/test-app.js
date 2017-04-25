import feathers from 'feathers';
import rest from 'feathers-rest';
import errorHandler from 'feathers-errors/handler';
import bodyParser from 'body-parser';
import nano from 'nano';
import plugin from '../src';

export default new Promise(function (resolve) {
  const cxn = nano('http://localhost:5984');

  const callback = function () {
    const options = {
      db: cxn.use('test'),
      name: 'tests',
      paginate: {
        default: 10,
        max: 25
      }
    };

    const app = feathers()
      .configure(rest())
      .use(bodyParser.json())
      .use(bodyParser.urlencoded({ extended: true }))
      .use(options.name, plugin(options))
      .use(errorHandler());

    const server = app.listen(3007);

    server.on('listening', function () {
      console.log('Feathers CouchDB Nano service running on 127.0.0.1:3007');

      resolve(server);
    });
  };

  cxn.db.create('test', callback);
});
