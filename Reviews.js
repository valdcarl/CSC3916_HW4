var mongoose = require('mongoose');
var Schema = mongoose.Schema;

mongoose.Promise= global.Promise;

try{
    mongoose.connect( process.env.DB, {useNewUrlParser: true, useUnifiedTopology: true}, () =>
        console.log("connected"));
} catch(error) {
    console.log("could not connect");
}
mongoose.set('useCreateIndex', true);


//Movie Schema
var ReviewSchema = new Schema({
    movieTitle: { type: String, required: true, index: { unique: true }},
    reviewer: { type: String, required: true},
    quote: { type: String, required: true},
    rating: { type: Number, min: 1, max: 5,required: true}
});

//exporting the files
module.exports = mongoose.model('Reviews', ReviewSchema);