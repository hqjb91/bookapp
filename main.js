// Load the libraries
const express = require('express');
const hbs = require('express-handlebars');
const mysql = require('mysql2/promise');
require('dotenv').config();
const morgan = require('morgan');

// Configure port
const PORT = parseInt(process.argv[2]) || parseInt(process.env.PORT) || 3000;

// Create connection pool
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    database: process.env.DB_NAME || 'goodreads',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    connectionLimit: 4,
    timezone: '+08:00'
});

// Import in the router
const router = require('./routes/route')(pool);

// Create express instance
const app = express();

// Configure handlebars
app.engine('hbs', hbs({defaultLayout:'default.hbs'}));
app.set('view engine', 'hbs');

// Load morgan middleware for logging
//app.use(morgan('combined'));

// Configure the application

    // Load static files
    app.use(express.static(__dirname + '/public'));

    // Load router
    app.use('/', router);

// Start the server and ping database to test
pool.getConnection()
    .then(conn => {
        console.log('Pinging database...');
        const p1 = Promise.resolve(conn);
        const p2 = conn.ping();
        return Promise.all([ p1, p2 ]);
    })
    .then(( results ) => { //results is an array of p1 and p2
        const conn = results[0];
        conn.release();
        app.listen(PORT, () => {
            console.log(`Server has started on port ${PORT} at ${new Date()}.`);
        });
    })
    .catch(e => console.log(e));