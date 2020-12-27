const express = require('express');

const session = require('cookie-session');
const bodyParser = require('body-parser');

const app = express();
const MongoClient = require('mongodb').MongoClient;
const ObjectID = require('mongodb').ObjectID;
const assert = require('assert');
const fs = require('fs');
const formidable = require('express-formidable');
const mongourl = '';
const dbName = 'project';

app.use(formidable());
app.set('view engine', 'ejs');


//View
const findDocument = (db, criteria, callback) => {
    let cursor = db.collection('restaurants').find(criteria);
    console.log(`findDocument: ${JSON.stringify(criteria)}`);
    cursor.toArray((err, docs) => {
        assert.equal(err, null);
        console.log(`findDocument: ${docs.length}`);
        callback(docs);
    });
}

const list_Restaurant = (req, res, criteria) => {
    const client = new MongoClient(mongourl);
    client.connect((err) => {
        assert.equal(null, err);
        console.log("Connected successfully to server");
        const db = client.db(dbName);

        findDocument(db, criteria, (docs) => {
            client.close();
            console.log("Closed DB connection");
            console.log(docs);
            res.status(200).render('list', { nrestaurants: docs.length, restaurants: docs, name: req.session.username });
        });
    });
}

const handle_Details = (req, res, criteria) => {
    const client = new MongoClient(mongourl);
    client.connect((err) => {
        assert.equal(null, err);
        console.log("Connected successfully to server");
        const db = client.db(dbName);

        /* use Document ID for query */
        let DOCID = {};
        DOCID['_id'] = ObjectID(criteria._id)
        findDocument(db, DOCID, (docs) => {  // docs contain 1 document (hopefully)
            client.close();
            console.log("Closed DB connection");
            var holder = false;
            if(req.session.username == docs[0].owner){
                holder = true;
            }
            console.log("holder: " + holder );
            res.status(200).render('details', { restaurant: docs[0] , name: req.session.username , holder: holder});
        });
    });
}


//search
const handle_searchByName = (req, res, criteria) => {
    const client = new MongoClient(mongourl);
    client.connect((err) => {
        assert.equal(null, err);
        console.log("Connected successfully to server");
        const db = client.db(dbName);

        /* use Document ID for query */
        let DOCID = {};
        DOCID['name'] = criteria.name;
        findDocument(db, DOCID, (docs) => {  // docs contain 1 document (hopefully)
            client.close();
            console.log("Closed DB connection");

            res.status(200).render('list', { nrestaurants: docs.length, restaurants: docs, name: req.session.username });
        });
    });
}

const handle_searchByBorough = (req, res, criteria) => {
    const client = new MongoClient(mongourl);
    client.connect((err) => {
        assert.equal(null, err);
        console.log("Connected successfully to server");
        const db = client.db(dbName);

        /* use Document ID for query */
        let DOCID = {};
        DOCID['borough'] = criteria.borough;
        findDocument(db, DOCID, (docs) => {  // docs contain 1 document (hopefully)
            client.close();
            console.log("Closed DB connection");

            res.status(200).render('list', { nrestaurants: docs.length, restaurants: docs, name: req.session.username });
        });
    });
}

const handle_searchByCuisine = (req, res, criteria) => {
    const client = new MongoClient(mongourl);
    client.connect((err) => {
        assert.equal(null, err);
        console.log("Connected successfully to server");
        const db = client.db(dbName);

        /* use Document ID for query */
        let DOCID = {};
        DOCID['cuisine'] = criteria.cuisine;
        findDocument(db, DOCID, (docs) => {  // docs contain 1 document (hopefully)
            client.close();
            console.log("Closed DB connection");

            res.status(200).render('list', { nrestaurants: docs.length, restaurants: docs, name: req.session.username });
        });
    });
}

//Insert
const insertDocument = (insertDoc, callback) => {
    const client = new MongoClient(mongourl);
    client.connect((err) => {
        assert.equal(null, err);
        console.log("Connected successfully to server");
        const db = client.db(dbName);

        db.collection('restaurants').insertOne(
            insertDoc,
            (err, results) => {
                client.close();
                assert.equal(err, null);
                callback(results);
            }
        );
    });
}

