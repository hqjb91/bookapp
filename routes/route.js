const express = require('express');
const router = express.Router();
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
SQL_GET_BOOKLIST_FROM_CHAR = "select book_id, title from book2018 where title like ? order by title asc limit ? offset ?";
SQL_GET_BOOKLIST_LENGTH_FROM_CHAR = "select count(*) as total from book2018 where title like ?";
SQL_GET_BOOK_FROM_BOOKID = "select * from book2018 where book_id = ?";

// Define closure 
const mkQuery = (sqlQuery, pool) => {
    return f = async (params) => {
        const conn = await pool.getConnection();

        try {
            const response = await conn.query(sqlQuery, params);
            return response[0];
        } catch (e) {
            return Promise.reject(e);
        } finally {
            conn.release();
        }
    }
}

module.exports = r = (pool) => {

    // Create closure functions
    const getBookList = mkQuery(SQL_GET_BOOKLIST_FROM_CHAR, pool);
    const getBookListLength = mkQuery(SQL_GET_BOOKLIST_LENGTH_FROM_CHAR, pool);
    const getBookFromId = mkQuery(SQL_GET_BOOK_FROM_BOOKID, pool);

    // Configure landing page
    router.get('/', (req, res) => {
        res.status(200);
        res.type('text/html');
        res.render('index', {inputChars, index:true});
    });

    // Configure the master list
    router.get('/master', async (req, res) => {

        const charQuery = req.query.charQuery.toString() + '%';
        console.log(charQuery);

        const limit = 10;
        let offset = parseInt(req.query.offset) || 0;

        // console.log("Offset is :" + offset);

        try {
            const lengthResponse = await getBookListLength([charQuery]);
            const lengthResults = lengthResponse[0].total;

            // Check for invalid queries
            (offset > lengthResults || isNaN(offset) || offset < 0) ? offset = lengthResults-limit : offset = offset;

            const listResponse = await getBookList([charQuery, limit, offset]);
            const listResults = listResponse;

            // Create array to paginate the list
            const numOfPages = Math.ceil(lengthResults/limit);
            const arrayOfPages = [];
            const populateArrayOfPages = () => {
                for(let i=1; i<=numOfPages; i++){
                    arrayOfPages.push({pagenumber : i, offset: (i-1)*limit});
                };
            };
            populateArrayOfPages();

            // console.log("Total is :" + lengthResults);
            // console.log("Left :" + (lengthResults-offset));

            res.status(200);
            res.type('text/html');
            res.render('master', { charQuery: req.query.charQuery , listResults, isStart: offset === 0, isEnd: offset >= lengthResults-limit,
                                    lengthResults, prevOffset: offset-limit, arrayOfPages, nextOffset:offset+limit });
        } catch (e) {
            res.status(500);
            res.type('text/html');
            res.send(JSON.stringify(e));
        }
    });

    // Configure the detailed page
    router.get('/detail/:bookId', async (req, res) => {
        res.status(200);
        const {bookId} = req.params;

        try {
            const bookResponse = await getBookFromId([bookId]);
            const bookResults = bookResponse[0];

            // Parse into required JSON
            const bookResultsJSON = {
                bookId: bookResults.book_id,
                title: bookResults.title,
                authors: bookResults.authors.split('|'),
                summary: bookResults.description,
                pages: bookResults.pages,
                rating: parseInt(bookResults.rating),
                ratingCount: bookResults["rating_count"],
                genre: bookResults.genres.split('|'),
            }

            // Parse the authors and genres string
            bookResults.authorsList = bookResults.authors.replaceAll("|", " and ");
            bookResults.authors = bookResults.authors.replaceAll("|", ", ");
            bookResults.genres = bookResults.genres.replaceAll("|", ", ");

            res.status(200);

            // Content negotiation
            res.format({
                'text/html': () => {
                    res.type('text/html');
                    res.render('detail', {bookResults});
                },
                'application/json': () => {
                    res.type('application/json');
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
        }
    });

    // Configure review page
    router.get('/review', async (req, res) => {
        const endpoint = "https://api.nytimes.com/svc/books/v3/reviews.json";
        const url = withQuery(endpoint, {
            author: req.query.authorsList,
            title : req.query.title,
            "api-key" : process.env.NYT_API_KEY
        });

        const reviewResponse = await fetch(url);
        const reviewResults = await reviewResponse.json();

        res.status(200);
        res.type('text/html');
        res.render('review', {reviewResults: reviewResults.results, resultsLength: reviewResults.num_results});
    });

    // Configure 404 page
    router.use((req, res) => {
        res.status(404);
        res.type('text/html');
        res.render('404');
    });

    return router;
}