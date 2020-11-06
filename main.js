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

// Configure port
const PORT = parseInt(process.argv[2]) || parseInt(process.env.PORT) || 3000;

// Create express instance
const app = express();

// Configure handlebars
app.engine('hbs', hbs({defaultLayout:'default.hbs'}));
app.set('view engine', 'hbs');

// Load morgan middleware for logging
// app.use(morgan('combined'));

// Configure the application

// Configure landing page
app.get('/', (req, res) => {
    res.status(200);
    res.type('text/html');
    res.render('index', {inputChars});
});

// Configure the master list
app.post('/master', (req, res) => {
    res.status(200);
    res.type('text/html');
    res.render('master');
});

// Configure 404 page
app.use((req, res) => {
    res.status(404);
    res.type('text/html');
    res.render('404');
});

// Start the server
app.listen(PORT, () => {
    console.log(`You have connected at ${PORT} at ${new Date()}.`);
});