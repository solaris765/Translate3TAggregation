db.servicerequests.aggregate(

    // ONLY the pipline section will be processed
	// Pipeline
	[
		// Stage 1
		{
            //ObjectId will be processed as a string by the Mongo parser
			$match: { endCustomer: ObjectId('5a95f643b0a9605c6d480d9e') }
        },
        // Trailing comma will be processed by Mongo parser
	],

	// Options
	{
		cursor: {
			batchSize: 50
		}
	}

	// Created with Studio 3T, the IDE for MongoDB - https://studio3t.com/
    // with extra comments
);