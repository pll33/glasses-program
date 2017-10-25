import PouchDB from 'pouchdb';
import PouchFind from 'pouchdb-find';
PouchDB.plugin(PouchFind);

export default function inventoryService() {
    let localDB = new PouchDB('glassesDB');
    let remoteDB = new PouchDB('http://localhost:5984/glassesDB');

    let _nextPairNum = 1;
    let _invTaken = [];
    let _invAvailable = [];
    let _invAllLength = 0;
    let _setLetter = '';

    let _invSearch = [];
    let inventory = {};

    function initDB() {
        localDB.changes({ include_docs: true }).on('complete', function(info) {
            console.log('InitDB watch: Complete event fired.');
            // console.log('InitDB watch: Complete event fired -- ', info);
            //only update inventory if there are actually items
            if (info.results.length) { 
                updateInventory();
            }
        }).on('error', function(err) {
            console.log('InitDB watch: Error event fired -- ', err);
        });

        //  check if local database exists
        localDB.info().then(function (info) {
            console.log('InitDB: Local DB info:', info);
        });

        // check if remote exists
        // remoteDB.info().then(function (info) {
        //     console.log('InitDB: Remote DB info:', info);
        // });

        let nextNumDoc = {
            _id: 'next_num',
            number: _nextPairNum
        };

        // check if nextNum doc exists,
        // if exists - update nextNum
        // else - add doc for nextNum, init 1
        localDB.get('next_num').then(function(doc) {
            console.log('InitDB: next_num document already exists. Setting next_num to ' + doc.number);
            _nextPairNum = doc.number;
        }).catch(function(err) {
            if (err && err.status == '404') {
                localDB.put(nextNumDoc).then(function() {
                    console.log('InitDB: Added next_num document');
                });
            } else {
                console.log('InitDB: next_num document lookup error', err);
            }
        });

        // check for indexes
        localDB.getIndexes().then(function (result) {
            if (result.indexes.length > 1) {
                console.log('InitDB: Search indexes already exist.');
            } else {
                console.log('InitDB: Search indexes do not exist, creating indexes...');

                // create index for inventory (pouchdb-find)
                localDB.createIndex({
                    index: {
                        fields: ['available', 'number'],
                        name: 'inventory'
                    }
                });

                localDB.createIndex({
                    index: {
                        fields: ['available', 'data.rightEquiv', 'data.rightCylinder', 'data.rightAxis'],
                        name: 'rightSearch'
                    }
                });

                localDB.createIndex({
                    index: {
                        fields: ['available', 'data.leftEquiv', 'data.leftCylinder', 'data.leftAxis'],
                        name: 'leftSearch'
                    }
                });

                localDB.createIndex({
                    index: {
                        fields: ['available', 'data.rightEquiv', 'data.rightCylinder', 'data.rightAxis', 'data.leftEquiv', 'data.leftCylinder', 'data.leftAxis'],
                        name: 'noneSearch'
                    }
                });
            }
        }).catch(function (err) {
            console.log('InitDB: Index check error.');
            console.log(err);
        });
    }

    initDB();

    let addPairDB = function(glassesObj) {
        const now = Date.now();
        const pairNumStr = 'pair-' + glassesObj.pairNumber.toString();
        let pair = {
            _id: pairNumStr,
            number: glassesObj.pairNumber,
            data: glassesObj.data,
            available: glassesObj.available,
            set: glassesObj.setLetter || _setLetter,
            time_added: now,
            time_modified: now
        };

        localDB.put(pair).then(function() {
            // console.log('Added glasses pair: #' + glassesObj.pairNumber);
            return localDB.get(pairNumStr);
        }).catch(function (err) {
            // TO-DO: update to a clearer error message
            // console.log('Add pair: Error when adding pair to database.', err, pair);
            if (err.status == '409') {
                updateNextNum(_invAllLength+1);
            }
        }).then(function() {
            updateNextNum(++_nextPairNum);
        });
    };

    /**
    **  Update pair of glasses in PouchDB database
    **    pairNum: pair #,
    **    availableBool: bool to set pair availability (true=Not Taken, false=Taken)
    **/
    let updatePairDB = function(pairNum, availableBool) {
        const pairStr = 'pair-' + pairNum.toString();

        // get pair from DB and put back
        localDB.get(pairStr).then(function(pair) {
            pair.time_modified = Date.now();
            pair.available = availableBool;
            return localDB.put(pair);
        }).catch(function (err) {
            console.log(err);
        }).then(function() {
            updateInventory();
        });
    };

    let updateInventory = function() {
        updateTaken();
        updateAvailable();
    };

    let updateNextNum = function(num) {
        localDB.get('next_num').then(function(id) {
            id.number = num;
            _nextPairNum = num;
            return localDB.put(id);
        }).catch(function (err) {
            if (err.status == '409') {
                if (_nextPairNum == num) {
                    updateNextNum(_nextPairNum);
                    console.log('Update next_num: next_num updated after bulk operation');
                    // console.log('_nextPairNum',_nextPairNum);
                    updateInventory();
                    console.log('Update inventory: inventory updated after bulk operation');
                }
                // note: lots of 409s fired when importing pairs in bulk
                // console.log('num:', num);
                // console.log('actual next num:', _nextPairNum);
            } else {
                console.log('Update next_num: Error.', err);
            }
        });
    };

    let updateTaken = function() {
        localDB.find({
            selector: {available: {$eq: false}}
        }).then(function(result) {
            // console.log('Taken inventory:', result);
            _invTaken = result.docs;
            _invAllLength = _invTaken.length + _invAvailable.length;
        }).catch(function(err) {
            console.log('Update taken inventory error: ', err);
        });
    };
    let updateAvailable = function() {
        localDB.find({
            selector: {available: {$eq: true}}
        }).then(function(result) {
            // console.log('Available inventory:', result);
            _invAvailable = result.docs;
            _invAllLength = _invTaken.length + _invAvailable.length;
        }).catch(function(err) {
            console.log('Update available inventory error: ', err);
        });
    };

    // add to inventory from manual inputradix sort, least
    // NOTE: assumes all glasses from manual input are available (=NOT taken) and from the SAME set
    inventory.add = function(obj) {
        if (obj.setLetter && !_setLetter) { _setLetter = obj.setLetter; }
        addPairDB(obj);
    };

    // search for matching available glasses in _available
    inventory.lookupDomRight = function(searchObj) {
        localDB.find({
            selector: {
                'available': {$eq: true},
                'data.rightEquiv': {$gte: searchObj.equivMin, $lte: searchObj.equivMax },
                'data.rightCylinder': {$gte: searchObj.cylinderMin, $lte: searchObj.cylinderMax },
                'data.rightAxis': {$gte: searchObj.axisMin, $lte: searchObj.axisMax } 
            }
        }).then(function(result) {
            // console.log('SEARCH DOM RIGHT: ', result);
            // console.log('SEARCH DONE: ', Date.now())
            _invSearch = result.docs;
        });
    };

    inventory.lookupDomLeft = function(searchObj) {
        localDB.find({
            selector: {
                'available': {$eq: true},
                'data.leftEquiv': {$gte: searchObj.equivMin, $lte: searchObj.equivMax },
                'data.leftCylinder': {$gte: searchObj.cylinderMin, $lte: searchObj.cylinderMax },
                'data.leftAxis': {$gte: searchObj.axisMin, $lte: searchObj.axisMax }
            }
        }).then(function(result) {
            // console.log('SEARCH DOM LEFT: ', result);
            _invSearch = result.docs;
        });
    };

    inventory.lookupDomNone = function(rightObj, leftObj) {
        localDB.find({
            selector: {
                'available': {$eq: true},
                'data.rightEquiv': {$gte: rightObj.equivMin, $lte: rightObj.equivMax },
                'data.rightCylinder': {$gte: rightObj.cylinderMin, $lte: rightObj.cylinderMax },
                'data.rightAxis': {$gte: rightObj.axisMin, $lte: rightObj.axisMax },
                'data.leftEquiv': {$gte: leftObj.equivMin, $lte: leftObj.equivMax },
                'data.leftCylinder': {$gte: leftObj.cylinderMin, $lte: leftObj.cylinderMax },
                'data.leftAxis': {$gte: leftObj.axisMin, $lte: leftObj.axisMax }
            }
        }).then(function(result) {
            // console.log('SEARCH DOM NONE: ', result);
            _invSearch = result.docs;
        });
    };

    // available -> taken glasses
    inventory.take = function(pairNum) {
        console.log('Available->Taken: Pair #' + pairNum);
        updatePairDB(pairNum, false);
    };

    // taken --> available glasses
    inventory.putback = function(pairNum) {
        console.log('Taken->Available: Pair #' + pairNum);
        updatePairDB(pairNum, true);
    };

    inventory.getSearchResults = function() { return _invSearch; };
    inventory.getSetLetter = function() { return _setLetter; };
    inventory.getPairNumber = function() { return _nextPairNum; };
    inventory.getTaken = function() { return _invTaken; };
    inventory.getAvailable = function() { return _invAvailable; };

    inventory.update = function() {
        updateInventory();
    };

    inventory.sync = function() {
        localDB.replicate.to(remoteDB).on('complete', function () {
            console.log('Local->Remote: Sync complete.');
        }).on('error', function (err) {
            console.log('Local->Remote: Sync error.', err);
        });
    };

    inventory.destroy = function() {
        localDB.destroy().then(function () {
            // double-check info
            localDB.info().then(function (info) {
                console.log('Local DB info:', info);
            }).catch(function() {
                // database actually destroyed
                console.log('Local DB: Database successfully destroyed.');

                console.log('Local DB: Resetting database..');
                localDB = new PouchDB('glassesDB');
                _nextPairNum = 1;
                _invTaken = [];
                _invAvailable = [];
                initDB();
            });
        }).catch(function (err) {
            console.log('Local DB: Destroy error');
            console.log(err);
        });
    };

    return inventory;
}
