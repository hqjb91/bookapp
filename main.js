// Load the libraries
const express = require('express');
const hbs = require('express-handlebars');
const mysql = require('mysql2/promise');
require('dotenv').config();
const morgan = require('morgan');
const fetch = require('node-fetch');
const withQuery = require('with-query').default;

// Global variables
const inputChars = [{value: "A", newRow: true}, {value: "B"}, {value: "C"}, {value: "D"}, {value: "E", endRow: true}, 
{value: "F", newRow: true}, {value: "G"}, {value: "H"}, {value: "I"}, {value: "J", endRow: true},
{value: "K", newRow: true}, {value: "L"}, {value: "M"}, {value: "N"}, {value: "O", endRow: true}, 
{value: "P", newRow: true}, {value: "Q"}, {value: "R"}, {value: "S"}, {value: "T", endRow: true},
{value: "U", newRow: true}, {value: "V"}, {value: "W"}, {value: "X"}, {value: "Y", endRow: true},
{value: "Z", newRow: true, endRow: true}, 
{value: 0, newRow: true}, {value: 1}, {value: 2}, {value: 3}, {value: 4, endRow: true}, 
{value: 5, newRow: true}, {value: 6}, {value: 7}, {value: 8}, {value: 9, endRow: true}];

// SQL
SQL_GET_BOOKLIST_FROM_CHAR = "select book_id, title from book2018 where title like ? limit ? offset ?";
SQL_GET_BOOKLIST_LENGTH_FROM_CHAR = "select count(*) from book2018 where title like ?";

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

// Create express instance
const app = express();

// Configure handlebars
app.engine('hbs', hbs({defaultLayout:'default.hbs'}));
app.set('view engine', 'hbs');

// Load morgan middleware for logging
//app.use(morgan('combined'));

// Configure the application

// Configure landing page
app.get('/', (req, res) => {
    res.status(200);
    res.type('text/html');
    res.render('index', {inputChars});
});

// Configure the master list
app.post('/master', express.urlencoded({extended: true}), async (req, res) => {

    const charQuery = req.body.charQuery + '%';
    const limit = 10;
    const offset = 0;
    const conn = await pool.getConnection();
    console.log(req.body.charQuery);

    try {
        const listResponse = await conn.query(SQL_GET_BOOKLIST_FROM_CHAR, [charQuery, limit, offset]);
        const listResults = listResponse[0];

        const lengthResponse = await conn.query(SQL_GET_BOOKLIST_LENGTH_FROM_CHAR, [charQuery]);
        const lengthResults = lengthResponse[0];
        console.log(lengthResults);

        res.status(200);
        res.type('text/html');
        res.render('master', { charQuery: req.body.charQuery , listResults, lengthResults });
    } catch (e) {
        res.status(500);
        res.type('text/html');
        res.send(JSON.stringify(e));
    } finally {
        conn.release();
    }
});

// Configure 404 page
app.use((req, res) => {
    res.status(404);
    res.type('text/html');
    res.render('404');
});

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