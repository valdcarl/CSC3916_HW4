let envPath = __dirname + "/../.env"
require('dotenv').config({path:envPath});
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

mongoose.Promise= global.Promise;

try {
    mongoose.connect( process.env.DB, {useNewUrlParser: true, useUnifiedTopology: true}, () =>
        console.log("connected"));
} catch(error) {
    console.log("could not connect");
}
mongoose.set('useCreateIndex', true);


//Movie Schema
var MovieSchema = new Schema({
    title: { type: String, required: true, index: { unique: true }},
    releaseYear: { type: String, required: true},
    genre: { type: String, required: true, enum: ['Horror', 'Action', 'Drama', 'Comedy', 'Romance', 'Sci-fi', 'Documentary', 'Musical', 'Thriller']},
    actors: { type: [{actorName: String, characterName: String}], required: true }
});

MovieSchema.pre('save', function (next) {
   if(this.actors.length < 3) {
       return next(new Error('Fewer than 3 actors'));
   }
   next()
});

module.exports = mongoose.model('Movie', MovieSchema);