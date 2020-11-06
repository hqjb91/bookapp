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
SQL_GET_BOOKLIST_LENGTH_FROM_CHAR = "select count(*) as total from book2018 where title like ?";
SQL_GET_BOOK_FROM_BOOKID = "select * from book2018 where book_id = ?";

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
    const offset = parseInt(req.body.offset) || 0;
    // console.log("Offset is :" + offset);
    const conn = await pool.getConnection();

    try {
        const listResponse = await conn.query(SQL_GET_BOOKLIST_FROM_CHAR, [charQuery, limit, offset]);
        const listResults = listResponse[0];

        const lengthResponse = await conn.query(SQL_GET_BOOKLIST_LENGTH_FROM_CHAR, [charQuery]);
        const lengthResults = lengthResponse[0][0].total;

        // console.log("Total is :" + lengthResults);
        // console.log("Left :" + (lengthResults-offset));

        res.status(200);
        res.type('text/html');
        res.render('master', { charQuery: req.body.charQuery , listResults, lengthResults, prevOffset: Math.max(offset-limit,0), nextOffset:Math.min(offset+limit,lengthResults-limit) });
    } catch (e) {
        res.status(500);
        res.type('text/html');
        res.send(JSON.stringify(e));
    } finally {
        conn.release();
    }
});

// Configure the detailed page
app.get('/detail/:bookId', async (req, res) => {
    res.status(200);
    const {bookId} = req.params;

    const conn = await pool.getConnection();

    try {
        const bookResponse = await conn.query(SQL_GET_BOOK_FROM_BOOKID, [bookId]);
        const bookResults = bookResponse[0][0];

        res.status(200);
        res.format({
            'text/html': () => {
                res.type('text/html');
                res.render('detail', {bookResults});
            },
            'application/json': () => {
                res.type('application/json');
                const bookResultsJSON = {
                    bookId: bookResults.book_id,
                    title: bookResults.title,
                    authors: bookResults.authors.split('|'),
                    summary: bookResults.description,
                    pages: bookResults.pages,
                    rating: bookResults.rating,
                    ratingCount: bookResults["rating_count"],
                    genre: bookResults.genres.split('|'),
                }

                res.json(bookResultsJSON);
            },
            'default': () => {
                res.type('text/plain');
                res.send('Please use html/json');
            }
            
        });
    } catch (e) {
        res.status(500);
        res.type('text/html');
        res.send(JSON.stringify(e));
    } finally {
        conn.release();
    }

});

app.get('/review', async (req, res) => {
    const endpoint = "https://api.nytimes.com/svc/books/v3/reviews.json";
    const url = withQuery(endpoint, {
        title : req.query.title,
        "api-key" : process.env.NYT_API_KEY
    });

    const reviewResponse = await fetch(url);
    const reviewResults = await reviewResponse.json();

    console.log(reviewResults);
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