const handle_Insert = (req, res) => {

    // New js objet to storge document
    var insertDoc = new Object();

    insertDoc.restaurant_id = req.fields.restaurant_id;
    insertDoc.name = req.fields.name;
    insertDoc.borough = req.fields.borough;
    insertDoc.cuisine = req.fields.cuisine;
    insertDoc.owner = req.fields.owner;

    // New address js objet inside insertDoc
    insertDoc.address = new Object();
    insertDoc.address.street = req.fields.street;
    insertDoc.address.building = req.fields.building;
    insertDoc.address.zipcode = req.fields.zipcode;

    insertDoc.address.coord = [req.fields.lat , req.fields.lon];
    
    console.log("insertDoc" + insertDoc);

    if (req.files.filetoupload.size > 0) {
        fs.readFile(req.files.filetoupload.path, (err, data) => {
            assert.equal(err, null);
            insertDoc['photo'] = new Buffer.from(data).toString('base64');
            insertDocument(insertDoc, (results) => {
                res.status(200).render('info', { message: `Updated ${results.result.nModified} document(s)` })
            });
        });
    } else {
        insertDocument(insertDoc, (results) => {
            res.status(200).render('info', { message: `Updated ${results.result.nModified} document(s)` })
        });
    }
}


const handle_insertScore = (req, res) => {

    // New js objet to storge document
    var insertScor = new Object();

    insertScor.user = req.fields.user;
    insertScor.score = req.fields.score;
    
    console.log("req.query.restaurant_id =" + req.query.restaurant_id);
    console.log("insertScor.user =" + req.query.user);
    console.log("insertScor.score =" + req.query.score);

    const client = new MongoClient(mongourl);
    client.connect((err) => {
        assert.equal(null, err);
        console.log("Connected successfully to server");
        const db = client.db(dbName);

        db.collection('restaurants').updateOne(
            { "restaurant_id" : req.query.restaurant_id },
            {
                $push: { grades: {"user" : req.query.user , "score" : req.query.score } }
            },
            (err, results) => {
                client.close();
                assert.equal(err, null);
            }
        );
    });

    res.status(200).render('info', { message: `Updated  document(s)` });

}


//Fill in restaurant information to edit form.
const handle_Edit = (res, criteria) => {
    const client = new MongoClient(mongourl);
    client.connect((err) => {
        assert.equal(null, err);
        console.log("Connected successfully to server");
        const db = client.db(dbName);

        /* use Document ID for query */
        let DOCID = {};
        DOCID['_id'] = ObjectID(criteria._id)
        let cursor = db.collection('restaurants').find(DOCID);
        cursor.toArray((err, docs) => {
            client.close();
            assert.equal(err, null);
            res.status(200).render('edit', { restaurant: docs[0] });
        });
    });
}

//Update
const updateDocument = (criteria, updateDoc, callback) => {
    const client = new MongoClient(mongourl);
    client.connect((err) => {
        assert.equal(null, err);
        console.log("Connected successfully to server");
        const db = client.db(dbName);

        db.collection('restaurants').updateOne(criteria,
            {
                $set: updateDoc
            },
            (err, results) => {
                client.close();
                assert.equal(err, null);
                callback(results);
            }
        );
    });
}

const handle_Update = (req, res) => {
    var DOCID = {};
    DOCID['_id'] = ObjectID(req.fields._id);

    // New js objet to storge document
    var updateDoc = new Object();

    updateDoc.restaurant_id = req.fields.restaurant_id;
    updateDoc.name = req.fields.name;
    updateDoc.borough = req.fields.borough;
    updateDoc.cuisine = req.fields.cuisine;

    // New address js objet inside updateDoc
    updateDoc.address = new Object();
    updateDoc.address.street = req.fields.street;
    updateDoc.address.building = req.fields.building;
    updateDoc.address.zipcode = req.fields.zipcode;

    updateDoc.address.coord = [req.fields.lat , req.fields.lon];
    
    console.log("updateDoc" + updateDoc);

    if (req.files.filetoupload.size > 0) {
        fs.readFile(req.files.filetoupload.path, (err, data) => {
            assert.equal(err, null);
            updateDoc['photo'] = new Buffer.from(data).toString('base64');
            updateDocument(DOCID, updateDoc, (results) => {
                res.status(200).render('info', { message: `Updated ${results.result.nModified} document(s)` })
            });
        });
    } else {
        updateDocument(DOCID, updateDoc, (results) => {
            res.status(200).render('info', { message: `Updated ${results.result.nModified} document(s)` })
        });
    }
}

//Delete
const deleteDocument = (db, criteria, callback) => {
    db.collection('restaurants').deleteMany(criteria, (err,results) => {
        assert.equal(err,null);
        console.log('deleteMany was successful');
        callback(results);
    })
}

