// including libraries
var http   = require('http');
var static = require('node-static');
var app    = http.createServer(handler);
var io     = require('socket.io').listen(app);
var mysql  = require('mysql');

// Create a connection to MySQL db
var connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'geolocation'
});
// MySQL database server disconnect handler
handleDisconnect(connection);
// Connect to the MySQL database
connection.connect(function(err) {
    console.log('Connected to MySQL');
});

// define port
var port = 8080;

// make html, js & css files accessible
var files = new static.Server('./public');

// serve files on request
function handler(request, response) {
    request.addListener('end', function() {
        files.serve(request, response);
    });
}

// Reestablish MySQL connection on server disconnects
function handleDisconnect(connection) {
  connection.on('error', function(err) {
    if (!err.fatal) {
      return;
    }

    if (err.code !== 'PROTOCOL_CONNECTION_LOST') {
      throw err;
    }

    console.log('Re-connecting lost connection: ' + err.stack);

    connection = mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'geolocation'
    });

    handleDisconnect(connection);
    connection.connect(function(err) {
        console.log('Connected to MySQL');
    });
  });
}

// listen for incoming connections from client
io.sockets.on('connection', function (socket) {

  // start listening for coords
  socket.on('send:coords', function (data) {
    var input = {
        timestamp: data.timestamp,
        latitude: data.coords[0].lat,
        longitude: data.coords[0].lng,
        altitude: data.coords[0].alt,
        json: JSON.stringify(data)
    };

    var query = connection.query('INSERT INTO geodata SET ?', input, function(err, result) {
        if (err) throw err;
        // Log insert query
        console.log(query.sql);
        // Log id of an inserted row
        console.log('ID of Inserted Row: ' + result.insertId);
    });
    // broadcast your coordinates to everyone except you
    socket.broadcast.emit('load:coords', data);
  });
});

// starts app on specified port
app.listen(port);
console.log('Your server goes on localhost:' + port);