const handle_Delete = (res, criteria) => {
    const client = new MongoClient(mongourl);
    client.connect((err) => {
        assert.equal(null, err);
        console.log("Connected successfully to server");
        const db = client.db(dbName);
    
        deleteDocument(db, criteria, (results) => {
            client.close();
            console.log("Closed DB connection");
            console.log(results);

            res.status(200).render('info', { message: `Deleted documents having criteria ${JSON.stringify(criteria)}: ${results.deletedCount}` });
        });
    });
}

/*  READ-Name

*/
app.get('/api/restaurant/name/:name', (req,res) => {
    if (req.params.name) {
        let criteria = {};
        criteria['name'] = req.params.name;
        const client = new MongoClient(mongourl);
        client.connect((err) => {
            assert.equal(null, err);
            console.log("Connected successfully to server");
            const db = client.db(dbName);

            findDocument(db, criteria, (docs) => {
                client.close();
                console.log("Closed DB connection");
                res.status(200).json(docs);
            });
        });
    } else {
        res.status(500).json({"error": "missing name"});
    }
})

app.get('/api/restaurant/borough/:borough', (req,res) => {
    if (req.params.borough) {
        let criteria = {};
        criteria['borough'] = req.params.borough;
        const client = new MongoClient(mongourl);
        client.connect((err) => {
            assert.equal(null, err);
            console.log("Connected successfully to server");
            const db = client.db(dbName);

            findDocument(db, criteria, (docs) => {
                client.close();
                console.log("Closed DB connection");
                res.status(200).json(docs);
            });
        });
    } else {
        res.status(500).json({"error": "missing borough"});
    }
})

app.get('/api/restaurant/cuisine/:cuisine', (req,res) => {
    if (req.params.cuisine) {
        let criteria = {};
        criteria['cuisine'] = req.params.cuisine;
        const client = new MongoClient(mongourl);
        client.connect((err) => {
            assert.equal(null, err);
            console.log("Connected successfully to server");
            const db = client.db(dbName);

            findDocument(db, criteria, (docs) => {
                client.close();
                console.log("Closed DB connection");
                res.status(200).json(docs);
            });
        });
    } else {
        res.status(500).json({"error": "missing cuisine"});
    }
})

//Login
const SECRETKEY = 'It is min-project';

const users = new Array(
    { name: 'demo' },
    { name: 'student' }
);

app.use(session({
    name: 'loginSession',
    keys: [SECRETKEY]
}));

app.get('/', (req, res) => {
    console.log(req.session);
    if (!req.session.authenticated) {    // user not logged in!
        res.redirect('/login');
    } else {
        list_Restaurant(req, res, req.query.docs);
    }
});

app.get('/find', (req, res) => {
    res.redirect('/');
})

app.get('/login', (req, res) => {
    res.status(200).render('login', {});
});

app.post('/login', (req, res) => {
    users.forEach((user) => {
        console.log(req.fields.name);

        if (user.name == req.fields.name) {
            // correct user name
            // store the following name/value pairs in cookie session
            req.session.authenticated = true;        // 'authenticated': true
            req.session.username = req.fields.name;	 // 'username': req.body.name		
        }
    });
    res.redirect('/');
});

app.get('/logout', (req, res) => {
    req.session = null;   // clear cookie-session
    res.redirect('/');
});

app.get('/details', (req, res) => {
    handle_Details(req , res, req.query);
})

app.get('/searchByName', (req, res) => {
    handle_searchByName(req , res, req.query);
})

app.get('/searchByBorough', (req, res) => {
    handle_searchByBorough(req , res, req.query);
})

app.get('/handle_searchByCuisine', (req, res) => {
    handle_searchByCuisine(req , res, req.query);
})

app.get('/edit', (req, res) => {
    handle_Edit(res, req.query);
})

app.get('/score', (req, res) => {
    console.log(req.session);
    if (!req.session.authenticated) {    // user not logged in!
        res.redirect('/login');
    } else {
        res.status(200).render('score', { name: req.session.username });
    }
})

app.get('/add', (req, res) => {
    console.log(req.session);
    if (!req.session.authenticated) {    // user not logged in!
        res.redirect('/login');
    } else {
        res.status(200).render('add', { name: req.session.username });
    }
})

app.get('/delete', (req, res) => {
    handle_Delete(res, req.query);
})

app.post('/update', (req, res) => {
    handle_Update(req, res);
})

app.post('/insert', (req, res) => {
    handle_Insert(req, res);
})

app.get('/insertScore', (req, res) => {
    handle_insertScore(req, res);
})

app.get('/*', (req, res) => {
    res.status(404).render('info', { message: `${req.path} - Unknown request!` });
})

app.listen(app.listen(process.env.PORT || 8099));
